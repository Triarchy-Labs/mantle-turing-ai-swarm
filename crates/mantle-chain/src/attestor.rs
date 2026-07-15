//! DecisionAttestor — structured, verifiable on-chain verdict log.
//!
//! Upgrades the legacy `onchain::encode_verdict_log` (opaque JSON blob stuffed into tx
//! calldata) into a structured, queryable, hash-chained record via the DecisionAttestor
//! contract. Each verdict commits `inputsHash = keccak256(canonical factors)` so anyone can
//! recompute the deterministic judge score and confirm it was not tuned after the fact.
//!
//! NOTE: not yet wired into the swarm's per-cycle hot path, and the contract is not yet
//! deployed — this module only builds the calldata + hashing so the write is one wiring
//! step away once `DecisionAttestor` is deployed (see contracts/script/DeployAttestor.s.sol).

use alloy::primitives::{keccak256, B256, I256, U256};
use alloy::sol;
use alloy::sol_types::SolCall;

/// Agent #1 NFT Token ID (already minted on-chain).
pub const AGENT_TOKEN_ID: u64 = 1;

sol! {
    #[sol(rpc)]
    interface IDecisionAttestor {
        function recordVerdict(uint256 agentId, bytes32 marketHash, int256 score, uint8 action, bytes32 inputsHash) external returns (uint256);
        function settleOutcome(uint256 verdictId, int256 realizedPnlBps) external;
        function verdictCount() external view returns (uint256);
        function agentReputation(uint256 agentId) external view returns (uint256);
        function verifyInputs(uint256 verdictId, bytes canonicalInputs) external view returns (bool);
    }
}

/// On-chain `Action` enum, mirrored from the contract.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum Action {
    Hold = 0,
    Buy = 1,
    Sell = 2,
    Reject = 3,
}

impl Action {
    /// Map the judge's textual decision to the on-chain action code.
    pub fn from_decision(decision: &str) -> Self {
        let d = decision.to_ascii_uppercase();
        if d.contains("BUY") {
            Action::Buy
        } else if d.contains("SELL") {
            Action::Sell
        } else if d.contains("REJECT") {
            Action::Reject
        } else {
            Action::Hold
        }
    }
}

/// keccak256 of a market pair symbol, e.g. "MNT/USDT".
pub fn market_hash(pair: &str) -> B256 {
    keccak256(pair.as_bytes())
}

/// Canonical bytes of the 15-factor judge inputs — the exact bytes that get hashed.
/// A verifier reproduces these (sorted keys, fixed-point 1e6 integers, no float ambiguity)
/// and calls `verifyInputs` to confirm the committed hash.
pub fn canonical_inputs(factors: &[(&str, f64)]) -> Vec<u8> {
    let mut sorted: Vec<(&str, f64)> = factors.to_vec();
    sorted.sort_by(|a, b| a.0.cmp(b.0));
    let obj: Vec<(String, i64)> = sorted
        .iter()
        .map(|(k, v)| (k.to_string(), (v * 1_000_000.0).round() as i64))
        .collect();
    serde_json::to_vec(&obj).unwrap_or_default()
}

/// keccak256 of the canonical 15-factor inputs.
pub fn inputs_hash(factors: &[(&str, f64)]) -> B256 {
    keccak256(canonical_inputs(factors))
}

/// Encode `recordVerdict` calldata. `score_1e4` is fixed-point 1e4 (e.g. 1.5 -> 15000).
/// The contract address is supplied at send time (matches the `onchain::encode_*` pattern).
pub fn encode_record_verdict(market: B256, score_1e4: i64, action: Action, inputs: B256) -> Vec<u8> {
    let call = IDecisionAttestor::recordVerdictCall {
        agentId: U256::from(AGENT_TOKEN_ID),
        marketHash: market,
        score: I256::try_from(score_1e4).unwrap_or(I256::ZERO),
        action: action as u8,
        inputsHash: inputs,
    };
    call.abi_encode()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_market_hash_deterministic() {
        assert_eq!(market_hash("MNT/USDT"), market_hash("MNT/USDT"));
        assert_ne!(market_hash("MNT/USDT"), market_hash("MNT/USDC"));
    }

    #[test]
    fn test_inputs_hash_order_independent() {
        // Same factors in different order must hash identically (sorted canonicalization).
        let a = inputs_hash(&[("price_trend", 3.0), ("funding", -1.0), ("oi", 42.0)]);
        let b = inputs_hash(&[("oi", 42.0), ("price_trend", 3.0), ("funding", -1.0)]);
        assert_eq!(a, b);
    }

    #[test]
    fn test_inputs_hash_sensitive() {
        let a = inputs_hash(&[("price_trend", 3.0)]);
        let b = inputs_hash(&[("price_trend", 3.1)]);
        assert_ne!(a, b, "different inputs must hash differently");
    }

    #[test]
    fn test_action_mapping() {
        assert_eq!(Action::from_decision("BUY MNT"), Action::Buy);
        assert_eq!(Action::from_decision("sell"), Action::Sell);
        assert_eq!(Action::from_decision("REJECTED"), Action::Reject);
        assert_eq!(Action::from_decision("HOLD"), Action::Hold);
    }

    #[test]
    fn test_encode_record_verdict_len() {
        let cd = encode_record_verdict(market_hash("MNT/USDT"), 15000, Action::Buy, inputs_hash(&[("x", 1.0)]));
        // selector (4) + 5 * 32-byte words
        assert_eq!(cd.len(), 4 + 32 * 5);
    }

    #[test]
    fn test_negative_score_encodes() {
        let cd = encode_record_verdict(market_hash("MNT/USDT"), -2000, Action::Reject, B256::ZERO);
        assert_eq!(cd.len(), 4 + 32 * 5);
    }
}
