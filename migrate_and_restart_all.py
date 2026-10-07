import urllib.request, urllib.parse, http.cookiejar, ssl, re, time

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

# Run database schema migration on BOTH database files and restart backend
script = """import sqlite3

for db_path in ['/home/admin/web/thesis.manamatechnologies.com/app/gimpa_thesis.db', '/home/admin/web/thesis.manamatechnologies.com/app/backend/gimpa_thesis.db']:
    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        def add_col_if_missing(table, col, col_type):
            c.execute(f"PRAGMA table_info({table})")
            cols = [row[1] for row in c.fetchall()]
            if col not in cols:
                c.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
        add_col_if_missing('users', 'specialization', "TEXT DEFAULT ''")
        add_col_if_missing('users', 'research_interests', "TEXT DEFAULT ''")
        add_col_if_missing('users', 'max_student_ceiling', "INTEGER DEFAULT 5")
        add_col_if_missing('papers', 'plagiarism_score', "REAL DEFAULT 0.0")
        add_col_if_missing('papers', 'plagiarism_status', "TEXT DEFAULT 'clean'")
        add_col_if_missing('papers', 'plagiarism_report_json', "TEXT DEFAULT NULL")
        add_col_if_missing('papers', 'plagiarism_checked_at', "TEXT DEFAULT NULL")
        conn.commit()
        conn.close()
        print(f"Migrated {db_path} OK")
    except Exception as e:
        print(f"Error on {db_path}: {e}")
"""

cmd = f"""/bin/bash -c "python3 -c \\"{script}\\" > /tmp/migrate_both.log 2>&1; echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl restart gimpa-backend >> /tmp/migrate_both.log 2>&1; echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl restart gimpa-frontend >> /tmp/migrate_both.log 2>&1; echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl reload nginx >> /tmp/migrate_both.log 2>&1; echo 'DONE' >> /tmp/migrate_both.log" """

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
print('Scheduled migration and restart for both backend paths!')
