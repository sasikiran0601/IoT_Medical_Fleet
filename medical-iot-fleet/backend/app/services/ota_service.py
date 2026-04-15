from sqlalchemy.ext.asyncio import AsyncSession
from app.models.device import Device
from app.services.device_service import log_action


async def push_ota_update(
    db: AsyncSession,
    device: Device,
    firmware_version: str,
    user_id: str,
):
    """
    Trigger OTA firmware update for a device.
    In production this would publish to MQTT topic:
    hospital/{floor}/{room_no}/{bed_no}/{device_id}/ota
    For now it updates the firmware version in the DB and logs the action.
    """
    old_version = device.firmware_version
    device.firmware_version = firmware_version
    await db.commit()

    await log_action(
        db,
        device_id=device.id,
        user_id=user_id,
        action="OTA_UPDATE",
        purpose=f"Firmware updated from {old_version} to {firmware_version}",
    )
    return {"status": "OTA triggered", "new_version": firmware_version}
