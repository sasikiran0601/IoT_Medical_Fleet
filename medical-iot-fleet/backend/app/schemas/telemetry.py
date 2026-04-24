from typing import Dict, List, Optional

from pydantic import BaseModel

from app.schemas.sensor_data import SensorDataOut


class TelemetryFieldConfig(BaseModel):
    label: str
    unit: Optional[str] = None
    preferred_chart: str
    priority: int
    group: str


class TelemetryGroup(BaseModel):
    id: str
    title: str
    fields: List[str]
    chart_type: str


class RecommendedLayout(BaseModel):
    mode: str
    primary_fields: List[str]
    secondary_fields: List[str] = []
    groups: List[TelemetryGroup] = []
    reason: str


class TelemetryDebug(BaseModel):
    payload_keys_seen: List[str]
    key_frequency: Dict[str, int]
    numeric_candidates: List[str]
    non_numeric_fields: List[str]
    meta_fields: List[str]
    excluded_fields: List[str]
    layout_reason: str


class TelemetryMeta(BaseModel):
    numeric_fields: List[str]
    meta_fields: List[str]
    excluded_fields: List[str]
    field_config: Dict[str, TelemetryFieldConfig]
    display_order: List[str]
    recommended_layout: RecommendedLayout
    debug: TelemetryDebug


class SensorHistoryResponse(BaseModel):
    records: List[SensorDataOut]
    telemetry_meta: TelemetryMeta
