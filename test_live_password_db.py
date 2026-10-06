import requests

BASE_URL = "https://thesis.manamatechnologies.com/idp"

print("--- [1] Testing Health Endpoint ---")
r = requests.get(f"{BASE_URL}/api/v1/health")
print("Status:", r.status_code, "Response:", r.json())

print("\n--- [2] Testing Valid Credentials Verification with Admin12345 ---")
payload_valid = {
    "email": "admin@gimpa.edu.gh",
    "password": "Admin12345",
    "client_app": "gimpa_thesis_repository"
}
r = requests.post(f"{BASE_URL}/api/v1/auth/verify-credentials", json=payload_valid)
print("Status:", r.status_code, "Response:", r.json())

print("\n--- [3] Testing Dean Account Verification with Admin12345 ---")
r2 = requests.post(f"{BASE_URL}/api/v1/auth/verify-credentials", json={
    "email": "eadaku@gimpa.edu.gh",
    "password": "Admin12345",
    "client_app": "gimpa_thesis_repository"
})
print("Dean Verify Status:", r2.status_code, "Response:", r2.json())
