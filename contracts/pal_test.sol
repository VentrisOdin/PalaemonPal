// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";

contract PalTest is ERC20, Ownable {
    event Debug(string message, address data);
    event DebugString(string message);
    event DebugUint(string label, uint256 value);
    event PairInitialized(address pair);

    mapping(address => bool) public isExcludedFromFees;

    address public charityWallet;
    address public devWallet;

    IUniswapV2Router02 public router;
    address public liquidityPair;

    bool private inSwapAndLiquify;
    bool public swapAndLiquifyEnabled = true;
    uint256 public minTokensBeforeSwap = 5000 * 10 ** decimals();

    modifier lockTheSwap {
        inSwapAndLiquify = true;
        _;
        inSwapAndLiquify = false;
    }

    constructor(
        address initialOwner,
        address _charityWallet,
        address _devWallet,
        address _router
    ) Ownable(initialOwner) ERC20("PalTest Token", "PTT") {
        require(_charityWallet != address(0), "Invalid charity wallet");
        require(_devWallet != address(0), "Invalid dev wallet");
        require(_router != address(0), "Invalid router address");

        charityWallet = _charityWallet;
        devWallet = _devWallet;
        router = IUniswapV2Router02(_router);

        _mint(initialOwner, 1_000_000 * 10 ** decimals());

        isExcludedFromFees[initialOwner] = true;
        isExcludedFromFees[address(this)] = true;
        isExcludedFromFees[_charityWallet] = true;
        isExcludedFromFees[_devWallet] = true;
    }

    receive() external payable {}

    function initializePair() external onlyOwner {
        require(liquidityPair == address(0), "Already initialized");
        require(address(router) != address(0), "Router not set");

        address factory = router.factory();
        emit Debug("Factory fetched", factory);
        require(factory != address(0), "Factory is zero");

        address weth = router.WETH();
        emit Debug("WETH fetched", weth);
        require(weth != address(0), "WETH is zero");

        address existingPair = IUniswapV2Factory(factory).getPair(address(this), weth);
        emit Debug("Checked for existing pair", existingPair);

        if (existingPair == address(0)) {
            address newPair = IUniswapV2Factory(factory).createPair(address(this), weth);
            liquidityPair = newPair;
            emit Debug("Pair created", newPair);
        } else {
            liquidityPair = existingPair;
            emit Debug("Pair already exists", existingPair);
        }

        emit Debug("Liquidity pair stored", liquidityPair);
    }

    function setLiquidityPair(address pair) external onlyOwner {
        liquidityPair = pair;
        emit PairInitialized(pair);
    }

    function _update(address from, address to, uint256 amount) internal override {
        if (isExcludedFromFees[from] || isExcludedFromFees[to]) {
            super._update(from, to, amount);
            return;
        }

        uint256 contractTokenBalance = balanceOf(address(this));
        if (
            contractTokenBalance >= minTokensBeforeSwap &&
            !inSwapAndLiquify &&
            from != liquidityPair &&
            swapAndLiquifyEnabled
        ) {
            swapAndLiquify(minTokensBeforeSwap);
        }

        uint256 charityFee = (amount * 2) / 100;
        uint256 devFee = (amount * 1) / 100;
        uint256 totalFee = charityFee + devFee;
        uint256 amountAfterFee = amount - totalFee;

        super._update(from, charityWallet, charityFee);
        super._update(from, devWallet, devFee);
        super._update(from, to, amountAfterFee);
    }

    function swapAndLiquify(uint256 contractTokenBalance) private lockTheSwap {
        emit DebugString("Entered swapAndLiquify");
        emit DebugUint("contractTokenBalance", contractTokenBalance);

        uint256 half = contractTokenBalance / 2;
        uint256 otherHalf = contractTokenBalance - half;

        emit DebugUint("half", half);
        emit DebugUint("otherHalf", otherHalf);

        uint256 initialBalance = address(this).balance;
        emit DebugUint("initialBalance", initialBalance);

        emit Debug("Router address", address(router));
        emit Debug("LiquidityPair address", liquidityPair);
        emit Debug("CharityWallet address", charityWallet);
        emit Debug("DevWallet address", devWallet);

        emit DebugString("Before swapTokensForBNB");
        swapTokensForBNB(half);
        emit DebugString("After swapTokensForBNB");

        emit DebugUint("Contract BNB balance after swap", address(this).balance);

        emit DebugString("Before addLiquidity");
        addLiquidity(otherHalf, address(this).balance - initialBalance);
        emit DebugString("After addLiquidity");

        emit DebugString("swapAndLiquify completed");
    }

    function swapTokensForBNB(uint256 tokenAmount) private {
        emit DebugString("Entered swapTokensForBNB");
        emit DebugUint("tokenAmount", tokenAmount);

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

        emit DebugString("swapTokensForBNB completed");
    }

    function addLiquidity(uint256 tokenAmount, uint256 ethAmount) private {
        emit DebugString("Entered addLiquidity");
        emit DebugUint("tokenAmount", tokenAmount);
        emit DebugUint("ethAmount", ethAmount);

        _approve(address(this), address(router), tokenAmount);

        router.addLiquidityETH{value: ethAmount}(
            address(this),
            tokenAmount,
            0,
            0,
            owner(),
            block.timestamp
        );

        emit DebugString("addLiquidity completed");
    }
}

