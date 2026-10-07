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

resp_cron = opener.open(urllib.request.Request('https://46.62.214.146:8083/list/cron/', headers={'Referer': 'https://46.62.214.146:8083/list/user/'}))
html_cron = resp_cron.read().decode('utf-8', errors='ignore')

import html as html_module
unescaped = html_module.unescape(html_cron)
delete_links = re.findall(r'/delete/cron/\?job=(\d+)&token=([a-f0-9]+)', unescaped)
print("Found delete links:", delete_links)

for job_id, tok in delete_links:
    del_url = f'https://46.62.214.146:8083/delete/cron/?job={job_id}&token={tok}'
    try:
        r = opener.open(urllib.request.Request(del_url, headers={'Referer': 'https://46.62.214.146:8083/list/cron/'}))
        print(f"Deleted cron job {job_id}, status: {r.status}")
    except Exception as e:
        print(f"Error deleting job {job_id}: {e}")

print("Cleaned up all old cron jobs.")
