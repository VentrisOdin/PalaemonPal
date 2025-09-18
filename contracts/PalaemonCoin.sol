// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";

contract PalaemonCoin is ERC20, Ownable {
    // ---- Events ----
    event PairInitialized(address pair);
    event SwapAndLiquify(uint256 tokensSwapped, uint256 bnbReceived, uint256 tokensIntoLiquidity);
    event TradingActivated(uint256 blockNumber, uint256 deadBlocks); // keep signature; emit 0 for deadBlocks
    event LimitsUpdated(uint256 maxTxAmount, uint256 maxWalletAmount);
    event ExcludedFromLimits(address indexed account, bool isExcluded);
    event WalletsUpdated(address indexed newCharity, address indexed newDev);
    event SwapThresholdUpdated(uint256 newThreshold);
    event AutoLiquidityWalletUpdated(address indexed oldWallet, address indexed newWallet);

    // ---- Fee exclusions ----
    mapping(address => bool) public isExcludedFromFees;

    // ---- Limit exclusions (anti-whale) ----
    mapping(address => bool) public isExcludedFromLimits;

    // ---- Project wallets ----
    address public charityWallet;
    address public devWallet;
    address public autoLiquidityWallet; // LP token receiver

    // ---- DEX ----
    IUniswapV2Router02 public router;
    address public liquidityPair;

    // ---- Swapping config ----
    bool private inSwapAndLiquify;
    bool public swapAndLiquifyEnabled = true;
    uint256 public minTokensBeforeSwap; // set in constructor

    // ---- Trading gate (keep, sans dead-block logic) ----
    bool public tradingActive;

    // ---- Anti-whale limits ----
    uint256 public maxTxAmount;     // default 1% of total supply
    uint256 public maxWalletAmount; // default 2% of total supply

    modifier lockTheSwap {
        inSwapAndLiquify = true;
        _;
        inSwapAndLiquify = false;
    }

    constructor(
        address initialOwner,
        address initialSupplyRecipient,     // Treasury wallet
        address _charityWallet,
        address _devWallet,
        address _router,
        address _autoLiquidityWallet
    ) Ownable(initialOwner) ERC20("Palaemon Coin", "PAL") {
        require(_charityWallet != address(0), "Invalid charity wallet");
        require(_devWallet != address(0), "Invalid dev wallet");
        require(_router != address(0), "Invalid router address");
        require(_autoLiquidityWallet != address(0), "Invalid auto-liquidity wallet");
        require(initialSupplyRecipient != address(0), "Invalid treasury wallet");

        charityWallet = _charityWallet;
        devWallet = _devWallet;
        router = IUniswapV2Router02(_router);
        autoLiquidityWallet = _autoLiquidityWallet;

        // ---- Exclusions BEFORE minting ----
        isExcludedFromFees[initialOwner]                 = true;
        isExcludedFromFees[address(this)]                = true;
        isExcludedFromFees[_charityWallet]               = true;
        isExcludedFromFees[_devWallet]                   = true;
        isExcludedFromFees[initialSupplyRecipient]       = true;

        isExcludedFromLimits[initialOwner]               = true;
        isExcludedFromLimits[address(this)]              = true;
        isExcludedFromLimits[_charityWallet]             = true;
        isExcludedFromLimits[_devWallet]                 = true;
        isExcludedFromLimits[_autoLiquidityWallet]       = true;
        isExcludedFromLimits[initialSupplyRecipient]     = true;

        // ---- Limits ----
        uint256 total = 1_000_000_000 * 10 ** decimals();
        maxTxAmount     = total / 100; // 1% of supply
        maxWalletAmount = total / 50;  // 2% of supply

        // ~0.05% of supply
        minTokensBeforeSwap = 500_000 * 10 ** decimals();

        // ---- Mint to treasury ----
        _mint(initialSupplyRecipient, total);
    }

    receive() external payable {}

    // ---------------- DEX / Pair ----------------

    function initializePair() external onlyOwner {
        require(liquidityPair == address(0), "Already initialized");
        require(address(router) != address(0), "Router not set");

        address factory = router.factory();
        require(factory != address(0), "Factory is zero");

        address weth = router.WETH();
        require(weth != address(0), "WETH is zero");

        address existingPair = IUniswapV2Factory(factory).getPair(address(this), weth);

        if (existingPair == address(0)) {
            address newPair = IUniswapV2Factory(factory).createPair(address(this), weth);
            liquidityPair = newPair;
        } else {
            liquidityPair = existingPair;
        }

        // Pair & router excluded from wallet limits
        isExcludedFromLimits[liquidityPair] = true;
        isExcludedFromLimits[address(router)] = true;

        emit PairInitialized(liquidityPair);
    }

    function setLiquidityPair(address pair) external onlyOwner {
        liquidityPair = pair;
        isExcludedFromLimits[pair] = true;
        emit PairInitialized(pair);
    }

    // ---------------- Launch Controls ----------------

    function enableTrading() external onlyOwner {
        require(!tradingActive, "Trading already active");
        require(liquidityPair != address(0), "Must initialize pair first");
        tradingActive = true;
        // Keep event signature stable; report 0 deadBlocks
        emit TradingActivated(block.number, 0);
    }

    // ---------------- Anti-Whale Admin ----------------

    function setLimits(uint256 _maxTxAmount, uint256 _maxWalletAmount) external onlyOwner {
        require(_maxTxAmount >= totalSupply() / 1000, "maxTx too small");        // >=0.1%
        require(_maxWalletAmount >= totalSupply() / 500, "maxWallet too small"); // >=0.2%
        maxTxAmount = _maxTxAmount;
        maxWalletAmount = _maxWalletAmount;
        emit LimitsUpdated(_maxTxAmount, _maxWalletAmount);
    }

    function removeLimits() external onlyOwner {
        maxTxAmount = totalSupply();
        maxWalletAmount = totalSupply();
        emit LimitsUpdated(maxTxAmount, maxWalletAmount);
    }

    function excludeFromLimits(address account, bool excluded) external onlyOwner {
        isExcludedFromLimits[account] = excluded;
        emit ExcludedFromLimits(account, excluded);
    }

    // ---------------- Wallet & Swap Admin ----------------

    function updateWallets(address newCharity, address newDev) external onlyOwner {
        require(newCharity != address(0) && newDev != address(0), "zero addr");
        charityWallet = newCharity;
        devWallet = newDev;
        isExcludedFromLimits[newCharity] = true;
        isExcludedFromLimits[newDev]     = true;
        emit WalletsUpdated(newCharity, newDev);
    }

    function setSwapAndLiquifyEnabled(bool enabled) external onlyOwner {
        swapAndLiquifyEnabled = enabled;
    }

    function setMinTokensBeforeSwap(uint256 amount) external onlyOwner {
        require(amount > 0, "zero threshold");
        minTokensBeforeSwap = amount;
        emit SwapThresholdUpdated(amount);
    }

    function setAutoLiquidityWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "zero addr");
        emit AutoLiquidityWalletUpdated(autoLiquidityWallet, newWallet);
        autoLiquidityWallet = newWallet;
        isExcludedFromLimits[newWallet] = true;
    }

    // ---------------- Core transfer logic ----------------

    function _update(address from, address to, uint256 amount) internal override {
        // Trading gate: allow owner/fee-exempt for setup before opening
        if (!tradingActive) {
            require(
                isExcludedFromFees[from] || isExcludedFromFees[to] || from == owner() || to == owner(),
                "Trading not active"
            );
        }

        bool isBuy  = (from == liquidityPair && to != address(router));
        bool isSell = (to == liquidityPair && from != address(router));
        bool isDEXTrade = isBuy || isSell;

        // Anti-whale checks (skip for excluded)
        if (!isExcludedFromLimits[from] && !isExcludedFromLimits[to]) {
            if (isBuy) {
                require(amount <= maxTxAmount, "MaxTx: buy too large");
                require(balanceOf(to) + amount <= maxWalletAmount, "MaxWallet: exceeds");
            } else if (isSell) {
                require(amount <= maxTxAmount, "MaxTx: sell too large");
            } else {
                require(balanceOf(to) + amount <= maxWalletAmount, "MaxWallet: exceeds");
            }
        }

        // Fee-exempt => passthrough
        if (isExcludedFromFees[from] || isExcludedFromFees[to]) {
            super._update(from, to, amount);
            return;
        }

        // Swap & liquify trigger (on outbound, not during buys)
        uint256 contractTokenBalance = balanceOf(address(this));
        if (
            contractTokenBalance >= minTokensBeforeSwap &&
            !inSwapAndLiquify &&
            from != liquidityPair &&
            swapAndLiquifyEnabled
        ) {
            swapAndLiquify(minTokensBeforeSwap);
        }

        uint256 fees;
        uint256 charityFee;
        uint256 devFee;
        uint256 liquidityFee;

        if (isDEXTrade) {
            // DEX trades: 5% (2% charity, 1% dev, 2% liquidity)
            charityFee   = (amount * 2) / 100;
            devFee       = (amount * 1) / 100;
            liquidityFee = (amount * 2) / 100;
            fees = charityFee + devFee + liquidityFee;

            if (charityFee > 0)   super._update(from, charityWallet, charityFee);
            if (devFee > 0)       super._update(from, devWallet,     devFee);
            if (liquidityFee > 0) super._update(from, address(this),  liquidityFee);
        } else {
            // Wallet-to-wallet: 2% charity only
            charityFee = (amount * 2) / 100;
            fees = charityFee;

            if (charityFee > 0) super._update(from, charityWallet, charityFee);
        }

        uint256 sendAmount = amount - fees;
        super._update(from, to, sendAmount);
    }

    // ---------------- Swapping / Liquidity ----------------

    function swapAndLiquify(uint256 contractTokenBalance) private lockTheSwap {
        uint256 half = contractTokenBalance / 2;
        uint256 otherHalf = contractTokenBalance - half;

        uint256 initialBalance = address(this).balance;

        swapTokensForBNB(half);

        uint256 newBalance = address(this).balance - initialBalance;

        addLiquidity(otherHalf, newBalance);

        emit SwapAndLiquify(half, newBalance, otherHalf);
    }

    function swapTokensForBNB(uint256 tokenAmount) private {
        address;
        path[0] = address(this);
        path[1] = router.WETH();

        _approve(address(this), address(router), tokenAmount);

        router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0,
            path,
            address(this),
            block.timestamp
        );
    }

    function addLiquidity(uint256 tokenAmount, uint256 ethAmount) private {
        _approve(address(this), address(router), tokenAmount);

        router.addLiquidityETH{value: ethAmount}(
            address(this),
            tokenAmount,
            0,
            0,
            autoLiquidityWallet, // LP tokens go here
            block.timestamp
        );
    }

    // ---------------- Emergency Recovery ----------------
    
    function rescueETH() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "ETH transfer failed");
    }
    
    function rescueTokens(address token, uint256 amt) external onlyOwner {
        require(token != address(this), "Cannot rescue own tokens");
        // Safe transfer for non-standard ERC20s (like USDT that don't return bool)
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, owner(), amt)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "Token transfer failed");
    }
}
