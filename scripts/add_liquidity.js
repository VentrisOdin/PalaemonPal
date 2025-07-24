// scripts/add_liquidity.js
const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.BSC_RPC);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const token = await ethers.getContractAt("PalTest", process.env.CONTRACT_ADDRESS, signer);
  const router = await ethers.getContractAt(
    "IUniswapV2Router02",
    process.env.ROUTER,
    signer
  );

  const amountPTT = ethers.utils.parseUnits("1000", 18); // 1000 tokens
  const amountBNB = ethers.utils.parseEther("0.01"); // 0.01 BNB

  console.log(`⛽ Approving router to spend ${ethers.utils.formatUnits(amountPTT)} PTT...`);
  const approveTx = await token.approve(router.address, amountPTT);
  await approveTx.wait();
  console.log("✅ Approved");

  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

  console.log("🚀 Adding liquidity...");
  const tx = await router.addLiquidityETH(
    process.env.CONTRACT_ADDRESS,
    amountPTT,
    0,
    0,
    signer.address,
    deadline,
    { value: amountBNB }
  );

  const receipt = await tx.wait();
  console.log("✅ Liquidity added! Tx:", receipt.transactionHash);
}

main().catch(console.error);
