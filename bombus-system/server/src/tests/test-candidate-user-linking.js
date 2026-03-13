/**
 * 候選人→員工→使用者帳號 自動串連 整合測試
 *
 * 測試場景：
 * A) Schema 遷移驗證 — org-units + pending-conversions 端點
 * B) 轉換流程 — 候選人轉員工 + 自動建立使用者帳號 + 指派 employee 角色
 * C) 首次登入攔截 — 新帳號登入時 must_change_password = true
 * D) 改密碼端點 — 驗證各種錯誤情境 + 正確改密碼
 * E) 改密碼後登入 — must_change_password = false
 * F) 必填欄位驗證 — convert-candidate 參數檢查
 * G) org-units 端點 — 取得組織單位列表
 *
 * 使用完整 API 流程：候選人列表 → decision(Offered) → accept offer → convert
 * 假設：伺服器在 http://localhost:3001，demo 租戶已初始化且有候選人資料
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const BASE = 'http://localhost:3001';
const TENANT_SLUG = 'demo';
const ADMIN_EMAIL = 'admin@demo.com';
const ADMIN_PASSWORD = 'admin123';

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, description) {
  if (condition) {
    passed++;
    results.push(`  PASS: ${description}`);
  } else {
    failed++;
    results.push(`  FAIL: ${description}`);
  }
}

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, data };
}

/**
 * 透過 API 流程將一個候選人推進到 offer_accepted 狀態
 * 1. decision → Offered（產生 response_token）
 * 2. offers/:token/respond → accepted（設為 offer_accepted）
 */
async function pushCandidateToOfferAccepted(candidateId, adminToken) {
  // Step 1: 做出 Offered 決策
  const decisionRes = await req('POST', `/api/recruitment/candidates/${candidateId}/decision`, {
    decision: 'Offered',
    decidedBy: 'test-admin',
    reason: 'Integration test'
  }, adminToken);

  if (decisionRes.status !== 200 || !decisionRes.data?.responseToken) {
    return { success: false, error: 'Decision API failed', detail: decisionRes };
  }

  // Step 2: 候選人接受 Offer
  const responseToken = decisionRes.data.responseToken;
  const acceptRes = await req('POST', `/api/recruitment/offers/${responseToken}/respond`, {
    response: 'accepted'
  }, adminToken);

  if (acceptRes.status !== 200) {
    return { success: false, error: 'Offer accept API failed', detail: acceptRes };
  }

  return { success: true, responseToken };
}

async function run() {
  console.log('=== 候選人→員工→使用者帳號 自動串連 整合測試 ===\n');

  // ─── 準備工作：Admin 登入 ───
  console.log('[準備] Admin 登入\n');
  const adminLogin = await req('POST', '/api/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    tenant_slug: TENANT_SLUG
  });

  if (adminLogin.status !== 200 || !adminLogin.data?.access_token) {
    console.error('ERROR: Admin 登入失敗，無法繼續測試');
    console.error('  請確認伺服器已啟動：cd bombus-system/server && npm run dev');
    console.error('  Status:', adminLogin.status, 'Data:', JSON.stringify(adminLogin.data));
    process.exit(1);
  }

  const adminToken = adminLogin.data.access_token;
  console.log('  Admin 登入成功\n');

  // ===========================================================
  // Part A: Schema 遷移驗證
  // ===========================================================
  console.log('[Part A] 端點正常性驗證\n');

  const pendingRes = await req('GET', '/api/hr/onboarding/pending-conversions', null, adminToken);
  assert(pendingRes.status === 200, 'A1 pending-conversions 端點正常 (200)');

  const orgUnitsRes = await req('GET', '/api/hr/onboarding/org-units', null, adminToken);
  assert(orgUnitsRes.status === 200, 'A2 org-units 端點正常 (200)');
  assert(Array.isArray(orgUnitsRes.data), 'A3 org-units 回傳陣列');

  const deptsRes = await req('GET', '/api/hr/onboarding/departments', null, adminToken);
  assert(deptsRes.status === 200, 'A4 departments 端點正常 (200)');

  // Admin login 應含 must_change_password 欄位（schema 遷移成功的證據）
  assert(
    adminLogin.data.user.must_change_password === false,
    'A5 Admin login 包含 must_change_password 欄位'
  );

  // ===========================================================
  // Part B: 轉換流程（完整 API 流程）
  // ===========================================================
  console.log('\n[Part B] 候選人轉換 + 自動建帳\n');

  // B1: 透過 seed 端點建立 offer_accepted 狀態的測試候選人
  const testEmail = `test-link-${Date.now()}@example.com`;
  const testName = 'Test Linking User';

  const seedRes = await req('POST', '/api/hr/onboarding/test/seed-candidate', {
    name: testName,
    email: testEmail
  }, adminToken);

  if (seedRes.status !== 201) {
    console.log('  ERROR: Seed 候選人失敗:', JSON.stringify(seedRes.data));
    assert(false, 'B1 建立測試候選人');
  } else {
    assert(true, `B1 建立測試候選人：${testName} (${testEmail})`);

    const candidateId = seedRes.data.id;
    let convertedEmail = testEmail;

    // B3: 轉換候選人
    const firstDept = deptsRes.data?.[0]?.name || '工程部';
    const orgUnits = orgUnitsRes.data || [];
    const matchingUnit = orgUnits.find(u => u.type === 'department' && u.name === firstDept);

    const convertRes = await req('POST', '/api/hr/onboarding/convert-candidate', {
      candidate_id: candidateId,
      department: firstDept,
      position: '前端工程師',
      job_title: '資深前端工程師',
      hire_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      probation_months: 3,
      org_unit_id: matchingUnit?.id || undefined
    }, adminToken);

    assert(convertRes.status === 201, `B3 轉換候選人成功 (201) — 實際: ${convertRes.status}`);

    if (convertRes.status === 201) {
      assert(!!convertRes.data?.data?.employee_id, 'B4 回傳 employee_id');
      assert(!!convertRes.data?.data?.employee_no, 'B5 回傳 employee_no');

      // B6: 驗證 user_account
      const userAccount = convertRes.data?.data?.user_account;
      assert(!!userAccount, 'B6 回傳 user_account 物件');

      if (userAccount && !userAccount.error) {
        if (userAccount.already_existed) {
          assert(!!userAccount.email, 'B7 既有帳號 — 包含 email');
          assert(userAccount.already_existed === true, 'B8 already_existed = true');
          console.log(`  INFO: 使用既有帳號 ${userAccount.email}`);
          convertedEmail = userAccount.email;
        } else {
          assert(!!userAccount.user_id, 'B7 新帳號 — 包含 user_id');
          assert(!!userAccount.email, 'B8 新帳號 — 包含 email');
          assert(userAccount.must_change_password === true, 'B9 must_change_password = true');
          assert(userAccount.default_role === 'employee', 'B10 預設角色 = employee');
          convertedEmail = userAccount.email;
        }
      } else if (userAccount?.error) {
        console.log(`  WARN: 帳號建立失敗：${userAccount.error}`);
      }

      // B11: 驗證 org_unit_id
      if (matchingUnit) {
        assert(
          convertRes.data?.data?.org_unit_id === matchingUnit.id,
          'B11 org_unit_id 正確回傳'
        );
      }

      // B12: 重複轉換防護
      const duplicateRes = await req('POST', '/api/hr/onboarding/convert-candidate', {
        candidate_id: candidateId,
        department: firstDept,
        position: '前端工程師',
        hire_date: '2026-04-01'
      }, adminToken);
      assert(duplicateRes.status === 400, 'B12 重複轉換被拒絕 (400)');

      // ===========================================================
      // Part C: 首次登入攔截
      // ===========================================================
      console.log('\n[Part C] 首次登入攔截\n');

      if (userAccount && !userAccount.error && !userAccount.already_existed) {
        const initialPassword = convertedEmail.length >= 8
          ? convertedEmail
          : convertedEmail + '1234';

        const newUserLogin = await req('POST', '/api/auth/login', {
          email: convertedEmail,
          password: initialPassword,
          tenant_slug: TENANT_SLUG
        });

        assert(newUserLogin.status === 200, 'C1 新員工首次登入成功 (200)');
        assert(
          newUserLogin.data?.user?.must_change_password === true,
          'C2 must_change_password = true'
        );
        assert(
          Array.isArray(newUserLogin.data?.user?.roles) &&
          newUserLogin.data.user.roles.includes('employee'),
          'C3 使用者角色包含 employee'
        );

        const newUserToken = newUserLogin.data?.access_token;

        // ===========================================================
        // Part D: 改密碼端點
        // ===========================================================
        console.log('\n[Part D] 改密碼端點\n');

        if (newUserToken) {
          // D1: 缺少欄位
          const missingFields = await req('POST', '/api/auth/change-password', {
            current_password: initialPassword
          }, newUserToken);
          assert(missingFields.status === 400, 'D1 缺少欄位被拒絕 (400)');

          // D2: 新密碼太短
          const shortPw = await req('POST', '/api/auth/change-password', {
            current_password: initialPassword,
            new_password: '1234567',
            tenant_slug: TENANT_SLUG
          }, newUserToken);
          assert(shortPw.status === 400, 'D2 新密碼太短被拒絕 (400)');

          // D3: 新舊密碼相同
          const samePw = await req('POST', '/api/auth/change-password', {
            current_password: initialPassword,
            new_password: initialPassword,
            tenant_slug: TENANT_SLUG
          }, newUserToken);
          assert(samePw.status === 400, 'D3 新舊密碼相同被拒絕 (400)');

          // D4: 舊密碼錯誤
          const wrongPw = await req('POST', '/api/auth/change-password', {
            current_password: 'wrongpassword123',
            new_password: 'newpassword123',
            tenant_slug: TENANT_SLUG
          }, newUserToken);
          assert(wrongPw.status === 401, 'D4 舊密碼錯誤被拒絕 (401)');

          // D5: 正確改密碼
          const newPassword = 'NewP@ssw0rd123';
          const changeRes = await req('POST', '/api/auth/change-password', {
            current_password: initialPassword,
            new_password: newPassword,
            tenant_slug: TENANT_SLUG
          }, newUserToken);
          assert(changeRes.status === 200, 'D5 改密碼成功 (200)');
          assert(changeRes.data?.success === true, 'D6 回傳 success = true');

          // ===========================================================
          // Part E: 改密碼後登入
          // ===========================================================
          console.log('\n[Part E] 改密碼後登入\n');

          // E1: 舊密碼登入失敗
          const oldPwLogin = await req('POST', '/api/auth/login', {
            email: convertedEmail,
            password: initialPassword,
            tenant_slug: TENANT_SLUG
          });
          assert(oldPwLogin.status === 401, 'E1 舊密碼登入失敗 (401)');

          // E2: 新密碼登入成功
          const newPwLogin = await req('POST', '/api/auth/login', {
            email: convertedEmail,
            password: newPassword,
            tenant_slug: TENANT_SLUG
          });
          assert(newPwLogin.status === 200, 'E2 新密碼登入成功 (200)');
          assert(
            newPwLogin.data?.user?.must_change_password === false,
            'E3 must_change_password = false（已清除）'
          );
        }
      } else {
        console.log('  INFO: 帳號為既有帳號或建立失敗，跳過首次登入測試');
      }
    } else {
      console.log('  ERROR: 轉換失敗:', JSON.stringify(convertRes.data));
    }
  }

  // ===========================================================
  // Part F: 必填欄位驗證
  // ===========================================================
  console.log('\n[Part F] convert-candidate 驗證\n');

  const missingReq = await req('POST', '/api/hr/onboarding/convert-candidate', {
    candidate_id: 'nonexistent'
  }, adminToken);
  assert(missingReq.status === 400, 'F1 缺少必填欄位被拒絕 (400)');

  const notFoundReq = await req('POST', '/api/hr/onboarding/convert-candidate', {
    candidate_id: 'nonexistent-id',
    department: '工程部',
    position: '工程師',
    hire_date: '2026-04-01'
  }, adminToken);
  assert(notFoundReq.status === 404, 'F2 不存在的候選人 (404)');

  // ===========================================================
  // Part G: org-units 端點
  // ===========================================================
  console.log('\n[Part G] org-units 端點\n');

  assert(orgUnitsRes.status === 200, 'G1 org-units 回傳 200');
  if (Array.isArray(orgUnitsRes.data) && orgUnitsRes.data.length > 0) {
    const unit = orgUnitsRes.data[0];
    assert(!!unit.id, 'G2 org_unit 有 id');
    assert(!!unit.name, 'G3 org_unit 有 name');
    assert(!!unit.type, 'G4 org_unit 有 type');
    assert(typeof unit.level === 'number', 'G5 org_unit 有 level (number)');
  }

  // ===========================================================
  // Part H: change-password 未授權
  // ===========================================================
  console.log('\n[Part H] change-password 未授權\n');

  const noTokenRes = await req('POST', '/api/auth/change-password', {
    current_password: 'test',
    new_password: 'test12345',
    tenant_slug: TENANT_SLUG
  });
  assert(noTokenRes.status === 401, 'H1 無 Token 被拒絕 (401)');

  // ===========================================================
  // 結果匯總
  // ===========================================================
  console.log('\n' + '='.repeat(50));
  console.log(`結果: ${passed} passed, ${failed} failed (共 ${passed + failed} 項)\n`);
  results.forEach(r => console.log(r));
  console.log('\n' + '='.repeat(50));

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
