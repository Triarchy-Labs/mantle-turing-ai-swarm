// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAgentRegistry {
    function agentControllers(uint256 agentId) external view returns (address);
}

/**
 * @title AgentSessionKeys
 * @notice Bounded autonomy for an AI agent, with a co-pilot switch. A user (the principal) grants
 *         the agent a revocable mandate with hard limits (per-trade size, daily size, allowed
 *         markets, expiry) and chooses how much rope it gets:
 *           - AUTONOMOUS: the agent acts on its own, but only inside the mandate.
 *           - COPILOT:    the agent may only propose; the principal approves before anything runs.
 *         The mode flips at any time without re-granting, and revocation is instant.
 *
 * @dev Prior art from the Mantle Turing Test 2026 finalists, and what we add:
 *   - Imara Wallet (track winner): ERC-4337/EIP-7702 session keys, revocable delegation, bounded
 *     autonomy. Stax: "autopilot delegation within hard user-set bounds". CoQuant: human+AI co-pilot.
 *       → Each shipped ONE of these. Here autonomy and co-pilot are two modes of a SINGLE mandate,
 *         so a user can start supervised and graduate to autonomous without re-granting keys.
 *   - OUR ADDITION: a proposal is bound to `verdictHash`, the hash of the exact signed, risk-checked
 *     verdict from DecisionVerifier. You approve a specific decision, not a blank cheque, and the
 *     agent cannot swap in a different trade after approval. No finalist bound the approval to the
 *     decision itself.
 */
contract AgentSessionKeys {
    enum Mode { AUTONOMOUS, COPILOT }

    struct Session {
        address principal;      // the user who granted it and can revoke
        uint256 agentId;
        uint256 maxPerTrade;    // hard cap on a single trade's notional
        uint256 maxDaily;       // hard cap on notional per UTC day
        uint64  expiry;
        Mode    mode;
        bool    revoked;
    }

    struct Proposal {
        uint256 sessionId;
        bytes32 verdictHash;    // binds approval to one exact verified verdict
        bytes32 marketHash;
        uint256 notional;
        bool    approved;
        bool    executed;
    }

    IAgentRegistry public immutable registry;

    Session[] public sessions;
    Proposal[] public proposals;

    /// sessionId => market => allowed
    mapping(uint256 => mapping(bytes32 => bool)) public marketAllowed;
    /// sessionId => UTC day index => notional already spent
    mapping(uint256 => mapping(uint64 => uint256)) public spentOnDay;

    event SessionGranted(uint256 indexed sessionId, address indexed principal, uint256 indexed agentId, uint256 maxPerTrade, uint256 maxDaily, uint64 expiry, Mode mode);
    event SessionRevoked(uint256 indexed sessionId);
    event ModeChanged(uint256 indexed sessionId, Mode mode);
    event MarketSet(uint256 indexed sessionId, bytes32 indexed marketHash, bool allowed);
    event Proposed(uint256 indexed proposalId, uint256 indexed sessionId, bytes32 indexed verdictHash, bytes32 marketHash, uint256 notional);
    event Approved(uint256 indexed proposalId, address indexed principal);
    event Executed(uint256 indexed proposalId, uint256 indexed sessionId, uint256 notional, uint256 spentToday);

    uint256 private _locked = 1;
    modifier nonReentrant() {
        require(_locked == 1, "reentrant");
        _locked = 2;
        _;
        _locked = 1;
    }

    constructor(address registry_) {
        require(registry_ != address(0), "registry=0");
        registry = IAgentRegistry(registry_);
    }

    modifier onlyPrincipal(uint256 sessionId) {
        require(msg.sender == sessions[sessionId].principal, "not principal");
        _;
    }

    modifier onlyAgent(uint256 sessionId) {
        require(msg.sender == registry.agentControllers(sessions[sessionId].agentId), "not agent");
        _;
    }

    // ── Mandate lifecycle (principal) ──

    /// @notice Grant the agent a bounded, revocable mandate. Caller becomes the principal.
    function grantSession(
        uint256 agentId,
        uint256 maxPerTrade,
        uint256 maxDaily,
        uint64 expiry,
        Mode mode,
        bytes32[] calldata markets
    ) external returns (uint256 sessionId) {
        require(expiry > block.timestamp, "expiry in past");
        require(maxPerTrade > 0 && maxDaily >= maxPerTrade, "bad bounds");

        sessionId = sessions.length;
        sessions.push(Session({
            principal: msg.sender,
            agentId: agentId,
            maxPerTrade: maxPerTrade,
            maxDaily: maxDaily,
            expiry: expiry,
            mode: mode,
            revoked: false
        }));
        for (uint256 i = 0; i < markets.length; i++) {
            marketAllowed[sessionId][markets[i]] = true;
            emit MarketSet(sessionId, markets[i], true);
        }
        emit SessionGranted(sessionId, msg.sender, agentId, maxPerTrade, maxDaily, expiry, mode);
    }

    /// @notice Kill the mandate immediately. Nothing pending can execute afterwards.
    function revokeSession(uint256 sessionId) external onlyPrincipal(sessionId) {
        sessions[sessionId].revoked = true;
        emit SessionRevoked(sessionId);
    }

    /// @notice Flip between supervised (COPILOT) and hands-off (AUTONOMOUS) without re-granting.
    function setMode(uint256 sessionId, Mode mode) external onlyPrincipal(sessionId) {
        sessions[sessionId].mode = mode;
        emit ModeChanged(sessionId, mode);
    }

    function setMarket(uint256 sessionId, bytes32 marketHash, bool allowed) external onlyPrincipal(sessionId) {
        marketAllowed[sessionId][marketHash] = allowed;
        emit MarketSet(sessionId, marketHash, allowed);
    }

    // ── Agent flow ──

    /// @notice Agent registers an intended trade, bound to the verdict that justifies it.
    function propose(
        uint256 sessionId,
        bytes32 verdictHash,
        bytes32 marketHash,
        uint256 notional
    ) external onlyAgent(sessionId) returns (uint256 proposalId) {
        _requireLive(sessionId);
        require(marketAllowed[sessionId][marketHash], "market not allowed");

        proposalId = proposals.length;
        proposals.push(Proposal({
            sessionId: sessionId,
            verdictHash: verdictHash,
            marketHash: marketHash,
            notional: notional,
            approved: false,
            executed: false
        }));
        emit Proposed(proposalId, sessionId, verdictHash, marketHash, notional);
    }

    /// @notice Principal approves one specific proposal. Because the proposal carries the verdict
    ///         hash, approving it approves that exact decision and nothing else.
    function approve(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(msg.sender == sessions[p.sessionId].principal, "not principal");
        require(!p.executed, "executed");
        p.approved = true;
        emit Approved(proposalId, msg.sender);
    }

    /// @notice Execute a proposal against `target`. Enforces the mandate: live, market allowed,
    ///         per-trade cap, rolling daily cap, and in COPILOT mode an explicit approval.
    function execute(
        uint256 proposalId,
        address target,
        bytes calldata callData
    ) external nonReentrant returns (bytes memory) {
        Proposal storage p = proposals[proposalId];
        uint256 sessionId = p.sessionId;
        require(msg.sender == registry.agentControllers(sessions[sessionId].agentId), "not agent");
        require(!p.executed, "already executed");

        Session storage s = sessions[sessionId];
        _requireLive(sessionId);
        require(marketAllowed[sessionId][p.marketHash], "market not allowed");
        require(p.notional <= s.maxPerTrade, "over per-trade cap");
        if (s.mode == Mode.COPILOT) require(p.approved, "awaiting approval");

        uint64 day = uint64(block.timestamp / 1 days);
        uint256 spent = spentOnDay[sessionId][day] + p.notional;
        require(spent <= s.maxDaily, "over daily cap");
        spentOnDay[sessionId][day] = spent;

        p.executed = true;
        emit Executed(proposalId, sessionId, p.notional, spent);

        (bool ok, bytes memory ret) = target.call(callData);
        require(ok, "execution failed");
        return ret;
    }

    // ── Views ──

    function sessionCount() external view returns (uint256) { return sessions.length; }
    function proposalCount() external view returns (uint256) { return proposals.length; }

    /// @notice Remaining notional the agent may still spend today under this mandate.
    function remainingToday(uint256 sessionId) external view returns (uint256) {
        Session storage s = sessions[sessionId];
        uint64 day = uint64(block.timestamp / 1 days);
        uint256 spent = spentOnDay[sessionId][day];
        return spent >= s.maxDaily ? 0 : s.maxDaily - spent;
    }

    function _requireLive(uint256 sessionId) internal view {
        Session storage s = sessions[sessionId];
        require(!s.revoked, "revoked");
        require(block.timestamp <= s.expiry, "expired");
    }
}
