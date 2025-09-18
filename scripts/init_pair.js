// scripts/init_pair.js
const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const CONTRACT = process.env.CONTRACT_ADDRESS;
  if (!CONTRACT) throw new Error("Missing CONTRACT_ADDRESS in .env");

  const [owner] = await ethers.getSigners();
  const token = await ethers.getContractAt("PalaemonCoin", CONTRACT, owner);

  const before = await token.liquidityPair();
  console.log("Current pair:", before);

  if (before !== ethers.ZeroAddress) {
    console.log("✅ Pair already set on contract.");
    return;
  }

  console.log("📡 Calling initializePair()…");
  const tx = await token.initializePair();
  console.log("→ tx:", tx.hash);
  await tx.wait();

  const after = await token.liquidityPair();
  console.log("✅ Pair initialized:", after);
}

main().catch((e) => { console.error(e); process.exit(1); });
