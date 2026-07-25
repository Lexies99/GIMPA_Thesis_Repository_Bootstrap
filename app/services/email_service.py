from __future__ import annotations

import logging
import smtplib
import time
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_notification_email(
    *,
    to_email: str,
    to_name: str | None,
    subject: str,
    message: str,
    attachments: list[tuple[str, bytes, str]] | None = None,
) -> bool:
    if not settings.smtp_enabled:
        return False

    if not settings.smtp_host or not settings.smtp_from_email:
        logger.warning("SMTP is enabled but SMTP_HOST or SMTP_FROM_EMAIL is missing")
        return False

    email = EmailMessage()
    from_label = settings.smtp_from_name.strip() if settings.smtp_from_name else "Gimpa Research Repository"
    email["From"] = f"{from_label} <{settings.smtp_from_email}>"
    email["To"] = to_email
    email["Subject"] = subject

    greeting_name = (to_name or "").strip() or "User"
    email.set_content(
        f"Hello {greeting_name},\n\n"
        f"{message}\n\n"
        "This is an automated message from Gimpa Research Repository.\n"
        "If you need help, please contact your system administrator.\n\n"
        "Regards,\n"
        "Gimpa Research Repository Team"
    )

    for item in attachments or []:
        try:
            filename, data, mime_type = item
            if not data:
                continue
            main_type, _, sub_type = (mime_type or "application/octet-stream").partition("/")
            if not main_type or not sub_type:
                main_type, sub_type = "application", "octet-stream"
            email.add_attachment(
                data,
                maintype=main_type,
                subtype=sub_type,
                filename=filename or "attachment.bin",
            )
        except Exception:
            logger.exception("Failed to attach file to notification email")

    attempts = max(1, int(settings.smtp_max_retries))
    backoff = max(0.0, float(settings.smtp_retry_backoff_seconds))
    for attempt in range(1, attempts + 1):
        try:
            if settings.smtp_use_ssl:
                with smtplib.SMTP_SSL(
                    host=settings.smtp_host,
                    port=settings.smtp_port,
                    timeout=settings.smtp_timeout_seconds,
                ) as smtp:
                    _login_if_needed(smtp)
                    smtp.send_message(email)
            else:
                with smtplib.SMTP(
                    host=settings.smtp_host,
                    port=settings.smtp_port,
                    timeout=settings.smtp_timeout_seconds,
                ) as smtp:
                    if settings.smtp_use_tls:
                        smtp.starttls()
                    _login_if_needed(smtp)
                    smtp.send_message(email)
            return True
        except Exception:
            logger.exception(
                "Failed to send notification email to %s (attempt %s/%s)",
                to_email,
                attempt,
                attempts,
            )
            if attempt < attempts and backoff > 0:
                time.sleep(backoff * attempt)
    return False


def _login_if_needed(smtp: smtplib.SMTP) -> None:
    if settings.smtp_username and settings.smtp_password:
        # Allow Gmail app passwords copied with visual spacing.
        smtp.login(settings.smtp_username, settings.smtp_password.replace(" ", ""))
