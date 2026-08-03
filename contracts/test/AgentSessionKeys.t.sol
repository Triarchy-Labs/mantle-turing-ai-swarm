// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ERC8004Registry} from "../src/ERC8004Registry.sol";
import {AgentSessionKeys} from "../src/AgentSessionKeys.sol";

contract MockVenue {
    uint256 public calls;
    function trade(uint256 amount) external returns (uint256) { calls++; return amount; }
}

contract AgentSessionKeysTest is Test {
    ERC8004Registry registry;
    AgentSessionKeys keys;
    MockVenue venue;

    address agent = address(0xA1);
    address user = address(0x0FEE);
    address stranger = address(0xDEAD);

    bytes32 constant MNT_USDT = keccak256("MNT/USDT");
    bytes32 constant BTC_USDT = keccak256("BTC/USDT");
    bytes32 constant VERDICT = keccak256("verdict-1");

    function setUp() public {
        registry = new ERC8004Registry();
        registry.registerAgent(agent); // agentId 1
        keys = new AgentSessionKeys(address(registry));
        venue = new MockVenue();
        vm.warp(1_800_000_000); // deterministic day bucket
    }

    function _grant(AgentSessionKeys.Mode mode) internal returns (uint256 id) {
        bytes32[] memory markets = new bytes32[](1);
        markets[0] = MNT_USDT;
        vm.prank(user);
        id = keys.grantSession(1, 100 ether, 250 ether, uint64(block.timestamp + 30 days), mode, markets);
    }

    function _propose(uint256 sid, uint256 notional) internal returns (uint256 pid) {
        vm.prank(agent);
        pid = keys.propose(sid, VERDICT, MNT_USDT, notional);
    }

    function _exec(uint256 pid) internal {
        vm.prank(agent);
        keys.execute(pid, address(venue), abi.encodeCall(MockVenue.trade, (1)));
    }

    // ── Autonomous mode ──

    function test_AutonomousExecutesWithinBounds() public {
        uint256 sid = _grant(AgentSessionKeys.Mode.AUTONOMOUS);
        uint256 pid = _propose(sid, 50 ether);
        _exec(pid);
        assertEq(venue.calls(), 1);
        assertEq(keys.remainingToday(sid), 200 ether);
    }

    function test_RevertOverPerTradeCap() public {
        uint256 sid = _grant(AgentSessionKeys.Mode.AUTONOMOUS);
        uint256 pid = _propose(sid, 150 ether); // cap is 100
        vm.prank(agent);
        vm.expectRevert("over per-trade cap");
        keys.execute(pid, address(venue), abi.encodeCall(MockVenue.trade, (1)));
    }

    function test_RevertOverDailyCap() public {
        uint256 sid = _grant(AgentSessionKeys.Mode.AUTONOMOUS);
        _exec(_propose(sid, 100 ether));
        _exec(_propose(sid, 100 ether)); // 200 of 250
        uint256 pid = _propose(sid, 100 ether); // would be 300
        vm.prank(agent);
        vm.expectRevert("over daily cap");
        keys.execute(pid, address(venue), abi.encodeCall(MockVenue.trade, (1)));
    }

    function test_DailyCapResetsNextDay() public {
        uint256 sid = _grant(AgentSessionKeys.Mode.AUTONOMOUS);
        _exec(_propose(sid, 100 ether));
        _exec(_propose(sid, 100 ether));
        assertEq(keys.remainingToday(sid), 50 ether);

        vm.warp(block.timestamp + 1 days);
        assertEq(keys.remainingToday(sid), 250 ether, "daily budget should reset");
        _exec(_propose(sid, 100 ether));
        assertEq(venue.calls(), 3);
    }

    // ── Co-pilot mode ──

    function test_CopilotBlocksUntilApproved() public {
        uint256 sid = _grant(AgentSessionKeys.Mode.COPILOT);
        uint256 pid = _propose(sid, 50 ether);

        vm.prank(agent);
        vm.expectRevert("awaiting approval");
        keys.execute(pid, address(venue), abi.encodeCall(MockVenue.trade, (1)));

        vm.prank(user);
        keys.approve(pid);
        _exec(pid);
        assertEq(venue.calls(), 1);
    }

    function test_OnlyPrincipalApproves() public {
        uint256 sid = _grant(AgentSessionKeys.Mode.COPILOT);
        uint256 pid = _propose(sid, 50 ether);
        vm.prank(stranger);
        vm.expectRevert("not principal");
        keys.approve(pid);
    }

    /// Approval is bound to one proposal carrying one verdict hash: approving trade A never
    /// authorises trade B. This is the property no finalist had.
    function test_ApprovalIsBoundToOneVerdict() public {
        uint256 sid = _grant(AgentSessionKeys.Mode.COPILOT);
        uint256 approvedPid = _propose(sid, 50 ether);
        vm.prank(user);
        keys.approve(approvedPid);

        // agent tries to slip in a different decision
        vm.prank(agent);
        uint256 otherPid = keys.propose(sid, keccak256("verdict-2"), MNT_USDT, 90 ether);
        vm.prank(agent);
        vm.expectRevert("awaiting approval");
        keys.execute(otherPid, address(venue), abi.encodeCall(MockVenue.trade, (1)));
    }

    function test_ModeFlipsWithoutRegranting() public {
        uint256 sid = _grant(AgentSessionKeys.Mode.COPILOT);
        vm.prank(user);
        keys.setMode(sid, AgentSessionKeys.Mode.AUTONOMOUS);
        _exec(_propose(sid, 50 ether)); // no approval needed now
        assertEq(venue.calls(), 1);
    }

    // ── Guards ──

    function test_RevocationIsInstant() public {
        uint256 sid = _grant(AgentSessionKeys.Mode.AUTONOMOUS);
        uint256 pid = _propose(sid, 50 ether);
        vm.prank(user);
        keys.revokeSession(sid);

        vm.prank(agent);
        vm.expectRevert("revoked");
        keys.execute(pid, address(venue), abi.encodeCall(MockVenue.trade, (1)));
    }

    function test_ExpiredMandateBlocks() public {
        uint256 sid = _grant(AgentSessionKeys.Mode.AUTONOMOUS);
        uint256 pid = _propose(sid, 50 ether);
        vm.warp(block.timestamp + 31 days);
        vm.prank(agent);
        vm.expectRevert("expired");
        keys.execute(pid, address(venue), abi.encodeCall(MockVenue.trade, (1)));
    }

    function test_MarketNotAllowed() public {
        uint256 sid = _grant(AgentSessionKeys.Mode.AUTONOMOUS);
        vm.prank(agent);
        vm.expectRevert("market not allowed");
        keys.propose(sid, VERDICT, BTC_USDT, 10 ether);
    }

    function test_OnlyAgentProposes() public {
        uint256 sid = _grant(AgentSessionKeys.Mode.AUTONOMOUS);
        vm.prank(stranger);
        vm.expectRevert("not agent");
        keys.propose(sid, VERDICT, MNT_USDT, 10 ether);
    }

    function test_NoDoubleExecute() public {
        uint256 sid = _grant(AgentSessionKeys.Mode.AUTONOMOUS);
        uint256 pid = _propose(sid, 50 ether);
        _exec(pid);
        vm.prank(agent);
        vm.expectRevert("already executed");
        keys.execute(pid, address(venue), abi.encodeCall(MockVenue.trade, (1)));
    }

    function test_OnlyPrincipalRevokes() public {
        uint256 sid = _grant(AgentSessionKeys.Mode.AUTONOMOUS);
        vm.prank(stranger);
        vm.expectRevert("not principal");
        keys.revokeSession(sid);
    }
}
