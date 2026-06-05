# ═══════════════════════════════════════════════════════════
# Mantle AI Swarm — Multi-stage Docker build
# Produces a slim runtime image (~50MB) with the swarm-engine
# binary + config files for Render.com deployment.
# ═══════════════════════════════════════════════════════════

# Stage 1: Build dependencies (cached layer)
FROM rust:1.95-bookworm AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config libssl-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy workspace manifests + all crate Cargo.toml first for dependency caching
COPY Cargo.toml Cargo.lock ./

# Create skeleton crate structures so cargo can resolve deps
COPY crates/ouroboros-brain/Cargo.toml crates/ouroboros-brain/Cargo.toml
COPY crates/titan-core/Cargo.toml crates/titan-core/Cargo.toml
COPY crates/hive-intel/Cargo.toml crates/hive-intel/Cargo.toml
COPY crates/mantle-chain/Cargo.toml crates/mantle-chain/Cargo.toml
COPY crates/swarm-engine/Cargo.toml crates/swarm-engine/Cargo.toml
COPY crates/x402-consensus/Cargo.toml crates/x402-consensus/Cargo.toml
COPY crates/x402-risk/Cargo.toml crates/x402-risk/Cargo.toml
COPY crates/x402-polymarket/Cargo.toml crates/x402-polymarket/Cargo.toml
COPY crates/x402-memory/Cargo.toml crates/x402-memory/Cargo.toml
COPY crates/x402-sniper/Cargo.toml crates/x402-sniper/Cargo.toml
COPY crates/x402-liquidator/Cargo.toml crates/x402-liquidator/Cargo.toml
COPY crates/core-ipc/Cargo.toml crates/core-ipc/Cargo.toml

# Create dummy lib.rs for each crate so cargo fetch works
RUN for dir in crates/*/; do \
      mkdir -p "$dir/src"; \
      echo "" > "$dir/src/lib.rs"; \
    done && \
    # swarm-engine has a binary, create dummy main.rs
    echo "fn main() {}" > crates/swarm-engine/src/main.rs

# Pre-fetch and build dependencies (this layer is cached)
RUN cargo build --release --bin swarm-engine || true

# Now copy real source code
COPY crates/ crates/

# Force Cargo to rebuild our crates by updating timestamps
# (COPY preserves host mtime which may be older than cached artifacts)
RUN find crates -name "*.rs" -exec touch {} +

# Build the actual binary (only recompiles our code, deps cached)
RUN cargo build --release --bin swarm-engine && \
    echo "Binary size:" && ls -lh target/release/swarm-engine

# Stage 2: Runtime
FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates libssl3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy binary
COPY --from=builder /usr/src/app/target/release/swarm-engine /app/swarm-engine

# Copy config files (models.toml, prompts.toml, thresholds.toml)
COPY config/ /app/config/

# Create data directory for decision memory
RUN mkdir -p /app/data

# Runtime env vars (overridden by Render)
ENV CONFIG_DIR=/app/config
ENV DATA_DIR=/app/data
ENV RUST_LOG=swarm_engine=info,ouroboros_brain=info
ENV RUST_BACKTRACE=1
ENV MALLOC_ARENA_MAX=2

EXPOSE 10000

CMD ["/app/swarm-engine"]
