/// Regime Detection — 4-state Hidden Markov Model market regime classifier.
///
/// 4 hidden states: Trending Up | Trending Down | Ranging | Volatile
///
/// This is a real HMM with:
///   - Gaussian emission distributions per state (mean/std derived from a
///     baseline volatility parameter),
///   - a sticky transition matrix (regimes persist over time),
///   - scaled forward–backward inference (smoothed posteriors γ),
///   - Viterbi decoding for the most-likely state path.
///
/// A window of returns is classified by the state with the highest expected
/// occupancy (Σ_t γ_t[state]); confidence is that occupancy fraction.
use serde::Serialize;

/// Рыночный режим.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub enum MarketRegime {
    TrendingUp,
    TrendingDown,
    Ranging,
    Volatile,
}

impl MarketRegime {
    #[allow(dead_code)]
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::TrendingUp => "trending_up",
            Self::TrendingDown => "trending_down",
            Self::Ranging => "ranging",
            Self::Volatile => "volatile",
        }
    }

    #[inline]
    fn from_index(i: usize) -> Self {
        match i {
            0 => Self::TrendingUp,
            1 => Self::TrendingDown,
            2 => Self::Ranging,
            _ => Self::Volatile,
        }
    }
}

const N_STATES: usize = 4;

/// Результат классификации режима.
#[derive(Debug, Clone, Serialize)]
pub struct RegimeResult {
    pub regime: MarketRegime,
    pub confidence: f64,
    pub mean_return: f64,
    pub volatility: f64,
    pub trend_strength: f64,
}

/// 4-state Gaussian-emission Hidden Markov Model.
///
/// Emission parameters are scale-relative to a baseline volatility `hv`:
///   - TrendingUp:   N(+2·hv, 1.5·hv)
///   - TrendingDown: N(-2·hv, 1.5·hv)
///   - Ranging:      N( 0,    0.75·hv)
///   - Volatile:     N( 0,    3.0·hv)
///
/// Transitions are sticky (states persist), so a single outlier observation
/// does not flip the inferred regime.
#[derive(Debug, Clone)]
pub struct RegimeHmm {
    /// Transition matrix A[from][to].
    trans: [[f64; N_STATES]; N_STATES],
    /// Initial state distribution.
    pi: [f64; N_STATES],
    /// Per-state emission means.
    means: [f64; N_STATES],
    /// Per-state emission std devs.
    stds: [f64; N_STATES],
}

impl RegimeHmm {
    /// Build an HMM whose emission scale is anchored to `historical_vol`.
    pub fn from_baseline(historical_vol: f64) -> Self {
        let hv = historical_vol.abs().max(1e-6);

        // Sticky transitions: 0.85 to stay, 0.05 to each of the other 3.
        let stay = 0.85;
        let leave = (1.0 - stay) / (N_STATES as f64 - 1.0);
        let mut trans = [[leave; N_STATES]; N_STATES];
        for (i, row) in trans.iter_mut().enumerate() {
            row[i] = stay;
        }

        Self {
            trans,
            pi: [0.25; N_STATES],
            // [TrendingUp, TrendingDown, Ranging, Volatile]
            means: [2.0 * hv, -2.0 * hv, 0.0, 0.0],
            stds: [1.5 * hv, 1.5 * hv, 0.75 * hv, 3.0 * hv],
        }
    }

    /// Gaussian emission likelihood b_state(x) (floored to avoid underflow).
    #[inline]
    fn emit(&self, state: usize, x: f64) -> f64 {
        let mu = self.means[state];
        let sigma = self.stds[state].max(1e-9);
        let z = (x - mu) / sigma;
        let pdf = (1.0 / (sigma * (2.0 * std::f64::consts::PI).sqrt())) * (-0.5 * z * z).exp();
        pdf.max(1e-300)
    }

    /// Scaled forward–backward. Returns (γ smoothed posteriors per step,
    /// log-likelihood of the observation sequence).
    pub fn forward_backward(&self, obs: &[f64]) -> (Vec<[f64; N_STATES]>, f64) {
        let t_len = obs.len();
        if t_len == 0 {
            return (Vec::new(), 0.0);
        }

        let mut alpha = vec![[0.0f64; N_STATES]; t_len];
        let mut scale = vec![0.0f64; t_len];

        // Forward, t = 0.
        let mut sum0 = 0.0;
        for s in 0..N_STATES {
            alpha[0][s] = self.pi[s] * self.emit(s, obs[0]);
            sum0 += alpha[0][s];
        }
        scale[0] = if sum0 > 0.0 { sum0 } else { 1.0 };
        for s in 0..N_STATES {
            alpha[0][s] /= scale[0];
        }

        // Forward, t = 1..T.
        for t in 1..t_len {
            let mut sum_t = 0.0;
            for j in 0..N_STATES {
                let mut acc = 0.0;
                for i in 0..N_STATES {
                    acc += alpha[t - 1][i] * self.trans[i][j];
                }
                alpha[t][j] = acc * self.emit(j, obs[t]);
                sum_t += alpha[t][j];
            }
            scale[t] = if sum_t > 0.0 { sum_t } else { 1.0 };
            for j in 0..N_STATES {
                alpha[t][j] /= scale[t];
            }
        }

        // Backward (scaled with the same per-step scale factors).
        let mut beta = vec![[0.0f64; N_STATES]; t_len];
        for s in 0..N_STATES {
            beta[t_len - 1][s] = 1.0;
        }
        for t in (0..t_len - 1).rev() {
            for i in 0..N_STATES {
                let mut acc = 0.0;
                for j in 0..N_STATES {
                    acc += self.trans[i][j] * self.emit(j, obs[t + 1]) * beta[t + 1][j];
                }
                beta[t][i] = acc / scale[t + 1];
            }
        }

        // γ_t[i] = α_t[i]·β_t[i] (already normalized under scaling), with a
        // defensive renormalization per step.
        let mut gamma = vec![[0.0f64; N_STATES]; t_len];
        for t in 0..t_len {
            let mut g_sum = 0.0;
            for i in 0..N_STATES {
                gamma[t][i] = alpha[t][i] * beta[t][i];
                g_sum += gamma[t][i];
            }
            if g_sum > 0.0 {
                for i in 0..N_STATES {
                    gamma[t][i] /= g_sum;
                }
            }
        }

        let loglik: f64 = scale.iter().map(|c| c.ln()).sum();
        (gamma, loglik)
    }

    /// Viterbi decoding — most-likely hidden state path (in log space).
    pub fn viterbi(&self, obs: &[f64]) -> Vec<MarketRegime> {
        let t_len = obs.len();
        if t_len == 0 {
            return Vec::new();
        }

        let log_trans: Vec<Vec<f64>> = self
            .trans
            .iter()
            .map(|row| row.iter().map(|p| p.max(1e-300).ln()).collect())
            .collect();

        let mut delta = vec![[f64::NEG_INFINITY; N_STATES]; t_len];
        let mut psi = vec![[0usize; N_STATES]; t_len];

        for s in 0..N_STATES {
            delta[0][s] = self.pi[s].max(1e-300).ln() + self.emit(s, obs[0]).ln();
        }

        for t in 1..t_len {
            for j in 0..N_STATES {
                let mut best = f64::NEG_INFINITY;
                let mut best_i = 0;
                for i in 0..N_STATES {
                    let v = delta[t - 1][i] + log_trans[i][j];
                    if v > best {
                        best = v;
                        best_i = i;
                    }
                }
                delta[t][j] = best + self.emit(j, obs[t]).ln();
                psi[t][j] = best_i;
            }
        }

        // Backtrack.
        let mut path = vec![MarketRegime::Ranging; t_len];
        let mut last = 0;
        let mut best = f64::NEG_INFINITY;
        for s in 0..N_STATES {
            if delta[t_len - 1][s] > best {
                best = delta[t_len - 1][s];
                last = s;
            }
        }
        path[t_len - 1] = MarketRegime::from_index(last);
        for t in (0..t_len - 1).rev() {
            last = psi[t + 1][last];
            path[t] = MarketRegime::from_index(last);
        }
        path
    }

    /// Classify a window by expected state occupancy (Σ_t γ_t[state]).
    pub fn classify(&self, obs: &[f64]) -> (MarketRegime, f64) {
        let (gamma, _) = self.forward_backward(obs);
        if gamma.is_empty() {
            return (MarketRegime::Ranging, 0.0);
        }

        let mut occupancy = [0.0f64; N_STATES];
        for g in &gamma {
            for i in 0..N_STATES {
                occupancy[i] += g[i];
            }
        }

        let t_len = gamma.len() as f64;
        let mut best_i = 0;
        let mut best_occ = occupancy[0];
        for i in 1..N_STATES {
            if occupancy[i] > best_occ {
                best_occ = occupancy[i];
                best_i = i;
            }
        }

        (MarketRegime::from_index(best_i), best_occ / t_len)
    }
}

/// Классифицирует рыночный режим на основе returns через HMM.
///
/// Запускает 4-state Gaussian HMM с forward–backward инференсом и выбирает
/// режим по максимальной ожидаемой занятости состояния.
///
/// `returns`: slice of log returns (или простых %-returns)
/// `historical_vol`: базовая волатильность — задаёт масштаб emission-моделей
pub fn classify_regime(returns: &[f64], historical_vol: f64) -> RegimeResult {
    if returns.is_empty() {
        return RegimeResult {
            regime: MarketRegime::Ranging,
            confidence: 0.0,
            mean_return: 0.0,
            volatility: 0.0,
            trend_strength: 0.0,
        };
    }

    let n = returns.len() as f64;
    let mean = returns.iter().sum::<f64>() / n;
    let variance = returns.iter().map(|r| (r - mean).powi(2)).sum::<f64>() / n;
    let vol = variance.sqrt();
    let trend_strength = if vol > 1e-10 { mean.abs() / vol } else { 0.0 };

    let hmm = RegimeHmm::from_baseline(historical_vol);
    let (regime, confidence) = hmm.classify(returns);

    RegimeResult {
        regime,
        confidence,
        mean_return: mean,
        volatility: vol,
        trend_strength,
    }
}

/// Детектирует смену режима между двумя окнами.
pub fn detect_regime_change(
    old_returns: &[f64],
    new_returns: &[f64],
    historical_vol: f64,
) -> Option<(MarketRegime, MarketRegime)> {
    let old = classify_regime(old_returns, historical_vol);
    let new = classify_regime(new_returns, historical_vol);

    if old.regime != new.regime {
        Some((old.regime, new.regime))
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_returns_ranging() {
        let r = classify_regime(&[], 0.01);
        assert_eq!(r.regime, MarketRegime::Ranging);
        assert_eq!(r.confidence, 0.0);
    }

    #[test]
    fn test_trending_up() {
        let returns = vec![0.02, 0.015, 0.025, 0.01, 0.03, 0.02, 0.018, 0.022];
        let r = classify_regime(&returns, 0.01);
        assert_eq!(r.regime, MarketRegime::TrendingUp, "Consistent positive returns = trending up");
    }

    #[test]
    fn test_trending_down() {
        let returns = vec![-0.02, -0.015, -0.025, -0.01, -0.03, -0.02, -0.018];
        let r = classify_regime(&returns, 0.01);
        assert_eq!(r.regime, MarketRegime::TrendingDown, "Consistent negative returns = trending down");
    }

    #[test]
    fn test_volatile() {
        let returns = vec![0.05, -0.06, 0.07, -0.08, 0.04, -0.05]; // wild swings
        let r = classify_regime(&returns, 0.01); // historical vol = 0.01, actual ~5x
        assert_eq!(r.regime, MarketRegime::Volatile, "High vol vs historical = volatile");
    }

    #[test]
    fn test_ranging() {
        let returns = vec![0.001, -0.001, 0.002, -0.0015, 0.001, -0.001];
        let r = classify_regime(&returns, 0.01);
        assert_eq!(r.regime, MarketRegime::Ranging, "Low trend + normal vol = ranging");
    }

    #[test]
    fn test_regime_change_detection() {
        let old = vec![0.02, 0.015, 0.025, 0.01, 0.03];  // trending up
        let new = vec![-0.02, -0.015, -0.025, -0.01, -0.03]; // trending down
        let change = detect_regime_change(&old, &new, 0.01);
        assert!(change.is_some());
        let (from, to) = change.unwrap();
        assert_eq!(from, MarketRegime::TrendingUp);
        assert_eq!(to, MarketRegime::TrendingDown);
    }

    #[test]
    fn test_gamma_posteriors_sum_to_one() {
        let hmm = RegimeHmm::from_baseline(0.01);
        let obs = vec![0.02, -0.01, 0.005, 0.03, -0.04, 0.01];
        let (gamma, _loglik) = hmm.forward_backward(&obs);
        for g in &gamma {
            let s: f64 = g.iter().sum();
            assert!((s - 1.0).abs() < 1e-9, "gamma at step must sum to 1, got {}", s);
        }
    }

    #[test]
    fn test_viterbi_path_length_and_stability() {
        let hmm = RegimeHmm::from_baseline(0.01);
        let obs = vec![0.02, 0.018, 0.025, 0.021, 0.019];
        let path = hmm.viterbi(&obs);
        assert_eq!(path.len(), obs.len());
        // A steady uptrend should decode to TrendingUp throughout.
        assert!(path.iter().all(|s| *s == MarketRegime::TrendingUp));
    }

    #[test]
    fn test_loglik_finite() {
        let hmm = RegimeHmm::from_baseline(0.02);
        let obs = vec![0.01, -0.02, 0.03, 0.0, -0.01];
        let (_g, loglik) = hmm.forward_backward(&obs);
        assert!(loglik.is_finite(), "log-likelihood must be finite");
    }

    #[test]
    fn test_confidence_in_unit_range() {
        let returns = vec![0.02, 0.015, 0.025, 0.01, 0.03];
        let r = classify_regime(&returns, 0.01);
        assert!(r.confidence > 0.0 && r.confidence <= 1.0, "confidence out of range: {}", r.confidence);
    }
}
