"""Test Regulator and Pool tabs from a clean state."""
import sys, io, os, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

SS = "d:/projects/compliant-bridge/test_screenshots"
os.makedirs(SS, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 800})

    # ── Load app and scroll to dashboard ──────────────────────────────
    page.goto("http://localhost:3000")
    page.wait_for_load_state("networkidle")
    # Scroll to the tab dashboard
    page.evaluate("document.getElementById('app')?.scrollIntoView({behavior:'instant'})")
    page.wait_for_timeout(500)

    # ── REGULATOR TAB ──────────────────────────────────────────────────
    print("\n=== REGULATOR TAB ===")
    page.get_by_role("button", name="Regulator").click()
    page.wait_for_timeout(1500)
    page.screenshot(path=f"{SS}/reg_01_landing.png")
    print("Screenshot: reg_01_landing.png")
    text = page.locator("body").inner_text()
    print(f"Has Alice: {'Alice' in text}, Has Bob: {'Bob' in text}, Has Charlie: {'Charlie' in text}")
    print(f"Has search: {'Search' in text or 'address' in text.lower()}")

    # Click Alice
    print("\n--- Alice ---")
    page.get_by_role("button").filter(has_text="Alice").first.click()
    page.wait_for_timeout(2000)
    page.screenshot(path=f"{SS}/reg_02_alice.png")
    text = page.locator("body").inner_text()
    print(f"Compliant: {'Compliant' in text or 'ACTIVE' in text}")
    print(f"Tier shown: {'Tier' in text}")
    print(f"Sanctions: {'Sanctions' in text}")
    print(f"KYC: {'KYC' in text}")
    print(f"Transfer history: {'Transfer' in text}")
    # Scroll down to see full card
    page.evaluate("window.scrollBy(0, 300)")
    page.wait_for_timeout(300)
    page.screenshot(path=f"{SS}/reg_02_alice_full.png")

    # Click Bob
    print("\n--- Bob (REVOKED) ---")
    page.get_by_role("button").filter(has_text="Bob").first.click()
    page.wait_for_timeout(2000)
    page.screenshot(path=f"{SS}/reg_03_bob.png")
    text = page.locator("body").inner_text()
    print(f"REVOKED: {'REVOKED' in text or 'REVOCATION' in text}")
    print(f"Sanctions FAIL: {'FAIL' in text or 'sanctions' in text.lower()}")
    print(f"OFAC: {'OFAC' in text or 'SDN' in text}")
    page.evaluate("window.scrollBy(0, 300)")
    page.wait_for_timeout(300)
    page.screenshot(path=f"{SS}/reg_03_bob_full.png")
    # Print Bob card content
    try:
        card = page.locator("[class*='rounded']").nth(3).inner_text()
        print(f"Card content: {card[:400]}")
    except:
        pass

    # Click Charlie
    print("\n--- Charlie ---")
    page.get_by_role("button").filter(has_text="Charlie").first.click()
    page.wait_for_timeout(2000)
    page.screenshot(path=f"{SS}/reg_04_charlie.png")
    text = page.locator("body").inner_text()
    print(f"Has attestation: {'Tier' in text or 'Compliant' in text}")
    print(f"Status: {'ACTIVE' in text or 'Compliant' in text or 'REVOKED' in text}")

    # Try manual address search
    print("\n--- Manual address lookup ---")
    try:
        inp = page.locator("input[placeholder*='address'], input[placeholder*='0x']").first
        inp.fill("0xAa00000000000000000000000000000000000002")
        page.wait_for_timeout(300)
        page.get_by_role("button", name="Search").click()
        page.wait_for_timeout(1500)
        page.screenshot(path=f"{SS}/reg_05_manual_search.png")
        print("Manual search: done")
    except Exception as e:
        print(f"Manual search: {e}")

    # ── COMPLIANT POOL TAB ─────────────────────────────────────────────
    print("\n=== COMPLIANT POOL TAB ===")
    # Navigate back to top for fresh tab click
    page.evaluate("document.getElementById('app')?.scrollIntoView({behavior:'instant'})")
    page.wait_for_timeout(300)
    page.get_by_role("button", name="Compliant Pool").click()
    page.wait_for_timeout(2000)
    page.screenshot(path=f"{SS}/pool_01_landing.png")
    text = page.locator("body").inner_text()
    print(f"Has Basic pool: {'Basic' in text}")
    print(f"Has Accredited pool: {'Accredited' in text}")
    print(f"Has Institutional pool: {'Institutional' in text}")
    print(f"Has IUSD: {'IUSD' in text}")
    print(f"Has tTREAS: {'tTREAS' in text}")
    print(f"Has TVL: {'TVL' in text}")
    print(f"Has deploying banner: {'deploying' in text.lower()}")
    print(f"Has compliance banner: {'compliance' in text.lower()}")
    print(f"Has Faucet: {'Faucet' in text}")
    print(f"Has lock icon: {'lock' in text.lower() or 'Need Tier' in text or 'Locked' in text}")

    # Full pool page text
    print("\nPool page text (first 800 chars):")
    print(text[:800])

    # Scroll down to see pool cards
    page.evaluate("window.scrollBy(0, 200)")
    page.wait_for_timeout(300)
    page.screenshot(path=f"{SS}/pool_02_cards.png")

    # Try clicking Tier 1 Basic pool
    print("\n--- Click Basic (Tier 1) pool ---")
    try:
        # Try various selectors for the pool card
        clicked = False
        for selector in ["text=Basic Pool", "text=Basic", "button:has-text('Basic')", "[class*='pool']"]:
            matches = page.locator(selector).all()
            if matches:
                matches[0].click()
                page.wait_for_timeout(1000)
                clicked = True
                print(f"Clicked using: {selector}")
                break
        if not clicked:
            print("Could not find Basic pool card to click")
        page.screenshot(path=f"{SS}/pool_03_basic_selected.png")
        text = page.locator("body").inner_text()
        print(f"Swap panel: {'Swap' in text}")
        print(f"Liquidity: {'Liquidity' in text}")
        print(f"Amount input: {'Amount' in text or 'Enter' in text}")
        print(f"Rate shown: {'Rate' in text or 'Fee' in text or '0.3%' in text}")
    except Exception as e:
        print(f"Pool card click: {e}")

    # Scroll to see more of pool
    page.evaluate("window.scrollBy(0, 400)")
    page.wait_for_timeout(300)
    page.screenshot(path=f"{SS}/pool_04_swap_panel.png")

    browser.close()
    print(f"\nAll screenshots in: {SS}")
