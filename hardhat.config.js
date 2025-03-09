require("@nomiclabs/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");

// Your private key for deployment - REPLACE THIS or use environment variable
const PRIVATE_KEY = process.env.PRIVATE_KEY || "INSERT PRIVATE KEY HERE";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    base: {
      url: "https://mainnet.base.org",
      accounts: [PRIVATE_KEY],
      chainId: 8453,
      gasPrice: 1000000000, // Adjust as needed
    },
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: [PRIVATE_KEY],
      chainId: 84532,
    }
  },
  etherscan: {
    apiKey: {
      base: process.env.BASESCAN_API_KEY || "your-basescan-api-key-here",
      baseSepolia: process.env.BASESCAN_API_KEY || "your-basescan-api-key-here",
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org"
        }
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      }
    ]
  }
};
