# MQTT topic constants
# Devices publish to:  hospital/{floor}/{room_no}/{bed_no}/{device_id}/data
# Server publishes to: hospital/{floor}/{room_no}/{bed_no}/{device_id}/cmd
#                      hospital/{floor}/{room_no}/{bed_no}/{device_id}/ota

DEVICE_DATA = "hospital/{floor}/{room_no}/{bed_no}/{device_id}/data"
DEVICE_STATUS = "hospital/{floor}/{room_no}/{bed_no}/{device_id}/status"
DEVICE_CMD = "hospital/{floor}/{room_no}/{bed_no}/{device_id}/cmd"
DEVICE_OTA = "hospital/{floor}/{room_no}/{bed_no}/{device_id}/ota"

# Example: hospital/floor1/room101/bed1/DEV-001/data
WILDCARD_DATA = "hospital/+/+/+/+/data"
WILDCARD_STATUS = "hospital/+/+/+/+/status"


def extract_device_id(topic: str) -> str:
    """Extract device_id from topic like hospital/floor1/room101/bed1/DEV-001/{data|status}."""
    parts = topic.split("/")
    if len(parts) == 6 and parts[0] == "hospital" and parts[-1] in {"data", "status"}:
        return parts[4]
    return ""


def extract_topic_context(topic: str) -> dict:
    parts = topic.split("/")
    if len(parts) != 6 or parts[0] != "hospital" or parts[-1] not in {"data", "status"}:
        return {}
    return {
        "floor": parts[1],
        "room": parts[2],
        "bed": parts[3],
        "device_id": parts[4],
        "kind": parts[5],
    }
