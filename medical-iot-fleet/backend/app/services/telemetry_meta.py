from __future__ import annotations

import math
from collections import Counter
from typing import Any, Dict, Iterable, List, Optional, Set


DEFAULT_META_FIELDS: Set[str] = {
    "device_id",
    "device_type",
    "status",
    "timestamp",
    "timestamp_ms",
    "time_s",
    "lead_off",
}

DEFAULT_EXCLUDED_FIELDS: Set[str] = {
    "sample_no",
}

ECG_PREFERRED_FIELDS = {"ecg_raw", "r_peak", "rr_interval", "rr_interval_ms", "heart_rate"}

DEFAULT_FIELD_CONFIG: Dict[str, Dict[str, Any]] = {
    "ecg_raw": {"label": "ECG Raw", "unit": "", "preferred_chart": "line", "priority": 10, "group": "signal"},
    "r_peak": {"label": "R Peak", "unit": "", "preferred_chart": "stat-only", "priority": 20, "group": "signal"},
    "rr_interval": {"label": "RR Interval", "unit": "s", "preferred_chart": "trend", "priority": 30, "group": "rhythm"},
    "rr_interval_ms": {"label": "RR Interval", "unit": "ms", "preferred_chart": "trend", "priority": 30, "group": "rhythm"},
    "heart_rate": {"label": "Heart Rate", "unit": "bpm", "preferred_chart": "line", "priority": 40, "group": "vitals"},
    "spo2": {"label": "SpO2", "unit": "%", "preferred_chart": "line", "priority": 10, "group": "oxygenation"},
    "pulse": {"label": "Pulse", "unit": "bpm", "preferred_chart": "line", "priority": 20, "group": "oxygenation"},
    "respiratory_rate": {"label": "Respiratory Rate", "unit": "breaths/min", "preferred_chart": "line", "priority": 10, "group": "respiratory"},
    "tidal_volume": {"label": "Tidal Volume", "unit": "ml", "preferred_chart": "area", "priority": 20, "group": "respiratory"},
    "temperature": {"label": "Temperature", "unit": "C", "preferred_chart": "line", "priority": 10, "group": "temperature"},
    "systolic": {"label": "Systolic", "unit": "mmHg", "preferred_chart": "line", "priority": 10, "group": "blood_pressure"},
    "diastolic": {"label": "Diastolic", "unit": "mmHg", "preferred_chart": "line", "priority": 20, "group": "blood_pressure"},
    "signal_strength": {"label": "Signal Strength", "unit": "dBm", "preferred_chart": "line", "priority": 50, "group": "connectivity"},
    "battery_voltage": {"label": "Battery Voltage", "unit": "V", "preferred_chart": "line", "priority": 60, "group": "power"},
    "battery_level": {"label": "Battery Level", "unit": "%", "preferred_chart": "line", "priority": 60, "group": "power"},
}

DEVICE_TYPE_LAYOUTS: Dict[str, Dict[str, Any]] = {
    "ECG": {"mode": "ecg", "primary_fields": ["ecg_raw"], "secondary_fields": ["rr_interval_ms", "rr_interval"]},
    "Pulse Oximeter": {"mode": "paired", "primary_fields": ["spo2", "pulse"]},
    "Ventilator": {"mode": "paired", "primary_fields": ["respiratory_rate", "tidal_volume"]},
    "Temperature Sensor": {"mode": "single", "primary_fields": ["temperature"]},
    "Blood Pressure": {"mode": "paired", "primary_fields": ["systolic", "diastolic"]},
}


def _to_number_if_numeric(value: Any) -> Optional[float]:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        if isinstance(value, float) and not math.isfinite(value):
            return None
        return float(value)
    if not isinstance(value, str):
        return None
    trimmed = value.strip()
    if not trimmed:
        return None
    try:
        parsed = float(trimmed)
    except ValueError:
        return None
    return parsed if math.isfinite(parsed) else None


def _normalize_label(key: str) -> str:
    return " ".join(part.capitalize() for part in key.replace("_", " ").split())


def _build_field_config(field: str) -> Dict[str, Any]:
    base = DEFAULT_FIELD_CONFIG.get(field, {})
    return {
        "label": base.get("label", _normalize_label(field)),
        "unit": base.get("unit"),
        "preferred_chart": base.get("preferred_chart", "line"),
        "priority": base.get("priority", 100),
        "group": base.get("group", "general"),
    }


def _group_fields_by_scale(fields: List[str], latest_numeric_values: Dict[str, float]) -> List[List[str]]:
    if len(fields) <= 2:
        return [fields] if fields else []

    sorted_fields = sorted(
        fields,
        key=lambda field: abs(latest_numeric_values.get(field, 0.0)) or 0.0001,
    )
    groups: List[List[str]] = []
    current_group: List[str] = []
    current_anchor: Optional[float] = None

    for field in sorted_fields:
        magnitude = abs(latest_numeric_values.get(field, 0.0)) or 0.0001
        if current_anchor is None:
            current_group = [field]
            current_anchor = magnitude
            continue

        ratio = max(magnitude, current_anchor) / max(min(magnitude, current_anchor), 0.0001)
        if ratio > 20 and current_group:
            groups.append(current_group)
            current_group = [field]
            current_anchor = magnitude
        else:
            current_group.append(field)
            current_anchor = max(current_anchor, magnitude)

    if current_group:
        groups.append(current_group)
    return groups


def build_telemetry_meta(device_type: str, payloads: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    payload_list = list(payloads)
    key_counter: Counter[str] = Counter()
    numeric_fields: Set[str] = set()
    meta_fields: Set[str] = set()
    non_numeric_fields: Set[str] = set()
    excluded_fields: Set[str] = set()
    latest_numeric_values: Dict[str, float] = {}

    for payload in payload_list:
        for key, value in payload.items():
            key_counter[key] += 1
            if key in DEFAULT_EXCLUDED_FIELDS:
                excluded_fields.add(key)
                continue
            numeric = _to_number_if_numeric(value)
            if numeric is not None:
                numeric_fields.add(key)
                latest_numeric_values[key] = numeric
            elif key in DEFAULT_META_FIELDS:
                meta_fields.add(key)
            else:
                non_numeric_fields.add(key)

    normalized_type = str(device_type or "").strip()
    type_layout = DEVICE_TYPE_LAYOUTS.get(normalized_type, {})

    field_config = {field: _build_field_config(field) for field in numeric_fields.union(meta_fields)}
    display_order = sorted(
        numeric_fields,
        key=lambda field: (field_config[field]["priority"], field_config[field]["label"]),
    )

    layout_mode = type_layout.get("mode")
    primary_fields = [field for field in type_layout.get("primary_fields", []) if field in numeric_fields]
    secondary_fields = [field for field in type_layout.get("secondary_fields", []) if field in numeric_fields]

    if layout_mode == "ecg" and "ecg_raw" in numeric_fields:
        recommended_layout = {
            "mode": "ecg",
            "primary_fields": primary_fields or ["ecg_raw"],
            "secondary_fields": secondary_fields,
            "groups": [],
            "reason": "known_ecg_layout",
        }
    else:
        grouped_fields = _group_fields_by_scale(display_order, latest_numeric_values)
        if len(display_order) <= 1:
            mode = "single"
            reason = "single_numeric_field"
        elif len(grouped_fields) > 1:
            mode = "grouped"
            reason = "mixed_scale_grouping"
        elif primary_fields and len(primary_fields) >= 2:
            mode = "paired"
            reason = "known_device_pairing"
        else:
            mode = "generic"
            reason = "auto_numeric_detection"

        groups = []
        for idx, fields in enumerate(grouped_fields):
            groups.append(
                {
                    "id": f"group_{idx + 1}",
                    "title": "Telemetry Group" if len(grouped_fields) == 1 else f"Telemetry Group {idx + 1}",
                    "fields": fields,
                    "chart_type": "area" if len(fields) > 1 else field_config[fields[0]]["preferred_chart"],
                }
            )

        recommended_layout = {
            "mode": mode,
            "primary_fields": primary_fields or display_order[:2],
            "secondary_fields": secondary_fields,
            "groups": groups,
            "reason": reason,
        }

    return {
        "numeric_fields": display_order,
        "meta_fields": sorted(meta_fields.union(non_numeric_fields)),
        "excluded_fields": sorted(excluded_fields),
        "field_config": field_config,
        "display_order": display_order,
        "recommended_layout": recommended_layout,
        "debug": {
            "payload_keys_seen": sorted(key_counter.keys()),
            "key_frequency": dict(sorted(key_counter.items())),
            "numeric_candidates": display_order,
            "non_numeric_fields": sorted(non_numeric_fields),
            "meta_fields": sorted(meta_fields),
            "excluded_fields": sorted(excluded_fields),
            "layout_reason": recommended_layout["reason"],
        },
    }
