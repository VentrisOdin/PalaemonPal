// scripts/pair_reserves.js
const { ethers } = require("hardhat");
require("dotenv").config();

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

const IUniswapV2PairABI = [
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32)",
  "function token0() view returns (address)",
  "function token1() view returns (address)"
];

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.BSC_RPC);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const token = await ethers.getContractAt("PalTest", CONTRACT_ADDRESS, signer);
  const pairAddress = await token.liquidityPair();

  if (pairAddress === ethers.constants.AddressZero) {
    console.error("❌ liquidityPair not set. Did you run initializePair()?");
    return;
  }

  console.log("🔗 Liquidity Pair Address:", pairAddress);

  const pair = new ethers.Contract(pairAddress, IUniswapV2PairABI, provider);
  const [r0, r1] = await pair.getReserves();
  const token0 = await pair.token0();
  const token1 = await pair.token1();

  console.log("🧪 Pair Reserves:");
  console.log(`${token0} => ${r0.toString()}`);
  console.log(`${token1} => ${r1.toString()}`);
}

main().catch(console.error);
