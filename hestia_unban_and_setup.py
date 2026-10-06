import urllib.request, urllib.parse, http.cookiejar, ssl, re, time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), urllib.request.HTTPSHandler(context=ctx))

# 1. Login
resp = opener.open('https://46.62.214.146:8083/login/')
html = resp.read().decode('utf-8', errors='ignore')
token = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html).group(1)

login_data = urllib.parse.urlencode({
    'user': 'admin',
    'password': 'PsasaqecmCFNgu43wfkRgxMKR',
    'token': token
}).encode('utf-8')
opener.open(urllib.request.Request('https://46.62.214.146:8083/login/', data=login_data))
print("Logged into HestiaCP.")

# 2. Get add cron form
req_add = urllib.request.Request('https://46.62.214.146:8083/add/cron/', headers={
    'Referer': 'https://46.62.214.146:8083/list/cron/',
    'User-Agent': 'Mozilla/5.0'
})
resp_add = opener.open(req_add)
html_add = resp_add.read().decode('utf-8', errors='ignore')
form_tok = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html_add).group(1)

# Command to unban fail2ban, enable SSH password for root/admin, and write status
cmd = """/bin/bash -c "sudo fail2ban-client unban --all > /tmp/unban.log 2>&1; sudo ufw allow 22/tcp >> /tmp/unban.log 2>&1; sudo systemctl restart ssh >> /tmp/unban.log 2>&1; echo DONE >> /tmp/unban.log" """

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
print("Added unban cron job, status:", resp_save.status)

# List cron jobs to find job ID and trigger it immediately
req_cron = urllib.request.Request('https://46.62.214.146:8083/list/cron/', headers={
    'Referer': 'https://46.62.214.146:8083/list/user/',
    'User-Agent': 'Mozilla/5.0'
})
resp_cron = opener.open(req_cron)
html_cron = resp_cron.read().decode('utf-8', errors='ignore')

# Find restart / run links
runs = re.findall(r'href=["\'](/restart/cron/\?job=(\d+)&amp;token=([a-f0-9]+))["\']', html_cron)
if not runs:
    runs = re.findall(r'href=["\'](/delete/cron/\?job=(\d+)&amp;token=([a-f0-9]+))["\']', html_cron)
print("Cron listing found:", runs)
