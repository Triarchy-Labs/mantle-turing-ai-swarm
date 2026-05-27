// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ERC8004Registry.sol";

/**
 * @title X402 Flash Liquidator
 * @dev The core execution engine for the X402 Swarm. Receives AI inference data as calldata.
 */
contract X402FlashLiquidator {
    ERC8004Registry public registry;

    event LiquidationExecuted(
        uint256 indexed agentId, 
        address indexed target, 
        uint256 aiSentimentScore, 
        bool success
    );

    constructor(address _registryAddress) {
        registry = ERC8004Registry(_registryAddress);
    }

    /**
     * @notice Executes a flash loan liquidation triggered by an autonomous AI agent.
     * @param target The underwater account to liquidate.
     * @param aiSentimentScore The global sentiment multiplier passed by the L0 IPC Swarm.
     * @param agentId The ERC-8004 identity of the executing agent.
     */
    function executeAILiquidation(address target, uint256 aiSentimentScore, uint256 agentId) external {
        require(registry.agentControllers(agentId) == msg.sender, "Unauthorized: Not the registered agent controller");

        // MVP Logic: We simulate the flash loan and Agni Finance interaction.
        // In reality, this would call out to lending pools.
        
        bool executionSuccess = true;

        if (executionSuccess) {
            // Reward the agent's on-chain reputation for a successful inference & execution.
            registry.addReputation(agentId, 100);
        }

        emit LiquidationExecuted(agentId, target, aiSentimentScore, executionSuccess);
    }
}
