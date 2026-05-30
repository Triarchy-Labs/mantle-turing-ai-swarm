//! Mantle Chain — On-Chain Adapter for Mantle L2
//!
//! Provides Alloy-based RPC client, ERC-8004 registry interaction,
//! DEX execution (Agni Finance), and on-chain event logging.
//!
//! Already deployed contracts on Mantle Mainnet (chain 5000):
//!   ERC8004Registry: 0xFA0b5036aF9770B370B33CeBBb42d1E626338383
//!   X402FlashLiquidator: 0x41c51a03FFE750F5df1F6ffc972DBA8265B5a4F4
//!   Agent #1 NFT: Token ID 1
//!   Wallet: 0xF02332A7d92C86631Ea30d49D9778994B9277c79

pub mod provider;
pub mod erc8004;
pub mod onchain;
pub mod wallet;
pub mod dex;
