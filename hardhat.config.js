require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    bscTestnet: {
      url: process.env.BSC_RPC,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 97
    },
    bscMainnet: {
      url: "https://bsc-dataseed1.binance.org/",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 56
    }
  },
  etherscan: {
    // New v2 format - single API key
    apiKey: process.env.BSCSCAN_API_KEY
  }
};
