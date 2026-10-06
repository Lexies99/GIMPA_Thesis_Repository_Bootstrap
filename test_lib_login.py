import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=20)

test_script = """
import urllib.request, urllib.parse, json

data = urllib.parse.urlencode({"username": "librarian@gimpa.edu.gh", "password": "Librarian@2026!"}).encode("utf-8")
req = urllib.request.Request("http://127.0.0.1:8011/api/auth/login", data=data)
try:
    with urllib.request.urlopen(req) as resp:
        print("LOGIN_SUCCESS:", resp.status, resp.read().decode())
except Exception as e:
    print("LOGIN_FAILED:", e)
"""

sftp = client.open_sftp()
with sftp.file('/tmp/test_lib_login.py', 'w') as f:
    f.write(test_script)
sftp.close()

stdin, stdout, stderr = client.exec_command("/home/admin/web/thesis.manamatechnologies.com/app/venv/bin/python3 /tmp/test_lib_login.py")
print("STDOUT:\n", stdout.read().decode())
print("STDERR:\n", stderr.read().decode())
client.close()
