# MQTT topic constants
# Devices publish to:  hospital/{floor}/{room_no}/{bed_no}/{device_id}/data
# Server publishes to: hospital/{floor}/{room_no}/{bed_no}/{device_id}/cmd
#                      hospital/{floor}/{room_no}/{bed_no}/{device_id}/ota

DEVICE_DATA = "hospital/{floor}/{room_no}/{bed_no}/{device_id}/data"
DEVICE_CMD = "hospital/{floor}/{room_no}/{bed_no}/{device_id}/cmd"
DEVICE_OTA = "hospital/{floor}/{room_no}/{bed_no}/{device_id}/ota"

# Example: hospital/floor1/room101/bed1/DEV-001/data
WILDCARD_DATA = "hospital/+/+/+/+/data"


def extract_device_id(topic: str) -> str:
    """Extract device_id from topic like hospital/floor1/room101/bed1/DEV-001/data."""
    parts = topic.split("/")
    if len(parts) == 6 and parts[0] == "hospital" and parts[-1] == "data":
        return parts[4]
    return ""
