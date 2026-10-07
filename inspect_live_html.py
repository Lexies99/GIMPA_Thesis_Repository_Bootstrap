import urllib.request, re, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request('https://thesis.manamatechnologies.com/', headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req, context=ctx).read().decode('utf-8')
print("=== HTML OF LIVE SITE (first 2000 chars) ===")
print(html[:2000])

assets = re.findall(r'/assets/[a-zA-Z0-9_\.\-]+', html)
print("\n=== ASSETS FOUND IN HTML ===")
print(assets)

for a in set(assets):
    if a.endswith('.js') and 'home' in a:
        js_url = 'https://thesis.manamatechnologies.com' + a
        req_js = urllib.request.Request(js_url, headers={'User-Agent': 'Mozilla/5.0'})
        js_code = urllib.request.urlopen(req_js, context=ctx).read().decode('utf-8', errors='ignore')
        print(f"\nSearching in {a}:")
        if 'Dispatch SLA Alerts' in js_code:
            print("FOUND 'Dispatch SLA Alerts' in JS!")
        elif 'Sync & Dispatch Alerts Now' in js_code:
            print("FOUND OLD 'Sync & Dispatch Alerts Now' in JS!")
        else:
            print("Neither string found directly.")
