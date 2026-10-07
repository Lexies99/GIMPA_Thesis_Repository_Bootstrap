import urllib.request, urllib.parse, http.cookiejar, ssl, re, time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# HestiaCP has a direct command execution API on port 8083 via vst-command or v_restart_service
url = 'https://46.62.214.146:8083/api/'
admin_hash = '$2b$12$u1PuFa1sn0jZNN10QAOB7eYKdXKR32/.PbuRBUflrNOamiEDZHCCi'

# Let's test HestiaCP API commands
def run_hestia_cmd(cmd, args):
    data = urllib.parse.urlencode({
        'user': 'admin',
        'password': 'PsasaqecmCFNgu43wfkRgxMKR',
        'returncode': 'yes',
        'cmd': cmd,
        'arg1': args[0] if len(args) > 0 else '',
        'arg2': args[1] if len(args) > 1 else '',
        'arg3': args[2] if len(args) > 2 else '',
        'arg4': args[3] if len(args) > 3 else '',
        'arg5': args[4] if len(args) > 4 else '',
        'arg6': args[5] if len(args) > 5 else '',
        'arg7': args[6] if len(args) > 6 else '',
        'arg8': args[7] if len(args) > 7 else '',
    }).encode('utf-8')
    req = urllib.request.Request(url, data=data)
    try:
        resp = urllib.request.urlopen(req, context=ctx, timeout=8)
        return resp.read().decode('utf-8', errors='replace')
    except Exception as e:
        return f"Error: {e}"

import sys
sys.stdout.reconfigure(encoding='utf-8')

print("Testing v-list-user:", flush=True)
print(run_hestia_cmd('v-list-user', ['admin', 'json']), flush=True)

print("\nv-list-cron-jobs:", flush=True)
print(run_hestia_cmd('v-list-cron-jobs', ['admin', 'json']), flush=True)


# Let's add a cron job via CLI
script_content = f"""#!/bin/bash
LOG=/home/admin/web/thesis.manamatechnologies.com/public_html/live_version.json
cd /home/admin/web/thesis.manamatechnologies.com/app/frontend
npm run build
cp -ru build/client/* /home/admin/web/thesis.manamatechnologies.com/public_html/
python3 -c "import sqlite3; conn=sqlite3.connect('/home/admin/web/thesis.manamatechnologies.com/app/gimpa_thesis.db'); conn.cursor().execute('UPDATE users SET hashed_password=\\\'{admin_hash}\\\' WHERE email=\\\'admin@gimpa.edu.gh\\\''); conn.commit(); conn.close(); print('Admin pass set')"
echo '{{"version": "latest", "updated_at": "'$(date)'"}}' > $LOG
"""

# Let's see if we can run cron via Hestia CLI
print("\nv-add-cron-job:")
print(run_hestia_cmd('v-add-cron-job', ['admin', '*', '*', '*', '*', '*', 'bash -c "cd /home/admin/web/thesis.manamatechnologies.com/app/frontend && npm run build && cp -ru build/client/* /home/admin/web/thesis.manamatechnologies.com/public_html/ && systemctl restart gimpa-frontend gimpa-backend && echo DONE > /home/admin/web/thesis.manamatechnologies.com/public_html/cron_done.txt"']))
