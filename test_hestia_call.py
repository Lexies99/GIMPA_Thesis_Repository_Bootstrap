import urllib.request, urllib.parse, ssl, sys
sys.stdout.reconfigure(encoding='utf-8')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

data = urllib.parse.urlencode({
    'user': 'admin',
    'password': 'PsasaqecmCFNgu43wfkRgxMKR',
    'cmd': 'v-restart-service',
    'arg1': 'nginx',
    'returncode': 'yes'
}).encode('utf-8')

req = urllib.request.Request('https://46.62.214.146:8083/api/', data=data)
try:
    with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
        print("API Response:", resp.read().decode('utf-8'))
except Exception as e:
    print("API Error:", e)
