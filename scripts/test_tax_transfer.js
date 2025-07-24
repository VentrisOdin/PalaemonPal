const { ethers } = require("ethers");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.BSC_RPC);

  const devWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const walletA = new ethers.Wallet("0xbd4aca4da0e0cffd3de999c2a3fb60fb08b8edd91fc93de49113230a79174073", provider);
  const walletB = "0x23c991E7Ab7ACF4868Ef28262dca802bF17c4b9B";

  const abiPath = path.join(__dirname, "../artifacts/contracts/pal_test.sol/PalTest.json");
  const abi = JSON.parse(fs.readFileSync(abiPath)).abi;

  const palTest = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, devWallet);

  const amountToSend = ethers.utils.parseUnits("1000", 18);

  console.log(`💸 Sending ${ethers.utils.formatUnits(amountToSend)} PTT to Wallet A...`);
  const fundTx = await palTest.transfer(walletA.address, amountToSend);
  await fundTx.wait();
  console.log(`✅ Funded Wallet A: ${walletA.address}`);

  // Now transfer from A to B (taxable)
  const palTestFromA = palTest.connect(walletA);

  console.log(`🔁 Sending from Wallet A to Wallet B (taxable)...`);
  const tx = await palTestFromA.transfer(walletB, amountToSend);
  await tx.wait();
  console.log(`✅ Transfer complete: ${tx.hash}`);

  // Balances
  const balanceB = await palTest.balanceOf(walletB);
  const charityBal = await palTest.balanceOf(process.env.CHARITY_WALLET);
  const devBal = await palTest.balanceOf(process.env.DEV_WALLET);

  console.log(`💰 Wallet B PTT: ${ethers.utils.formatUnits(balanceB, 18)} PTT`);
  console.log(`🎯 Charity Wallet: ${ethers.utils.formatUnits(charityBal, 18)} PTT`);
  console.log(`🛠️ Dev Wallet: ${ethers.utils.formatUnits(devBal, 18)} PTT`);
}

main().catch(console.error);
