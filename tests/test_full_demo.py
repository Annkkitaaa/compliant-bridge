"""
Full demo walkthrough test for Compliant Bridge.
Tests: Hero, How It Works, Public tab, Institution tab (Alice/Bob), Regulator tab, Compliant Pool.
"""
import sys, io, os, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from playwright.sync_api import sync_playwright

SCREENSHOTS = "d:/projects/compliant-bridge/test_screenshots"
os.makedirs(SCREENSHOTS, exist_ok=True)

def ss(page, name):
    path = f"{SCREENSHOTS}/{name}.png"
    page.screenshot(path=path, full_page=False)
    print(f"  [screenshot] {name}.png")

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    page.goto("http://localhost:3000")
    page.wait_for_load_state("networkidle")

    # ── HERO ──────────────────────────────────────────────────────────
    section("1. HERO SECTION")
    ss(page, "01_hero")
    title = page.locator("h1, h2").first.inner_text()
    print(f"  Headline: {title}")

    # Check navbar
    navbar_text = page.locator("nav").inner_text()
    print(f"  Navbar: {navbar_text[:80]}")

    # Check hero buttons
    buttons = page.locator("a, button").all()
    btn_texts = [b.inner_text().strip() for b in buttons[:10] if b.inner_text().strip()]
    print(f"  Buttons visible: {btn_texts}")

    # ── HOW IT WORKS ─────────────────────────────────────────────────
    section("2. HOW IT WORKS SECTION")
    page.evaluate("window.scrollTo(0, 600)")
    page.wait_for_timeout(500)
    ss(page, "02_how_it_works")
    # Try to find the how it works section
    try:
        how_text = page.locator("text=How It Works").first.inner_text()
        print(f"  Found: {how_text}")
    except:
        print("  Section heading not found by text")
    # Grab step cards
    cards = page.locator(".rounded-2xl, .rounded-xl").all()
    print(f"  Cards found: {len(cards)}")

    # ── SCROLL TO APP / TABS ─────────────────────────────────────────
    section("3. DASHBOARD - TAB BAR")
    # Click "Launch App" or scroll to #app
    try:
        page.locator("text=Launch App").first.click()
        page.wait_for_timeout(600)
    except:
        page.evaluate("document.getElementById('app')?.scrollIntoView()")
        page.wait_for_timeout(600)
    ss(page, "03_tabs_bar")
    tabs = page.locator("button").all()
    tab_texts = [t.inner_text().strip() for t in tabs if t.inner_text().strip() and len(t.inner_text().strip()) < 30]
    print(f"  Tab buttons: {tab_texts[:10]}")

    # ── PUBLIC TAB ───────────────────────────────────────────────────
    section("4. PUBLIC TAB")
    try:
        page.locator("button", has_text="Public").first.click()
        page.wait_for_timeout(2000)
    except:
        print("  Could not click Public tab")
    ss(page, "04_public_tab")
    content = page.locator("main, #app, [class*='tab']").first.inner_text()
    print(f"  Content preview: {content[:300]}")

    # Check chain status badge
    try:
        badge = page.locator("text=Live").first.inner_text()
        print(f"  Chain status badge: {badge}")
    except:
        try:
            badge = page.locator("text=Example data").first.inner_text()
            print(f"  Chain status badge: Example data (fallback)")
        except:
            print("  Chain status: not found")

    # Check for transfer table or empty state
    try:
        rows = page.locator("tr, [class*='row']").all()
        print(f"  Table rows: {len(rows)}")
    except:
        print("  No table rows found")

    # ── INSTITUTION TAB ───────────────────────────────────────────────
    section("5. INSTITUTION TAB - LANDING")
    try:
        page.locator("button", has_text="Institution").first.click()
        page.wait_for_timeout(1000)
    except:
        print("  Could not click Institution tab")
    ss(page, "05_institution_landing")
    content = page.content()
    if "Connect Wallet" in content:
        print("  Shows: Connect Wallet screen")
    if "Alice" in content:
        print("  Shows: Alice quick-pick button")
    if "Bob" in content:
        print("  Shows: Bob quick-pick button")
    if "View" in content:
        print("  Shows: View address input")

    # Click Alice
    section("5a. INSTITUTION - VIEW ALICE")
    try:
        alice_btn = page.locator("button", has_text="Alice").first
        alice_btn.click()
        page.wait_for_timeout(4000)  # wait for RPC call
        ss(page, "05a_institution_alice_loading")
        page.wait_for_timeout(3000)
        ss(page, "05a_institution_alice")
        content = page.content()
        if "No attestation" in content or "No compliance" in content:
            print("  Alice result: No attestation found")
            # Try request compliance check
            try:
                req_btn = page.locator("button", has_text="Request Compliance Check").first
                print(f"  Request button visible: {req_btn.is_visible()}")
                print(f"  Request button enabled: {req_btn.is_enabled()}")
            except:
                print("  Request button: not found")
        elif "Compliance Attestation" in content or "Tier" in content:
            print("  Alice result: Attestation card loaded!")
            tier = page.locator("text=TIER").first.inner_text() if page.locator("text=TIER").count() > 0 else "?"
            print(f"  Tier: {tier}")
        else:
            print(f"  Alice result: {content[2000:2300]}")
    except Exception as e:
        print(f"  Alice click error: {e}")

    # Go back to view Bob
    section("5b. INSTITUTION - VIEW BOB")
    try:
        page.go_back()
        page.wait_for_timeout(500)
    except:
        pass
    # Navigate back to institution tab
    try:
        page.locator("button", has_text="Institution").first.click()
        page.wait_for_timeout(500)
    except:
        pass
    # If still connected, need to "disconnect" - just reload
    page.reload()
    page.wait_for_load_state("networkidle")
    page.evaluate("document.getElementById('app')?.scrollIntoView()")
    page.wait_for_timeout(500)
    try:
        page.locator("button", has_text="Institution").first.click()
        page.wait_for_timeout(500)
        bob_btn = page.locator("button", has_text="Bob").first
        bob_btn.click()
        page.wait_for_timeout(5000)
        ss(page, "05b_institution_bob")
        content = page.content()
        if "REVOKED" in content or "revoked" in content.lower():
            print("  Bob result: REVOKED banner shown!")
        elif "No attestation" in content:
            print("  Bob result: No attestation found")
        elif "Tier" in content:
            print("  Bob result: Attestation card loaded")
        else:
            print(f"  Bob result: {content[2000:2300]}")
    except Exception as e:
        print(f"  Bob click error: {e}")

    # ── REGULATOR TAB ───────────────────────────────────────────────
    section("6. REGULATOR TAB")
    try:
        page.locator("button", has_text="Regulator").first.click()
        page.wait_for_timeout(1500)
    except:
        print("  Could not click Regulator tab")
    ss(page, "06_regulator_landing")
    content = page.content()
    print(f"  Has search bar: {'search' in content.lower() or 'address' in content.lower()}")
    print(f"  Has Alice quick-pick: {'Alice' in content}")
    print(f"  Has Bob quick-pick: {'Bob' in content}")
    print(f"  Has Charlie quick-pick: {'Charlie' in content}")

    # Click Alice in Regulator
    section("6a. REGULATOR - ALICE")
    try:
        alice_btns = page.locator("button").all()
        alice_reg = None
        for b in alice_btns:
            txt = b.inner_text()
            if "Alice" in txt:
                alice_reg = b
                break
        if alice_reg:
            alice_reg.click()
            page.wait_for_timeout(1500)
            ss(page, "06a_regulator_alice")
            content = page.content()
            if "Compliant" in content or "ACTIVE" in content:
                print("  Alice regulator: Compliant status shown")
            if "Sanctions" in content or "KYC" in content:
                print("  Alice regulator: Compliance checks shown")
            if "Transfer" in content:
                print("  Alice regulator: Transfer history shown")
        else:
            print("  Alice button not found in regulator")
    except Exception as e:
        print(f"  Regulator Alice error: {e}")

    # Click Bob in Regulator
    section("6b. REGULATOR - BOB (REVOKED)")
    try:
        bob_btns = page.locator("button").all()
        bob_reg = None
        for b in bob_btns:
            txt = b.inner_text()
            if "Bob" in txt:
                bob_reg = b
                break
        if bob_reg:
            bob_reg.click()
            page.wait_for_timeout(1500)
            ss(page, "06b_regulator_bob")
            content = page.content()
            if "REVOKED" in content or "REVOCATION" in content:
                print("  Bob regulator: REVOKED banner shown!")
            if "Sanctions" in content:
                print("  Bob regulator: Sanctions section shown")
            if "OFAC" in content or "SDN" in content:
                print("  Bob regulator: OFAC/SDN detail shown")
    except Exception as e:
        print(f"  Regulator Bob error: {e}")

    # Click Charlie in Regulator
    section("6c. REGULATOR - CHARLIE")
    try:
        charlie_btns = page.locator("button").all()
        charlie_reg = None
        for b in charlie_btns:
            txt = b.inner_text()
            if "Charlie" in txt:
                charlie_reg = b
                break
        if charlie_reg:
            charlie_reg.click()
            page.wait_for_timeout(1500)
            ss(page, "06c_regulator_charlie")
            content = page.content()
            if "Tier" in content:
                print("  Charlie regulator: Tier shown")
            status_indicators = ["ACTIVE", "COMPLIANT", "Compliant", "Tier"]
            for s in status_indicators:
                if s in content:
                    print(f"  Charlie regulator: '{s}' present")
                    break
    except Exception as e:
        print(f"  Regulator Charlie error: {e}")

    # Regulator full card content check
    section("6d. REGULATOR - CARD CONTENT CHECK")
    reg_content = page.locator("main, [id='app'], [class*='fade']").first.inner_text()
    print(f"  Full regulator text sample:\n{reg_content[:500]}")
    ss(page, "06d_regulator_full")

    # ── COMPLIANT POOL ───────────────────────────────────────────────
    section("7. COMPLIANT POOL TAB")
    try:
        page.locator("button", has_text="Compliant Pool").first.click()
        page.wait_for_timeout(2000)
    except:
        print("  Could not click Compliant Pool tab")
    ss(page, "07_pool_landing")
    content = page.content()
    print(f"  Has pool cards: {'Basic' in content or 'Tier' in content or 'Pool' in content}")
    print(f"  Has IUSD: {'IUSD' in content}")
    print(f"  Has tTREAS: {'tTREAS' in content}")
    print(f"  Has deploying banner: {'deploying' in content.lower() or 'coming' in content.lower()}")
    print(f"  Has TVL: {'TVL' in content}")
    print(f"  Has swap UI: {'Swap' in content}")
    print(f"  Has faucet: {'Faucet' in content}")

    # Try clicking a pool card
    section("7a. POOL - CLICK BASIC POOL CARD")
    try:
        pool_btns = page.locator("button, [class*='card'], [class*='pool']").all()
        basic = None
        for b in pool_btns:
            txt = b.inner_text()
            if "Basic" in txt or "Tier 1" in txt:
                basic = b
                break
        if basic:
            basic.click()
            page.wait_for_timeout(1000)
            ss(page, "07a_pool_basic_selected")
            content = page.content()
            print(f"  Basic pool clicked — swap panel visible: {'Swap' in content or 'Amount' in content}")
        else:
            print("  Basic pool card not found")
    except Exception as e:
        print(f"  Pool card click error: {e}")

    # Check compliance banner at top of pool
    section("7b. POOL - COMPLIANCE BANNER")
    content = page.content()
    if "Connect wallet" in content or "No compliance" in content:
        print("  Pool compliance banner: No wallet connected state")
    elif "Tier" in content and "access" in content.lower():
        print("  Pool compliance banner: Tier access shown")
    elif "wallet" in content.lower():
        print("  Pool compliance banner: Wallet-related message")

    pool_text = page.locator("main, [id='app'], [class*='fade']").first.inner_text()
    print(f"\n  Pool tab text sample:\n{pool_text[:600]}")
    ss(page, "07b_pool_full")

    browser.close()
    print(f"\n{'='*60}")
    print(f"  TEST COMPLETE — screenshots in {SCREENSHOTS}")
    print('='*60)
