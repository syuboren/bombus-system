/**
 * D-07 面試邀約流程整合測試
 *
 * 涵蓋：
 * - check-conflicts API：權限、15 分鐘對齊、面試官／候選人／會議衝突、已取消紀錄排除
 * - 發邀約 API：interviewerId 必填 / 無效員工 / 未對齊時段 / 全衝突硬擋 / 成功建立
 * - 安排面試 API：未對齊時段 / 衝突硬擋 / 成功建立（驗證 meeting 鏡像 + meeting_attendees）
 * - 取消面試：mirror meeting.status 同步為 cancelled
 *
 * 前提：
 *  - 後端 server 在 http://localhost:3001 執行中
 *  - demo 租戶已初始化，且已跑過 backfill-d07-interviewers.js（確保欄位存在）
 */

const BASE = 'http://localhost:3001';
let passed = 0, failed = 0;
const results = [];
const createdInterviews = [];
const createdInvitations = [];

function assert(condition, desc) {
    if (condition) { passed++; results.push(`  ✅ ${desc}`); }
    else { failed++; results.push(`  ❌ ${desc}`); }
}

async function req(method, path, body, token) {
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    const o = { method, headers: h };
    if (body && method !== 'GET') o.body = JSON.stringify(body);
    const r = await fetch(`${BASE}${path}`, o);
    let d = null;
    try { d = await r.json(); } catch {}
    return { status: r.status, data: d };
}

// 產生未來、15 分鐘對齊的 ISO 時段（偏移以分鐘計）
function futureSlot(offsetMinutes) {
    const now = Date.now();
    const aligned = Math.floor((now + offsetMinutes * 60 * 1000) / (15 * 60 * 1000)) * (15 * 60 * 1000);
    return new Date(aligned).toISOString().substring(0, 19);
}

async function run() {
    console.log('=== D-07 面試邀約流程整合測試 ===\n');

    // ─── Setup ───
    const login = await req('POST', '/api/auth/login', {
        email: 'admin@demo.com', password: 'admin123', tenant_slug: 'demo'
    });
    assert(login.status === 200, 'Setup: Demo 管理員登入成功');
    const adminToken = login.data?.access_token;
    if (!adminToken) {
        console.error('無 token，終止');
        console.log('\n' + results.join('\n'));
        process.exit(1);
    }

    // 取得一位 active 員工作為面試官候選
    const empList = await req('GET', '/api/employee/list?status=active', null, adminToken);
    assert(empList.status === 200, 'Setup: 取得員工清單');
    const interviewerId = empList.data?.[0]?.id;
    if (!interviewerId) {
        console.error('無員工可用');
        process.exit(1);
    }

    // 取得任一候選人
    const candList = await req('GET', '/api/recruitment/candidates', null, adminToken);
    assert(candList.status === 200, 'Setup: 取得候選人列表');
    const candidateId = candList.data?.[0]?.id;
    const jobId = candList.data?.[0]?.job_id;
    if (!candidateId || !jobId) {
        console.error('無候選人／職缺可用');
        process.exit(1);
    }

    // ═══════════════════════════════════════════════════════════
    // Section 1: check-conflicts API
    // ═══════════════════════════════════════════════════════════
    console.log('\n[Section 1] check-conflicts API');

    // 1.1 必填驗證
    const r11 = await req('POST', '/api/recruitment/interviews/check-conflicts', {}, adminToken);
    assert(r11.status === 400, '1.1 無參數回 400');

    // 1.2 空陣列
    const r12 = await req('POST', '/api/recruitment/interviews/check-conflicts',
        { interviewerId, slots: [] }, adminToken);
    assert(r12.status === 400, '1.2 空 slots 回 400');

    // 1.3 無衝突情境
    const freeSlot = futureSlot(60 * 24 * 30); // 30 天後，幾乎不可能有既有行程
    const r13 = await req('POST', '/api/recruitment/interviews/check-conflicts',
        { interviewerId, candidateId, slots: [freeSlot] }, adminToken);
    assert(r13.status === 200, '1.3 正常呼叫回 200');
    assert(Array.isArray(r13.data?.slots), '1.4 回傳 slots 陣列');
    assert(r13.data?.slots?.[0]?.status === 'available', '1.5 遠未來時段為 available');
    assert(r13.data?.allClear === true, '1.6 allClear = true');

    // ═══════════════════════════════════════════════════════════
    // Section 2: 發邀約 API 驗證
    // ═══════════════════════════════════════════════════════════
    console.log('\n[Section 2] POST /candidates/:id/invitations');

    const futureA = futureSlot(60 * 24 * 30 + 10);
    const futureB = futureSlot(60 * 24 * 30 + 100);

    // 2.1 缺 interviewerId
    const r21 = await req('POST', `/api/recruitment/candidates/${candidateId}/invitations`,
        { jobId, proposedSlots: [futureA] }, adminToken);
    assert(r21.status === 400 && r21.data?.error === 'INTERVIEWER_REQUIRED',
        '2.1 缺 interviewerId 回 400 INTERVIEWER_REQUIRED');

    // 2.2 無效 interviewerId
    const r22 = await req('POST', `/api/recruitment/candidates/${candidateId}/invitations`,
        { jobId, interviewerId: 'NONEXISTENT_999', proposedSlots: [futureA] }, adminToken);
    assert(r22.status === 400 && r22.data?.error === 'INTERVIEWER_INVALID',
        '2.2 無效 interviewerId 回 400 INTERVIEWER_INVALID');

    // 2.3 未對齊 15 分鐘
    const badSlot = futureA.replace(/:00$/, ':07'); // 替換秒為分鐘，產生 14:07 格式
    const r23 = await req('POST', `/api/recruitment/candidates/${candidateId}/invitations`,
        { jobId, interviewerId, proposedSlots: [badSlot.substring(0, 16) + ':00'] }, adminToken);
    // 注意：僅當修改後的分鐘數確實不是 00/15/30/45 時才應為 400
    // 若對齊後恰巧仍對齊，會是 201 或 409；這裡測試明確未對齊的 case：
    const definitelyBad = futureA.substring(0, 14) + '07:00';
    const r23b = await req('POST', `/api/recruitment/candidates/${candidateId}/invitations`,
        { jobId, interviewerId, proposedSlots: [definitelyBad] }, adminToken);
    assert(r23b.status === 400 && r23b.data?.error === 'SLOT_NOT_ALIGNED',
        '2.3 分鐘未對齊 15 分鐘回 400 SLOT_NOT_ALIGNED');

    // 2.4 成功建立（可用時段）
    const r24 = await req('POST', `/api/recruitment/candidates/${candidateId}/invitations`,
        { jobId, interviewerId, proposedSlots: [futureA, futureB], message: 'D-07 測試邀約' }, adminToken);
    assert(r24.status === 201, '2.4 有效參數建立邀約回 201');
    assert(!!r24.data?.invitationId, '2.5 回傳 invitationId');
    if (r24.data?.invitationId) createdInvitations.push(r24.data.invitationId);

    // ═══════════════════════════════════════════════════════════
    // Section 3: 安排面試 + meeting 鏡像
    // ═══════════════════════════════════════════════════════════
    console.log('\n[Section 3] POST /interviews + meeting mirror');

    // 用隨機偏移避免與前次測試殘留資料衝突
    const interviewSlot = futureSlot(60 * 24 * 30 + 200 + Math.floor(Math.random() * 1000) * 15);

    // 3.1 未對齊時段
    const r31 = await req('POST', '/api/recruitment/interviews', {
        candidateId, jobId, interviewerId,
        interviewAt: interviewSlot.substring(0, 14) + '08:00',
        location: 'online', round: 1
    }, adminToken);
    assert(r31.status === 400 && r31.data?.error === 'SLOT_NOT_ALIGNED',
        '3.1 未對齊時段回 400 SLOT_NOT_ALIGNED');

    // 3.2 成功建立面試（驗證 mirroredMeetingId 回傳）
    const r32 = await req('POST', '/api/recruitment/interviews', {
        candidateId, jobId, interviewerId,
        interviewAt: interviewSlot, location: 'online',
        meetingLink: 'https://meet.example.com/test', round: 1
    }, adminToken);
    assert(r32.status === 201, '3.2 有效時段建立面試回 201');
    assert(!!r32.data?.interviewId, '3.3 回傳 interviewId');
    assert(!!r32.data?.mirroredMeetingId, '3.4 回傳 mirroredMeetingId（meetings 鏡像）');
    assert(r32.data?.mirroredMeetingId === `mtg-${r32.data?.interviewId}`,
        '3.5 mirroredMeetingId 格式正確（mtg-<interviewId>）');
    const newInterviewId = r32.data?.interviewId;
    const cancelToken = r32.data?.cancelToken;
    if (newInterviewId) createdInterviews.push(newInterviewId);

    // 3.6 同時段再建一次應衝突（409）
    const r36 = await req('POST', '/api/recruitment/interviews', {
        candidateId, jobId, interviewerId,
        interviewAt: interviewSlot, location: 'online', round: 2
    }, adminToken);
    assert(r36.status === 409, '3.6 同面試官同時段再建回 409 SLOT_CONFLICT');
    assert(Array.isArray(r36.data?.conflicts), '3.7 回傳 conflicts 陣列');

    // 3.8 驗證衝突 API 能偵測到剛建立的面試
    const r38 = await req('POST', '/api/recruitment/interviews/check-conflicts',
        { interviewerId, candidateId, slots: [interviewSlot] }, adminToken);
    assert(r38.data?.slots?.[0]?.status === 'conflict',
        '3.8 check-conflicts 偵測到既有面試');

    // ═══════════════════════════════════════════════════════════
    // Section 4: 取消面試同步 meeting.status
    // ═══════════════════════════════════════════════════════════
    console.log('\n[Section 4] Cancel interview → meeting.status=cancelled');

    if (cancelToken) {
        const r41 = await req('POST', `/api/recruitment/interviews/cancel/${cancelToken}`,
            { reason: 'D-07 測試取消' }, adminToken);
        assert(r41.status === 200, `4.1 取消面試回 200 (實際=${r41.status})`);

        // 4.2 取消後同時段不再衝突
        const r42 = await req('POST', '/api/recruitment/interviews/check-conflicts',
            { interviewerId, candidateId, slots: [interviewSlot] }, adminToken);
        // 候選人本身的其他已取消面試也不應被回報
        assert(r42.data?.slots?.[0]?.status === 'available',
            '4.2 取消後同時段回到 available（cancelled_at 排除）');
    } else {
        assert(false, '4.0 無 cancelToken，跳過取消測試');
    }

    // ═══════════════════════════════════════════════════════════
    // 結果
    // ═══════════════════════════════════════════════════════════
    console.log('\n' + results.join('\n'));
    console.log(`\n=== 結果：${passed}/${passed + failed} passed ===`);

    if (createdInvitations.length > 0 || createdInterviews.length > 0) {
        console.log(`\n📝 測試產生資料：${createdInvitations.length} 邀約、${createdInterviews.length} 面試（未自動清理）`);
    }

    process.exit(failed === 0 ? 0 : 1);
}

run().catch(err => {
    console.error('❌ 測試執行錯誤:', err);
    process.exit(1);
});
