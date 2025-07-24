const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const token = await ethers.getContractAt("PalTest", process.env.CONTRACT_ADDRESS);
  const pair = await token.liquidityPair();
  console.log("Current liquidityPair:", pair);
}
main();