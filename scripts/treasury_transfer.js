const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🏦 Transferring PAL from Treasury to Deployer for liquidity...");
  
  // You'll need to add the treasury private key to .env
  const treasuryKey = process.env.TREASURY_PRIVATE_KEY;
  if (!treasuryKey) {
    console.log("❌ Please add TREASURY_PRIVATE_KEY to your .env file");
    console.log("📋 Or use MetaMask to manually transfer:");
    console.log("   From: " + process.env.TREASURY_WALLET);
    console.log("   To: 0x18c12791DbEC9A9a89644b312993a91c6929934b");
    console.log("   Amount: 2,000,000 PAL");
    console.log("   Contract: " + process.env.CONTRACT_ADDRESS);
    return;
  }

  const [deployer] = await ethers.getSigners();
  const treasurySigner = new ethers.Wallet(treasuryKey, deployer.provider);
  
  const token = await ethers.getContractAt("PalaemonCoin", process.env.CONTRACT_ADDRESS, treasurySigner);
  
  const amount = ethers.parseUnits("2000000", 18); // 2M PAL
  
  console.log("📤 Transferring 2M PAL from treasury to deployer...");
  const tx = await token.transfer(deployer.address, amount);
  await tx.wait();
  console.log("✅ Transfer complete!");
  
  // Check new balance
  const newBalance = await token.balanceOf(deployer.address);
  console.log(`💰 Deployer now has: ${ethers.formatUnits(newBalance)} PAL`);
  console.log("\n🚀 Now run: npx hardhat run scripts/add_liquidity.js --network bscTestnet");
}

main().catch(console.error);