import urllib.request, urllib.parse, http.cookiejar, ssl, re, html as html_module

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

resp_cron = opener.open(urllib.request.Request('https://46.62.214.146:8083/list/cron/', headers={'Referer': 'https://46.62.214.146:8083/list/user/'}))
html_cron = resp_cron.read().decode('utf-8', errors='ignore')

unescaped = html_module.unescape(html_cron)
jobs = re.findall(r'/edit/cron/\?job=(\d+)&token=([a-f0-9]+)', unescaped)
print('Current cron jobs in Hestia:', jobs)

for m in re.finditer(r'title="Edit Cron Job:\s*([^"]+)"', unescaped):
    print('  - Job cmd:', m.group(1)[:120])
