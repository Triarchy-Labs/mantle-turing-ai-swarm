# ═══════════════════════════════════════════════════════════
# Mantle AI Swarm — Multi-stage Docker build
# Produces a slim runtime image (~50MB) with the swarm-engine
# binary + config files for Render.com deployment.
# ═══════════════════════════════════════════════════════════

# Stage 1: Build
FROM rust:1.87-bookworm AS builder

WORKDIR /usr/src/app

# Copy workspace manifests first for dependency caching
COPY Cargo.toml Cargo.lock ./
COPY crates/ crates/

# Build release binary
RUN cargo build --release --bin swarm-engine --quiet 2>/dev/null; \
    echo "Build exit: $?"

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

# Runtime env vars (overridden by Render/Railway)
ENV CONFIG_DIR=/app/config
ENV DATA_DIR=/app/data
ENV RUST_LOG=swarm_engine=info,ouroboros_brain=info

# Render requires PORT env var — telemetry server binds to 3402
# but Render proxies to whatever port we expose
EXPOSE 3402

CMD ["/app/swarm-engine"]
