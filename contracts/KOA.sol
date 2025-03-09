// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface KOA {
    function owner() external view returns (address);
    function weth() external view returns (address);
    function taxCollector() external view returns (address);
    function protocolCut() external view returns (uint8);
    function liquidityLocker() external view returns (address);
    function uniswapV3Factory() external view returns (address);
    function positionManager() external view returns (address);
    function swapRouter() external view returns (address);
    function generateSalt(
        address deployer,
        string memory name,
        string memory symbol,
        uint256 supply
    ) external view returns (bytes32 salt, address predictedAddress);

    // FIXED function signature to match the actual contract
    function deployToken(
        string calldata _name,
        string calldata _symbol,
        uint256 _supply,
        int24 _initialTick,
        uint24 _fee,
        bytes32 _salt,
        address _deployer,
        address _recipient,
        uint256 _recipientAmount
    ) external payable returns (address tokenAddress, uint256 positionId);
    
    // FIXED event signature to match actual contract
    event TokenCreated(
        address tokenAddress,
        uint256 lpNftId,
        address deployer,
        string name,
        string symbol,
        uint256 supply,
        address recipient,
        uint256 recipientAmount
    );
}