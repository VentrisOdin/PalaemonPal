const { ethers } = require("hardhat");

async function main() {
  const [deployer, middleman, recipient] = await ethers.getSigners();

  const contract = await ethers.getContractAt("PalTest", "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0");

  // Use .env dummy wallets
  const charityWallet = "0x000000000000000000000000000000000000dead";
  const devWallet = "0x000000000000000000000000000000000000beef";

  // Helper function to fetch and format balance
  async function printBalance(label, address) {
    const bal = await contract.balanceOf(address);
    console.log(`${label}: ${ethers.utils.formatEther(bal)}`);
  }

  console.log("\nInitial balances:");
  await printBalance("Deployer", deployer.address);
  await printBalance("Middleman", middleman.address);
  await printBalance("Recipient", recipient.address);
  await printBalance("Charity", charityWallet);
  await printBalance("Dev", devWallet);
  await printBalance("Contract", contract.address);

  // Deployer sends 10,000 to middleman (no fee — deployer is excluded)
  await (await contract.connect(deployer).transfer(middleman.address, ethers.utils.parseEther("10000"))).wait();

  // Middleman sends 10,000 to recipient (fee should apply: 2% to charity, 1% to dev)
  await (await contract.connect(middleman).transfer(recipient.address, ethers.utils.parseEther("10000"))).wait();

  console.log("\nAfter fee-triggering transfer:");
  await printBalance("Deployer", deployer.address);
  await printBalance("Middleman", middleman.address);
  await printBalance("Recipient", recipient.address);
  await printBalance("Charity", charityWallet);
  await printBalance("Dev", devWallet);
  await printBalance("Contract", contract.address);
}

main().catch(console.error);
