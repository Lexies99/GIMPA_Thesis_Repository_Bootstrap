from __future__ import annotations

import logging
import smtplib
import time
from email.message import EmailMessage
from email.utils import formatdate, make_msgid

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

    from_label = (settings.smtp_from_name or "GIMPA Thesis Management System").strip()
    email = EmailMessage()
    email["From"] = f"{from_label} <{settings.smtp_from_email}>"
    email["To"] = to_email
    email["Subject"] = subject
    email["Date"] = formatdate(localtime=True)
    domain = settings.smtp_from_email.partition("@")[2] or "thesis.manamatechnologies.com"
    email["Message-ID"] = make_msgid(domain=domain)

    greeting_name = (to_name or "").strip() or "User"
    email.set_content(
        f"Dear {greeting_name},\n\n"
        f"{message}\n\n"
        "----------------------------------------------------------------------\n"
        "Login Portal: https://thesis.manamatechnologies.com/login\n\n"
        "This is an automated notification from the GIMPA Thesis Management System.\n"
        "If you have any questions, please contact your department Project Coordinator, HOD, or System Administrator.\n\n"
        "Best regards,\n"
        "GIMPA Thesis Management System\n"
        "Ghana Institute of Management and Public Administration (GIMPA)"
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
                    local_hostname="localhost",
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


def send_batch_emails(emails: list[dict[str, str]]) -> int:
    """Send a batch of notification emails using a single persistent SMTP connection."""
    if not settings.smtp_enabled or not emails:
        return 0
    if not settings.smtp_host or not settings.smtp_from_email:
        logger.warning("SMTP is enabled but SMTP_HOST or SMTP_FROM_EMAIL is missing for batch send")
        return 0

    from_label = (settings.smtp_from_name or "GIMPA Thesis Management System").strip()
    domain = settings.smtp_from_email.partition("@")[2] or "thesis.manamatechnologies.com"
    sent_count = 0

    try:
        if settings.smtp_use_ssl:
            smtp = smtplib.SMTP_SSL(
                host=settings.smtp_host,
                port=settings.smtp_port,
                timeout=settings.smtp_timeout_seconds,
            )
        else:
            smtp = smtplib.SMTP(
                host=settings.smtp_host,
                port=settings.smtp_port,
                timeout=settings.smtp_timeout_seconds,
                local_hostname="localhost",
            )
            if settings.smtp_use_tls:
                smtp.starttls()
        _login_if_needed(smtp)
    except Exception:
        logger.exception("Failed to connect/authenticate with SMTP server for batch send")
        return 0

    with smtp:
        for item in emails:
            to_email = item.get("to_email")
            if not to_email:
                continue
            to_name = item.get("to_name") or ""
            subject = item.get("subject") or "GIMPA Thesis Management System Notification"
            message = item.get("message") or ""

            msg = EmailMessage()
            msg["From"] = f"{from_label} <{settings.smtp_from_email}>"
            msg["To"] = to_email
            msg["Subject"] = subject
            msg["Date"] = formatdate(localtime=True)
            msg["Message-ID"] = make_msgid(domain=domain)

            greeting_name = to_name.strip() or "User"
            msg.set_content(
                f"Dear {greeting_name},\n\n"
                f"{message}\n\n"
                "----------------------------------------------------------------------\n"
                "Login Portal: https://thesis.manamatechnologies.com/login\n\n"
                "This is an automated notification from the GIMPA Thesis Management System.\n"
                "If you have any questions, please contact your department Project Coordinator, HOD, or System Administrator.\n\n"
                "Best regards,\n"
                "GIMPA Thesis Management System\n"
                "Ghana Institute of Management and Public Administration (GIMPA)"
            )

            try:
                smtp.send_message(msg)
                sent_count += 1
            except Exception:
                logger.exception("Failed to send batch email to %s", to_email)
            # Gentle delay to comply with provider rate limits
            time.sleep(0.2)

    logger.info("Batch email sending completed: %d/%d sent", sent_count, len(emails))
    return sent_count

