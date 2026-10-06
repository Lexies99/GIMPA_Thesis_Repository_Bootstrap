import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=20)

test_email_script = """
import sys
sys.path.insert(0, '/home/admin/web/thesis.manamatechnologies.com/app')

from app.core.config import settings
from app.services.email_service import send_notification_email

print("Current settings:")
print("  SMTP_HOST:", settings.smtp_host)
print("  SMTP_PORT:", settings.smtp_port)
print("  SMTP_USERNAME:", settings.smtp_username)
print("  SMTP_FROM_EMAIL:", settings.smtp_from_email)
print("  SMTP_ENABLED:", settings.smtp_enabled)
print("  SMTP_USE_TLS:", settings.smtp_use_tls)

print("Attempting to send test email to softwareresearchlab@gimpa.edu.gh...")
try:
    ok = send_notification_email(
        to_email=settings.smtp_username,
        to_name="Test Recipient",
        subject="[Diagnostic Test] GIMPA Thesis System SMTP Check",
        message="This is a test notification email to verify SMTP delivery on thesis.manamatechnologies.com."
    )
    print("Result of send_notification_email:", ok)
except Exception as e:
    import traceback
    print("Exception occurred:", type(e), e)
    traceback.print_exc()
"""

sftp = client.open_sftp()
with sftp.file('/tmp/test_email_diag.py', 'w') as f:
    f.write(test_email_script)
sftp.close()

stdin, stdout, stderr = client.exec_command("/home/admin/web/thesis.manamatechnologies.com/app/venv/bin/python3 /tmp/test_email_diag.py")
print("STDOUT:\n", stdout.read().decode())
print("STDERR:\n", stderr.read().decode())
client.close()
