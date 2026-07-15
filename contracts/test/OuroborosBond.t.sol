// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ERC8004Registry} from "../src/ERC8004Registry.sol";
import {DecisionVerifier} from "../src/DecisionVerifier.sol";
import {OuroborosBond} from "../src/OuroborosBond.sol";

contract MockOracle {
    uint256 public risk;
    function set(uint256 r) external { risk = r; }
    function riskOf(bytes32) external view returns (uint256) { return risk; }
}

contract OuroborosBondTest is Test {
    OuroborosBond bond;
    address operator = address(0xAB01);
    address challenger = address(0xC0FFEE);
    address treasury = address(0x7EA5);
    address verifier = address(0xBEEF); // mock verifier for unit tests

    function setUp() public {
        bond = new OuroborosBond(treasury);
        bond.setVerifier(verifier);
        vm.deal(operator, 10 ether);
    }

    function test_StakeAndWithdraw() public {
        vm.prank(operator);
        bond.stake{value: 2 ether}(1);
        assertEq(bond.bondOf(1), 2 ether);
        assertEq(bond.stakerOf(1), operator);

        vm.prank(operator);
        bond.withdraw(1, 1 ether);
        assertEq(bond.bondOf(1), 1 ether);
        assertEq(operator.balance, 9 ether);
    }

    function test_OnlyStakerWithdraws() public {
        vm.prank(operator);
        bond.stake{value: 1 ether}(1);
        vm.prank(challenger);
        vm.expectRevert("not staker");
        bond.withdraw(1, 1 ether);
    }

    function test_OnlyVerifierSlashes() public {
        vm.prank(operator);
        bond.stake{value: 1 ether}(1);
        vm.prank(challenger);
        vm.expectRevert("not verifier");
        bond.onViolation(1, challenger);
    }

    function test_SlashSplitsRewardAndTreasury() public {
        vm.prank(operator);
        bond.stake{value: 1 ether}(1);

        vm.prank(verifier);
        bond.onViolation(1, challenger);

        // slash 50% = 0.5; challenger 50% of slash = 0.25; treasury 0.25; bond left 0.5
        assertEq(bond.bondOf(1), 0.5 ether);
        assertEq(challenger.balance, 0.25 ether);
        assertEq(treasury.balance, 0.25 ether);
    }

    function test_ZeroBondNoOp() public {
        vm.prank(verifier);
        bond.onViolation(1, challenger); // no stake -> no revert, no payout
        assertEq(challenger.balance, 0);
    }
}

/// End-to-end: a permissionless fraud proof in DecisionVerifier actually slashes the bond.
contract OuroborosBondIntegrationTest is Test {
    ERC8004Registry registry;
    DecisionVerifier verifier;
    OuroborosBond bond;
    MockOracle oracle;

    uint256 agentPk = 0xA11CE;
    address agent;
    address operator = address(0xAB01);
    address challenger = address(0xC0FFEE);
    address treasury = address(0x7EA5);
    bytes32 constant MARKET = keccak256("MNT/USDT");

    function setUp() public {
        agent = vm.addr(agentPk);
        registry = new ERC8004Registry();
        registry.registerAgent(agent);
        verifier = new DecisionVerifier(address(registry));
        oracle = new MockOracle();
        bond = new OuroborosBond(treasury);

        verifier.setRiskOracle(address(oracle));
        verifier.setSlasher(address(bond));
        bond.setVerifier(address(verifier));

        vm.deal(operator, 10 ether);
        vm.prank(operator);
        bond.stake{value: 1 ether}(1);
    }

    function test_FraudProofSlashesBond() public {
        oracle.set(90); // true risk high
        DecisionVerifier.SignedVerdict memory v = DecisionVerifier.SignedVerdict({
            agentId: 1, marketHash: MARKET, score: 15000, action: 1,
            inputsHash: keccak256("i"), riskScore: 10, maxRisk: 50, // agent signed only 10
            expiry: uint64(block.timestamp + 1 hours), nonce: 42
        });
        bytes32 digest = verifier.hashVerdict(v);
        (uint8 sv, bytes32 r, bytes32 s) = vm.sign(agentPk, digest);
        bytes memory sig = abi.encodePacked(r, s, sv);

        vm.prank(challenger);
        verifier.challengeVerdict(v, sig);

        // bond slashed 50%, challenger rewarded, dishonest nonce burned
        assertEq(bond.bondOf(1), 0.5 ether);
        assertEq(challenger.balance, 0.25 ether);
        assertEq(treasury.balance, 0.25 ether);
        assertTrue(verifier.usedNonce(1, 42));
    }
}
