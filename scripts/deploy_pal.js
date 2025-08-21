const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying from:", deployer.address);

  const PalaemonCoin = await ethers.getContractFactory("PalaemonCoin");
  const contract = await PalaemonCoin.deploy(
    deployer.address,
    process.env.CHARITY_WALLET,
    process.env.DEV_WALLET,
    process.env.ROUTER
  );
  await contract.deployed();

  console.log("PalaemonCoin deployed to:", contract.address);
}

main().catch(console.error);
