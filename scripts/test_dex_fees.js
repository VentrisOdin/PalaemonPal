const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  const token = await ethers.getContractAt("PalaemonCoin", process.env.CONTRACT_ADDRESS, deployer);
  const router = await ethers.getContractAt("IUniswapV2Router02", process.env.ROUTER, deployer);

  console.log("🧪 Testing DEX trading fees (should be 5% total)...");
  
  // Check balances before DEX trade
  const deployerBefore = await token.balanceOf(deployer.address);
  const charityBefore = await token.balanceOf(process.env.CHARITY_WALLET);
  const devBefore = await token.balanceOf(process.env.DEV_WALLET);
  const contractBefore = await token.balanceOf(process.env.CONTRACT_ADDRESS);

  console.log("\n📊 Balances Before DEX Trade:");
  console.log(`  Deployer: ${ethers.formatUnits(deployerBefore)} PAL`);
  console.log(`  Charity: ${ethers.formatUnits(charityBefore)} PAL`);
  console.log(`  Dev: ${ethers.formatUnits(devBefore)} PAL`);
  console.log(`  Contract: ${ethers.formatUnits(contractBefore)} PAL`);

  // Perform a DEX trade: Sell 10,000 PAL for BNB
  const sellAmount = ethers.parseUnits("10000", 18); // 10K PAL
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

  console.log(`\n🔄 Selling ${ethers.formatUnits(sellAmount)} PAL on DEX...`);
  
  // Approve router to spend PAL
  const approveTx = await token.approve(router.target, sellAmount);
  await approveTx.wait();

  // Execute the swap: PAL → BNB
  const swapTx = await router.swapExactTokensForETH(
    sellAmount,
    0, // Accept any amount of BNB
    [process.env.CONTRACT_ADDRESS, await router.WETH()],
    deployer.address,
    deadline
  );
  await swapTx.wait();

  console.log("✅ DEX trade completed!");

  // Check balances after
  const deployerAfter = await token.balanceOf(deployer.address);
  const charityAfter = await token.balanceOf(process.env.CHARITY_WALLET);
  const devAfter = await token.balanceOf(process.env.DEV_WALLET);
  const contractAfter = await token.balanceOf(process.env.CONTRACT_ADDRESS);

  console.log("\n📊 Balances After DEX Trade:");
  console.log(`  Deployer: ${ethers.formatUnits(deployerAfter)} PAL`);
  console.log(`  Charity: ${ethers.formatUnits(charityAfter)} PAL`);
  console.log(`  Dev: ${ethers.formatUnits(devAfter)} PAL`);
  console.log(`  Contract: ${ethers.formatUnits(contractAfter)} PAL`);

  // Calculate changes
  const deployerChange = deployerBefore - deployerAfter;
  const charityChange = charityAfter - charityBefore;
  const devChange = devAfter - devBefore;
  const contractChange = contractAfter - contractBefore;

  console.log("\n🔄 Fee Distribution:");
  console.log(`  Total PAL sold: ${ethers.formatUnits(deployerChange)} PAL`);
  console.log(`  Charity fee (2%): ${ethers.formatUnits(charityChange)} PAL`);
  console.log(`  Dev fee (1%): ${ethers.formatUnits(devChange)} PAL`);
  console.log(`  Auto-liquidity (2%): ${ethers.formatUnits(contractChange)} PAL`);

  const totalFees = charityChange + devChange + contractChange;
  const feePercentage = (totalFees * 100n) / deployerChange;

  console.log(`  Total fees: ${ethers.formatUnits(totalFees)} PAL (${feePercentage}%)`);

  console.log("\n✅ Expected DEX Trading Results:");
  console.log("  • 5% total fees on DEX trades");
  console.log("  • 2% to charity (saves lives!)");
  console.log("  • 1% to dev wallet");
  console.log("  • 2% to contract for auto-liquidity");
  console.log("  • Mission: Every Transaction Saves Lives! 🌟");
}

main().catch(console.error);