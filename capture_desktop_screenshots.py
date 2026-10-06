import os
import time
from playwright.sync_api import sync_playwright

dest_dir = r'd:\NSS\GIMPA_Thesis_Repository_Bootstrap\presentation_assets\desktop_screens'
os.makedirs(dest_dir, exist_ok=True)

BASE_URL = "https://thesis.manamatechnologies.com"

users = [
    {
        "role": "Dean",
        "name": "Kofi Mensah",
        "email": "kofi.mensah@gimpa.edu.gh",
        "password": "GimpaSecurePass123!",
    },
    {
        "role": "HOD",
        "name": "Kwame Boadu",
        "email": "kwame.boadu@adj.gimpa.edu.gh",
        "password": "GimpaSecurePass123!",
    },
    {
        "role": "Coordinator",
        "name": "Yaw Asante",
        "email": "yaw.asante@gimpa.edu.gh",
        "password": "GimpaSecurePass123!",
    },
    {
        "role": "Lecturer_Supervisor_Examiner",
        "name": "Abena Osei",
        "email": "abena.osei@gimpa.edu.gh",
        "password": "GimpaSecurePass123!",
    },
    {
        "role": "Student",
        "name": "John Smith",
        "email": "john.smith@st.gimpa.edu.gh",
        "password": "GimpaSecurePass123!",
    },
]

def capture_all():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        
        # 1. Public Pages (Unauthenticated)
        print("Capturing Public Catalog (Desktop 1920x1080)...")
        ctx = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = ctx.new_page()
        page.goto(f"{BASE_URL}/", wait_until="domcontentloaded", timeout=15000)
        page.wait_for_timeout(2500)
        page.screenshot(path=os.path.join(dest_dir, "public_catalog_desktop.png"), full_page=False)
        print("Saved public_catalog_desktop.png")
        
        print("Capturing Login Screen (Desktop 1920x1080)...")
        page.goto(f"{BASE_URL}/login", wait_until="domcontentloaded", timeout=15000)
        page.wait_for_timeout(2000)
        page.screenshot(path=os.path.join(dest_dir, "login_screen_desktop.png"), full_page=False)
        print("Saved login_screen_desktop.png")
        ctx.close()
        
        # 2. Capture for each user role
        for u in users:
            print(f"\nLogging in as {u['role']} ({u['name']})...")
            ctx = browser.new_context(viewport={"width": 1920, "height": 1080})
            pg = ctx.new_page()
            
            try:
                pg.goto(f"{BASE_URL}/login", wait_until="domcontentloaded", timeout=15000)
                pg.wait_for_timeout(1500)
                
                # Fill login form using explicit IDs
                pg.fill('#login-email', u["email"])
                pg.fill('#login-password', u["password"])
                
                # Submit form
                pg.click('button:has-text("Sign In")')
                
                # Wait for navigation / redirect
                pg.wait_for_timeout(3500)
                print(f"Logged in successfully. URL: {pg.url}")
                
                # Capture main dashboard
                screen_name = f"{u['role'].lower()}_dashboard_desktop.png"
                pg.screenshot(path=os.path.join(dest_dir, screen_name), full_page=False)
                print(f"Saved {screen_name}")
                
                # If Dean, HOD, or Coordinator, capture PhD Hub too
                if u['role'] in ["Dean", "HOD", "Coordinator"]:
                    phd_btn = pg.query_selector('text="PhD Hub"') or pg.query_selector('button:has-text("PhD Hub")')
                    if phd_btn:
                        print("Clicking PhD Hub...")
                        phd_btn.click()
                        pg.wait_for_timeout(2000)
                        pg.screenshot(path=os.path.join(dest_dir, f"{u['role'].lower()}_phd_hub_desktop.png"), full_page=False)
                        print(f"Saved {u['role'].lower()}_phd_hub_desktop.png")
                        
                        # Click 12-Stage Supervision Logs
                        sup_btn = pg.query_selector('text="12-Stage Supervision Logs"')
                        if sup_btn:
                            print("Clicking 12-Stage Supervision Logs...")
                            sup_btn.click()
                            pg.wait_for_timeout(2000)
                            pg.screenshot(path=os.path.join(dest_dir, f"{u['role'].lower()}_phd_supervision_desktop.png"), full_page=False)
                            print(f"Saved {u['role'].lower()}_phd_supervision_desktop.png")
                
                # If Dean, check Administration
                if u['role'] in ["Dean"]:
                    admin_btn = pg.query_selector('text="Administration"') or pg.query_selector('text="Account Management"')
                    if admin_btn:
                        print("Clicking Administration tab...")
                        admin_btn.click()
                        pg.wait_for_timeout(2000)
                        pg.screenshot(path=os.path.join(dest_dir, f"admin_management_desktop.png"), full_page=False)
                        print(f"Saved admin_management_desktop.png")

            except Exception as e:
                print(f"Error capturing for {u['name']}: {e}")
            finally:
                ctx.close()
                
        browser.close()
        print("\nAll desktop screenshots captured successfully!")

if __name__ == "__main__":
    capture_all()
