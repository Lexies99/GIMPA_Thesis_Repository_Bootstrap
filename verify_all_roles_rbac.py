import sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

test_users = [
    {
        "role": "Librarian",
        "email": "librarian@gimpa.edu.gh",
        "password": "GimpaSecurePass123!",
        "expected_sidebar_excludes": ["PhD Hub", "Administration"],
        "expected_dashboard_excludes": ["Department Student Pipeline", "Phases 1-5", "People & User Directory", "Supervisor Advisee Broadcast"],
        "expected_dashboard_includes": ["Librarian Repository Operations"]
    },
    {
        "role": "Non-PhD Student (MSc IT & Law)",
        "email": "louisa.baffo@st.gimpa.edu.gh",
        "password": "GimpaSecurePass123!",
        "expected_sidebar_excludes": ["PhD Hub", "Approval Workflow", "Administration"],
        "expected_dashboard_excludes": ["Department Student Pipeline", "Phases 1-5", "People & User Directory", "Supervisor Advisee Broadcast", "Librarian Repository Operations"],
        "expected_dashboard_includes": ["My Submissions & Workflow"]
    },
    {
        "role": "PhD Student",
        "email": "john.smith@st.gimpa.edu.gh",
        "password": "GimpaSecurePass123!",
        "expected_sidebar_includes": ["PhD Hub"],
        "expected_sidebar_excludes": ["Approval Workflow", "Administration"],
        "expected_dashboard_excludes": ["Department Student Pipeline", "Phases 1-5", "People & User Directory", "Supervisor Advisee Broadcast", "Librarian Repository Operations"],
        "expected_dashboard_includes": ["My Submissions & Workflow"]
    },
    {
        "role": "HOD",
        "email": "kwame.boadu@adj.gimpa.edu.gh",
        "password": "GimpaSecurePass123!",
        "expected_sidebar_includes": ["PhD Hub", "Approval Workflow", "Administration"],
        "expected_dashboard_includes": ["Department Student Pipeline", "Project Supervisor Performance"],
        "expected_dashboard_excludes": ["People & User Directory", "Librarian Repository Operations"]
    },
    {
        "role": "System Admin",
        "email": "admin@gimpa.edu.gh",
        "password": "GimpaSecurePass123!",
        "expected_sidebar_includes": ["PhD Hub", "Approval Workflow", "Administration"],
        "expected_dashboard_includes": ["Department Student Pipeline", "People & User Directory"],
        "expected_dashboard_excludes": ["Librarian Repository Operations"]
    }
]

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    
    for u in test_users:
        print(f"\n==========================================")
        print(f"Testing Role: {u['role']} ({u['email']})")
        print(f"==========================================")
        
        ctx = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = ctx.new_page()
        page.goto("https://thesis.manamatechnologies.com/login", timeout=30000)
        page.fill("#login-email", u["email"])
        page.fill("#login-password", u["password"])
        page.click('button:has-text("Sign In")')
        page.wait_for_timeout(3500)
        
        # Check sidebar
        sidebar_buttons = page.locator("aside button").all()
        sidebar_items = [b.inner_text().strip() for b in sidebar_buttons if b.inner_text().strip()]
        print("Sidebar Items:", sidebar_items)
        
        # Switch to Dashboard
        for b in sidebar_buttons:
            if "Dashboard" in b.inner_text():
                b.click()
                break
        page.wait_for_timeout(3000)
        
        content = page.content()
        headings = page.locator("h1, h2, h3, h4").all_inner_texts()
        print("Dashboard Headings:", headings)
        
        # Verify sidebar items
        passed = True
        for exc in u.get("expected_sidebar_excludes", []):
            if any(exc in item for item in sidebar_items):
                print(f"[FAIL] Found forbidden sidebar item: '{exc}'")
                passed = False
            else:
                print(f"[PASS] Forbidden sidebar item not present: '{exc}'")
                
        for inc in u.get("expected_sidebar_includes", []):
            if not any(inc in item for item in sidebar_items):
                print(f"[FAIL] Missing required sidebar item: '{inc}'")
                passed = False
            else:
                print(f"[PASS] Required sidebar item present: '{inc}'")
                
        # Verify dashboard content
        for exc in u.get("expected_dashboard_excludes", []):
            if exc in content:
                print(f"[FAIL] Found forbidden dashboard content: '{exc}'")
                passed = False
            else:
                print(f"[PASS] Forbidden dashboard content not present: '{exc}'")
                
        for inc in u.get("expected_dashboard_includes", []):
            if not any(inc in h for h in headings):
                print(f"[FAIL] Missing required dashboard content in headings: '{inc}'")
                passed = False
            else:
                print(f"[PASS] Required dashboard content present: '{inc}'")
                
        if passed:
            print(f">>> ALL CHECKS PASSED FOR {u['role']}!")
        else:
            print(f">>> SOME CHECKS FAILED FOR {u['role']}!")
            
        ctx.close()
        
    browser.close()
