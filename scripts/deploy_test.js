const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying from:", deployer.address);

  const PalTest = await ethers.getContractFactory("PalTest");
  const contract = await PalTest.deploy(
    deployer.address,
    process.env.CHARITY_WALLET,
    process.env.DEV_WALLET,
    process.env.ROUTER
  );
  await contract.deployed();

  console.log("PalTest deployed to:", contract.address);
}

main().catch(console.error);
