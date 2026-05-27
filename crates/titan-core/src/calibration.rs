// src/modules/calibration.rs
// ═══════════════════════════════════════════════════════════════
// AUTO-RECALIBRATION — Автоматическая самокалибровка Titan
// ═══════════════════════════════════════════════════════════════
// Вынесено из orchestrator.rs. Запускает hour_analyzer и backtester
// по расписанию для обновления hour_performance.json и titan_calibration.json.

use crate::logger::TitanLogger;

pub struct Calibration;

impl Calibration {
    /// Проверяет свежесть файлов и запускает рекалибровку при необходимости
    pub fn run_if_needed() {
        TitanLogger::log("RECALIBRATION", "Starting 6-hour self-calibration cycle...");

        // Hour performance (обновляется раз в 24ч)
        let hour_path = r"E:\ROXY_SYSTEM\Projects\Antigravity-Swarm\Swarm_Kingdoms\V4_Titan\hour_performance.json";
        let needs_hour_refresh = std::fs::metadata(hour_path)
            .and_then(|m| m.modified())
            .map(|t| t.elapsed().unwrap_or_default().as_secs() > 86400)
            .unwrap_or(true);

        if needs_hour_refresh {
            TitanLogger::log("RECALIBRATION", "⚡ hour_performance.json stale — auto-refreshing...");
            let exe = r"E:\ROXY_SYSTEM\Projects\Antigravity-Swarm\Swarm_Kingdoms\V4_Titan\src\target\debug\hour_analyzer.exe";
            match std::process::Command::new(exe).spawn() {
                Ok(_) => TitanLogger::log("RECALIBRATION", "hour_analyzer spawned successfully"),
                Err(e) => TitanLogger::log("RECALIBRATION", &format!("hour_analyzer failed: {e}")),
            }
        }

        // Backtester calibration (обновляется раз в 7 дней)
        let cal_path = r"E:\ROXY_SYSTEM\Projects\Antigravity-Swarm\Swarm_Kingdoms\V4_Titan\titan_calibration.json";
        let needs_cal_refresh = std::fs::metadata(cal_path)
            .and_then(|m| m.modified())
            .map(|t| t.elapsed().unwrap_or_default().as_secs() > 7 * 86400)
            .unwrap_or(true);

        if needs_cal_refresh {
            TitanLogger::log("RECALIBRATION", "⚡ titan_calibration.json stale — auto-recalibrating...");
            let exe = r"E:\ROXY_SYSTEM\Projects\Antigravity-Swarm\Swarm_Kingdoms\V4_Titan\src\target\debug\backtester.exe";
            match std::process::Command::new(exe).spawn() {
                Ok(_) => TitanLogger::log("RECALIBRATION", "backtester spawned successfully"),
                Err(e) => TitanLogger::log("RECALIBRATION", &format!("backtester failed: {e}")),
            }
        }

        TitanLogger::log("RECALIBRATION", "Cycle complete. Next check in 6h.");
    }
}
