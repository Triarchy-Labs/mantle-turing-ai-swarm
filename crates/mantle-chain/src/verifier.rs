//! DecisionVerifier — EIP-712 signing for the on-chain enforcement gate.
//!
//! Produces the exact EIP-712 digest the `DecisionVerifier` contract recovers in
//! `executeIfVerified`, so the swarm can sign a verdict off-chain and the chain will refuse to
//! trade unless that signature (+ risk bound + expiry + nonce) verifies.
//!
//! NOTE: not wired into the swarm hot path and the contract is not deployed. The signing hash
//! depends on the deployed verifier address (EIP-712 domain `verifyingContract`), passed in.

use alloy::primitives::{Address, B256};
use alloy::sol;
use alloy::sol_types::{eip712_domain, SolStruct};

/// Mantle mainnet chain id (EIP-712 domain).
pub const MANTLE_CHAIN_ID: u64 = 5000;

sol! {
    #[derive(Debug)]
    struct SignedVerdict {
        uint256 agentId;
        bytes32 marketHash;
        int256  score;
        uint8   action;
        bytes32 inputsHash;
        uint256 riskScore;
        uint256 maxRisk;
        uint64  expiry;
        uint256 nonce;
    }
}

/// EIP-712 signing digest for a verdict, bound to a specific deployed verifier contract.
/// Sign this with the agent-controller key (see `wallet`) to produce `sig` for `executeIfVerified`.
pub fn signing_digest(verifier: Address, v: &SignedVerdict) -> B256 {
    let domain = eip712_domain! {
        name: "OuroborosDecisionVerifier",
        version: "1",
        chain_id: MANTLE_CHAIN_ID,
        verifying_contract: verifier,
    };
    v.eip712_signing_hash(&domain)
}

#[cfg(test)]
mod tests {
    use super::*;
    use alloy::primitives::{keccak256, I256, U256};

    fn sample() -> SignedVerdict {
        SignedVerdict {
            agentId: U256::from(1u64),
            marketHash: keccak256("MNT/USDT"),
            score: I256::try_from(15000i64).unwrap(),
            action: 1u8,
            inputsHash: keccak256("inputs"),
            riskScore: U256::from(30u64),
            maxRisk: U256::from(50u64),
            expiry: 1_900_000_000u64,
            nonce: U256::from(1u64),
        }
    }

    #[test]
    fn test_digest_deterministic() {
        let verifier = Address::repeat_byte(0x11);
        let a = signing_digest(verifier, &sample());
        let b = signing_digest(verifier, &sample());
        assert_eq!(a, b);
    }

    #[test]
    fn test_digest_depends_on_verifier_address() {
        // EIP-712 domain includes verifyingContract -> different deployment, different digest.
        let a = signing_digest(Address::repeat_byte(0x11), &sample());
        let b = signing_digest(Address::repeat_byte(0x22), &sample());
        assert_ne!(a, b);
    }

    #[test]
    fn test_digest_sensitive_to_fields() {
        let verifier = Address::repeat_byte(0x11);
        let base = signing_digest(verifier, &sample());
        let mut hi = sample();
        hi.riskScore = U256::from(31u64);
        assert_ne!(base, signing_digest(verifier, &hi));
    }

    #[test]
    fn test_typehash_matches_contract() {
        // Must equal the SIGNED_VERDICT_TYPEHASH constant in DecisionVerifier.sol.
        let expected = keccak256(
            "SignedVerdict(uint256 agentId,bytes32 marketHash,int256 score,uint8 action,bytes32 inputsHash,uint256 riskScore,uint256 maxRisk,uint64 expiry,uint256 nonce)"
        );
        assert_eq!(SignedVerdict::eip712_type_hash(&sample()), expected);
    }
}
