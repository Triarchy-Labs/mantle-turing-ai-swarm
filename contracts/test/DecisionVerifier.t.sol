// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ERC8004Registry} from "../src/ERC8004Registry.sol";
import {DecisionVerifier, IRiskOracle} from "../src/DecisionVerifier.sol";

contract MockRiskOracle is IRiskOracle {
    uint256 public risk;
    function set(uint256 r) external { risk = r; }
    function riskOf(bytes32) external view returns (uint256) { return risk; }
}

contract MockTarget {
    bool public called;
    function doSwap(uint256 x) external returns (uint256) { called = true; return x * 2; }
}

contract DecisionVerifierTest is Test {
    ERC8004Registry registry;
    DecisionVerifier verifier;
    MockRiskOracle oracle;
    MockTarget target;

    uint256 agentPk = 0xA11CE;
    address agent;
    address stranger = address(0xDEAD);

    bytes32 constant MARKET = keccak256("MNT/USDT");

    function setUp() public {
        agent = vm.addr(agentPk);
        registry = new ERC8004Registry();
        registry.registerAgent(agent); // agentId 1, controller = agent
        verifier = new DecisionVerifier(address(registry));
        oracle = new MockRiskOracle();
        target = new MockTarget();
    }

    function _verdict(uint256 risk, uint256 maxRisk, uint64 expiry, uint256 nonce)
        internal pure returns (DecisionVerifier.SignedVerdict memory v)
    {
        v = DecisionVerifier.SignedVerdict({
            agentId: 1,
            marketHash: MARKET,
            score: 15000,
            action: 1, // BUY
            inputsHash: keccak256("inputs"),
            riskScore: risk,
            maxRisk: maxRisk,
            expiry: expiry,
            nonce: nonce
        });
    }

    function _sign(uint256 pk, DecisionVerifier.SignedVerdict memory v) internal view returns (bytes memory) {
        bytes32 digest = verifier.hashVerdict(v);
        (uint8 s_v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, s_v);
    }

    function _swap() internal pure returns (bytes memory) {
        return abi.encodeCall(MockTarget.doSwap, (21));
    }

    // ── Stax core: executes only when signed + within risk + not expired ──

    function test_ExecutesWhenVerified() public {
        DecisionVerifier.SignedVerdict memory v = _verdict(30, 50, uint64(block.timestamp + 1 hours), 1);
        bytes memory sig = _sign(agentPk, v);

        verifier.executeIfVerified(v, sig, address(target), _swap());

        assertTrue(target.called(), "target should have been called");
        assertTrue(verifier.usedNonce(1, 1), "nonce should be burned");
    }

    function test_RevertBadSigner() public {
        DecisionVerifier.SignedVerdict memory v = _verdict(30, 50, uint64(block.timestamp + 1 hours), 1);
        bytes memory sig = _sign(0xB0B, v); // wrong key
        vm.expectRevert("bad signer");
        verifier.executeIfVerified(v, sig, address(target), _swap());
    }

    function test_RevertRiskExceedsTolerance() public {
        DecisionVerifier.SignedVerdict memory v = _verdict(60, 50, uint64(block.timestamp + 1 hours), 1);
        bytes memory sig = _sign(agentPk, v);
        vm.expectRevert("risk exceeds tolerance");
        verifier.executeIfVerified(v, sig, address(target), _swap());
    }

    function test_RevertExpired() public {
        vm.warp(1000);
        DecisionVerifier.SignedVerdict memory v = _verdict(30, 50, uint64(500), 1); // already past
        bytes memory sig = _sign(agentPk, v);
        vm.expectRevert("expired");
        verifier.executeIfVerified(v, sig, address(target), _swap());
    }

    function test_RevertReplay() public {
        DecisionVerifier.SignedVerdict memory v = _verdict(30, 50, uint64(block.timestamp + 1 hours), 1);
        bytes memory sig = _sign(agentPk, v);
        verifier.executeIfVerified(v, sig, address(target), _swap());
        vm.expectRevert("nonce used");
        verifier.executeIfVerified(v, sig, address(target), _swap());
    }

    // ── Argus: independent on-chain oracle re-check ──

    function test_OracleGateBlocksWhenOracleRiskHigh() public {
        verifier.setRiskOracle(address(oracle));
        oracle.set(80); // independent risk above tolerance
        DecisionVerifier.SignedVerdict memory v = _verdict(30, 50, uint64(block.timestamp + 1 hours), 1);
        bytes memory sig = _sign(agentPk, v);
        vm.expectRevert("oracle risk exceeds tolerance");
        verifier.executeIfVerified(v, sig, address(target), _swap());
    }

    function test_OracleGateAllowsWhenOracleOk() public {
        verifier.setRiskOracle(address(oracle));
        oracle.set(40); // within tolerance
        DecisionVerifier.SignedVerdict memory v = _verdict(30, 50, uint64(block.timestamp + 1 hours), 1);
        bytes memory sig = _sign(agentPk, v);
        verifier.executeIfVerified(v, sig, address(target), _swap());
        assertTrue(target.called());
    }

    // ── Ours: permissionless fraud proof / slash trigger ──

    function test_ChallengeSlashesUnderReportedRisk() public {
        verifier.setRiskOracle(address(oracle));
        oracle.set(90); // true risk is high...
        DecisionVerifier.SignedVerdict memory v = _verdict(10, 50, uint64(block.timestamp + 1 hours), 7); // ...but agent signed only 10
        bytes memory sig = _sign(agentPk, v);

        vm.prank(stranger); // anyone can challenge
        vm.expectEmit(true, true, false, true);
        emit DecisionVerifier.AgentViolation(1, MARKET, 90, 10, 7);
        verifier.challengeVerdict(v, sig);

        assertTrue(verifier.usedNonce(1, 7), "dishonest nonce must be burned");

        // and it can no longer be executed
        vm.expectRevert("nonce used");
        verifier.executeIfVerified(v, sig, address(target), _swap());
    }

    function test_ChallengeRevertsWhenNoViolation() public {
        verifier.setRiskOracle(address(oracle));
        oracle.set(20); // true risk below what agent signed -> honest
        DecisionVerifier.SignedVerdict memory v = _verdict(30, 50, uint64(block.timestamp + 1 hours), 1);
        bytes memory sig = _sign(agentPk, v);
        vm.expectRevert("no violation");
        verifier.challengeVerdict(v, sig);
    }

    function test_ChallengeRespectsSlack() public {
        verifier.setRiskOracle(address(oracle));
        verifier.setRiskSlack(15);
        oracle.set(40);
        DecisionVerifier.SignedVerdict memory v = _verdict(30, 50, uint64(block.timestamp + 1 hours), 1);
        bytes memory sig = _sign(agentPk, v);
        // 40 > 30 + 15 == 45 is false -> within slack -> no violation
        vm.expectRevert("no violation");
        verifier.challengeVerdict(v, sig);
    }
}
