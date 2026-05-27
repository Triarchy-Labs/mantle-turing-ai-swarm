// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {ERC8004Registry} from "../src/ERC8004Registry.sol";
import {X402FlashLiquidator} from "../src/X402FlashLiquidator.sol";

contract X402Test is Test {
    ERC8004Registry registry;
    X402FlashLiquidator liquidator;
    address agent = address(0xA1);
    address victim = address(0xB2);

    function setUp() public {
        registry = new ERC8004Registry();
        liquidator = new X402FlashLiquidator(address(registry));
    }

    function test_RegisterAgent() public {
        uint256 id = registry.registerAgent(agent);
        assertEq(id, 1);
        assertEq(registry.agentControllers(1), agent);
        assertEq(registry.ownerOf(1), agent);
    }

    function test_ExecuteAILiquidation() public {
        uint256 id = registry.registerAgent(agent);

        vm.prank(agent);
        liquidator.executeAILiquidation(victim, 105, id);

        // Verify reputation was incremented
        assertEq(registry.agentReputation(id), 100);
    }

    function test_RevertUnauthorizedAgent() public {
        uint256 id = registry.registerAgent(agent);

        // Try to execute from wrong address
        vm.prank(address(0xDEAD));
        vm.expectRevert("Unauthorized: Not the registered agent controller");
        liquidator.executeAILiquidation(victim, 105, id);
    }

    function test_AddReputation() public {
        registry.registerAgent(agent);
        registry.addReputation(1, 500);
        assertEq(registry.agentReputation(1), 500);

        registry.addReputation(1, 200);
        assertEq(registry.agentReputation(1), 700);
    }

    function test_RevertReputationNonExistent() public {
        vm.expectRevert("Agent does not exist");
        registry.addReputation(999, 100);
    }
}
