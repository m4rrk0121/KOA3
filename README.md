# ZAC Token Deployer

A comprehensive toolkit for deploying tokens on the Base blockchain using the KOA (King of Apes) protocol.

## 📋 Overview

This project provides a streamlined process for deploying tokens on the Base blockchain with the following features:

- Automatic price calculation based on target market cap
- Preconfigured liquidity pools with 1% fee tier
- 1% token allocation to a specified recipient
- Locked liquidity via Uniswap V3 positions
- Automatic contract verification on Basescan

## 🔧 Prerequisites

- Node.js (v14 or later recommended)
- npm or yarn
- A Base-compatible wallet with ETH for deployment fees
- Access to the Base RPC endpoint

## 💾 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR-USERNAME/zac-token-deployer.git
   cd zac-token-deployer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your environment:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` to add your private key and Basescan API key:
   ```
   PRIVATE_KEY=your_private_key_without_0x_prefix
   BASESCAN_API_KEY=your_basescan_api_key
   ```

## ⚙️ Configuration

The project uses Hardhat as its development environment. The main configuration is in `hardhat.config.js`.

Key configurations:
- Network settings for Base mainnet and Base Sepolia testnet
- Contract verification settings for Basescan
- Solidity compiler version and optimization settings

```javascript
// Sample hardhat.config.js structure
require("@nomiclabs/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

module.exports = {
  solidity: "0.8.20",
  networks: {
    base: {
      url: "https://mainnet.base.org",
      accounts: [PRIVATE_KEY],
      chainId: 8453,
      gasPrice: 1000000000,
    },
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: [PRIVATE_KEY],
      chainId: 84532,
    }
  },
  etherscan: {
    apiKey: {
      base: process.env.BASESCAN_API_KEY || "",
      baseSepolia: process.env.BASESCAN_API_KEY || "",
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
```

## 🚀 Usage

### Running on Base Mainnet

```bash
npx hardhat run --network base scripts/ZAC.js
```

### Running on Base Sepolia Testnet

```bash
npx hardhat run --network baseSepolia scripts/ZAC.js
```

### Deployment Process

1. The script will prompt you for token parameters:
   - Token name
   - Token symbol
   - Total supply (default: 100,000)
   - Fee collector address (default: deployer address)

2. The script will:
   - Calculate a target market cap of $14,000
   - Set the fee tier to 1% (10000)
   - Generate a salt for a deterministic token address
   - Deploy your token on the selected network
   - Set up a Uniswap V3 position with your token and ETH
   - Lock the LP position
   - Allocate 1% of tokens to a configured recipient
   - Verify the contract on Basescan

3. After deployment, you'll receive:
   - Token contract address
   - Explorer URL for your token
   - LP NFT ID for the Uniswap V3 position
   - Local JSON file with all deployment details

## 📁 Project Structure

```
zac-token-deployer/
├── contracts/               # Smart contract interfaces
│   ├── KOA.sol              # KOA contract interface
│   ├── IUniswapV3Factory.sol # Uniswap V3 factory interface
│   ├── MultiPositionLiquidityLocker.sol # Liquidity locker interface
│   └── Token.sol            # Basic ERC20 implementation
├── scripts/
│   └── ZAC.js               # Main deployment script
├── deployments/             # Deployment artifacts
│   └── tokens/              # Saved token deployment data
├── hardhat.config.js        # Hardhat configuration
└── README.md                # This file
```

## 🔍 Contract Addresses

The script uses the following contract addresses on Base:

- KOA: `0xb51F74E6d8568119061f59Fd7f98824F1e666AC1`
- Liquidity Locker: `0x1D896fb544dF80bfc72d2F82796Aa56F3a00e8b3`
- WETH: `0x4200000000000000000000000000000000000006`
- Uniswap V3 Factory: `0x33128a8fC17869897dcE68Ed026d694621f6FDfD`
- Position Manager: `0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1`
- Swap Router: `0x2626664c2603336E57B271c5C0b26F421741e481`

## 🧪 Testing

To test a deployment without committing to mainnet:

```bash
npx hardhat run --network baseSepolia scripts/ZAC.js
```

Base Sepolia is the testnet for Base, allowing you to test deployments without spending real ETH.

## 📊 Market Cap Targeting

The script targets a $14,000 market cap by:

1. Calculating the token price needed to achieve this target
2. Converting this price to a Uniswap V3 tick
3. Creating a pool with this initial tick
4. Setting up a position that spans from this tick to the maximum usable tick

This allows for a predictable initial pricing when your token launches.

## 🔒 Security Considerations

- The private key in `.env` has access to deploy contracts and transfer tokens. Keep it secure.
- The deployment fee is hardcoded at 0.0005 ETH. Ensure your wallet has sufficient funds.
- 1% of tokens are allocated to a fixed recipient address.
- LP positions are locked for a predetermined period.

## 🛣️ Roadmap

- [ ] Support for additional networks
- [ ] Customizable fee tiers
- [ ] Configurable token allocations
- [ ] Web interface for deployment
- [ ] Multiple LP position strategies

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [Base](https://base.org)
- [Uniswap V3](https://uniswap.org)
- [Hardhat](https://hardhat.org)
- [OpenZeppelin](https://openzeppelin.com)
- [KOA protocol](https://kingofapes.xyz)