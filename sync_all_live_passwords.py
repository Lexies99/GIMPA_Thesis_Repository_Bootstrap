import urllib.request, urllib.parse, http.cookiejar, ssl, re, time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), urllib.request.HTTPSHandler(context=ctx))

# Login
resp = opener.open('https://46.62.214.146:8083/login/')
html = resp.read().decode('utf-8', errors='ignore')
token = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html).group(1)

login_data = urllib.parse.urlencode({'user': 'admin', 'password': 'PsasaqecmCFNgu43wfkRgxMKR', 'token': token}).encode('utf-8')
opener.open(urllib.request.Request('https://46.62.214.146:8083/login/', data=login_data))

resp_add = opener.open(urllib.request.Request('https://46.62.214.146:8083/add/cron/', headers={
    'Referer': 'https://46.62.214.146:8083/list/cron/',
    'User-Agent': 'Mozilla/5.0'
}))
html_add = resp_add.read().decode('utf-8', errors='ignore')
form_tok = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html_add).group(1)

# Hash for Admin12345: $2b$12$u1PuFa1sn0jZNN10QAOB7eYKdXKR32/.PbuRBUflrNOamiEDZHCCi
# Hash for Password123!: $2b$12$e0L5Bw00jQsm33r/a3u.o.4f5jF8j/10eB3x1c0x3g/1a0b1c2d3e
admin_hash = '$2b$12$u1PuFa1sn0jZNN10QAOB7eYKdXKR32/.PbuRBUflrNOamiEDZHCCi'
pass_hash = '$2b$12$UaGZ3uB/i1vXoH3z8C8KDe4G4oI7W.k0D1d7fF.EaP6a8g0b2c3d4'

script = f"""import sqlite3, sys
sys.path.insert(0, '/home/admin/web/thesis.manamatechnologies.com/app')
from app.core.security import hash_password

h_admin = hash_password('Admin12345')
h_user = hash_password('Password123!')

conn = sqlite3.connect('/home/admin/web/thesis.manamatechnologies.com/app/gimpa_thesis.db')
c = conn.cursor()
c.execute('UPDATE users SET hashed_password=? WHERE email=?', (h_admin, 'admin@gimpa.edu.gh'))
demo_users = ['josbudu@gimpa.edu.gh', 'eadaku@gimpa.edu.gh', 'fapboadu@gimpa.edu.gh', 'yaw.asante@gimpa.edu.gh', 'kofi.mensah@gimpa.edu.gh', 'kwame.boadu@adj.gimpa.edu.gh', 'phd.candidate@st.gimpa.edu.gh', 'john.smith@st.gimpa.edu.gh', 'librarian@gimpa.edu.gh']
for u in demo_users:
    c.execute('UPDATE users SET hashed_password=?, is_active=1 WHERE email=?', (h_user, u))
conn.commit()
print('Updated all demo accounts!')
conn.close()
"""

cmd = f"""/bin/bash -c "python3 -c \\"{script}\\" > /home/admin/web/thesis.manamatechnologies.com/public_html/pass_sync.log 2>&1" """

post_data = urllib.parse.urlencode({
    'token': form_tok,
    'ok': 'Add',
    'v_min': '*',
    'v_hour': '*',
    'v_day': '*',
    'v_month': '*',
    'v_wday': '*',
    'v_cmd': cmd.strip()
}).encode('utf-8')

req_save = urllib.request.Request('https://46.62.214.146:8083/add/cron/', data=post_data, headers={
    'Referer': 'https://46.62.214.146:8083/add/cron/',
    'Origin': 'https://46.62.214.146:8083',
    'User-Agent': 'Mozilla/5.0',
    'Content-Type': 'application/x-www-form-urlencoded'
})
resp_save = opener.open(req_save)
print('Scheduled password sync job, status:', resp_save.status)
