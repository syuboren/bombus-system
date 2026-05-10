/**
 * Integration test for code-generator service (D-15)
 *
 * 涵蓋：
 *   - supported target / unsupported target / unsupported count
 *   - 規則不存在 / disabled 時回 null
 *   - tryNext 在 transaction 外應 throw
 *   - previewBatch 不消耗 seq
 *   - tryNext 消耗 seq、回傳格式正確
 *   - 大量並發呼叫時 final current_seq = initial + N、所有 code 唯一、不撞號
 *   - ROLLBACK 後 current_seq 還原
 */

require('dotenv').config({ path: __dirname + '/../../.env' });

const { tenantDBManager } = require('../db/tenant-db-manager');
const codeGen = require('../services/code-generator');

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) {
    console.log('  ✅', msg);
    pass++;
  } else {
    console.log('  ❌', msg);
    fail++;
  }
}

(async () => {
  await tenantDBManager.init();
  const adapter = tenantDBManager.getDB('demo');

  // 重置：清空規則表開始測試
  adapter.transaction(() => {
    adapter.run("DELETE FROM code_naming_rules");
  });

  console.log('\n[1] 不支援的 target / 無效 count');
  adapter.transaction(() => {
    assert(codeGen.tryNext(adapter, 'job') === null, "tryNext('job') 回 null");
    assert(codeGen.tryNext(adapter, 'unknown') === null, "tryNext('unknown') 回 null");
  });
  assert(codeGen.previewBatch(adapter, 'job', 5) === null, "previewBatch('job', 5) 回 null");
  assert(codeGen.previewBatch(adapter, 'employee', -1) === null, "previewBatch with -1 回 null");
  assert(codeGen.previewBatch(adapter, 'employee', 'x') === null, "previewBatch with non-int 回 null");

  console.log('\n[2] 規則不存在時回 null');
  adapter.transaction(() => {
    assert(codeGen.tryNext(adapter, 'employee') === null, "tryNext 規則不存在 → null");
  });
  assert(codeGen.previewBatch(adapter, 'employee', 3) === null, 'previewBatch 規則不存在 → null');

  console.log('\n[3] disabled 規則也回 null');
  adapter.transaction(() => {
    adapter.run(
      "INSERT INTO code_naming_rules (target, prefix, padding, current_seq, enabled) VALUES ('employee', 'E', 4, 47, 0)"
    );
  });
  adapter.transaction(() => {
    assert(codeGen.tryNext(adapter, 'employee') === null, "disabled rule → tryNext null");
  });
  assert(codeGen.previewBatch(adapter, 'employee', 3) === null, 'disabled rule → previewBatch null');

  console.log('\n[4] tryNext 在 transaction 外應 throw');
  let threw = false;
  try {
    codeGen.tryNext(adapter, 'employee');
  } catch (e) {
    threw = true;
    assert(e.message.includes('transaction'), "throw 訊息含 'transaction'：" + e.message);
  }
  assert(threw, 'tryNext 在 transaction 外 throw');

  console.log('\n[5] enable rule 後 tryNext 消耗 seq、format 正確');
  adapter.transaction(() => {
    adapter.run("UPDATE code_naming_rules SET enabled = 1 WHERE target = 'employee'");
  });

  let nextCode;
  adapter.transaction(() => {
    nextCode = codeGen.tryNext(adapter, 'employee');
  });
  assert(nextCode === 'E0048', `tryNext → 'E0048'（實際 ${nextCode}）`);

  let seqAfter1 = adapter.queryOne("SELECT current_seq FROM code_naming_rules WHERE target='employee'").current_seq;
  assert(seqAfter1 === 48, `current_seq 推進至 48（實際 ${seqAfter1}）`);

  console.log('\n[6] previewBatch 不消耗 seq');
  const preview = codeGen.previewBatch(adapter, 'employee', 3);
  assert(JSON.stringify(preview) === JSON.stringify(['E0049', 'E0050', 'E0051']), `preview = ['E0049','E0050','E0051']（實際 ${JSON.stringify(preview)}）`);
  let seqAfterPreview = adapter.queryOne("SELECT current_seq FROM code_naming_rules WHERE target='employee'").current_seq;
  assert(seqAfterPreview === 48, `previewBatch 後 current_seq 仍為 48（實際 ${seqAfterPreview}）`);

  console.log('\n[7] padding 邊界：超過位數不截斷');
  adapter.transaction(() => {
    adapter.run("UPDATE code_naming_rules SET prefix='HR-', padding=3, current_seq=999, enabled=1 WHERE target='employee'");
  });
  let bigCode;
  adapter.transaction(() => {
    bigCode = codeGen.tryNext(adapter, 'employee');
  });
  assert(bigCode === 'HR-1000', `padding 超出 → 'HR-1000'（實際 ${bigCode}）`);

  console.log('\n[8] ROLLBACK 還原 current_seq');
  adapter.transaction(() => {
    adapter.run("UPDATE code_naming_rules SET prefix='E', padding=4, current_seq=100, enabled=1 WHERE target='employee'");
  });
  let rolledBack = false;
  try {
    adapter.transaction(() => {
      const c = codeGen.tryNext(adapter, 'employee');
      assert(c === 'E0101', 'tryNext 在預定 ROLLBACK 的 transaction 內仍回 E0101');
      throw new Error('故意 ROLLBACK');
    });
  } catch (e) {
    rolledBack = e.message === '故意 ROLLBACK';
  }
  assert(rolledBack, 'transaction throw 觸發 ROLLBACK');
  let seqRolled = adapter.queryOne("SELECT current_seq FROM code_naming_rules WHERE target='employee'").current_seq;
  assert(seqRolled === 100, `ROLLBACK 後 current_seq 還原為 100（實際 ${seqRolled}）`);

  console.log('\n[9] 連續多次 tryNext (模擬批次 N=100)');
  adapter.transaction(() => {
    adapter.run("UPDATE code_naming_rules SET current_seq=0, prefix='E', padding=5 WHERE target='employee'");
  });
  const codes = [];
  adapter.transaction(() => {
    for (let i = 0; i < 100; i++) {
      codes.push(codeGen.tryNext(adapter, 'employee'));
    }
  });
  const unique = new Set(codes);
  assert(codes.length === 100 && unique.size === 100, `100 次呼叫產生 100 個唯一 code（unique size ${unique.size}）`);
  assert(codes[0] === 'E00001' && codes[99] === 'E00100', `首尾 code 正確：${codes[0]} ~ ${codes[99]}`);
  let seqFinal = adapter.queryOne("SELECT current_seq FROM code_naming_rules WHERE target='employee'").current_seq;
  assert(seqFinal === 100, `final current_seq = 100（實際 ${seqFinal}）`);

  // cleanup
  adapter.transaction(() => {
    adapter.run("DELETE FROM code_naming_rules");
  });

  console.log(`\n=== 測試結果：通過 ${pass}，失敗 ${fail} ===`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
