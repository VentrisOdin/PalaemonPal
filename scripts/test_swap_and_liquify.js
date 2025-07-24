const { ethers } = require("hardhat");
require("dotenv").config();

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const PRIVATE_KEY_A = "0xbd4aca4da0e0cffd3de999c2a3fb60fb08b8edd91fc93de49113230a79174073"; // Wallet A
const PRIVATE_KEY_B = "0x363d6df0faea1043e950e03c0197438c4766ec4266e9a54aa62ba477a980f902"; // Wallet B

const IUniswapV2PairABI = [
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32)"
];

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.BSC_RPC);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider); // your dev wallet (excluded)
  const walletA = new ethers.Wallet(PRIVATE_KEY_A, provider);
  const walletB = new ethers.Wallet(PRIVATE_KEY_B, provider);

  const token = await ethers.getContractAt("PalTest", CONTRACT_ADDRESS, signer);

  const amount = ethers.utils.parseUnits("5000", 18);
  console.log(`💸 Sending ${ethers.utils.formatUnits(amount)} PTT to contract...`);
  const tx1 = await token.transfer(CONTRACT_ADDRESS, amount);
  await tx1.wait();
  console.log("✅ Contract funded with PTT");

  // ✅ Check liquidity pair exists and has reserves
  const pairAddress = await token.liquidityPair();
  console.log("🔗 Liquidity Pair Address:", pairAddress);

  if (pairAddress === ethers.constants.AddressZero) {
    console.warn("❌ Liquidity pair not set. Did you run initializePair()?");
    process.exit(1);
  }

  const pair = new ethers.Contract(pairAddress, IUniswapV2PairABI, provider);
  const [reserve0, reserve1] = await pair.getReserves();
  console.log(`📦 Reserves - Token: ${reserve0.toString()}, WBNB: ${reserve1.toString()}`);

  if (reserve0 == 0 || reserve1 == 0) {
    console.warn("⚠️ Liquidity pool has no reserves. Add liquidity before testing swapAndLiquify.");
    process.exit(1);
  }

  // Transfer some PTT to Wallet A if needed
  const fundAmount = ethers.utils.parseUnits("1000", 18);
  const balanceA = await token.balanceOf(walletA.address);
  if (balanceA.lt(fundAmount)) {
    console.log("💰 Funding Wallet A...");
    const txFund = await token.transfer(walletA.address, fundAmount);
    await txFund.wait();
    console.log("✅ Wallet A funded");
  }

  const tokenA = token.connect(walletA);

  console.log(`🔁 Sending from Wallet A to Wallet B (taxable, should trigger swapAndLiquify)...`);
  const tx2 = await tokenA.transfer(walletB.address, fundAmount);
  await tx2.wait();
  console.log(`✅ Transfer complete: ${tx2.hash}`);

  const devBal = await token.balanceOf(process.env.DEV_WALLET);
  const charityBal = await token.balanceOf(process.env.CHARITY_WALLET);
  const bnbBalance = await provider.getBalance(CONTRACT_ADDRESS);

  console.log(`💰 Dev Wallet: ${ethers.utils.formatUnits(devBal, 18)} PTT`);
  console.log(`🎯 Charity Wallet: ${ethers.utils.formatUnits(charityBal, 18)} PTT`);
  console.log(`🪙 Contract BNB: ${ethers.utils.formatEther(bnbBalance)} BNB`);
}

main().catch(console.error);
