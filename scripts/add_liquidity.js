// scripts/add_liquidity.js
const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Using deployer:", deployer.address);

  const token = await ethers.getContractAt("PalaemonCoin", process.env.CONTRACT_ADDRESS, deployer);
  const router = await ethers.getContractAt("IUniswapV2Router02", process.env.ROUTER, deployer);

  // Step 1: Check current balances
  const deployerBalance = await token.balanceOf(deployer.address);
  const treasuryBalance = await token.balanceOf(process.env.TREASURY_WALLET);
  const devBalance = await token.balanceOf(process.env.DEV_WALLET);
  
  console.log(`📊 Current Balances:`);
  console.log(`  Deployer: ${ethers.formatUnits(deployerBalance)} PAL`);
  console.log(`  Treasury: ${ethers.formatUnits(treasuryBalance)} PAL`);
  console.log(`  Dev Wallet: ${ethers.formatUnits(devBalance)} PAL`);

  // Step 2: Define liquidity amounts - SINGLE DECLARATION
  const amountPAL = ethers.parseUnits("800000", 18); // 800K PAL
  const amountBNB = ethers.parseEther("0.3"); // 0.3 tBNB
  
  if (deployerBalance < amountPAL) {
    console.log(`\n❌ Deployer needs ${ethers.formatUnits(amountPAL)} PAL but only has ${ethers.formatUnits(deployerBalance)}`);
    console.log("💡 Need to transfer tokens from treasury or previous deployment!");
    return;
  }

  // Step 3: Add liquidity
  console.log(`\n⛽ Approving router to spend ${ethers.formatUnits(amountPAL)} PAL...`);
  const approveTx = await token.approve(router.target, amountPAL);
  await approveTx.wait();
  console.log("✅ Approved");

  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

  console.log("🚀 Adding liquidity...");
  const tx = await router.addLiquidityETH(
    process.env.CONTRACT_ADDRESS,
    amountPAL,
    0, 0, // min amounts (0 for testing)
    deployer.address, // LP tokens to deployer
    deadline,
    { value: amountBNB }
  );

  const receipt = await tx.wait();
  console.log("✅ Liquidity added! Tx:", receipt.hash);
  
  // Check pair address after liquidity addition
  const pairAddress = await token.liquidityPair();
  console.log("📍 Liquidity Pair:", pairAddress);
}

main().catch(console.error);
