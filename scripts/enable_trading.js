const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  const token = await ethers.getContractAt("PalaemonCoin", process.env.CONTRACT_ADDRESS, deployer);

  console.log("🔍 Checking current trading status...");
  const tradingActive = await token.tradingActive();
  const liquidityPair = await token.liquidityPair();
  
  console.log(`Trading Active: ${tradingActive}`);
  console.log(`Liquidity Pair: ${liquidityPair}`);

  if (tradingActive) {
    console.log("✅ Trading is already enabled!");
    return;
  }

  // Check if liquidity pair exists
  if (liquidityPair === ethers.ZeroAddress) {
    console.log("❌ Must add liquidity first!");
    return;
  }

  console.log("🚀 Enabling trading with 2 dead blocks (anti-sniper protection)...");
  
  try {
    const tx = await token.enableTrading(2); // 2 dead blocks = 99% fee for snipers
    await tx.wait();
    
    console.log("✅ Trading enabled!");
    console.log("🛡️  Anti-sniper protection: 2 dead blocks with 99% fees");
    console.log("💰 Ready for testing all transaction types!");
    
    // Verify it worked
    const newTradingStatus = await token.tradingActive();
    const tradingActiveBlock = await token.tradingActiveBlock();
    const deadBlocks = await token.deadBlocks();
    
    console.log(`\n📊 Trading Status:`);
    console.log(`  Active: ${newTradingStatus}`);
    console.log(`  Launch Block: ${tradingActiveBlock}`);
    console.log(`  Dead Blocks: ${deadBlocks}`);
    
    console.log("\n🧪 Now you can test:");
    console.log("  • Wallet-to-wallet transfers (2% charity fee)");
    console.log("  • DEX buy/sell trades (5% total fees)");
    console.log("  • Anti-whale limits (max 1% tx, 2% wallet)");
    console.log("  • Auto-liquidity triggers (at 500K PAL threshold)");
    
  } catch (error) {
    console.error("❌ Error enabling trading:", error.message);
    if (error.message.includes("TradingEnabled")) {
      console.log("💡 Remove the 'emit TradingEnabled' line from your contract or add the event declaration");
    }
  }
}

main().catch(console.error);