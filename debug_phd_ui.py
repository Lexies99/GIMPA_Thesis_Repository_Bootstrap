import asyncio
from playwright.async_api import async_playwright

async def debug_login():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='msedge', headless=True)
        page = await browser.new_page()
        
        # Monitor console logs
        page.on("console", lambda msg: print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: print(f"[BROWSER ERROR] {err}"))

        page.on("request", lambda req: print(f"[REQ] {req.method} {req.url}"))
        page.on("response", lambda res: print(f"[RES] {res.status} {res.url}"))

        print("Navigating to login...")
        await page.goto('https://thesis.manamatechnologies.com/login')
        await page.wait_for_timeout(1000)
        await page.fill('#login-email', 'phd.candidate@st.gimpa.edu.gh')
        await page.fill('#login-password', 'Password123!')
        print("Clicking Sign In button...")
        # Use explicit button selector
        await page.click("button:has-text('Sign In')")
        await page.wait_for_timeout(5000)
        print('URL after login:', page.url)


        # Check for error alert
        alert = await page.query_selector("div[role='alert']") or await page.query_selector(".text-red-500") or await page.query_selector(".bg-red-50")
        if alert:
            err_text = await alert.inner_text()
            print("ALERT FOUND:", err_text)


        # Look for PhD Hub tab
        phd_btn = await page.query_selector("button:has-text('PhD Hub')")
        print('PhD Hub button found:', phd_btn is not None)
        if phd_btn:
            await phd_btn.click()
            await page.wait_for_timeout(2000)
            print('Clicked PhD Hub!')
            content = await page.content()
            print('Contains Candidate Account:', 'Candidate Account' in content)
            print('Contains PhD:', 'PhD' in content)
            await page.screenshot(path='screenshot_phd_student.png')
        else:
            await page.screenshot(path='debug_no_phd_btn.png')
            print('No PhD Hub button! Let\'s print page buttons:')
            buttons = await page.query_selector_all('button')
            for b in buttons:
                txt = (await b.inner_text()).strip()
                if txt:
                    print('Button:', txt.encode('ascii', 'replace').decode('ascii'))

        await browser.close()

if __name__ == '__main__':
    asyncio.run(debug_login())
