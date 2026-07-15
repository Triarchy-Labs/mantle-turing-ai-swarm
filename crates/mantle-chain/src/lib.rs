//! Mantle Chain — On-Chain Adapter for Mantle L2
//!
//! Provides Alloy-based RPC client, ERC-8004 registry interaction,
//! DEX execution (Agni Finance), and on-chain event logging.
//!
//! Already deployed contracts on Mantle Mainnet (chain 5000):
//!   ERC8004Registry (v2): 0xEb271ece1aB2f72835556Ee67ad0BCA36a378a66
//!   TuringFlashLiquidator (v2): 0x19A53120FE1f0147f28fE83c2922A402AC98217c
//!   Agent #1 NFT: Token ID 1
//!   Wallet: 0xF02332A7d92C86631Ea30d49D9778994B9277c79

pub mod provider;
pub mod erc8004;
pub mod onchain;
pub mod wallet;
pub mod dex;
pub mod attestor;
pub mod verifier;
