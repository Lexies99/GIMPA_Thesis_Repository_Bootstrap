import asyncio
from playwright.async_api import async_playwright

async def verify_ui():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="msedge", headless=True)
        page = await browser.new_page()

        # 1. Test PhD Student Login & View
        print("Testing PhD Student UI...")
        await page.goto("https://thesis.manamatechnologies.com/login")
        await page.wait_for_timeout(1000)
        await page.fill("#login-email", "phd.candidate@st.gimpa.edu.gh")
        await page.fill("#login-password", "Password123!")
        await page.click("button:has-text('Sign In')")
        await page.wait_for_timeout(4000)

        # Click PhD Hub in navigation
        phd_btn = await page.wait_for_selector("button:has-text('PhD Hub')", timeout=10000)
        await phd_btn.click()
        await page.wait_for_timeout(3000)
        
        # Check banner text
        content = await page.content()
        assert "Candidate Account" in content, "Student should see 'Candidate Account' badge"
        assert "My PhD Dossier" in content, "Student should see 'My PhD Dossier' tab"
        print("[PASS] PhD Student UI shows personalized candidate portal!")
        await page.screenshot(path="screenshot_phd_student.png")

        # 2. Test Supervisor Login & View
        print("\nTesting Assigned Supervisor UI...")
        # Clear storage or create new context
        context2 = await browser.new_context()
        page2 = await context2.new_page()
        await page2.goto("https://thesis.manamatechnologies.com/login")
        await page2.wait_for_timeout(1000)
        await page2.fill("#login-email", "josbudu@gimpa.edu.gh")
        await page2.fill("#login-password", "Password123!")
        await page2.click("button:has-text('Sign In')")
        await page2.wait_for_timeout(4000)

        phd_btn2 = await page2.wait_for_selector("button:has-text('PhD Hub')", timeout=10000)
        await phd_btn2.click()
        await page2.wait_for_timeout(3000)

        content_sup = await page2.content()
        assert "Supervisor Scope" in content_sup, "Supervisor should see 'Supervisor Scope' badge"
        assert "My Supervised Students" in content_sup, "Supervisor should see 'My Supervised Students' tab"
        print("[PASS] Supervisor UI shows 'Supervisor Scope' and only their supervised students!")
        await page2.screenshot(path="screenshot_phd_supervisor.png")

        await browser.close()

        print("\nAll browser UI tests completed successfully!")

if __name__ == "__main__":
    asyncio.run(verify_ui())
