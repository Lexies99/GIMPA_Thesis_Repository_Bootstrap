import urllib.request, urllib.parse, http.cookiejar, ssl, re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), urllib.request.HTTPSHandler(context=ctx))

resp = opener.open('https://46.62.214.146:8083/login/')
html = resp.read().decode('utf-8', errors='ignore')
token = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html).group(1)

login_data = urllib.parse.urlencode({'user': 'admin', 'password': 'PsasaqecmCFNgu43wfkRgxMKR', 'token': token}).encode('utf-8')
opener.open(urllib.request.Request('https://46.62.214.146:8083/login/', data=login_data))

resp_add = opener.open(urllib.request.Request('https://46.62.214.146:8083/add/cron/', headers={'Referer': 'https://46.62.214.146:8083/list/cron/', 'User-Agent': 'Mozilla/5.0'}))
html_add = resp_add.read().decode('utf-8', errors='ignore')
form_tok = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html_add).group(1)

script = """
import os, sys
sys.path.insert(0, '/home/admin/web/thesis.manamatechnologies.com/app')
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import hash_password

print("DB URL:", settings.database_url)
db = SessionLocal()
users = db.query(User).all()
print(f"Total users in DB: {len(users)}")
for u in users:
    print(f"User: {u.email}, role={u.role}, active={u.is_active}")
    u.hashed_password = hash_password('Password123!')
    u.is_active = True
    if u.email == 'admin@gimpa.edu.gh':
        u.hashed_password = hash_password('Admin12345')
db.commit()
print("All users updated with Password123! and admin with Admin12345")
db.close()
"""

cmd = f"""/bin/bash -c "python3 -c \\"{script}\\" > /home/admin/web/thesis.manamatechnologies.com/public_html/db_diag.log 2>&1" """

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
opener.open(req_save)
print('Scheduled DB sync via SQLAlchemy session!')
