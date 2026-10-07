import urllib.request, ssl, json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = 'https://thesis.manamatechnologies.com/'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, context=ctx) as r:
        html = r.read().decode('utf-8')
        print("Live HTML Title & Script tags:")
        for line in html.splitlines():
            if '<link rel="modulepreload"' in line or '<script' in line or '<title>' in line:
                print(line)
except Exception as e:
    print("Error fetching live HTML:", e)

import sys, os
sys.stdout.reconfigure(encoding='utf-8')

manifest_path = os.path.join(r'D:\NSS\GIMPA_Thesis_Repository_Bootstrap\frontend\build\client\.vite\manifest.json')
with open(manifest_path, 'r', encoding='utf-8') as f:
    mf = json.load(f)
    print("\nLocal manifest routes/home.tsx chunk:", mf.get('app/routes/home.tsx'))

home_chunk = mf.get('app/routes/home.tsx', {}).get('file')
if home_chunk:
    asset_url = f"https://thesis.manamatechnologies.com/{home_chunk}"
    try:
        with urllib.request.urlopen(urllib.request.Request(asset_url, headers={'User-Agent': 'Mozilla/5.0'}), context=ctx) as r:
            content = r.read().decode('utf-8')
            print(f"\nFetched {asset_url} from server! Length: {len(content)}")
            if "Alert Now" in content:
                print(">>> SUCCESS: 'Alert Now' is inside the uploaded bundle on the server!")
            else:
                print(">>> 'Alert Now' not found in uploaded chunk.")
    except Exception as e:
        print(f"Error fetching {asset_url}:", e)
