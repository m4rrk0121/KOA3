// Fixed ZAC.js to match actual KOA contract
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");
const readline = require("readline");
const https = require("https");

// Add console logging to track execution
console.log("Script started");

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline.question for easier async/await usage
function promptQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Function to fetch ETH price from CoinGecko API
async function fetchEthPrice() {
  console.log("Fetching ETH price...");
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.coingecko.com',
      path: '/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          console.log("ETH price API response received");
          const parsedData = JSON.parse(data);
          if (parsedData.ethereum && parsedData.ethereum.usd) {
            console.log(`ETH price: $${parsedData.ethereum.usd}`);
            resolve(parsedData.ethereum.usd);
          } else {
            console.error("Could not parse ETH price from API response");
            reject(new Error("Could not parse ETH price from API response"));
          }
        } catch (e) {
          console.error(`Error parsing API response: ${e.message}`);
          reject(new Error(`Error parsing API response: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => {
      console.error(`Error fetching ETH price: ${e.message}`);
      reject(new Error(`Error fetching ETH price: ${e.message}`));
    });

    req.end();
  });
}

// Function to calculate the tick for a target market cap
function calculateTickForMarketCap(targetMarketCapUSD, tokenSupply, ethPriceUSD, tickSpacing) {
  console.log(`Calculating tick for market cap: $${targetMarketCapUSD}`);
  // Ensure all inputs are regular numbers, not BigInt
  const targetMarketCap = Number(targetMarketCapUSD);
  const supply = Number(tokenSupply);
  const ethPrice = Number(ethPriceUSD);
  const spacing = Number(tickSpacing);
  
  // Calculate required token price in USD
  const tokenPriceUSD = targetMarketCap / supply;
  
  // Convert to ETH price
  const tokenPriceETH = tokenPriceUSD / ethPrice;
  
  // Calculate exact tick using the Uniswap V3 formula
  // price = 1.0001^tick
  // so tick = log(price) / log(1.0001)
  const exactTick = Math.log(tokenPriceETH) / Math.log(1.0001);
  
  // Round to the nearest valid tick (multiple of tick spacing)
  const validTick = Math.round(exactTick / spacing) * spacing;
  
  // Calculate the actual price and market cap with this tick
  const actualPriceETH = Math.pow(1.0001, validTick);
  const actualPriceUSD = actualPriceETH * ethPrice;
  const actualMarketCapUSD = actualPriceUSD * supply;
  
  console.log(`Valid tick: ${validTick}`);
  
  return {
    validTick,
    exactTick,
    actualPriceETH,
    actualPriceUSD,
    actualMarketCapUSD
  };
}

// Function to verify token contract
async function verifyTokenContract(network, tokenAddress, tokenName, tokenSymbol, tokenSupply) {
  console.log(`Verifying token contract at ${tokenAddress}`);
  // Wait for the blockchain to index the contract
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  try {
    await hre.run("verify:verify", {
      address: tokenAddress,
      constructorArguments: [
        tokenName,
        tokenSymbol,
        tokenSupply.toString()
      ],
    });
    console.log("Contract verification successful");
    return true;
  } catch (error) {
    console.error(`Contract verification failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("Main function started");
  
  // Hardcoded contract addresses
  const koaAddress = "0xb51F74E6d8568119061f59Fd7f98824F1e666AC1";
  const lockerAddress = "0x1D896fb544dF80bfc72d2F82796Aa56F3a00e8b3";
  const network = hre.network.name;
  
  console.log(`Using network: ${network}`);
  console.log(`KOA address: ${koaAddress}`);
  
  try {
    // Get KOA contract instance
    console.log("Getting KOA contract instance...");
    const koa = await ethers.getContractAt("KOA", koaAddress);
    console.log("KOA contract instance loaded");
    
    // Get signer information
    console.log("Getting signer information...");
    const [signer] = await ethers.getSigners();
    const signerAddress = await signer.getAddress();
    console.log(`Signer address: ${signerAddress}`);
    
    const signerBalance = await ethers.provider.getBalance(signerAddress);
    console.log(`Signer balance: ${ethers.utils.formatEther(signerBalance)} ETH`);

    try {
      // Check contract ownership and permissions
      console.log("Checking KOA contract ownership...");
      const owner = await koa.owner();
      console.log(`KOA owner: ${owner}`);
      
      // Check basic state variables
      console.log("Checking KOA contract state variables...");
      const wethAddress = await koa.weth();
      console.log(`WETH address: ${wethAddress}`);
      
      const taxCollector = await koa.taxCollector();
      console.log(`Tax collector: ${taxCollector}`);
      
      const protocolCut = await koa.protocolCut();
      console.log(`Protocol cut: ${protocolCut}`);

      // Check locker setup
      console.log("Checking locker setup...");
      const lockerAddress = await koa.liquidityLocker();
      console.log(`Liquidity locker: ${lockerAddress}`);
      
      try {
        const locker = await ethers.getContractAt("MultiPositionLiquidityLocker", lockerAddress);
        const lockerFeeCollector = await locker.feeCollector();
        console.log(`Locker fee collector: ${lockerFeeCollector}`);
      } catch (error) {
        console.error(`Error accessing locker: ${error.message}`);
      }
      
      // Check UniswapV3 infrastructure
      console.log("Checking Uniswap V3 infrastructure...");
      const uniswapFactoryAddress = await koa.uniswapV3Factory();
      console.log(`Uniswap V3 Factory: ${uniswapFactoryAddress}`);
      
      try {
        const uniswapFactory = await ethers.getContractAt("IUniswapV3Factory", uniswapFactoryAddress);
        
        const feeAmount = 3000; // 0.3%
        const tickSpacing = await uniswapFactory.feeAmountTickSpacing(feeAmount);
        console.log(`Tick spacing for 0.3% fee: ${tickSpacing}`);
      } catch (error) {
        console.error(`Error accessing Uniswap V3 Factory: ${error.message}`);
      }
      
      // Check position manager
      console.log("Checking position manager...");
      const positionManagerAddress = await koa.positionManager();
      console.log(`Position manager: ${positionManagerAddress}`);
      
      // Check swap router
      console.log("Checking swap router...");
      const swapRouterAddress = await koa.swapRouter();
      console.log(`Swap router: ${swapRouterAddress}`);
      
    } catch (error) {
      console.error(`Critical error during contract checks: ${error.message}`);
      rl.close();
      process.exit(1);
    }

    // Get token deployment parameters from user
    console.log("\n--- Token Deployment Wizard ---\n");
    const tokenName = await promptQuestion("Enter token name: ");
    console.log(`Token name entered: ${tokenName}`);
    
    const tokenSymbol = await promptQuestion("Enter token symbol: ");
    console.log(`Token symbol entered: ${tokenSymbol}`);
    
    // Get initial token supply
    let tokenSupply;
    try {
      const rawSupply = await promptQuestion("Enter token supply (default: 100000): ");
      tokenSupply = rawSupply.trim() === "" ? 
        ethers.utils.parseEther("100000") : 
        ethers.utils.parseEther(rawSupply);
      
      // Get the numeric value for calculations
      const tokenSupplyNumber = parseFloat(ethers.utils.formatEther(tokenSupply));
      console.log(`Token supply: ${tokenSupplyNumber.toLocaleString()}`);
    } catch (error) {
      console.error(`Error processing token supply: ${error.message}`);
      tokenSupply = ethers.utils.parseEther("100000");
      console.log(`Using default token supply: 100,000`);
    }
    
    // Set fixed recipient address for 1% token allocation
    const recipientWallet = "0xc5C216E6E60ccE2d189Bcce5f6ebFFDE1e8ce926";
    console.log(`Recipient wallet for 1% allocation: ${recipientWallet}`);
    
    // Get the user's wallet address for collecting LP fees
    let feeClaimerAddress;
    let isValidAddress = false;
    
    while (!isValidAddress) {
      const feeClaimerWallet = await promptQuestion("Enter your wallet address for collecting LP fees (default is deployer): ");
      
      // Empty input - use deployer address
      if (feeClaimerWallet.trim() === "") {
        feeClaimerAddress = signerAddress;
        isValidAddress = true;
        console.log(`Using deployer address for fee collection: ${signerAddress}`);
      } 
      // Validate the address format
      else if (!ethers.utils.isAddress(feeClaimerWallet)) {
        console.log("Invalid wallet address format. Press Enter to try again...");
        await promptQuestion("Invalid wallet address format. Press Enter to try again...");
      } 
      // Valid address
      else {
        feeClaimerAddress = feeClaimerWallet;
        isValidAddress = true;
        console.log(`Using provided address for fee collection: ${feeClaimerAddress}`);
      }
    }
    
    // Calculate 1% for the recipient wallet and 99% for LP
    const onePercentAmount = tokenSupply.mul(1).div(100);
    const lpAmount = tokenSupply.sub(onePercentAmount);
    
    const onePercentFormatted = parseFloat(ethers.utils.formatEther(onePercentAmount));
    const lpAmountFormatted = parseFloat(ethers.utils.formatEther(lpAmount));
    
    console.log(`1% allocation: ${onePercentFormatted.toLocaleString()} tokens`);
    console.log(`99% for LP: ${lpAmountFormatted.toLocaleString()} tokens`);
    
    // Use lpAmount for market cap calculations
    const effectiveSupplyForMarketCap = lpAmountFormatted;
    
    // Get fee tier - restricted to 1% (10000) only
    let feeTier = 10000; // Force 1% fee tier
    console.log(`Using fee tier: 1% (${feeTier})`);
    
    // Verify tick spacing for 1% fee tier
    let tickSpacing;
    try {
      const uniswapFactoryAddress = await koa.uniswapV3Factory();
      const uniswapFactory = await ethers.getContractAt("IUniswapV3Factory", uniswapFactoryAddress);
      tickSpacing = await uniswapFactory.feeAmountTickSpacing(feeTier);
      console.log(`Tick spacing for 1% fee: ${tickSpacing}`);
    } catch (error) {
      // Set default tick spacing for 1% fee tier
      tickSpacing = 200; // Default for 1% fee tier
      console.log(`Using default tick spacing: ${tickSpacing}`);
    }

    // Fetch current ETH price
    let ethPriceUSD;
    try {
      ethPriceUSD = await fetchEthPrice();
    } catch (error) {
      console.error(`Error fetching ETH price: ${error.message}`);
      const manualPrice = await promptQuestion("Enter ETH price in USD manually: ");
      ethPriceUSD = parseFloat(manualPrice);
      if (isNaN(ethPriceUSD) || ethPriceUSD <= 0) {
        ethPriceUSD = 3000;
        console.log(`Using default ETH price: $${ethPriceUSD}`);
      }
    }
    
    // Fixed target market cap of $14,000
    const targetMarketCapUSD = 14000;
    console.log(`Target market cap: $${targetMarketCapUSD.toLocaleString()}`);
    
    // Calculate the initial tick based on the target market cap
    // Use the LP amount (99%) for market cap calculations
    const tickResult = calculateTickForMarketCap(targetMarketCapUSD, effectiveSupplyForMarketCap, ethPriceUSD, tickSpacing);
    
    // Always use the calculated tick, no confirmation needed
    const initialTick = tickResult.validTick;
    console.log(`Using initial tick: ${initialTick}`);
    console.log(`Calculated token price: $${tickResult.actualPriceUSD.toFixed(12)}`);
    console.log(`Expected market cap: $${tickResult.actualMarketCapUSD.toLocaleString()}`);
    
    // Step 1: Generate salt using the contract's generateSalt function
    let saltResult;
    let generatedSalt;
    let predictedAddress;
    
    try {
      console.log("Generating salt for token deployment...");
      // Call the contract's generateSalt function to get a salt that produces a token address < WETH
      saltResult = await koa.generateSalt(
        signerAddress,
        tokenName,
        tokenSymbol,
        tokenSupply
      );
      
      generatedSalt = saltResult[0];
      predictedAddress = saltResult[1];
      
      console.log(`Generated salt: ${generatedSalt}`);
      console.log(`Predicted token address: ${predictedAddress}`);
      
      // Verify that the predicted token address is less than WETH address
      const wethAddress = await koa.weth();
      
      // Check if token already exists
      const codeSize = await ethers.provider.getCode(predictedAddress);
      if (codeSize !== "0x") {
        console.error(`Token already exists at the predicted address. Please try a different name/symbol.`);
        rl.close();
        process.exit(1);
      }
    } catch (error) {
      console.error(`Error generating salt: ${error.message}`);
      rl.close();
      process.exit(1);
    }

    // Step 2: Deploy the token
    // Hardcoded deployment fee of 0.0005 ETH
    const deploymentFee = ethers.utils.parseEther("0.0005");
    console.log(`Deployment fee: ${ethers.utils.formatEther(deploymentFee)} ETH`);
    
    // Always verify automatically
    const autoVerify = true;
    
    // Final confirmation
    const proceed = await promptQuestion("\nReady to deploy token with these parameters? (y/n): ");
    if (proceed.toLowerCase() !== 'y') {
      console.log("Deployment cancelled by user.");
      rl.close();
      process.exit(0);
    }
    
    try {
      console.log("Preparing for token deployment...");
      
      // FIXED: Updated parameters to match the actual contract function
      const params = [
        tokenName,               // _name
        tokenSymbol,             // _symbol
        tokenSupply,             // _supply
        initialTick,             // _initialTick
        feeTier,                 // _fee
        generatedSalt,           // _salt
        signerAddress,           // _deployer (should be signer address, not fee collector)
        recipientWallet,         // _recipient
        onePercentAmount         // _recipientAmount
      ];

      // Try to estimate gas first
      try {
        console.log("Estimating gas for deployment...");
        const estimatedGas = await koa.deployToken.estimateGas(
          ...params,
          { value: deploymentFee }
        );
        console.log(`Estimated gas: ${estimatedGas.toString()}`);
      } catch (estimateError) {
        console.error(`Gas estimation failed: ${estimateError.message}`);
        // Try to get more details about the error
        try {
          console.log("Getting more details about the gas estimation error...");
          const encodeFunctionData = koa.interface.encodeFunctionData("deployToken", params);
          
          // Create transaction object
          const tx = {
            to: koaAddress,
            from: signerAddress,
            data: encodeFunctionData,
            value: deploymentFee
          };
          
          try {
            // Try simulating call
            await ethers.provider.call(tx);
          } catch (callError) {
            console.error(`Call simulation failed: ${callError.message}`);
            // Try to extract reason from error message
            if (callError.message) {
              // Try to find revert reason
              const revertReasonMatch = callError.message.match(/reverted with reason string '([^']+)'/);
              if (revertReasonMatch) {
                console.error(`Revert reason: ${revertReasonMatch[1]}`);
              }
              
              // Try to find custom error
              const customErrorMatch = callError.message.match(/reverted with custom error '([^']+)'/);
              if (customErrorMatch) {
                console.error(`Custom error: ${customErrorMatch[1]}`);
              }
              
              // Try to find selector
              const selectorMatch = callError.message.match(/reverted with an unrecognized custom error \(code=0x([0-9a-f]+)/);
              if (selectorMatch) {
                console.error(`Unknown selector: 0x${selectorMatch[1]}`);
              }
            }
          }
        } catch (debugError) {
          console.error(`Error during debugging: ${debugError.message}`);
        }
        
        const continueAnyway = await promptQuestion("\nDo you want to continue with deployment despite gas estimation failure? (y/n): ");
        if (continueAnyway.toLowerCase() !== 'y') {
          console.log("Deployment cancelled by user.");
          rl.close();
          process.exit(0);
        }
      }
      
      console.log("Sending deployment transaction...");
      const tx = await koa.deployToken(
        ...params,
        { 
          value: deploymentFee,
          gasLimit: 8000000 // High gas limit for testing
        }
      );
      
      console.log(`Transaction sent: ${tx.hash}`);
      console.log("Waiting for transaction confirmation...");
      
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
      
      // Parse the TokenCreated event - FIXED for actual contract event structure
      console.log("Parsing deployment events...");
      const tokenCreatedEvents = receipt.logs
        .filter(log => {
          try {
            const parsed = koa.interface.parseLog(log);
            return parsed && parsed.name === "TokenCreated";
          } catch (e) {
            return false;
          }
        })
        .map(log => koa.interface.parseLog(log));

      if (tokenCreatedEvents.length > 0) {
        const event = tokenCreatedEvents[0];
        console.log(`Token created event found!`);
        
        // Save the token info - FIXED to match actual event structure
        const tokenData = {
          tokenAddress: event.args.tokenAddress,
          lpNftId: event.args.lpNftId.toString(),
          name: event.args.name,
          symbol: event.args.symbol,
          totalSupply: event.args.supply.toString(),
          lpSupply: lpAmount.toString(),
          recipientWallet: event.args.recipient,
          recipientAmount: event.args.recipientAmount.toString(),
          deployer: event.args.deployer,
          initialTick: initialTick,
          targetMarketCap: targetMarketCapUSD,
          ethPriceAtDeployment: ethPriceUSD,
          timestamp: new Date().toISOString()
        };
        
        const tokensDir = path.join(__dirname, "..", "deployments", "tokens");
        if (!fs.existsSync(tokensDir)) {
          fs.mkdirSync(tokensDir, { recursive: true });
        }
        
        const tokenFilePath = path.join(tokensDir, `${tokenSymbol}-${network}.json`);
        fs.writeFileSync(
          tokenFilePath,
          JSON.stringify(tokenData, null, 2)
        );
        console.log(`Token data saved to ${tokenFilePath}`);
        
        // For Base network
        let explorerUrl;
        if (network === 'base' || network === 'baseSepolia') {
          explorerUrl = network === 'base' 
            ? `https://basescan.org/address/${event.args.tokenAddress}` 
            : `https://sepolia.basescan.org/address/${event.args.tokenAddress}`;
        } else if (network === 'ethereum') {
          explorerUrl = `https://etherscan.io/address/${event.args.tokenAddress}`;
        } else {
          explorerUrl = `https://explorer.${network}.network/address/${event.args.tokenAddress}`;
        }
        
        console.log(`\nToken deployed! 🎉`);
        console.log(`Token Address: ${event.args.tokenAddress}`);
        console.log(`Explorer URL: ${explorerUrl}`);
        console.log(`LP NFT ID: ${event.args.lpNftId.toString()}`);
        
        // Verify the token contract directly in this script
        if (autoVerify) {
          console.log("\nVerifying contract on Basescan...");
          await verifyTokenContract(
            network, 
            event.args.tokenAddress, 
            event.args.name, 
            event.args.symbol, 
            event.args.supply
          );
        }
      } else {
        console.error("No TokenCreated event found in transaction logs");
      }
    } catch (error) {
      console.error(`Deployment error: ${error.message}`);
    }
    
  } catch (error) {
    console.error(`Unhandled error in main function: ${error.message}`);
    console.error(error.stack);
  }

  rl.close();
}

// Call main function with proper error handling
console.log("Calling main function...");
main()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed with error:", error);
    process.exit(1);
  });