import urllib.request, urllib.error, urllib.parse, json, sys

sys.stdout.reconfigure(encoding='utf-8')

BASE = 'https://thesis.manamatechnologies.com/api'

# 1. Login with urlencoded
body = urllib.parse.urlencode({'username': 'admin@gimpa.edu.gh', 'password': 'Admin12345'}).encode('utf-8')
req = urllib.request.Request(
    f'{BASE}/auth/login',
    data=body,
    headers={'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0'}
)

try:
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        token = res.get('access_token') or res.get('token')
        print('Login success! Token acquired.')
except Exception as e:
    print('Login error:', e)
    token = None

if token:
    headers = {'Authorization': f'Bearer {token}', 'User-Agent': 'Mozilla/5.0'}
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
    ]

    for method, ep in endpoints:
        try:
            r = urllib.request.Request(ep, headers=headers)
            with urllib.request.urlopen(r) as response:
                print(f'SUCCESS: {method} {ep} -> {response.status}')
        except urllib.error.HTTPError as he:
            err_body = he.read().decode('utf-8', errors='replace')
            print(f'ERROR: {method} {ep} -> {he.code}: {err_body}')
        except Exception as ex:
            print(f'EXCEPTION: {method} {ep} -> {ex}')

    # Also test creating a lecturer account
    print('\nTesting create lecturer account:')
    create_payload = {
        'full_name': 'Test Lecturer Diagnosis',
        'email': 'testdiag.lecturer@gimpa.edu.gh',
        'role': 'lecturer',
        'school_id': 'LEC-DIAG-01',
        'school': 'School of Technology and Social Sciences (SOTSS)',
        'department': 'Computer Science and Information Systems',
        'specialization': 'Cloud Computing',
        'research_interests': 'Cloud, Distributed Systems',
        'max_student_ceiling': 5,
    }
    try:
        r_create = urllib.request.Request(
            f'{BASE}/admin/users',
            data=json.dumps(create_payload).encode('utf-8'),
            headers={'Content-Type': 'application/json', **headers}
        )
        with urllib.request.urlopen(r_create) as resp_c:
            print(f'SUCCESS create-user: {resp_c.status}: {resp_c.read().decode("utf-8")}')
    except urllib.error.HTTPError as he:
        print(f'ERROR create-user -> {he.code}: {he.read().decode("utf-8", errors="replace")}')
    except Exception as ex:
        print(f'EXCEPTION create-user -> {ex}')
