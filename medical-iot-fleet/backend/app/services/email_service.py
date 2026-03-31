import aiosmtplib
from email.message import EmailMessage
from app.core.config import settings


async def send_alert_email(to_email: str, subject: str, body: str):
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"[Email] SMTP not configured. Would send: {subject}")
        return

    msg = EmailMessage()
    msg["From"] = settings.SMTP_USER
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
        print(f"[Email] Alert sent to {to_email}")
    except Exception as e:
        print(f"[Email] Failed: {e}")