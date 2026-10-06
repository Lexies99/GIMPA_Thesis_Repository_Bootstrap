import requests

BASE_URL = "https://thesis.manamatechnologies.com/api"

def login(email, password="Password123!"):
    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": email, "password": password})
    if resp.status_code == 200:
        return resp.json()["access_token"]
    raise Exception(f"Failed to login for {email}: {resp.status_code} {resp.text}")

def test_reminders():
    print("Testing Regulatory Early-Warning Reminders Dispatch...")

    # 1. Test student cannot dispatch reminders (should return 403 Forbidden)
    tok_student = login("phd.candidate@st.gimpa.edu.gh")
    r_st = requests.post(f"{BASE_URL}/phd/regulatory-reminders", headers={"Authorization": f"Bearer {tok_student}"})
    print(f"1. PhD Student dispatch attempt: status={r_st.status_code} (detail: {r_st.json().get('detail')})")
    assert r_st.status_code == 403, "Student must NOT be able to dispatch reminders!"

    # 2. Test Assigned Supervisor dispatching reminders for supervisee
    tok_sup = login("josbudu@gimpa.edu.gh")
    r_sup = requests.post(f"{BASE_URL}/phd/regulatory-reminders", headers={"Authorization": f"Bearer {tok_sup}"})
    print(f"\n2. Supervisor (josbudu@gimpa.edu.gh) dispatch: status={r_sup.status_code}")
    data_sup = r_sup.json()
    print("   Response:", data_sup)
    assert data_sup.get("success") is True
    print(f"   [PASS] Successfully evaluated {data_sup.get('candidates_evaluated')} candidates, found {data_sup.get('inactive_candidates_found')} inactive, sent {data_sup.get('students_notified')} student notices and {data_sup.get('supervisors_notified')} supervisor alerts.")

    # 3. Test Dean of Business School dispatching reminders
    tok_dean = login("eadaku@gimpa.edu.gh")
    r_dean = requests.post(f"{BASE_URL}/phd/regulatory-reminders", headers={"Authorization": f"Bearer {tok_dean}"})
    print(f"\n3. Dean (eadaku@gimpa.edu.gh) dispatch: status={r_dean.status_code}")
    data_dean = r_dean.json()
    print("   Response:", data_dean)
    assert data_dean.get("success") is True

    # 4. Check that student has received an in-app notification
    r_notif = requests.get(f"{BASE_URL}/notifications", headers={"Authorization": f"Bearer {tok_student}"})
    print(f"\n4. Checking student notifications: status={r_notif.status_code}")
    notifs = r_notif.json()
    recent_phd_notifs = [n for n in notifs if "phd_supervision_inactivity" in n.get("type", "") or "Regulatory" in n.get("message", "")]
    print(f"   Found {len(recent_phd_notifs)} PhD regulatory notifications for candidate.")
    if recent_phd_notifs:
        print("   Latest notification message snippet:")
        print("   ", recent_phd_notifs[0]["message"][:200].replace("\n", " "))
    assert len(recent_phd_notifs) > 0, "Candidate must have received the in-app early warning notice!"

    print("\n[ALL TESTS PASSED] Regulatory early-warning email reminder system is fully functional!")

if __name__ == "__main__":
    test_reminders()
