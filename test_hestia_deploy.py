import urllib.request, urllib.parse, ssl, re, http.cookiejar

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), urllib.request.HTTPSHandler(context=ctx))

resp = opener.open('https://46.62.214.146:8083/login/')
html = resp.read().decode('utf-8', errors='replace')
token_match = re.search(r'name="token"\s+value="([^"]+)"', html)
tok = token_match.group(1) if token_match else ''

login_data = urllib.parse.urlencode({'user': 'admin', 'password': 'PsasaqecmCFNgu43wfkRgxMKR', 'token': tok}).encode('utf-8')
resp2 = opener.open(urllib.request.Request('https://46.62.214.146:8083/login/', data=login_data))
html2 = resp2.read().decode('utf-8', errors='replace')

if 'logout' in html2.lower():
    print("SUCCESS! Logged into HestiaCP as admin!")
else:
    print("HestiaCP login failed.")
