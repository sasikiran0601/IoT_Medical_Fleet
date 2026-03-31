export const DEVICE_TYPES = [
    "ECG",
    "Pulse Oximeter",
    "Ventilator",
    "Temperature Sensor",
    "Blood Pressure",
    "IV Pump",
    "Infusion Pump",
    "Defibrillator",
];

export const ROLES = ["admin", "doctor", "nurse", "viewer"];

export const ALERT_TYPES = ["OFFLINE", "LONG_RUNNING", "ANOMALY", "LOW_CONFIDENCE"];

export const CONFIDENCE_COLOR = (score) => {
    if (score >= 80) return "text-success-light";
    if (score >= 50) return "text-warning-light";
    return "text-error-light";
};

export const CONFIDENCE_BG = (score) => {
    if (score >= 80) return "bg-success";
    if (score >= 50) return "bg-warning";
    return "bg-error";
};
