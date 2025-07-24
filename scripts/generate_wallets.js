const { ethers } = require("ethers");

function generateWallets() {
  const walletA = ethers.Wallet.createRandom();
  const walletB = ethers.Wallet.createRandom();

  console.log("🔐 Wallet A:", walletA.address);
  console.log("Private Key A:", walletA.privateKey);
  console.log("🔐 Wallet B:", walletB.address);
  console.log("Private Key B:", walletB.privateKey);
}

generateWallets();
