"""SMTP delivery: never record a reply that was not accepted by SMTP."""
import smtplib
import ssl
from email.message import EmailMessage

from fastapi import HTTPException


def send_reply(settings, recipient: str, question: str, body: str) -> None:
    if not settings.smtp_host:
        raise HTTPException(503, "Email delivery is not configured")
    message = EmailMessage()
    try:
        message["From"] = settings.mail_from
        message["To"] = recipient
        message["Subject"] = "MUICT Dev Club — reply to your inquiry"
        message.set_content(f"{body}\n\nYour question:\n{question}\n")
        smtp_class = smtplib.SMTP_SSL if settings.smtp_ssl else smtplib.SMTP
        kwargs = {"timeout": 20}
        if settings.smtp_ssl:
            kwargs["context"] = ssl.create_default_context()
        with smtp_class(settings.smtp_host, settings.smtp_port, **kwargs) as smtp:
            if settings.smtp_starttls and not settings.smtp_ssl:
                smtp.starttls(context=ssl.create_default_context())
            if settings.smtp_username:
                smtp.login(settings.smtp_username, settings.smtp_password or "")
            refused = smtp.send_message(message)
            if refused:
                raise smtplib.SMTPRecipientsRefused(refused)
    except (OSError, smtplib.SMTPException, ValueError) as exc:
        raise HTTPException(502, "Email delivery failed") from exc
