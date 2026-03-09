"""
Full app walkthrough: every tab, button, and visual element.
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright
import time

BASE = "http://localhost:3000"

def screenshot(page, name):
    path = f"d:/projects/compliant-bridge/screenshots/cb_{name}.png"
    page.screenshot(path=path, full_page=True)
    print(f"  SCREENSHOT {name} -> {path}")

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

import os
os.makedirs("d:/projects/compliant-bridge/screenshots", exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("console", lambda msg: errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(f"[CRASH] {e}"))

    # ── INITIAL LOAD ──────────────────────────────────────────────
    section("1. Initial page load")
    page.goto(BASE)
    page.wait_for_load_state("networkidle")
    screenshot(page, "01_home_load")
    print(f"  Title: {page.title()}")
    print(f"  URL:   {page.url}")

    # Check Navbar
    navbar = page.locator("nav").first
    print(f"  Navbar visible: {navbar.is_visible()}")
    nav_text = navbar.inner_text()
    print(f"  Navbar content: {nav_text[:120]}")

    # Check Hero
    hero_h1 = page.locator("h1").first
    print(f"  Hero H1: {hero_h1.inner_text()}")

    # Check H2 sections
    section_headers = page.locator("h2").all_inner_texts()
    print(f"  H2 sections: {section_headers}")

    # ── HERO SECTION ──────────────────────────────────────────────
    section("2. Hero section check")
    page.evaluate("window.scrollTo(0,0)")
    screenshot(page, "02_hero")

    # Launch App button
    launch_btn = page.get_by_text("Launch App", exact=False)
    if launch_btn.count() > 0:
        print(f"  OK 'Launch App' button found")
        launch_btn.first.click()
        page.wait_for_timeout(800)
        screenshot(page, "02b_after_launch_app_click")
        scroll_y = page.evaluate('window.scrollY')
        print(f"  Scrolled to y={scroll_y}")
        if scroll_y < 100:
            print(f"  WARNING: Launch App did not scroll down - y={scroll_y}")
            errors.append(f"Launch App scroll failed: y={scroll_y}")
    else:
        print(f"  FAIL 'Launch App' button NOT found")
        errors.append("Launch App button missing")

    # Live stats
    stats_row = page.locator("section").first.locator("text=/transfer|compliance|chain/i").all_inner_texts()
    print(f"  Stats mentions: {stats_row[:5]}")

    # ── PUBLIC TAB ────────────────────────────────────────────────
    section("3. Public Tab")
    # scroll to app section
    page.evaluate("document.getElementById('app')?.scrollIntoView()")
    page.wait_for_timeout(500)

    pub_tab = page.get_by_role("button", name="Public")
    if pub_tab.count() == 0:
        pub_tab = page.locator("button").filter(has_text="Public").first
    pub_tab.click()
    page.wait_for_timeout(3000)  # wait for chain data or fallback
    screenshot(page, "03_public_tab")

    # Check for chain status
    chain_status = page.locator("text=/Live|fallback|No on-chain|Sepolia/i").all_inner_texts()
    print(f"  Chain status elements: {chain_status[:5]}")

    # Check for table
    rows = page.locator("table tbody tr").all()
    print(f"  Table rows: {len(rows)}")
    if rows:
        print(f"  First row text: {rows[0].inner_text()[:100]}")

    # Check refresh button
    refresh_btn = page.locator("button").filter(has_text="Refresh")
    if refresh_btn.count() > 0:
        print(f"  OK Refresh button found")
        refresh_btn.first.click()
        page.wait_for_timeout(2000)
        screenshot(page, "03b_public_after_refresh")
        print(f"  OK Refresh clicked")
    else:
        print(f"  WARNING Refresh button not found - checking all buttons:")
        all_btns = page.locator("section#app button").all_inner_texts()
        print(f"    Buttons in app section: {all_btns[:10]}")

    # ── INSTITUTION TAB ───────────────────────────────────────────
    section("4. Institution Tab")
    inst_tab = page.get_by_role("button", name="Institution")
    if inst_tab.count() == 0:
        inst_tab = page.locator("button").filter(has_text="Institution").first
    inst_tab.click()
    page.wait_for_timeout(1500)
    screenshot(page, "04_institution_tab")

    inst_text = page.locator("section#app").inner_text()
    print(f"  Content preview:\n  {inst_text[:400]}")

    # Connect wallet button
    connect_btn = page.locator("button").filter(has_text="Connect")
    if connect_btn.count() > 0:
        print(f"  OK Connect button: '{connect_btn.first.inner_text()}'")
    else:
        print(f"  FAIL No Connect button found")
        errors.append("Institution: no Connect Wallet button")
        all_btns_inst = page.locator("section#app button").all_inner_texts()
        print(f"  Buttons in section: {all_btns_inst[:8]}")

    # Section headings
    headings = page.locator("section#app").locator("h2,h3,h4").all_inner_texts()
    print(f"  Headings: {headings}")

    # ── REGULATOR TAB ─────────────────────────────────────────────
    section("5. Regulator Tab")
    reg_tab = page.get_by_role("button", name="Regulator")
    if reg_tab.count() == 0:
        reg_tab = page.locator("button").filter(has_text="Regulator").first
    reg_tab.click()
    page.wait_for_timeout(1000)
    screenshot(page, "05_regulator_tab")

    reg_text = page.locator("section#app").inner_text()
    print(f"  Content preview:\n  {reg_text[:400]}")

    # Search input
    search_inp = page.locator("section#app input").first
    if search_inp.count() > 0 and search_inp.is_visible():
        print(f"  OK Search input found")
        # Type Bob's address
        search_inp.fill("0xAa00000000000000000000000000000000000002")
        page.wait_for_timeout(300)
        screenshot(page, "05b_regulator_typed")

        # Find Check/Submit button
        check_btn = page.locator("section#app button").filter(has_text="Check")
        if check_btn.count() == 0:
            check_btn = page.locator("section#app button").filter(has_text="Look")
        if check_btn.count() == 0:
            # try any button that's not a quick-pick
            all_btns = page.locator("section#app button").all()
            print(f"  Buttons available: {[b.inner_text()[:20] for b in all_btns]}")
            # find submit-style button
            for b in all_btns:
                txt = b.inner_text().strip()
                if any(x in txt.lower() for x in ["check", "look", "submit", "search", "verify"]):
                    check_btn = b
                    break

        if hasattr(check_btn, 'count') and check_btn.count() > 0:
            check_btn.first.click()
        elif not hasattr(check_btn, 'count') and check_btn:
            check_btn.click()
        else:
            print(f"  WARNING No Check button found")
            errors.append("Regulator: no Check button")

        page.wait_for_timeout(3000)
        screenshot(page, "05c_regulator_result")
        result_text = page.locator("section#app").inner_text()
        print(f"  After check (400 chars):\n  {result_text[:400]}")
    else:
        print(f"  FAIL No search input visible")
        errors.append("Regulator: no search input")

    # Quick-pick buttons
    quick_btns = page.locator("section#app button").all_inner_texts()
    print(f"  All regulator buttons: {quick_btns[:10]}")

    # ── POOL TAB ──────────────────────────────────────────────────
    section("6. Compliant Pool Tab")
    pool_tab = page.get_by_role("button", name="Compliant Pool")
    if pool_tab.count() == 0:
        pool_tab = page.locator("button").filter(has_text="Pool").first
    pool_tab.click()
    page.wait_for_timeout(1500)
    screenshot(page, "06_pool_tab")

    pool_text = page.locator("section#app").inner_text()
    print(f"  Content preview:\n  {pool_text[:500]}")

    # Check compliance banner (no wallet state)
    banner_text = page.locator("section#app").locator("text=/wallet|Compliance|Tier/i").all_inner_texts()
    print(f"  Banner/tier mentions: {banner_text[:6]}")

    # Check pool cards
    card_headings = page.locator("section#app").locator("h3,h4").all_inner_texts()
    print(f"  Card headings: {card_headings[:8]}")

    # Check tokens mentioned
    token_labels = page.locator("section#app").locator("text=/IUSD|tTREAS/").all_inner_texts()
    print(f"  Token labels: {token_labels[:4]}")

    # Check faucet button
    faucet_btn = page.locator("section#app button").filter(has_text="Faucet")
    print(f"  Faucet button: {faucet_btn.count() > 0}")

    # Check swap/liquidity toggle
    swap_btn = page.locator("section#app button").filter(has_text="Swap")
    liq_btn = page.locator("section#app button").filter(has_text="Liquidity")
    print(f"  Swap button: {swap_btn.count() > 0}, Liquidity button: {liq_btn.count() > 0}")

    # ── FOOTER ────────────────────────────────────────────────────
    section("7. Footer check")
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    page.wait_for_timeout(600)
    screenshot(page, "07_footer")

    footer = page.locator("footer")
    footer_text = footer.inner_text()
    print(f"  Footer content:\n  {footer_text[:400]}")

    copy_btns = footer.get_by_title("Copy address").all()
    print(f"  Copy buttons: {len(copy_btns)}")
    eth_links = footer.get_by_title("View on Etherscan").all()
    print(f"  Etherscan links: {len(eth_links)}")

    # Check contract names shown
    contract_names = footer.locator("p.font-semibold, p.text-white").all_inner_texts()
    print(f"  Contract entries: {contract_names}")

    # ── HOW IT WORKS ──────────────────────────────────────────────
    section("8. How It Works section")
    page.evaluate("window.scrollTo(0,0)")
    page.wait_for_timeout(400)
    hiw = page.locator("section").filter(has_text="How It Works")
    if hiw.count() > 0:
        hiw.first.scroll_into_view_if_needed()
        page.wait_for_timeout(300)
        screenshot(page, "08_how_it_works")
        print(f"  OK How It Works found")
        steps = hiw.first.locator("h3").all_inner_texts()
        print(f"  Steps: {steps}")
    else:
        print(f"  WARNING How It Works not found as section")
        errors.append("How It Works section not found")

    # ── ALL CONSOLE ERRORS ────────────────────────────────────────
    section("9. Console / JS errors")
    if errors:
        for e in errors:
            print(f"  ERROR: {e}")
    else:
        print("  OK No JS errors or crashes")

    # ── LINKS ─────────────────────────────────────────────────────
    section("10. Link audit")
    all_links = page.locator("a[href]").all()
    for link in all_links:
        href = link.get_attribute("href") or ""
        text = link.inner_text().strip()[:40]
        if href in ("", "#"):
            print(f"  WARNING empty href: '{text}'")

    section("DONE - All screenshots saved to d:/projects/compliant-bridge/screenshots/")
    browser.close()
