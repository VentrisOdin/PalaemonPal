const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  if (!process.env.CHARITY_WALLET || !process.env.DEV_WALLET || !process.env.AUTO_LIQ_WALLET || !process.env.ROUTER || !process.env.TREASURY_WALLET) {
    throw new Error("Missing required environment variables");
  }

  const PalaemonCoin = await ethers.getContractFactory("PalaemonCoin");
  const palaemonCoin = await PalaemonCoin.deploy(
    deployer.address,                    // initialOwner (contract owner)
    process.env.TREASURY_WALLET,        // NEW: Treasury gets all tokens
    process.env.CHARITY_WALLET,         // charityWallet
    process.env.DEV_WALLET,             // devWallet
    process.env.ROUTER,                 // router
    process.env.AUTO_LIQ_WALLET         // autoLiquidityWallet
  );

  await palaemonCoin.waitForDeployment();
  console.log("PalaemonCoin deployed to:", await palaemonCoin.getAddress());

  console.log("Initializing pair...");
  await palaemonCoin.initializePair();
  const pairAddress = await palaemonCoin.liquidityPair();
  console.log("Pair set to:", pairAddress);

  const autoLiqWallet = await palaemonCoin.autoLiquidityWallet();
  const minTokensBeforeSwap = await palaemonCoin.minTokensBeforeSwap();
  console.log("AutoLiquidityWallet:", autoLiqWallet);
  console.log("MinTokensBeforeSwap:", minTokensBeforeSwap.toString());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
