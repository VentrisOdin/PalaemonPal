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
    event TradingActivated(uint256 blockNumber, uint256 deadBlocks);
    event LimitsUpdated(uint256 maxTxAmount, uint256 maxWalletAmount);
    event TransferDelayToggled(bool enabled);
    event ExcludedFromLimits(address indexed account, bool isExcluded);
    event WalletsUpdated(address indexed newCharity, address indexed newDev);
    event SwapThresholdUpdated(uint256 newThreshold);
    event AutoLiquidityWalletUpdated(address indexed oldWallet, address indexed newWallet);

    // ---- Fee exclusions (existing) ----
    mapping(address => bool) public isExcludedFromFees;

    // ---- New: Limit exclusions (anti-whale) ----
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

    // ---- Anti-sniper / trading gates ----
    bool    public tradingActive;
    uint256 public tradingActiveBlock;
    uint256 public deadBlocks = 2;              // set on enableTrading
    uint256 public constant PUNITIVE_FEE = 99;  // 99% for dead blocks

    bool public transferDelayEnabled = true; // 1 tx / block during launch
    mapping(address => uint256) private _holderLastTransferBlock;

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
        address initialSupplyRecipient,     // NEW: Treasury wallet
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

        // ---- FIRST: Set exclusions BEFORE minting ----
        isExcludedFromFees[initialOwner]     = true;
        isExcludedFromFees[address(this)]    = true;
        isExcludedFromFees[_charityWallet]   = true;
        isExcludedFromFees[_devWallet]       = true;
        isExcludedFromFees[initialSupplyRecipient] = true; // NEW: Treasury excluded

        isExcludedFromLimits[initialOwner]     = true;
        isExcludedFromLimits[address(this)]    = true;
        isExcludedFromLimits[_charityWallet]   = true;
        isExcludedFromLimits[_devWallet]       = true;
        isExcludedFromLimits[_autoLiquidityWallet] = true;
        isExcludedFromLimits[initialSupplyRecipient] = true; // NEW: Treasury excluded

        // ---- THEN: Set limits ----
        uint256 totalSupply = 1_000_000_000 * 10 ** decimals();
        maxTxAmount     = totalSupply / 100; // 1% of total supply = 10 million
        maxWalletAmount = totalSupply / 50;  // 2% of total supply = 20 million

        // Set swap threshold (~0.05% of supply): 500,000 PAL
        minTokensBeforeSwap = 500_000 * 10 ** decimals();

        // ---- FINALLY: Mint tokens to treasury wallet ----
        _mint(initialSupplyRecipient, totalSupply);
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

        // Pair & router shouldn't be hindered by wallet limits
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

    function enableTrading(uint256 _deadBlocks) external onlyOwner {
        require(!tradingActive, "Trading already active");
        require(liquidityPair != address(0), "Must initialize pair first");
        
        tradingActive = true;
        deadBlocks = _deadBlocks;
        tradingActiveBlock = block.number;
        
        emit TradingActivated(block.number, _deadBlocks);
    }

    function setTransferDelayEnabled(bool enabled) external onlyOwner {
        transferDelayEnabled = enabled;
        emit TransferDelayToggled(enabled);
    }

    // ---------------- Anti-Whale Admin ----------------

    function setLimits(uint256 _maxTxAmount, uint256 _maxWalletAmount) external onlyOwner {
        require(_maxTxAmount >= totalSupply() / 1000, "maxTx too small");       // >=0.1%
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

    // ---- Core transfer logic ----------------

    function _update(address from, address to, uint256 amount) internal override {
        // Before-trading gate (allow owner/fee-exempt for setup)
        if (!tradingActive) {
            require(
                isExcludedFromFees[from] || isExcludedFromFees[to] || from == owner() || to == owner(),
                "Trading not active"
            );
        }

        // Transfer delay: 1 tx per block per origin (except direct router/pair interactions)
        if (transferDelayEnabled && to != address(router) && to != liquidityPair) {
            require(_holderLastTransferBlock[tx.origin] < block.number, "Transfer Delay: 1 tx per block");
            _holderLastTransferBlock[tx.origin] = block.number;
        }

        bool isBuy  = from == liquidityPair && to != address(router);
        bool isSell = to == liquidityPair && from != address(router);
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

        // If either side is fee-exempt, skip fees entirely
        if (isExcludedFromFees[from] || isExcludedFromFees[to]) {
            super._update(from, to, amount);
            return;
        }

        // Trigger swap and liquify only when sending from non-pair, and not already swapping
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

        // Anti-sniper punitive fee during dead blocks (applied to DEX trades only)
        if (tradingActive && block.number <= tradingActiveBlock + deadBlocks && isDEXTrade) {
            fees = (amount * PUNITIVE_FEE) / 100;
            super._update(from, address(this), fees); // send punitive to contract
        } else if (isDEXTrade) {
            // DEX trades: Full 5% fee (2% charity, 1% dev, 2% liquidity)
            charityFee   = (amount * 2) / 100;
            devFee       = (amount * 1) / 100;
            liquidityFee = (amount * 2) / 100;
            fees = charityFee + devFee + liquidityFee;

            if (charityFee > 0)   super._update(from, charityWallet, charityFee);
            if (devFee > 0)       super._update(from, devWallet,     devFee);
            if (liquidityFee > 0) super._update(from, address(this),  liquidityFee);
        } else {
            // Wallet-to-wallet: Only 2% charity fee
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
        address[] memory path = new address[](2);
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
