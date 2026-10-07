import urllib.request, ssl, re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request('https://thesis.manamatechnologies.com/', headers={'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache'})
resp = urllib.request.urlopen(req, context=ctx)
html = resp.read().decode('utf-8', errors='replace')
js_files = re.findall(r'src="(/assets/[^"]+\.js)"', html)
print('Found JS files in live HTML:', js_files)
for js in js_files:
    js_url = 'https://thesis.manamatechnologies.com' + js
    req_js = urllib.request.Request(js_url, headers={'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache'})
    js_content = urllib.request.urlopen(req_js, context=ctx).read().decode('utf-8', errors='replace')
    has_spec = 'Supervisor Research Specialization' in js_content or 'specialization' in js_content.lower()
    print(js, 'has_spec:', has_spec, 'len:', len(js_content))
