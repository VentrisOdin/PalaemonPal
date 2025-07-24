require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const owner = deployer.address;
  const charityWallet = process.env.CHARITY_WALLET;
  const devWallet = process.env.DEV_WALLET;
  const router = process.env.ROUTER;

  if (
    !owner || owner === "0x0000000000000000000000000000000000000000" ||
    !charityWallet || charityWallet === "0x0000000000000000000000000000000000000000" ||
    !devWallet || devWallet === "0x0000000000000000000000000000000000000000" ||
    !router || router === "0x0000000000000000000000000000000000000000"
  ) {
    throw new Error("❌ One or more required environment variables are missing or zero!");
  }

  console.log("OWNER:", owner);
  console.log("CHARITY_WALLET:", charityWallet);
  console.log("DEV_WALLET:", devWallet);
  console.log("ROUTER:", router);

  const Token = await hre.ethers.getContractFactory("PalaemonCoin");
  const token = await Token.deploy(owner, charityWallet, devWallet, router);

  await token.deployed();
  console.log("PalaemonCoin deployed to:", token.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
