// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {ERC8004Registry} from "../src/ERC8004Registry.sol";
import {TuringFlashLiquidator} from "../src/TuringFlashLiquidator.sol";

contract DeployTuring is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy ERC-8004 Registry
        ERC8004Registry registry = new ERC8004Registry();
        console.log("ERC8004Registry deployed at:", address(registry));

        // 2. Deploy TuringFlashLiquidator with registry address
        TuringFlashLiquidator liquidator = new TuringFlashLiquidator(address(registry));
        console.log("TuringFlashLiquidator deployed at:", address(liquidator));

        // 3. Register the deployer as Agent #1
        uint256 agentId = registry.registerAgent(msg.sender);
        console.log("Agent registered with ID:", agentId);

        vm.stopBroadcast();
    }
}
