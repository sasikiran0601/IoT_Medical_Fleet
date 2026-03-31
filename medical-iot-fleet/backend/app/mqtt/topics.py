# MQTT topic constants
# Devices publish to:  DEVICE_DATA  (sensor readings)
# Server publishes to: DEVICE_CMD   (on/off commands)
#                      DEVICE_OTA   (firmware update trigger)

DEVICE_DATA = "hospital/devices/{device_id}/data"
DEVICE_CMD  = "hospital/devices/{device_id}/cmd"
DEVICE_OTA  = "hospital/devices/{device_id}/ota"

WILDCARD_DATA = "hospital/devices/+/data"


def extract_device_id(topic: str) -> str:
    """Extract device_id from topic string like hospital/devices/DEV-001/data"""
    parts = topic.split("/")
    return parts[2] if len(parts) >= 3 else ""