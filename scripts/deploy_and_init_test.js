const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`🚀 Deploying with account: ${deployer.address}`);

  const PalTest = await hre.ethers.getContractFactory("PalTest");
  const contract = await PalTest.deploy(
    deployer.address,
    process.env.CHARITY_WALLET,
    process.env.DEV_WALLET,
    process.env.ROUTER
  );

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  console.log(`✅ Contract deployed to: ${contractAddress}`);

  // Call initializePair
  try {
    const tx = await contract.initializePair();
    console.log(`🔁 initializePair() tx sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ initializePair() confirmed in block ${receipt.blockNumber}`);
  } catch (error) {
    console.error("❌ initializePair() failed:", error.message);
  }

  // Print pair address
  const pair = await contract.liquidityPair();
  console.log(`💧 Liquidity pair: ${pair}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
