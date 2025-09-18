// scripts/enable_trading.js
const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const CONTRACT = process.env.CONTRACT_ADDRESS;
  const DEAD = Number(process.env.DEAD_BLOCKS ?? 2);
  if (!CONTRACT) throw new Error("Missing CONTRACT_ADDRESS in .env");

  const [deployer] = await ethers.getSigners();
  const token = await ethers.getContractAt("PalaemonCoin", CONTRACT, deployer);

  console.log("🔍 Checking current trading status...");
  const tradingActive = await token.tradingActive();
  let liquidityPair = await token.liquidityPair();

  console.log(`Trading Active: ${tradingActive}`);
  console.log(`Liquidity Pair: ${liquidityPair}`);

  if (tradingActive) {
    console.log("✅ Trading is already enabled!");
    return;
  }

  // Ensure pair is recorded on-chain (needed by enableTrading)
  if (liquidityPair === ethers.ZeroAddress) {
    console.log("🧩 Pair not set on contract. Calling initializePair()…");
    const txInit = await token.initializePair();
    console.log("  → tx:", txInit.hash);
    await txInit.wait();
    liquidityPair = await token.liquidityPair();
    console.log("✅ Pair after init:", liquidityPair);
    if (liquidityPair === ethers.ZeroAddress) {
      throw new Error("❌ Pair still zero after initializePair().");
    }
  }

  console.log(`🚀 Enabling trading with ${DEAD} dead blocks (anti-sniper) …`);
  try {
    const tx = await token.enableTrading(DEAD);
    console.log("  → tx:", tx.hash);
    await tx.wait();

    // Verify
    const [live, launchBlock, deadBlocks] = await Promise.all([
      token.tradingActive(),
      token.tradingActiveBlock(),
      token.deadBlocks(),
    ]);

    console.log("\n✅ Trading enabled!");
    console.log(`📊 Active: ${live}`);
    console.log(`📊 Launch Block: ${Number(launchBlock)}`);
    console.log(`📊 Dead Blocks: ${Number(deadBlocks)}`);

    console.log("\n🧪 You can now test:");
    console.log("  • Wallet→wallet (2% charity)");
    console.log("  • DEX buy/sell (5% total: 2% charity, 1% dev, 2% liq)");
    console.log("  • MaxTx (1%) / MaxWallet (2%)");
    console.log("  • Auto-liquidity at 500k PAL");
  } catch (error) {
    console.error("❌ Error enabling trading:", error.shortMessage || error.message);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
