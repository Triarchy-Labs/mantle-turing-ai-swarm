// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {ERC8004Registry} from "../src/ERC8004Registry.sol";
import {X402FlashLiquidator} from "../src/X402FlashLiquidator.sol";

contract DeployX402 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy ERC-8004 Registry
        ERC8004Registry registry = new ERC8004Registry();
        console.log("ERC8004Registry deployed at:", address(registry));

        // 2. Deploy X402FlashLiquidator with registry address
        X402FlashLiquidator liquidator = new X402FlashLiquidator(address(registry));
        console.log("X402FlashLiquidator deployed at:", address(liquidator));

        // 3. Register the deployer as Agent #1
        uint256 agentId = registry.registerAgent(msg.sender);
        console.log("Agent registered with ID:", agentId);

        vm.stopBroadcast();
    }
}
