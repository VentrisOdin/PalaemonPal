const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.BSC_RPC);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const token = await ethers.getContractAt("PalTest", process.env.CONTRACT_ADDRESS, signer);

  const router = await token.router();
  console.log("🧭 Router address stored in contract:", router);
}

main().catch(console.error);
