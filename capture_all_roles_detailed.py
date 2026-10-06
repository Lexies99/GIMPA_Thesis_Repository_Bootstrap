import os
import time
from playwright.sync_api import sync_playwright

dest_dir = r'd:\NSS\GIMPA_Thesis_Repository_Bootstrap\presentation_assets\role_screens'
os.makedirs(dest_dir, exist_ok=True)

BASE_URL = "https://thesis.manamatechnologies.com"

role_credentials = [
    {
        "role_key": "student",
        "role_title": "Student",
        "name": "John Smith",
        "email": "john.smith@st.gimpa.edu.gh",
        "password": "GimpaSecurePass123!",
        "views": [
            ("student_dashboard.png", "Dashboard"),
            ("student_phd_hub.png", "PhD Hub"),
            ("student_profile.png", "My Profile"),
        ]
    },
    {
        "role_key": "supervisor",
        "role_title": "Supervisor",
        "name": "Abena Osei",
        "email": "abena.osei@gimpa.edu.gh",
        "password": "GimpaSecurePass123!",
        "views": [
            ("supervisor_dashboard.png", "Dashboard"),
            ("supervisor_phd_hub.png", "PhD Hub"),
            ("supervisor_profile.png", "My Profile"),
        ]
    },
    {
        "role_key": "hod",
        "role_title": "Head of Department (HOD)",
        "name": "Kwame Boadu",
        "email": "kwame.boadu@adj.gimpa.edu.gh",
        "password": "GimpaSecurePass123!",
        "views": [
            ("hod_dashboard.png", "Dashboard"),
            ("hod_phd_hub.png", "PhD Hub"),
        ]
    },
    {
        "role_key": "coordinator",
        "role_title": "Project Coordinator",
        "name": "Yaw Asante",
        "email": "yaw.asante@gimpa.edu.gh",
        "password": "GimpaSecurePass123!",
        "views": [
            ("coordinator_dashboard.png", "Dashboard"),
        ]
    },
    {
        "role_key": "dean",
        "role_title": "Dean of Faculty",
        "name": "Kofi Mensah",
        "email": "kofi.mensah@gimpa.edu.gh",
        "password": "GimpaSecurePass123!",
        "views": [
            ("dean_dashboard.png", "Dashboard"),
            ("dean_phd_hub.png", "PhD Hub"),
        ]
    },
    {
        "role_key": "admin",
        "role_title": "System Administrator & Librarian",
        "name": "Super Administrator",
        "email": "admin@gimpa.edu.gh",
        "password": "GimpaSecurePass123!",
        "views": [
            ("admin_dashboard.png", "Dashboard"),
            ("admin_users.png", "Administration"),
        ]
    },
]

def capture_roles():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        
        for user in role_credentials:
            print(f"\n==========================================")
            print(f"Capturing Views for: {user['role_title']} ({user['name']})")
            print(f"==========================================")
            
            ctx = browser.new_context(viewport={"width": 1920, "height": 1080})
            pg = ctx.new_page()
            
            try:
                pg.goto(f"{BASE_URL}/login", wait_until="domcontentloaded", timeout=20000)
                pg.wait_for_timeout(1000)
                
                # Fill form
                pg.fill('#login-email', user['email'])
                pg.fill('#login-password', user['password'])
                pg.click('button:has-text("Sign In")')
                
                pg.wait_for_timeout(3500)
                print(f"Logged in successfully. URL: {pg.url}")
                
                # Iterate requested views
                for filename, tab_name in user['views']:
                    print(f"Navigating to tab: {tab_name}...")
                    
                    if tab_name == "Dashboard":
                        dash_btn = pg.query_selector('button:has-text("Dashboard")') or pg.query_selector('text="Dashboard"')
                        if dash_btn:
                            dash_btn.click()
                            pg.wait_for_timeout(2000)
                    elif tab_name == "PhD Hub":
                        phd_btn = pg.query_selector('button:has-text("PhD Hub")') or pg.query_selector('text="PhD Hub"')
                        if phd_btn:
                            phd_btn.click()
                            pg.wait_for_timeout(2000)
                    elif tab_name == "My Profile":
                        prof_btn = pg.query_selector('button:has-text("My Profile")') or pg.query_selector('text="My Profile"')
                        if prof_btn:
                            prof_btn.click()
                            pg.wait_for_timeout(2000)
                    elif tab_name == "Administration":
                        admin_btn = pg.query_selector('button:has-text("Administration")') or pg.query_selector('text="Administration"') or pg.query_selector('text="Account Management"')
                        if admin_btn:
                            admin_btn.click()
                            pg.wait_for_timeout(2500)

                    # Save screenshot
                    out_path = os.path.join(dest_dir, filename)
                    pg.screenshot(path=out_path, full_page=False)
                    print(f"-> Saved screenshot: {filename}")
                    
            except Exception as e:
                print(f"Error for {user['name']}: {e}")
            finally:
                ctx.close()
                
        browser.close()
        print("\nAll role views captured successfully!")

if __name__ == "__main__":
    capture_roles()
