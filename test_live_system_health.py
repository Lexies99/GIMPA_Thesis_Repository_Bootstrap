import requests
import json
import time

BASE = 'https://thesis.manamatechnologies.com/api'

def run_checks():
    print('1. Logging in as Admin...')
    try:
        login_res = requests.post(
            f'{BASE}/auth/login',
            data={'username': 'admin@gimpa.edu.gh', 'password': 'Admin12345'},
            timeout=15
        )
    except Exception as e:
        print('Login request error:', e)
        return False

    if login_res.status_code != 200:
        print(f'Login failed ({login_res.status_code}): {login_res.text[:200]}')
        return False
    
    token = login_res.json().get('access_token')
    print('Login successful. Access token obtained.')
    headers = {'Authorization': f'Bearer {token}'}

    endpoints = [
        ('Live Metrics (5-day overdue auto-alerts)', '/dashboard/live-metrics'),
        ('Specializations List', '/specializations'),
        ('All Papers', '/papers'),
        ('Pending Papers', '/papers/pending'),
        ('Pipeline Papers', '/papers/pipeline'),
        ('Paper Stats', '/papers/stats'),
        ('Supervisor Capacities', '/supervisors/capacities'),
        ('Departments', '/departments'),
        ('Notifications', '/notifications'),
        ('Overdue Reviews Report', '/reports/overdue-reviews'),
    ]

    all_ok = True
    print('\n2. Testing Endpoints:')
    for name, ep in endpoints:
        t0 = time.time()
        try:
            r = requests.get(f'{BASE}{ep}', headers=headers, timeout=20)
            elapsed = time.time() - t0
            if r.status_code == 200:
                print(f'  [PASS] {name} ({ep}) -> HTTP {r.status_code} ({elapsed:.2f}s, size: {len(r.text)} bytes)')
            else:
                print(f'  [FAIL] {name} ({ep}) -> HTTP {r.status_code} ({elapsed:.2f}s): {r.text[:200]}')
                all_ok = False
        except Exception as e:
            elapsed = time.time() - t0
            print(f'  [ERROR] {name} ({ep}) -> Exception ({elapsed:.2f}s): {e}')
            all_ok = False

    return all_ok

if __name__ == '__main__':
    run_checks()
