// scripts/test_wallet_transfer.js
const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  const token = await ethers.getContractAt("PalaemonCoin", process.env.CONTRACT_ADDRESS, deployer);

  const testWallet = "0xA88d202d0619325345d773c041Ffa69ae5B092FB"; // Use any test address
  const amount = ethers.parseUnits("1000", 18); // 1000 PAL

  console.log("🧪 Testing wallet-to-wallet transfer (2% charity fee)...");
  const tx = await token.transfer(testWallet, amount);
  await tx.wait();
  console.log("✅ Transfer successful!");
  console.log("Expected: 980 PAL to wallet, 20 PAL to charity");
}

main().catch(console.error);