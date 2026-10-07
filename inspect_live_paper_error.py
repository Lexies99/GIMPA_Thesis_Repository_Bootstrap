import urllib.request, urllib.parse, http.cookiejar, ssl, re, time, sys

sys.stdout.reconfigure(encoding='utf-8')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), urllib.request.HTTPSHandler(context=ctx))

# Login to HestiaCP
resp = opener.open('https://46.62.214.146:8083/login/')
html = resp.read().decode('utf-8', errors='ignore')
token = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html).group(1)

login_data = urllib.parse.urlencode({'user': 'admin', 'password': 'PsasaqecmCFNgu43wfkRgxMKR', 'token': token}).encode('utf-8')
opener.open(urllib.request.Request('https://46.62.214.146:8083/login/', data=login_data))

resp_cron = opener.open(urllib.request.Request('https://46.62.214.146:8083/list/cron/', headers={'Referer': 'https://46.62.214.146:8083/list/user/'}))
html_cron = resp_cron.read().decode('utf-8', errors='ignore')
import html as html_module
unescaped = html_module.unescape(html_cron)
delete_links = re.findall(r'/delete/cron/\?job=(\d+)&token=([a-f0-9]+)', unescaped)
for job_id, tok in set(delete_links):
    try:
        opener.open(urllib.request.Request(f'https://46.62.214.146:8083/delete/cron/?job={job_id}&token={tok}', headers={'Referer': 'https://46.62.214.146:8083/list/cron/'}))
    except Exception:
        pass

resp_add = opener.open(urllib.request.Request('https://46.62.214.146:8083/add/cron/', headers={'Referer': 'https://46.62.214.146:8083/list/cron/'}))
html_add = resp_add.read().decode('utf-8', errors='ignore')
form_tok = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html_add).group(1)

# Write test script that directly calls /api/papers handler in Python on server
script = """/bin/bash -c "LOG=/home/admin/web/thesis.manamatechnologies.com/public_html/diag_paper.txt; echo 'START' > \\$LOG; python3 -c \\"
import sys
sys.path.insert(0, '/home/admin/web/thesis.manamatechnologies.com/app')
try:
    from app.db.session import SessionLocal
    from app.models.paper import Paper
    from app.models.user import User
    from app.api.routes.papers import _to_paper_read, read_papers
    db = SessionLocal()
    admin = db.query(User).filter(User.email == 'admin@gimpa.edu.gh').first()
    print('Found admin:', admin.id)
    papers = db.query(Paper).all()
    print('Found total papers:', len(papers))
    for p in papers:
        try:
            r = _to_paper_read(p)
            print('Paper read ok:', p.id, p.title[:30])
        except Exception as e:
            print('ERROR converting paper', p.id, ':', repr(e))
            import traceback
            traceback.print_exc()
except Exception as e:
    print('CRITICAL:', repr(e))
    import traceback
    traceback.print_exc()
\\" >> \\$LOG 2>&1; echo 'DONE' >> \\$LOG 2>&1" """

post_data = urllib.parse.urlencode({
    'token': form_tok,
    'ok': 'Add',
    'v_min': '*',
    'v_hour': '*',
    'v_day': '*',
    'v_month': '*',
    'v_wday': '*',
    'v_cmd': script.strip()
}).encode('utf-8')

opener.open(urllib.request.Request('https://46.62.214.146:8083/add/cron/', data=post_data, headers={'Referer': 'https://46.62.214.146:8083/add/cron/'}))
print("Diagnostic cron added. Waiting 65s...")
time.sleep(65)

# Cleanup
resp_cron = opener.open(urllib.request.Request('https://46.62.214.146:8083/list/cron/', headers={'Referer': 'https://46.62.214.146:8083/list/user/'}))
html_cron = resp_cron.read().decode('utf-8', errors='ignore')
unescaped = html_module.unescape(html_cron)
delete_links = re.findall(r'/delete/cron/\?job=(\d+)&token=([a-f0-9]+)', unescaped)
for job_id, tok in set(delete_links):
    try:
        opener.open(urllib.request.Request(f'https://46.62.214.146:8083/delete/cron/?job={job_id}&token={tok}', headers={'Referer': 'https://46.62.214.146:8083/list/cron/'}))
    except Exception:
        pass

try:
    with urllib.request.urlopen(urllib.request.Request('https://thesis.manamatechnologies.com/diag_paper.txt', headers={'User-Agent': 'Mozilla/5.0'}), context=ctx) as f:
        print("DIAGNOSTIC OUTPUT:\n", f.read().decode('utf-8', errors='ignore'))
except Exception as e:
    print("Failed to read diag:", e)
