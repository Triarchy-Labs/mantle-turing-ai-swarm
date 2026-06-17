// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {ERC8004Registry} from "../src/ERC8004Registry.sol";
import {TuringFlashLiquidator} from "../src/TuringFlashLiquidator.sol";

contract TuringTest is Test {
    ERC8004Registry registry;
    TuringFlashLiquidator liquidator;
    address agent = address(0xA1);
    address victim = address(0xB2);

    function setUp() public {
        registry = new ERC8004Registry();
        liquidator = new TuringFlashLiquidator(address(registry));
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

        // Verify reputation was NOT incremented by the liquidator (it's now done by L0 backend)
        assertEq(registry.agentReputation(id), 0);
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

    function test_RejectUnauthorizedReputation() public {
        uint256 id = registry.registerAgent(agent);
        
        vm.prank(address(0xDEAD));
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", address(0xDEAD)));
        registry.addReputation(id, 100);
    }
}
