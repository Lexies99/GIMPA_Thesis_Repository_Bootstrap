import urllib.request, urllib.parse, json, sys

sys.stdout.reconfigure(encoding='utf-8')

headers_base = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

data = urllib.parse.urlencode({'username': 'admin@gimpa.edu.gh', 'password': 'Admin12345'}).encode('utf-8')
req = urllib.request.Request(
    'https://thesis.manamatechnologies.com/api/auth/login',
    data=data,
    headers={'Content-Type': 'application/x-www-form-urlencoded', **headers_base}
)
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode())['access_token']

auth_headers = {'Authorization': f'Bearer {token}', **headers_base}
BASE = 'https://thesis.manamatechnologies.com/api'

endpoints = [
    ('GET', f'{BASE}/papers/stats'),
    ('GET', f'{BASE}/papers/me'),
    ('GET', f'{BASE}/dashboard/live-metrics'),
    ('GET', f'{BASE}/supervisors/capacities'),
    ('GET', f'{BASE}/reports/supervisor-comments'),
    ('GET', f'{BASE}/reports/overdue-reviews'),
    ('GET', f'{BASE}/users?limit=20'),
    ('GET', f'{BASE}/departments'),
    ('GET', f'{BASE}/theses/supervisor/advisees'),
    ('GET', f'{BASE}/theses/pipeline-metrics'),
    ('GET', f'{BASE}/theses/check-topic?title=Sample+Thesis+Title'),
]

for method, ep in endpoints:
    try:
        r = urllib.request.Request(ep, headers=auth_headers)
        with urllib.request.urlopen(r) as response:
            print(f'SUCCESS {response.status}: {method} {ep}')
    except urllib.error.HTTPError as he:
        body = he.read().decode('utf-8', errors='replace')
        print(f'FAIL {he.code}: {method} {ep} -> {body}')
    except Exception as ex:
        print(f'EXC: {method} {ep} -> {ex}')

print('\nTesting Admin Create User:')
create_payload = {
    'full_name': 'Dr. Test Lecturer',
    'email': 'dr.test.lecturer@gimpa.edu.gh',
    'role': 'lecturer',
    'school_id': 'LEC-999',
    'school': 'School of Technology and Social Sciences (SOTSS)',
    'department': 'Computer Science and Information Systems',
    'specialization': 'Computer Vision & Deep Learning',
    'research_interests': 'Vision, AI, Neural Networks',
    'max_student_ceiling': 5,
}
try:
    r_create = urllib.request.Request(
        f'{BASE}/admin/users',
        data=json.dumps(create_payload).encode('utf-8'),
        headers={'Content-Type': 'application/json', **auth_headers}
    )
    with urllib.request.urlopen(r_create) as resp_c:
        print(f'SUCCESS create-user: {resp_c.status}: {resp_c.read().decode("utf-8")}')
except urllib.error.HTTPError as he:
    print(f'FAIL create-user {he.code} -> {he.read().decode("utf-8", errors="replace")}')
except Exception as ex:
    print(f'EXC create-user -> {ex}')
