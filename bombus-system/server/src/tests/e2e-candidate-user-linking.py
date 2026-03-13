"""
候選人→員工→使用者帳號 自動串連 E2E 測試 (Playwright)

測試場景：
A) Admin 登入 → 導航到入職管理頁面
B) 透過 API seed 一個 offer_accepted 候選人
C) 在入職進度頁面找到待入職候選人 → 點擊「啟動入職」
D) 在轉換 Modal 填寫資料 → 提交 → 驗證成功畫面（含帳號資訊）
E) 登出 → 用新員工帳號登入 → 被導向 /change-password
F) 變更密碼 → 驗證導向 /dashboard
G) 登出 → 用新密碼登入 → 直接進 dashboard

前提：
- Angular dev server: http://localhost:4200
- Backend server: http://localhost:3001
- Demo 租戶已初始化（admin@demo.com / admin123）
"""

import json
import time
import urllib.request
import urllib.error
from playwright.sync_api import sync_playwright, expect

BASE_URL = 'http://localhost:4200'
API_BASE = 'http://localhost:3001'
TENANT_SLUG = 'demo'
ADMIN_EMAIL = 'admin@demo.com'
ADMIN_PASSWORD = 'admin123'

passed = 0
failed = 0
results = []


def check(condition, description):
    global passed, failed
    if condition:
        passed += 1
        results.append(f'  PASS: {description}')
    else:
        failed += 1
        results.append(f'  FAIL: {description}')


def api_post(url, body, token=None):
    """HTTP POST helper using urllib"""
    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    try:
        with urllib.request.urlopen(req) as resp:
            return {'status': resp.status, 'data': json.loads(resp.read().decode())}
    except urllib.error.HTTPError as e:
        body_text = e.read().decode() if e.fp else '{}'
        try:
            return {'status': e.code, 'data': json.loads(body_text)}
        except Exception:
            return {'status': e.code, 'data': body_text}


def seed_candidate(admin_token):
    """透過 API 建立 offer_accepted 測試候選人"""
    ts = int(time.time() * 1000)
    email = f'e2e-test-{ts}@example.com'
    name = f'E2E Test User {ts}'

    result = api_post(
        f'{API_BASE}/api/hr/onboarding/test/seed-candidate',
        {'name': name, 'email': email},
        admin_token
    )
    if result['status'] == 201:
        data = result['data']
        return {'id': data['id'], 'name': name, 'email': email}
    else:
        print(f'  ERROR: Seed 候選人失敗 status={result["status"]} body={result["data"]}')
        return None


def admin_login_api():
    """透過 API 取得 admin token"""
    result = api_post(
        f'{API_BASE}/api/auth/login',
        {'email': ADMIN_EMAIL, 'password': ADMIN_PASSWORD, 'tenant_slug': TENANT_SLUG}
    )
    if result['status'] == 200:
        return result['data'].get('access_token')
    return None


def run():
    global passed, failed

    print('=== 候選人→員工→使用者帳號 自動串連 E2E 測試 (Playwright) ===\n')

    # ── 準備工作：API 取得 admin token + seed 候選人 ──
    print('[準備] Admin API 登入 + Seed 候選人\n')
    admin_token = admin_login_api()
    if not admin_token:
        print('ERROR: Admin API 登入失敗，無法繼續')
        return

    candidate = seed_candidate(admin_token)
    if not candidate:
        print('ERROR: Seed 候選人失敗，無法繼續')
        return

    test_email = candidate['email']
    test_name = candidate['name']
    print(f'  候選人：{test_name} ({test_email})\n')

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 900})
        page = context.new_page()

        # ================================================================
        # Part A: Admin 登入
        # ================================================================
        print('[Part A] Admin 登入\n')

        page.goto(f'{BASE_URL}/login')
        page.wait_for_load_state('networkidle')

        # 填寫登入表單
        page.fill('#tenantSlug', TENANT_SLUG)
        page.fill('#email', ADMIN_EMAIL)
        page.fill('#password', ADMIN_PASSWORD)
        page.click('.btn-login')

        # 等待導向 dashboard
        page.wait_for_url('**/dashboard**', timeout=15000)
        check('/dashboard' in page.url, 'A1 Admin 登入成功，導向 dashboard')
        page.screenshot(path='/tmp/e2e-A1-dashboard.png')

        # ================================================================
        # Part B: 導航到入職管理頁面
        # ================================================================
        print('\n[Part B] 導航到入職管理頁面\n')

        page.goto(f'{BASE_URL}/employee/onboarding')
        page.wait_for_load_state('networkidle')
        time.sleep(2)  # 等待 API 回傳資料

        check('/employee/onboarding' in page.url, 'B1 導航到入職管理頁面')
        page.screenshot(path='/tmp/e2e-B1-onboarding.png')

        # 確認「入職進度」tab 是 active
        progress_tab = page.locator('.tab-btn').first
        check(progress_tab.is_visible(), 'B2 入職進度 Tab 可見')

        # ================================================================
        # Part C: 找到待入職候選人，點擊「啟動入職」
        # ================================================================
        print('\n[Part C] 啟動入職流程\n')

        # 等待待入職候選人列表載入
        time.sleep(2)

        # 找到我們 seed 的候選人 — 用 email 匹配
        candidate_card = page.locator(f'text={test_email}').first
        if candidate_card.is_visible():
            check(True, f'C1 找到待入職候選人 ({test_email})')

            # 找到該候選人的「啟動入職」按鈕
            # 候選人卡片中的按鈕
            card_container = candidate_card.locator('xpath=ancestor::div[contains(@class, "candidate-card") or contains(@class, "pending")]')
            convert_btn = card_container.locator('text=啟動入職').first

            if not convert_btn.is_visible():
                # fallback: 找所有「啟動入職」按鈕中的最後一個（最新 seed 的候選人）
                all_convert_btns = page.locator('text=啟動入職')
                btn_count = all_convert_btns.count()
                if btn_count > 0:
                    convert_btn = all_convert_btns.last
                    check(True, f'C2 找到啟動入職按鈕 (共 {btn_count} 個)')
                else:
                    check(False, 'C2 找不到啟動入職按鈕')
                    convert_btn = None
            else:
                check(True, 'C2 找到該候選人的啟動入職按鈕')

            if convert_btn:
                convert_btn.click()
                time.sleep(1)
        else:
            check(False, f'C1 找不到候選人 ({test_email})')
            # 嘗試截圖看看頁面狀態
            page.screenshot(path='/tmp/e2e-C1-no-candidate.png')
            # 嘗試點擊任何一個「啟動入職」按鈕繼續測試
            all_btns = page.locator('text=啟動入職')
            if all_btns.count() > 0:
                check(True, 'C2 使用頁面上的其他候選人')
                all_btns.last.click()
                time.sleep(1)
            else:
                check(False, 'C2 頁面上沒有任何待入職候選人')

        # ================================================================
        # Part D: 轉換 Modal 填寫資料
        # ================================================================
        print('\n[Part D] 轉換 Modal 填寫\n')

        modal = page.locator('.modal-container')
        modal_visible = modal.is_visible()
        check(modal_visible, 'D1 轉換 Modal 已開啟')
        page.screenshot(path='/tmp/e2e-D1-modal.png')

        if modal_visible:
            # 等待下拉選項載入
            time.sleep(2)

            # 選擇部門
            dept_select = page.locator('#department')
            if dept_select.is_visible():
                # 取得第一個可用的部門選項
                options = dept_select.locator('option').all()
                if len(options) > 1:  # 第一個是 placeholder
                    dept_value = options[1].get_attribute('value')
                    dept_select.select_option(value=dept_value)
                    time.sleep(1)
                    check(True, f'D2 選擇部門: {dept_value}')
                else:
                    check(False, 'D2 沒有可用的部門選項')
            else:
                check(False, 'D2 部門下拉未顯示')

            # 選擇職等
            grade_select = page.locator('#gradeSelect')
            if grade_select.is_visible():
                grade_options = grade_select.locator('option').all()
                if len(grade_options) > 1:
                    grade_select.select_option(index=1)
                    time.sleep(1)
                    check(True, 'D3 選擇職等')
                else:
                    check(False, 'D3 沒有可用的職等選項')
            else:
                check(False, 'D3 職等下拉未顯示')

            # 填寫職位
            position_el = page.locator('#position')
            if position_el.is_visible():
                tag_name = position_el.evaluate('el => el.tagName')
                if tag_name == 'SELECT':
                    pos_options = position_el.locator('option').all()
                    if len(pos_options) > 1:
                        position_el.select_option(index=1)
                    else:
                        # 沒有預設職位，改用文字輸入
                        pass
                else:
                    position_el.fill('E2E 測試工程師')
                check(True, 'D4 填寫職位')
            else:
                check(False, 'D4 職位欄位未顯示')

            # 填寫職稱
            job_title_el = page.locator('#jobTitle')
            if job_title_el.is_visible():
                job_title_el.fill('E2E 資深測試工程師')
                check(True, 'D5 填寫職稱')

            # 選擇到職日
            hire_date_el = page.locator('#hireDate')
            if hire_date_el.is_visible():
                hire_date_el.fill('2026-04-01')
                check(True, 'D6 填寫到職日')

            page.screenshot(path='/tmp/e2e-D6-filled.png')

            # 點擊「確認轉入」
            submit_btn = modal.locator('text=確認轉入')
            if submit_btn.is_visible():
                submit_btn.click()
                # 等待轉換完成
                time.sleep(3)
                page.screenshot(path='/tmp/e2e-D7-submitted.png')

                # 驗證成功畫面
                success_view = page.locator('.success-view')
                if success_view.is_visible():
                    check(True, 'D7 轉換成功畫面顯示')

                    # 驗證員工編號
                    emp_no = page.locator('.result-info .info-item').first
                    check(emp_no.is_visible(), 'D8 顯示員工編號')

                    # 驗證帳號資訊區塊
                    account_info = page.locator('.user-account-info')
                    if account_info.is_visible():
                        check(True, 'D9 系統帳號資訊區塊顯示')

                        # 檢查是否顯示 email
                        account_text = account_info.inner_text()
                        check('登入信箱' in account_text or test_email in account_text or '已連結' in account_text,
                              'D10 帳號資訊包含 email 或連結狀態')
                        check('首次登入需變更' in account_text or '預設密碼' in account_text or '已連結' in account_text,
                              'D11 帳號資訊包含密碼提示或連結狀態')
                    else:
                        check(False, 'D9 系統帳號資訊區塊未顯示')

                    page.screenshot(path='/tmp/e2e-D11-success.png')

                    # 點擊「完成」關閉 modal
                    done_btn = page.locator('.modal-footer .btn-primary:has-text("完成")')
                    if done_btn.is_visible():
                        done_btn.click()
                        time.sleep(1)
                else:
                    check(False, 'D7 轉換成功畫面未顯示')
                    page.screenshot(path='/tmp/e2e-D7-no-success.png')
            else:
                check(False, 'D7 確認轉入按鈕不可見')

        # ================================================================
        # Part E: 登出 → 新員工登入 → 強制改密碼
        # ================================================================
        print('\n[Part E] 新員工首次登入 → 改密碼頁面\n')

        # 登出（直接導航到登入頁）
        page.goto(f'{BASE_URL}/login')
        page.wait_for_load_state('networkidle')
        time.sleep(1)

        # 清除 localStorage（確保登出狀態）
        page.evaluate('localStorage.clear()')
        page.reload()
        page.wait_for_load_state('networkidle')
        time.sleep(1)

        check('/login' in page.url, 'E1 已登出回到登入頁')

        # 用新員工帳號登入（密碼 = email）
        page.fill('#tenantSlug', TENANT_SLUG)
        page.fill('#email', test_email)
        # 初始密碼 = email（若 < 8 字元則加 1234）
        initial_password = test_email if len(test_email) >= 8 else test_email + '1234'
        page.fill('#password', initial_password)
        page.click('.btn-login')

        # 等待導向 — 應該被導向 /change-password
        try:
            page.wait_for_url('**/change-password**', timeout=10000)
            check(True, 'E2 新員工登入後導向 /change-password')
        except Exception:
            current_url = page.url
            check('/change-password' in current_url, f'E2 新員工登入後導向 /change-password（實際: {current_url}）')

        page.screenshot(path='/tmp/e2e-E2-change-password.png')

        # 驗證首次登入提示
        force_notice = page.locator('.force-change-notice')
        check(force_notice.is_visible(), 'E3 首次登入提示訊息可見')

        # ================================================================
        # Part F: 變更密碼
        # ================================================================
        print('\n[Part F] 變更密碼\n')

        new_password = 'NewE2EP@ss123'

        page.fill('#currentPassword', initial_password)
        page.fill('#newPassword', new_password)
        page.fill('#confirmPassword', new_password)

        # 確認按鈕可點擊
        submit_btn = page.locator('.btn-login')
        check(not submit_btn.is_disabled(), 'F1 變更密碼按鈕可點擊')

        submit_btn.click()

        # 等待導向 dashboard
        try:
            page.wait_for_url('**/dashboard**', timeout=10000)
            check(True, 'F2 改密碼後導向 /dashboard')
        except Exception:
            current_url = page.url
            check('/dashboard' in current_url, f'F2 改密碼後導向 dashboard（實際: {current_url}）')

        page.screenshot(path='/tmp/e2e-F2-dashboard-after-pw.png')

        # ================================================================
        # Part G: 登出 → 用新密碼重新登入
        # ================================================================
        print('\n[Part G] 新密碼重新登入\n')

        # 登出
        page.goto(f'{BASE_URL}/login')
        page.evaluate('localStorage.clear()')
        page.reload()
        page.wait_for_load_state('networkidle')
        time.sleep(1)

        # 用新密碼登入
        page.fill('#tenantSlug', TENANT_SLUG)
        page.fill('#email', test_email)
        page.fill('#password', new_password)
        page.click('.btn-login')

        # 應直接進 dashboard（不再導向改密碼頁）
        try:
            page.wait_for_url('**/dashboard**', timeout=10000)
            check(True, 'G1 新密碼登入成功，直接進 dashboard')
        except Exception:
            current_url = page.url
            check('/dashboard' in current_url, f'G1 新密碼登入（實際: {current_url}）')

        check('/change-password' not in page.url, 'G2 不再被導向改密碼頁')
        page.screenshot(path='/tmp/e2e-G2-final-dashboard.png')

        # ================================================================
        # Part H: 舊密碼登入應失敗
        # ================================================================
        print('\n[Part H] 舊密碼登入驗證\n')

        page.goto(f'{BASE_URL}/login')
        page.evaluate('localStorage.clear()')
        page.reload()
        page.wait_for_load_state('networkidle')
        time.sleep(1)

        page.fill('#tenantSlug', TENANT_SLUG)
        page.fill('#email', test_email)
        page.fill('#password', initial_password)
        page.click('.btn-login')

        time.sleep(3)

        # 應該還在登入頁（登入失敗）
        check('/login' in page.url or '/dashboard' not in page.url,
              'H1 舊密碼登入失敗，仍在登入頁')

        # 應顯示錯誤訊息
        error_alert = page.locator('.alert--error')
        check(error_alert.is_visible(), 'H2 顯示登入錯誤訊息')
        page.screenshot(path='/tmp/e2e-H2-old-pw-fail.png')

        browser.close()

    # ================================================================
    # 結果匯總
    # ================================================================
    print('\n' + '=' * 50)
    print(f'結果: {passed} passed, {failed} failed (共 {passed + failed} 項)\n')
    for r in results:
        print(r)
    print('\n' + '=' * 50)

    print('\n截圖檔案：')
    print('  /tmp/e2e-A1-dashboard.png')
    print('  /tmp/e2e-B1-onboarding.png')
    print('  /tmp/e2e-D1-modal.png')
    print('  /tmp/e2e-D6-filled.png')
    print('  /tmp/e2e-D11-success.png')
    print('  /tmp/e2e-E2-change-password.png')
    print('  /tmp/e2e-F2-dashboard-after-pw.png')
    print('  /tmp/e2e-G2-final-dashboard.png')
    print('  /tmp/e2e-H2-old-pw-fail.png')

    if failed > 0:
        exit(1)


if __name__ == '__main__':
    run()
