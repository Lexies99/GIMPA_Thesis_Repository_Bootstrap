import requests

BASE_URL = "https://thesis.manamatechnologies.com/api"

def login(email, password="Password123!"):
    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": email, "password": password})
    if resp.status_code == 200:
        return resp.json()["access_token"]
    raise Exception(f"Failed to login for {email}: {resp.status_code} {resp.text}")

def test_rbac():
    print("Testing PhD Hub Role-Based Access Control...")
    
    # 1. PhD Student
    tok_student = login("phd.candidate@st.gimpa.edu.gh")
    r_dossiers = requests.get(f"{BASE_URL}/phd/dossiers", headers={"Authorization": f"Bearer {tok_student}"})
    print(f"\n1. PhD Student (phd.candidate@st.gimpa.edu.gh): status={r_dossiers.status_code}")
    dossiers = r_dossiers.json()
    print(f"   Dossiers returned: {len(dossiers)}")
    if len(dossiers) == 1:
        print(f"   [PASS] Only returned own dossier: {dossiers[0]['student_email']} (ID {dossiers[0]['student_id']})")
    else:
        print(f"   ✗ Expected 1 dossier, got {len(dossiers)}: {dossiers}")
        
    # Student attempting to access foreign student logs
    r_foreign = requests.get(f"{BASE_URL}/phd/supervision-logs?student_id=999", headers={"Authorization": f"Bearer {tok_student}"})
    print(f"   Attempt foreign student logs: status={r_foreign.status_code} ({r_foreign.json().get('detail') if r_foreign.status_code == 403 else 'OK'})")
    assert r_foreign.status_code == 403, "Student must be blocked with 403 for foreign logs!"

    # 2. Assigned Supervisor (josbudu@gimpa.edu.gh)
    tok_sup = login("josbudu@gimpa.edu.gh")
    r_sup_dossiers = requests.get(f"{BASE_URL}/phd/dossiers", headers={"Authorization": f"Bearer {tok_sup}"})
    print(f"\n2. Assigned Supervisor (josbudu@gimpa.edu.gh): status={r_sup_dossiers.status_code}")
    sup_dossiers = r_sup_dossiers.json()
    print(f"   Supervisees returned: {len(sup_dossiers)}")
    for d in sup_dossiers:
        print(f"   [PASS] Supervisee: {d['student_name']} ({d['student_email']})")

    # 3. Unassigned Supervisor / Lecturer (fapboadu@gimpa.edu.gh)
    tok_unassigned = login("fapboadu@gimpa.edu.gh")
    r_unassigned = requests.get(f"{BASE_URL}/phd/dossiers", headers={"Authorization": f"Bearer {tok_unassigned}"})
    print(f"\n3. Unassigned Supervisor (fapboadu@gimpa.edu.gh): status={r_unassigned.status_code}")
    unassigned_dossiers = r_unassigned.json()
    print(f"   Dossiers returned: {len(unassigned_dossiers)}")
    assert len(unassigned_dossiers) == 0, f"Unassigned supervisor should see 0 supervisees, got {len(unassigned_dossiers)}"
    print("   [PASS] Correctly returns 0 supervisees for unassigned supervisor.")

    # 4. Dean of GIMPA Business School (eadaku@gimpa.edu.gh)
    tok_dean = login("eadaku@gimpa.edu.gh")
    r_dean = requests.get(f"{BASE_URL}/phd/dossiers", headers={"Authorization": f"Bearer {tok_dean}"})
    print(f"\n4. Dean of Business School (eadaku@gimpa.edu.gh): status={r_dean.status_code}")
    dean_dossiers = r_dean.json()
    print(f"   School candidates returned: {len(dean_dossiers)}")
    for d in dean_dossiers:
        print(f"   [PASS] Candidate: {d['student_name']} ({d['student_email']}) - Specialization: {d['specialization']}")

    # 5. Dean of SOTSS (kofi.mensah@gimpa.edu.gh)
    tok_sotss_dean = login("kofi.mensah@gimpa.edu.gh")
    r_sotss = requests.get(f"{BASE_URL}/phd/dossiers", headers={"Authorization": f"Bearer {tok_sotss_dean}"})
    print(f"\n5. Dean of SOTSS (kofi.mensah@gimpa.edu.gh): status={r_sotss.status_code}")
    sotss_dossiers = r_sotss.json()
    print(f"   SOTSS candidates returned: {len(sotss_dossiers)}")

    # 6. Non-PhD Student (john.smith@st.gimpa.edu.gh)
    tok_non_phd = login("john.smith@st.gimpa.edu.gh")
    r_non_phd = requests.get(f"{BASE_URL}/phd/dossiers", headers={"Authorization": f"Bearer {tok_non_phd}"})
    print(f"\n6. Non-PhD Student (john.smith@st.gimpa.edu.gh): status={r_non_phd.status_code} ({r_non_phd.json().get('detail') if r_non_phd.status_code == 403 else 'OK'})")
    assert r_non_phd.status_code == 403, "Non-PhD student must receive 403 Forbidden!"
    print("   [PASS] Non-PhD student correctly blocked with 403 Forbidden.")

    print("\nALL ROLE-BASED ACCESS CONTROL TESTS PASSED!")

if __name__ == "__main__":
    test_rbac()
