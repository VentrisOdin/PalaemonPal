const { ethers } = require("hardhat");
require("dotenv").config();

const PRIVATE_KEY_A = "0xbd4aca4da0e0cffd3de999c2a3fb60fb08b8edd91fc93de49113230a79174073";
const PRIVATE_KEY_B = "0x363d6df0faea1043e950e03c0197438c4766ec4266e9a54aa62ba477a980f902";

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.BSC_RPC);
  const walletA = new ethers.Wallet(PRIVATE_KEY_A, provider);
  const walletB = new ethers.Wallet(PRIVATE_KEY_B, provider);

  const balanceA = await provider.getBalance(walletA.address);
  const balanceB = await provider.getBalance(walletB.address);

  console.log(`Wallet A (${walletA.address}): ${ethers.utils.formatEther(balanceA)} BNB`);
  console.log(`Wallet B (${walletB.address}): ${ethers.utils.formatEther(balanceB)} BNB`);
}

main().catch(console.error);
