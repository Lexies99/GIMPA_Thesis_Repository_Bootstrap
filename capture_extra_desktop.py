import os
import time
from playwright.sync_api import sync_playwright

dest_dir = r'd:\NSS\GIMPA_Thesis_Repository_Bootstrap\presentation_assets\desktop_screens'
BASE_URL = "https://thesis.manamatechnologies.com"

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    
    # 1. Search & Discovery Tab
    ctx = browser.new_context(viewport={"width": 1920, "height": 1080})
    pg = ctx.new_page()
    pg.goto(f"{BASE_URL}/", wait_until="domcontentloaded", timeout=15000)
    pg.wait_for_timeout(2000)
    
    search_nav = pg.query_selector('text="Search & Discovery"') or pg.query_selector('a:has-text("Search")')
    if search_nav:
        search_nav.click()
        pg.wait_for_timeout(2000)
        pg.screenshot(path=os.path.join(dest_dir, "search_discovery_desktop.png"), full_page=False)
        print("Saved search_discovery_desktop.png")
    ctx.close()
    
    # 2. Login as Dean to capture PhD Hub Dossiers & Supervision Logs
    ctx = browser.new_context(viewport={"width": 1920, "height": 1080})
    pg = ctx.new_page()
    pg.goto(f"{BASE_URL}/login", wait_until="domcontentloaded", timeout=15000)
    pg.wait_for_timeout(1000)
    pg.fill('#login-email', "kofi.mensah@gimpa.edu.gh")
    pg.fill('#login-password', "GimpaSecurePass123!")
    pg.click('button:has-text("Sign In")')
    pg.wait_for_timeout(3500)
    
    # PhD Hub
    phd_btn = pg.query_selector('text="PhD Hub"')
    if phd_btn:
        phd_btn.click()
        pg.wait_for_timeout(2500)
        pg.screenshot(path=os.path.join(dest_dir, "phd_hub_dossiers_desktop.png"), full_page=False)
        print("Saved phd_hub_dossiers_desktop.png")
        
        # Click 12-Stage Supervision Logs
        sup_btn = pg.query_selector('text="12-Stage Supervision Logs"')
        if sup_btn:
            sup_btn.click()
            pg.wait_for_timeout(2000)
            pg.screenshot(path=os.path.join(dest_dir, "phd_supervision_logs_desktop.png"), full_page=False)
            print("Saved phd_supervision_logs_desktop.png")
            
    # Administration Tab
    admin_btn = pg.query_selector('text="Administration"') or pg.query_selector('text="Account Management"')
    if admin_btn:
        admin_btn.click()
        pg.wait_for_timeout(2000)
        pg.screenshot(path=os.path.join(dest_dir, "admin_management_desktop.png"), full_page=False)
        print("Saved admin_management_desktop.png")
        
    ctx.close()
    
    # 3. ONLYOFFICE Editor view
    ctx = browser.new_context(viewport={"width": 1920, "height": 1080})
    pg = ctx.new_page()
    pg.goto(f"{BASE_URL}/login", wait_until="domcontentloaded", timeout=15000)
    pg.wait_for_timeout(1000)
    pg.fill('#login-email', "john.smith@st.gimpa.edu.gh")
    pg.fill('#login-password', "GimpaSecurePass123!")
    pg.click('button:has-text("Sign In")')
    pg.wait_for_timeout(3500)
    
    # Click ONLYOFFICE editor button if present or navigate to editor
    editor_btn = pg.query_selector('text="ONLYOFFICE"') or pg.query_selector('button:has-text("Open in ONLYOFFICE")')
    if editor_btn:
        with ctx.expect_page() as new_page_info:
            editor_btn.click()
        new_pg = new_page_info.value
        new_pg.wait_for_timeout(4000)
        new_pg.screenshot(path=os.path.join(dest_dir, "onlyoffice_editor_desktop.png"), full_page=False)
        print("Saved onlyoffice_editor_desktop.png")
    else:
        # Fallback to direct editor URL
        pg.goto(f"{BASE_URL}/editor?paperId=1&type=comments", wait_until="domcontentloaded", timeout=15000)
        pg.wait_for_timeout(3000)
        pg.screenshot(path=os.path.join(dest_dir, "onlyoffice_editor_desktop.png"), full_page=False)
        print("Saved onlyoffice_editor_desktop.png")

    ctx.close()
    browser.close()
    print("All supplementary desktop screens captured!")
