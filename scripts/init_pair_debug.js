const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.BSC_RPC);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const token = await ethers.getContractAt("PalTest", process.env.CONTRACT_ADDRESS, signer);

  console.log("📡 Calling initializePair()...");

  const tx = await token.initializePair();
  const receipt = await tx.wait();

  console.log("✅ initializePair() tx:", tx.hash);

  // Parse emitted events for debugging
  for (const log of receipt.logs) {
    try {
      const parsed = token.interface.parseLog(log);
      console.log(`📢 Event: ${parsed.name}`, parsed.args);
    } catch (_) {
      // ignore unrelated logs
    }
  }

  const pair = await token.liquidityPair();
  console.log("📍 Stored liquidityPair:", pair);
}

main().catch(console.error);
