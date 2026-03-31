import json
import statistics
from typing import Dict, Any, List

# ── Physiological plausibility ranges per device type ──────────────────────
SENSOR_RULES: Dict[str, Dict[str, Dict]] = {
    "ECG": {
        "heart_rate":  {"min": 30,  "max": 220,  "unit": "bpm"},
        "temperature": {"min": 35.0,"max": 42.0,  "unit": "°C"},
    },
    "Pulse Oximeter": {
        "spo2":        {"min": 70,  "max": 100,  "unit": "%"},
        "pulse":       {"min": 30,  "max": 200,  "unit": "bpm"},
    },
    "Ventilator": {
        "respiratory_rate": {"min": 5,  "max": 60,  "unit": "breaths/min"},
        "tidal_volume":     {"min": 200,"max": 900, "unit": "ml"},
    },
    "Temperature Sensor": {
        "temperature": {"min": 35.0,"max": 42.0, "unit": "°C"},
    },
    "Blood Pressure": {
        "systolic":  {"min": 60, "max": 250, "unit": "mmHg"},
        "diastolic": {"min": 30, "max": 150, "unit": "mmHg"},
    },
}


def range_check(device_type: str, readings: Dict[str, Any]) -> Dict:
    """Gate 1 — check each reading against absolute physiological limits."""
    rules = SENSOR_RULES.get(device_type, {})
    results = {}
    overall_valid = True

    for field, value in readings.items():
        if not isinstance(value, (int, float)):
            continue
        if field in rules:
            r = rules[field]
            in_range = r["min"] <= value <= r["max"]
            results[field] = {
                "value": value,
                "valid": in_range,
                "range": f"{r['min']}–{r['max']} {r['unit']}",
                "status": "OK" if in_range else "OUT_OF_RANGE",
            }
            if not in_range:
                overall_valid = False
        else:
            results[field] = {"value": value, "valid": True, "status": "UNCHECKED"}

    return {"overall_valid": overall_valid, "details": results}


def zscore_check(readings: Dict[str, Any], history: List[str]) -> Dict:
    """Gate 2 — statistical consistency vs device's own recent history."""
    if len(history) < 10:
        return {"status": "INSUFFICIENT_DATA", "overall_score": 100.0, "fields": {}}

    field_scores = {}

    for field, new_val in readings.items():
        if not isinstance(new_val, (int, float)):
            continue

        historical_vals = []
        for h in history:
            try:
                parsed = json.loads(h)
                if field in parsed and isinstance(parsed[field], (int, float)):
                    historical_vals.append(float(parsed[field]))
            except Exception:
                continue

        if len(historical_vals) < 5:
            continue

        mean = statistics.mean(historical_vals)
        try:
            std = statistics.stdev(historical_vals)
        except statistics.StatisticsError:
            std = 0

        if std == 0:
            field_scores[field] = {
                "z_score": 0, "status": "FLATLINE_WARNING", "score": 20.0
            }
            continue

        z = abs((new_val - mean) / std)

        if z < 1:
            score, status = 100.0, "NORMAL"
        elif z < 2:
            score, status = 80.0, "SLIGHTLY_UNUSUAL"
        elif z < 3:
            score, status = 50.0, "SUSPICIOUS"
        else:
            score, status = 0.0, "ANOMALY"

        field_scores[field] = {
            "z_score": round(z, 2),
            "mean": round(mean, 2),
            "std": round(std, 2),
            "status": status,
            "score": score,
        }

    scores = [v["score"] for v in field_scores.values()]
    overall = round(statistics.mean(scores), 1) if scores else 100.0

    return {"overall_score": overall, "fields": field_scores, "status": "COMPUTED"}


def compute_confidence(range_result: Dict, zscore_result: Dict) -> float:
    """Combine gate results into a single 0–100 confidence score."""
    range_score = 100.0 if range_result["overall_valid"] else 30.0
    stat_score  = zscore_result.get("overall_score", 100.0)
    # 40% weight to range check, 60% to statistical check
    return round(range_score * 0.4 + stat_score * 0.6, 1)


def is_anomaly(confidence: float) -> bool:
    return confidence < 50.0