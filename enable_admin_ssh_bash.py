import urllib.request, urllib.parse, http.cookiejar, ssl, re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), urllib.request.HTTPSHandler(context=ctx))

# 1. Login to HestiaCP
resp = opener.open('https://46.62.214.146:8083/login/')
html = resp.read().decode('utf-8', errors='ignore')
token = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html).group(1)

login_data = urllib.parse.urlencode({'user': 'admin', 'password': 'PsasaqecmCFNgu43wfkRgxMKR', 'token': token}).encode('utf-8')
opener.open(urllib.request.Request('https://46.62.214.146:8083/login/', data=login_data))

# 2. Get edit user page for admin
resp_edit = opener.open(urllib.request.Request('https://46.62.214.146:8083/edit/user/?user=admin', headers={'Referer': 'https://46.62.214.146:8083/list/user/'}))
html_edit = resp_edit.read().decode('utf-8', errors='ignore')
form_tok = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html_edit).group(1)

# Extract form fields
fields = {}
for m in re.finditer(r'<input[^>]+name=["\']([^"\']+)["\'][^>]*value=["\']([^"\']*)["\']', html_edit):
    fields[m.group(1)] = m.group(2)

print('Current user edit fields:', fields.keys())

# Update SSH Access to bash
post_data = {
    'token': form_tok,
    'save': 'Save',
    'v_email': fields.get('v_email', 'admin@46.62.214.146'),
    'v_name': fields.get('v_name', 'admin'),
    'v_package': fields.get('v_package', 'default'),
    'v_language': fields.get('v_language', 'en'),
    'v_shell': 'bash',  # Set SSH Shell to bash!
}

req_save = urllib.request.Request('https://46.62.214.146:8083/edit/user/?user=admin', data=urllib.parse.urlencode(post_data).encode('utf-8'), headers={
    'Referer': 'https://46.62.214.146:8083/edit/user/?user=admin',
    'Origin': 'https://46.62.214.146:8083',
    'User-Agent': 'Mozilla/5.0',
    'Content-Type': 'application/x-www-form-urlencoded'
})
resp_save = opener.open(req_save)
print('Updated SSH access for admin to bash! Status:', resp_save.status)
