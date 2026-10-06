import asyncio
from playwright.async_api import async_playwright

async def verify_reminder_button():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="msedge", headless=True)
        page = await browser.new_page()

        print("Logging in as Assigned Supervisor...")
        await page.goto("https://thesis.manamatechnologies.com/login")
        await page.wait_for_timeout(1000)
        await page.fill("#login-email", "josbudu@gimpa.edu.gh")
        await page.fill("#login-password", "Password123!")
        await page.click("button:has-text('Sign In')")
        await page.wait_for_timeout(4000)

        # Navigate to PhD Hub
        phd_btn = await page.wait_for_selector("button:has-text('PhD Hub')", timeout=10000)
        await phd_btn.click()
        await page.wait_for_timeout(3000)

        content = await page.content()
        assert "Regulatory Early-Warning" in content, "Should display Early-Warning banner"
        print("[PASS] Early-Warning banner is visible.")

        # Look for the email reminder button
        reminder_btn = await page.wait_for_selector("button:has-text('Email Supervisee Reminder'), button:has-text('Dispatch Regulatory Reminders')", timeout=5000)
        assert reminder_btn is not None, "Reminder button must exist on the early warning banner"
        print("[PASS] Reminder dispatch button found on banner.")

        # Click the button
        await reminder_btn.click()
        await page.wait_for_timeout(3000)

        new_content = await page.content()
        assert "Dispatched successfully" in new_content or "student notice(s)" in new_content, "Should display success confirmation"
        print("[PASS] Reminder dispatch action executed and confirmed on UI!")

        await page.screenshot(path="screenshot_phd_early_warning_email.png")
        print("Captured screenshot: screenshot_phd_early_warning_email.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_reminder_button())
