// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {EIP712} from "openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

interface IAgentRegistry {
    function agentControllers(uint256 agentId) external view returns (address);
}

/// @notice Pluggable independent risk source. Lets the CONTRACT re-derive current risk for a
///         market itself (cf. Argus re-deriving from Pyth + pool) so a stale/forged signed
///         risk can never force a bad trade. `riskOf` returns risk on the same scale as maxRisk.
interface IRiskOracle {
    function riskOf(bytes32 marketHash) external view returns (uint256);
}

/**
 * @title DecisionVerifier
 * @notice The gate that makes "the chain won't let the swarm misbehave" literal: a trade
 *         executes ONLY if the agent's EIP-712-signed verdict verifies, its risk is within the
 *         user's tolerance, it has not expired, its nonce is unused, and — if a risk oracle is
 *         configured — an INDEPENDENT on-chain re-derivation of risk also agrees.
 *
 * @dev Synthesised from the Mantle Turing Test 2026 finalists and pushed further:
 *   - Stax (InferenceVerifier.verify): signer==agent, assessedRisk<=maxRisk, ts<=expiry.
 *       → kept verbatim, plus per-agent nonce replay protection.
 *   - Argus (ArgusExecutor): contract re-derives trigger metrics from an oracle so a
 *       compromised keeper cannot force execution.
 *       → kept as a pluggable IRiskOracle check inside the same gate.
 *   - OURS (no finalist had this): `challengeVerdict` — a PERMISSIONLESS fraud proof. Anyone
 *       can present a signed verdict and prove the oracle-derived risk exceeds the risk the
 *       agent signed (it under-reported) → emits AgentViolation (the $OUROBOROS slash trigger)
 *       and burns the nonce so the dishonest verdict can never be executed.
 */
contract DecisionVerifier is EIP712, Ownable {
    using ECDSA for bytes32;

    IAgentRegistry public immutable registry;
    IRiskOracle public riskOracle; // optional; when unset, the oracle re-check is skipped
    uint256 public riskSlack;      // tolerance (in risk units) for oracle noise on challenges

    bytes32 public constant SIGNED_VERDICT_TYPEHASH = keccak256(
        "SignedVerdict(uint256 agentId,bytes32 marketHash,int256 score,uint8 action,bytes32 inputsHash,uint256 riskScore,uint256 maxRisk,uint64 expiry,uint256 nonce)"
    );

    struct SignedVerdict {
        uint256 agentId;
        bytes32 marketHash;
        int256 score;       // deterministic judge score (informational)
        uint8 action;       // 0 HOLD 1 BUY 2 SELL 3 REJECT
        bytes32 inputsHash; // links to the attested inputs (recompute-verifiable)
        uint256 riskScore;  // the value bounded against maxRisk
        uint256 maxRisk;    // user risk tolerance
        uint64 expiry;
        uint256 nonce;
    }

    mapping(uint256 => mapping(uint256 => bool)) public usedNonce; // agentId => nonce => used

    event VerdictVerified(uint256 indexed agentId, bytes32 indexed marketHash, uint256 riskScore, uint8 action, uint256 nonce);
    event AgentViolation(uint256 indexed agentId, bytes32 indexed marketHash, uint256 oracleRisk, uint256 signedRisk, uint256 nonce);
    event RiskOracleUpdated(address indexed oracle);
    event RiskSlackUpdated(uint256 slack);

    constructor(address registry_) EIP712("OuroborosDecisionVerifier", "1") Ownable(msg.sender) {
        require(registry_ != address(0), "registry=0");
        registry = IAgentRegistry(registry_);
    }

    function setRiskOracle(address oracle) external onlyOwner {
        riskOracle = IRiskOracle(oracle);
        emit RiskOracleUpdated(oracle);
    }

    function setRiskSlack(uint256 slack) external onlyOwner {
        riskSlack = slack;
        emit RiskSlackUpdated(slack);
    }

    /// @notice EIP-712 digest for a verdict — sign THIS off-chain with the agent controller key.
    function hashVerdict(SignedVerdict calldata v) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(
            SIGNED_VERDICT_TYPEHASH,
            v.agentId, v.marketHash, v.score, v.action, v.inputsHash, v.riskScore, v.maxRisk, v.expiry, v.nonce
        )));
    }

    /// @dev Reverts unless the verdict fully verifies. Pure view-side checks (no state writes).
    function _check(SignedVerdict calldata v, bytes calldata sig) internal view {
        require(v.riskScore <= v.maxRisk, "risk exceeds tolerance");   // Stax
        require(block.timestamp <= v.expiry, "expired");                // Stax
        require(!usedNonce[v.agentId][v.nonce], "nonce used");          // replay
        address signer = hashVerdict(v).recover(sig);
        require(signer == registry.agentControllers(v.agentId), "bad signer"); // Stax
        if (address(riskOracle) != address(0)) {
            require(riskOracle.riskOf(v.marketHash) <= v.maxRisk, "oracle risk exceeds tolerance"); // Argus
        }
    }

    /// @notice Verify a signed verdict and, only if it passes, forward the trade to `target`.
    ///         The chain refuses to move funds otherwise.
    function executeIfVerified(
        SignedVerdict calldata v,
        bytes calldata sig,
        address target,
        bytes calldata swapCalldata
    ) external returns (bytes memory) {
        _check(v, sig);
        usedNonce[v.agentId][v.nonce] = true;
        emit VerdictVerified(v.agentId, v.marketHash, v.riskScore, v.action, v.nonce);

        (bool ok, bytes memory ret) = target.call(swapCalldata);
        require(ok, "execution failed");
        return ret;
    }

    /// @notice PERMISSIONLESS fraud proof. If the agent's signed riskScore is materially below
    ///         the independent oracle risk, the verdict under-reported risk: emit a slashable
    ///         violation and burn the nonce so it can never be executed. Requires a risk oracle.
    function challengeVerdict(SignedVerdict calldata v, bytes calldata sig) external {
        require(address(riskOracle) != address(0), "no oracle");
        require(!usedNonce[v.agentId][v.nonce], "nonce used");
        address signer = hashVerdict(v).recover(sig);
        require(signer == registry.agentControllers(v.agentId), "bad signer");

        uint256 oracleRisk = riskOracle.riskOf(v.marketHash);
        require(oracleRisk > v.riskScore + riskSlack, "no violation");

        usedNonce[v.agentId][v.nonce] = true; // burn so the dishonest verdict can't execute
        emit AgentViolation(v.agentId, v.marketHash, oracleRisk, v.riskScore, v.nonce);
    }
}
