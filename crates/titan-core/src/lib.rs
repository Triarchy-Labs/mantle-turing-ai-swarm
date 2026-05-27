//! Titan Core — Exchange-Agnostic Trading Intelligence
//!
//! Extracted from Titan-HFT-Engine: NeuralBrain scoring, RiskMatrix (Kelly),
//! 8-gate EntryPipeline, technical indicators, shield, trailing SL.
//!
//! All modules are exchange-neutral — no Bybit/CEX-specific code.
//! Feed them data from any source (DEX, CEX, oracle) and they produce
//! scoring, position sizing, and risk decisions.

pub mod brain;
pub mod risk;
pub mod entry;
pub mod indicators;
pub mod shield;
pub mod trailing;
// pub mod execution;   // Bybit-specific — will be replaced by mantle-chain adapter
pub mod confidence;
pub mod calibration;
pub mod types;
pub mod safe_io;
pub mod patience;
pub mod alpha_head;
pub mod auto_ramp;
pub mod brain_feeds;
pub mod deallow;
pub mod scanner;
pub mod logger;
pub mod unstuck;
// pub mod orchestrator; // Bybit-specific — replaced by swarm-engine
