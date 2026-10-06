import asyncio
import sys
from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding='utf-8')

async def debug():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="msedge", headless=True)
        page = await browser.new_page()
        await page.goto("https://thesis.manamatechnologies.com/login")
        await page.fill("#login-email", "phd.candidate@st.gimpa.edu.gh")
        await page.fill("#login-password", "Password123!")
        # Print buttons on page
        buttons = await page.eval_on_selector_all("button", "btns => btns.map(b => b.innerText)")
        print("Buttons on login page:", buttons)
        await page.click("button:has-text('Sign In')")
        await page.wait_for_timeout(3000)
        print("URL after login:", page.url)
        await page.goto("https://thesis.manamatechnologies.com/?tab=phd")
        await page.wait_for_timeout(3000)
        print("URL after tab=phd:", page.url)
        h1 = await page.eval_on_selector_all("h1", "els => els.map(e => e.innerText)")
        print("H1 elements:", h1)
        body_text = await page.inner_text("body")
        print("Body snippet:", body_text[:500])
        await browser.close()

if __name__ == "__main__":
    asyncio.run(debug())
