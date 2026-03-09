import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

SS = "d:/projects/compliant-bridge/test_screenshots/design"
os.makedirs(SS, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto("http://localhost:3000")
    page.wait_for_load_state("networkidle")

    # Hero
    page.screenshot(path=f"{SS}/01_hero.png")

    # How it works
    page.evaluate("window.scrollTo(0, 700)")
    page.wait_for_timeout(400)
    page.screenshot(path=f"{SS}/02_how_it_works.png")

    # Scroll to app
    page.evaluate("document.getElementById('app')?.scrollIntoView({behavior:'instant'})")
    page.wait_for_timeout(400)

    # Public tab
    page.get_by_role("button", name="Public").click()
    page.wait_for_timeout(1500)
    page.screenshot(path=f"{SS}/03_public.png")
    page.evaluate("window.scrollBy(0, 300)")
    page.wait_for_timeout(300)
    page.screenshot(path=f"{SS}/03_public_table.png")

    # Institution tab landing
    page.evaluate("document.getElementById('app')?.scrollIntoView({behavior:'instant'})")
    page.wait_for_timeout(200)
    page.get_by_role("button", name="Institution").click()
    page.wait_for_timeout(500)
    page.screenshot(path=f"{SS}/04_institution_landing.png")

    # Institution - Alice
    page.get_by_role("button").filter(has_text="Alice").first.click()
    page.wait_for_timeout(5000)
    page.screenshot(path=f"{SS}/05_institution_alice_top.png")
    page.evaluate("window.scrollBy(0, 400)")
    page.wait_for_timeout(300)
    page.screenshot(path=f"{SS}/05_institution_alice_bottom.png")

    # Regulator
    page.evaluate("document.getElementById('app')?.scrollIntoView({behavior:'instant'})")
    page.wait_for_timeout(200)
    page.get_by_role("button", name="Regulator").click()
    page.wait_for_timeout(500)
    page.screenshot(path=f"{SS}/06_regulator_landing.png")

    page.get_by_role("button").filter(has_text="Alice").first.click()
    page.wait_for_timeout(1500)
    page.screenshot(path=f"{SS}/07_regulator_alice.png")
    page.evaluate("window.scrollBy(0, 350)")
    page.wait_for_timeout(300)
    page.screenshot(path=f"{SS}/07_regulator_alice_checks.png")

    page.evaluate("document.getElementById('app')?.scrollIntoView({behavior:'instant'})")
    page.wait_for_timeout(200)
    page.get_by_role("button").filter(has_text="Bob").first.click()
    page.wait_for_timeout(1500)
    page.screenshot(path=f"{SS}/08_regulator_bob.png")

    # Pool
    page.evaluate("document.getElementById('app')?.scrollIntoView({behavior:'instant'})")
    page.wait_for_timeout(200)
    page.get_by_role("button", name="Compliant Pool").click()
    page.wait_for_timeout(1500)
    page.screenshot(path=f"{SS}/09_pool_landing.png")

    page.locator("text=Basic Pool").first.click()
    page.wait_for_timeout(800)
    page.screenshot(path=f"{SS}/10_pool_basic.png")
    page.evaluate("window.scrollBy(0, 300)")
    page.wait_for_timeout(300)
    page.screenshot(path=f"{SS}/10_pool_swap.png")

    # Footer
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    page.wait_for_timeout(500)
    page.screenshot(path=f"{SS}/11_footer.png")

    browser.close()
    print("Done")
