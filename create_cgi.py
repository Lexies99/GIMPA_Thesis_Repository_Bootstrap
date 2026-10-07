import paramiko, stat

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='admin', password='PsasaqecmCFNgu43wfkRgxMKR', timeout=15)
sftp = client.open_sftp()

cgi_code = """#!/usr/bin/env python3
import os, sys, subprocess

print("Content-Type: text/plain\\n")
print("=== RESTARTING SERVICES VIA CGI ===")

try:
    os.system("pkill -9 -f 'react-router-serve'")
    os.system("pkill -9 -f 'node.*9011'")
    print("Old node processes killed.")
    cmd = "cd /home/admin/web/thesis.manamatechnologies.com/app/frontend && PORT=9011 nohup npx react-router-serve ./build/server/index.js --port 9011 > /tmp/frontend_9011.log 2>&1 &"
    os.system(cmd)
    print("New node server started on port 9011!")
except Exception as e:
    print("Error:", e)
"""

remote_cgi = '/home/admin/web/thesis.manamatechnologies.com/cgi-bin/restart.cgi'
with sftp.open(remote_cgi, 'w') as f:
    f.write(cgi_code)

sftp.chmod(remote_cgi, 0o755)
print("Uploaded and chmod 755 to restart.cgi!")
sftp.close()
client.close()
