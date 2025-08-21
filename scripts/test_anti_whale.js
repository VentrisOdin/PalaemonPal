// scripts/test_anti_whale.js
const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  const token = await ethers.getContractAt("PalaemonCoin", process.env.CONTRACT_ADDRESS, deployer);

  // Try to send more than 1% of supply (10M PAL) - should fail!
  const whaleAmount = ethers.parseUnits("11000000", 18); // 11M PAL
  
  console.log("🐋 Testing anti-whale protection...");
  console.log(`Attempting to send ${ethers.formatUnits(whaleAmount)} PAL (should fail)`);
  
  try {
    await token.transfer(process.env.CHARITY_WALLET, whaleAmount);
    console.log("❌ Anti-whale failed - transaction went through!");
  } catch (error) {
    console.log("✅ Anti-whale working! Transaction blocked:");
    console.log(`   ${error.message}`);
  }
}

main().catch(console.error);