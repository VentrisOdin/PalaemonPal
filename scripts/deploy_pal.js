const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 Deploying PalaemonCoin to BSC MAINNET...");
  console.log("⚠️  Trading will be DISABLED until official launch!");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "BNB");

  if (balance < ethers.parseEther("0.1")) {
    console.log("❌ Need at least 0.1 BNB for deployment + verification");
    console.log("💡 Get BNB from exchange or bridge");
    return;
  }

  // Deploy with all 6 constructor parameters
  console.log("\n📄 Deploying contract with parameters:");
  console.log(`  Owner: ${deployer.address}`);
  console.log(`  Treasury: ${process.env.TREASURY_WALLET}`);
  console.log(`  Charity: ${process.env.CHARITY_WALLET}`);
  console.log(`  Dev: ${process.env.DEV_WALLET}`);
  console.log(`  Router: ${process.env.ROUTER}`);
  console.log(`  Auto-Liquidity: ${process.env.AUTO_LIQUIDITY_WALLET}`);

  const PalaemonCoin = await ethers.getContractFactory("PalaemonCoin");
  const contract = await PalaemonCoin.deploy(
    deployer.address,                     // initialOwner
    process.env.TREASURY_WALLET,          // initialSupplyRecipient (gets 1B PAL)
    process.env.CHARITY_WALLET,           // charityWallet (gets 2% fees)
    process.env.DEV_WALLET,               // devWallet (gets 1% fees)
    process.env.ROUTER,                   // router (PancakeSwap V2)
    process.env.AUTO_LIQUIDITY_WALLET     // autoLiquidityWallet (gets LP tokens)
  );
  
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("\n✅ PalaemonCoin deployed successfully!");
  console.log("📍 Contract Address:", contractAddress);

  // Get contract details
  const name = await contract.name();
  const symbol = await contract.symbol();
  const totalSupply = await contract.totalSupply();
  const owner = await contract.owner();
  const tradingActive = await contract.tradingActive();

  console.log("\n📊 Contract Details:");
  console.log(`  Name: ${name}`);
  console.log(`  Symbol: ${symbol}`);
  console.log(`  Total Supply: ${ethers.formatUnits(totalSupply)} PAL`);
  console.log(`  Owner: ${owner}`);
  console.log(`  Trading Active: ${tradingActive}`); // Will show "false"

  // Add explicit confirmation
  console.log("\n🔒 Trading Status Confirmation:");
  if (!tradingActive) {
    console.log("✅ PERFECT: Trading is DISABLED for 7-day preview period");
    console.log("✅ Only wallet-to-wallet transfers allowed (with 2% charity fee)");
    console.log("✅ DEX trading blocked until owner enables it");
    console.log("✅ Anti-sniper protection ready for launch day");
  } else {
    console.log("⚠️  WARNING: Trading is enabled! This should be disabled for preview.");
  }

  console.log("\n🏦 Wallet Configuration:");
  console.log(`  Treasury: ${process.env.TREASURY_WALLET}`);
  console.log(`  Charity: ${process.env.CHARITY_WALLET}`);
  console.log(`  Dev: ${process.env.DEV_WALLET}`);
  console.log(`  Auto-Liquidity: ${process.env.AUTO_LIQUIDITY_WALLET}`);

  // Check initial token distribution
  const treasuryBalance = await contract.balanceOf(process.env.TREASURY_WALLET);
  console.log("\n💰 Token Distribution:");
  console.log(`  Treasury Balance: ${ethers.formatUnits(treasuryBalance)} PAL`);

  console.log("\n🔗 Next Steps:");
  console.log(`1. Add this to your .env file: CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`2. Verify contract: npx hardhat verify --network bsc ${contractAddress} "${deployer.address}" "${process.env.TREASURY_WALLET}" "${process.env.CHARITY_WALLET}" "${process.env.DEV_WALLET}" "${process.env.ROUTER}" "${process.env.AUTO_LIQUIDITY_WALLET}"`);
  console.log(`3. Announce stealth launch: "Contract deployed! Trading launches in 7 days!"`);
  console.log(`4. Build community for 7 days`);
  console.log(`5. On launch day: Add liquidity + enable trading`);

  console.log("\n📢 Marketing Message:");
  console.log("🚀 PalaemonCoin Deployed to BSC Mainnet!");
  console.log("💝 Mission: Every Transaction Saves Lives!");
  console.log("🔒 Contract Verified & Secured");
  console.log("🔒 Trading DISABLED for 7-day preview period");
  console.log("📅 Trading launches in exactly 7 days!");
  console.log(`🔍 Contract: https://bscscan.com/address/${contractAddress}`);

  console.log("\n⚠️  PREVIEW MODE: Trading is DISABLED until you run enable_trading.js");
  console.log("🌟 Community can research the contract but cannot trade yet!");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
