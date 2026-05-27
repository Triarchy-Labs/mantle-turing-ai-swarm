// src/modules/scanner.rs
// Модуль сканирования рынка. Hype Scanner + BTC Gravity.
use serde_json::Value;
use reqwest::Client;
use crate::brain_feeds::BrainFeeds;

pub struct MarketScanner;

impl MarketScanner {
    /// BTC Gravity: возвращает % изменения BTC за последние 5 свечей по 15м
    pub async fn check_btc_gravity(client: &Client) -> f64 {
        // PREDATOR-05 FIX: extended lookback (20 candles = 5h vs 5 candles = 75min)
        let url = "https://api.bybit.com/v5/market/kline?category=linear&symbol=BTCUSDT&interval=15&limit=20";
        if let Ok(res) = client.get(url).send().await {
            if let Ok(json) = res.json::<Value>().await {
                if let Some(list) = json["result"]["list"].as_array() {
                    if list.len() >= 5 {
                        let current: f64 = list[0][4].as_str().unwrap_or("0").parse().unwrap_or(0.0);
                        // PREDATOR-05: compare with oldest candle (full lookback window)
                        let old: f64 = list.last().map(|v| v[4].as_str().unwrap_or("0").parse().unwrap_or(0.0)).unwrap_or(0.0);
                        if old > 0.0 { return (current - old) / old * 100.0; }
                    }
                }
            }
        }
        0.0
    }

    /// Hype Scanner: топ-12 монет по обороту за 24ч (исключая мемы и токсичные)
    pub async fn get_hype_coins(client: &Client) -> Vec<String> {
        let url = "https://api.bybit.com/v5/market/tickers?category=linear";
        if let Ok(res) = client.get(url).send().await {
            if let Ok(json) = res.json::<Value>().await {
                if let Some(list) = json["result"]["list"].as_array() {
                    let mut pairs: Vec<(String, f64)> = Vec::new();
                    for item in list {
                        let sym = item["symbol"].as_str().unwrap_or("");
                        if !sym.ends_with("USDT") { continue; }
                        if BrainFeeds::is_toxic_asset(sym) { continue; } // FORENSIC-09: was double-called via is_meme+is_toxic
                        if ["BTCUSDT","ETHUSDT","SOLUSDT","CLUSDT","GCUSDT"].contains(&sym) { continue; }
                        let vol = item["turnover24h"].as_str().unwrap_or("0").parse::<f64>().unwrap_or(0.0);
                        if vol > 10_000_000.0 { pairs.push((sym.to_string(), vol)); }
                    }
                    pairs.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
                    return pairs.into_iter().take(12).map(|(s,_)| s).collect();
                }
            }
        }
        vec![]
    }

    /// Проверяет, является ли символ мемом (делегирует BrainFeeds с адаптивным JSON)
    #[allow(dead_code)] // Reserved for future entry gate integration
    pub fn is_meme(symbol: &str) -> bool {
        BrainFeeds::is_toxic_asset(symbol)
    }
}
