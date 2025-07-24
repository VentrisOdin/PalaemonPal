// scripts/init_pair.js
const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.BSC_RPC);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const token = await ethers.getContractAt("PalTest", process.env.CONTRACT_ADDRESS, signer);

  console.log("📡 Calling initializePair()...");
  const tx = await token.initializePair();
  await tx.wait();
  const pairAddress = await token.liquidityPair();
  console.log(`✅ Pair initialized: ${pairAddress}`);
}

main().catch(console.error);
