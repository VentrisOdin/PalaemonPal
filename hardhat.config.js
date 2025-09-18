require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      accounts: [process.env.PRIVATE_KEY]
    },
    bsc: {
      url: process.env.BSC_RPC,
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: 3000000000,
    }
  },
  etherscan: {
    // Try the new v2 format
    apiKey: process.env.BSCSCAN_API_KEY
  }
};
