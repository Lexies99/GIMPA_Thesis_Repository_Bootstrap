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

# Command that builds frontend, syncs client files, and restarts services using sudo with echo password
cmd = """/bin/bash -c "LOG=/home/admin/web/thesis.manamatechnologies.com/public_html/build_run.log; echo 'BUILDING_FRONTEND' > $LOG; cd /home/admin/web/thesis.manamatechnologies.com/app/frontend >> $LOG 2>&1; npm run build >> $LOG 2>&1; cp -rf build/client/* /home/admin/web/thesis.manamatechnologies.com/public_html/ >> $LOG 2>&1; echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl restart gimpa-frontend >> $LOG 2>&1; echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl restart gimpa-backend >> $LOG 2>&1; echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl reload nginx >> $LOG 2>&1; echo 'BUILD_AND_RESTART_COMPLETED_SUCCESS' >> $LOG 2>&1" """

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
print('Scheduled build and restart job!')
