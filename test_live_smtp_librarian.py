import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=20)

test_email_script = """
import sys
sys.path.insert(0, '/home/admin/web/thesis.manamatechnologies.com/app')

from app.services.email_service import send_notification_email

print("Sending test email to librarian@gimpa.edu.gh...")
try:
    ok = send_notification_email(
        to_email="librarian@gimpa.edu.gh",
        to_name="Samuel Laryea",
        subject="Welcome to GIMPA Thesis Management System - Account Created",
        message="Your account has been created successfully. Login details:\\n- Email: librarian@gimpa.edu.gh\\n- Temporary Password: Librarian@2026!\\n\\nPlease sign in at https://thesis.manamatechnologies.com/login"
    )
    print("Result of send_notification_email:", ok)
except Exception as e:
    import traceback
    print("Exception occurred:", type(e), e)
    traceback.print_exc()
"""

sftp = client.open_sftp()
with sftp.file('/tmp/test_email_librarian.py', 'w') as f:
    f.write(test_email_script)
sftp.close()

stdin, stdout, stderr = client.exec_command("/home/admin/web/thesis.manamatechnologies.com/app/venv/bin/python3 /tmp/test_email_librarian.py")
print("STDOUT:\n", stdout.read().decode())
print("STDERR:\n", stderr.read().decode())
client.close()
