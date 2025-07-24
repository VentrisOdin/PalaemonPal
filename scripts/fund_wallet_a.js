const { ethers } = require("hardhat");

async function main() {
  const walletA = "0xe03E65172bF5Ff2B507C08EafF0564e11ce86aa7";
  const [deployer] = await ethers.getSigners();

  console.log(`🔐 Funding Wallet A from: ${deployer.address}`);

  const tx = await deployer.sendTransaction({
    to: walletA,
    value: ethers.utils.parseEther("0.05"), // Send 0.01 BNB
  });

  console.log(`💸 Sent 0.01 BNB to Wallet A: ${tx.hash}`);
  await tx.wait();
  console.log(`✅ Transaction confirmed.`);
}

main().catch(console.error);
