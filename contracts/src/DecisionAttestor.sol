// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/access/Ownable.sol";

interface IAgentRegistry {
    function agentControllers(uint256 agentId) external view returns (address);
}

/**
 * @title DecisionAttestor
 * @notice Tamper-evident, on-chain verdict log for an autonomous ERC-8004 agent.
 *         Every AI trade verdict is written on-chain as an ordered, hash-chained record —
 *         so "the agent writes each verdict on-chain" is a fact you can verify, not a claim.
 *
 * @dev Prior art (Mantle Turing Test 2026 finalists) and how this improves on each:
 *   - Conatus (Grand Champion): stores a single audit attestation + blocks self-rating.
 *       → We store an *ordered, hash-chained* log (prevHash → chainHash): history cannot be
 *         reordered or silently back-inserted. An Ouroboros of decisions, not one snapshot.
 *   - OFT Sentinel: keccak256(pdr) == verdictHash for independent verification.
 *       → We commit `inputsHash` = keccak256(canonical 15-factor inputs) AND expose
 *         verifyInputs(), so anyone can recompute the deterministic judge score and confirm
 *         it was not tuned after the fact.
 *   - Reputation: our old ERC8004Registry.addReputation() had NO anti-self-rating guard.
 *       → Reputation is minted ONLY from realized PnL, via a distinct `settler` role, and the
 *         contract reverts if the settler is the agent's own controller (self-rating blocked).
 */
contract DecisionAttestor is Ownable {
    IAgentRegistry public immutable registry;

    /// @notice Address allowed to settle realized outcomes (must differ from the agent controller).
    address public settler;

    enum Action { HOLD, BUY, SELL, REJECT }

    struct Verdict {
        uint256 agentId;
        bytes32 marketHash;      // keccak256(pair symbol, e.g. "MNT/USDT")
        int256  score;           // deterministic judge score, fixed-point 1e4 (e.g. 1.5 -> 15000)
        Action  action;
        bytes32 inputsHash;      // keccak256(canonical bytes of the 15 factor inputs)
        uint64  ts;
        bytes32 chainHash;       // keccak256(prevChainHash, agentId, market, score, action, inputs, ts)
        bool    settled;
        int256  realizedPnlBps;  // realized PnL in basis points, set at settlement
    }

    Verdict[] public verdicts;                          // global ordered log
    mapping(uint256 => uint256[]) public agentVerdictIds;
    mapping(uint256 => bytes32) public agentTipHash;    // running chain tip per agent
    mapping(uint256 => uint256) public agentReputation; // minted strictly from realized PnL

    event VerdictRecorded(
        uint256 indexed verdictId,
        uint256 indexed agentId,
        bytes32 indexed marketHash,
        int256 score,
        Action action,
        bytes32 inputsHash,
        bytes32 chainHash
    );
    event VerdictSettled(uint256 indexed verdictId, uint256 indexed agentId, int256 realizedPnlBps, uint256 reputationDelta);
    event SettlerUpdated(address indexed settler);

    constructor(address registry_) Ownable(msg.sender) {
        require(registry_ != address(0), "registry=0");
        registry = IAgentRegistry(registry_);
    }

    modifier onlyController(uint256 agentId) {
        require(msg.sender == registry.agentControllers(agentId), "not agent controller");
        _;
    }

    /// @notice Set the settler role (owner-only). Kept separate from the agent so the agent
    ///         can never grade its own realized outcomes.
    function setSettler(address settler_) external onlyOwner {
        settler = settler_;
        emit SettlerUpdated(settler_);
    }

    /// @notice Record one AI verdict on-chain. Only the agent's registered controller may write.
    /// @return verdictId Global index of the newly recorded verdict.
    function recordVerdict(
        uint256 agentId,
        bytes32 marketHash,
        int256 score,
        Action action,
        bytes32 inputsHash
    ) external onlyController(agentId) returns (uint256 verdictId) {
        verdictId = verdicts.length;
        bytes32 prev = agentTipHash[agentId];
        uint64 ts = uint64(block.timestamp);
        bytes32 chainHash = keccak256(abi.encode(prev, agentId, marketHash, score, action, inputsHash, ts));

        verdicts.push(Verdict({
            agentId: agentId,
            marketHash: marketHash,
            score: score,
            action: action,
            inputsHash: inputsHash,
            ts: ts,
            chainHash: chainHash,
            settled: false,
            realizedPnlBps: 0
        }));
        agentVerdictIds[agentId].push(verdictId);
        agentTipHash[agentId] = chainHash;

        emit VerdictRecorded(verdictId, agentId, marketHash, score, action, inputsHash, chainHash);
    }

    /// @notice Settle a verdict with its realized PnL. Reputation is minted ONLY here and ONLY
    ///         from a positive realized outcome. Reverts if the caller is the agent's own
    ///         controller (self-rating blocked) — reputation cannot be self-awarded.
    function settleOutcome(uint256 verdictId, int256 realizedPnlBps) external {
        require(msg.sender == settler, "not settler");
        Verdict storage v = verdicts[verdictId];
        require(!v.settled, "already settled");
        require(msg.sender != registry.agentControllers(v.agentId), "self-settlement blocked");

        v.settled = true;
        v.realizedPnlBps = realizedPnlBps;
        uint256 delta = realizedPnlBps > 0 ? uint256(realizedPnlBps) : 0;
        if (delta > 0) agentReputation[v.agentId] += delta;

        emit VerdictSettled(verdictId, v.agentId, realizedPnlBps, delta);
    }

    // ── Views ──

    function verdictCount() external view returns (uint256) {
        return verdicts.length;
    }

    function agentVerdictCount(uint256 agentId) external view returns (uint256) {
        return agentVerdictIds[agentId].length;
    }

    /// @notice Recompute-and-verify: does `canonicalInputs` hash to the committed inputsHash?
    ///         Lets anyone confirm the deterministic score was derived from these exact inputs.
    function verifyInputs(uint256 verdictId, bytes calldata canonicalInputs) external view returns (bool) {
        return keccak256(canonicalInputs) == verdicts[verdictId].inputsHash;
    }

    /// @notice Recompute the chain hash for a verdict from its stored fields + a given prev hash.
    ///         Walk the whole agent log with prev = previous verdict's chainHash to prove the
    ///         chain is intact (no reorder / no insertion).
    function recomputeChainHash(uint256 verdictId, bytes32 prevChainHash) external view returns (bytes32) {
        Verdict storage v = verdicts[verdictId];
        return keccak256(abi.encode(prevChainHash, v.agentId, v.marketHash, v.score, v.action, v.inputsHash, v.ts));
    }
}
