import aiosmtplib
from email.message import EmailMessage
from datetime import datetime
from app.core.config import settings


async def _send_email(to_email: str, subject: str, body: str):
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"[Email] SMTP not configured. Would send: {subject}")
        return False

    smtp_password = settings.SMTP_PASSWORD
    # Gmail app passwords are often copied with spaces (e.g. "abcd efgh ...").
    # Normalize only for Gmail to avoid auth failures from formatting.
    if settings.SMTP_HOST.strip().lower() == "smtp.gmail.com":
        smtp_password = smtp_password.replace(" ", "")

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
            password=smtp_password,
            start_tls=True,
        )
        print(f"[Email] Sent to {to_email}: {subject}")
        return True
    except Exception as e:
        print(f"[Email] Failed: {e}")
        return False


async def send_alert_email(to_email: str, subject: str, body: str):
    return await _send_email(to_email, subject, body)


async def send_invite_email(
    *,
    to_email: str,
    inviter_name: str,
    role: str,
    invite_url: str,
    expires_at: datetime,
):
    subject = "You are invited to Medical IoT Fleet"
    body = (
        f"Hello,\n\n"
        f"{inviter_name} invited you as '{role}' in Medical IoT Fleet.\n\n"
        f"Use this link to complete registration:\n"
        f"{invite_url}\n\n"
        f"This invite expires at: {expires_at.isoformat()} UTC\n\n"
        f"If you did not expect this, ignore this email."
    )
    return await _send_email(to_email, subject, body)
