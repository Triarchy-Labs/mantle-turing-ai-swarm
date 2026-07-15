// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {ERC8004Registry} from "../src/ERC8004Registry.sol";
import {DecisionAttestor} from "../src/DecisionAttestor.sol";

contract DecisionAttestorTest is Test {
    ERC8004Registry registry;
    DecisionAttestor attestor;

    address agent = address(0xA1);
    address settler = address(0x5E7);
    address stranger = address(0xDEAD);

    bytes32 constant MNT_USDT = keccak256("MNT/USDT");

    function setUp() public {
        registry = new ERC8004Registry();
        registry.registerAgent(agent); // agentId 1, controller = agent
        attestor = new DecisionAttestor(address(registry));
        attestor.setSettler(settler);
    }

    function _record(int256 score, DecisionAttestor.Action action, bytes32 inputsHash) internal returns (uint256) {
        vm.prank(agent);
        return attestor.recordVerdict(1, MNT_USDT, score, action, inputsHash);
    }

    function test_RecordVerdict() public {
        uint256 id = _record(15000, DecisionAttestor.Action.BUY, keccak256("inputs-0"));
        assertEq(id, 0);
        assertEq(attestor.verdictCount(), 1);
        assertEq(attestor.agentVerdictCount(1), 1);
    }

    function test_OnlyControllerCanRecord() public {
        vm.prank(stranger);
        vm.expectRevert("not agent controller");
        attestor.recordVerdict(1, MNT_USDT, 15000, DecisionAttestor.Action.BUY, keccak256("x"));
    }

    /// The chain hash of verdict N must equal keccak(prev tip, fields) — proving order integrity.
    function test_HashChainIntegrity() public {
        uint256 id0 = _record(15000, DecisionAttestor.Action.BUY, keccak256("i0"));
        uint256 id1 = _record(-2000, DecisionAttestor.Action.REJECT, keccak256("i1"));

        // verdict 0: prev = 0x0
        bytes32 recomputed0 = attestor.recomputeChainHash(id0, bytes32(0));
        (, , , , , , bytes32 stored0, , ) = attestor.verdicts(id0);
        assertEq(recomputed0, stored0, "genesis chain hash mismatch");

        // verdict 1: prev = verdict 0's chain hash
        bytes32 recomputed1 = attestor.recomputeChainHash(id1, stored0);
        (, , , , , , bytes32 stored1, , ) = attestor.verdicts(id1);
        assertEq(recomputed1, stored1, "chain link broken");

        // tip must be the latest
        assertEq(attestor.agentTipHash(1), stored1);
    }

    function test_VerifyInputs() public {
        bytes memory canonical = abi.encode("price_trend", int256(3), "funding", int256(-1), "oi", uint256(42));
        uint256 id = _record(9000, DecisionAttestor.Action.HOLD, keccak256(canonical));

        assertTrue(attestor.verifyInputs(id, canonical), "correct inputs should verify");
        assertFalse(attestor.verifyInputs(id, abi.encode("tampered")), "tampered inputs must not verify");
    }

    function test_SettleMintsReputationFromPnl() public {
        uint256 id = _record(15000, DecisionAttestor.Action.BUY, keccak256("i0"));

        vm.prank(settler);
        attestor.settleOutcome(id, 350); // +3.5% realized
        assertEq(attestor.agentReputation(1), 350);

        (, , , , , , , bool settled, int256 pnl) = attestor.verdicts(id);
        assertTrue(settled);
        assertEq(pnl, 350);
    }

    function test_LossMintsNoReputation() public {
        uint256 id = _record(15000, DecisionAttestor.Action.BUY, keccak256("i0"));
        vm.prank(settler);
        attestor.settleOutcome(id, -500);
        assertEq(attestor.agentReputation(1), 0, "losses must not add reputation");
    }

    function test_SelfSettlementBlocked() public {
        uint256 id = _record(15000, DecisionAttestor.Action.BUY, keccak256("i0"));

        // point settler at the agent itself, then try to self-grade
        attestor.setSettler(agent);
        vm.prank(agent);
        vm.expectRevert("self-settlement blocked");
        attestor.settleOutcome(id, 999);
    }

    function test_OnlySettlerCanSettle() public {
        uint256 id = _record(15000, DecisionAttestor.Action.BUY, keccak256("i0"));
        vm.prank(stranger);
        vm.expectRevert("not settler");
        attestor.settleOutcome(id, 100);
    }

    function test_NoDoubleSettle() public {
        uint256 id = _record(15000, DecisionAttestor.Action.BUY, keccak256("i0"));
        vm.startPrank(settler);
        attestor.settleOutcome(id, 100);
        vm.expectRevert("already settled");
        attestor.settleOutcome(id, 100);
        vm.stopPrank();
    }
}
