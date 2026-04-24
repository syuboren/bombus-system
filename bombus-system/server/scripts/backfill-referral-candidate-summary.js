#!/usr/bin/env node
/**
 * D-05 一次性修補：為既有內推候選人補 candidates.education / .experience / .experience_years
 * 之前版本漏寫這三個 summary 欄位，導致候選人列表顯示「未填寫」。
 *
 * 前提：server 必須已停止（sql.js 禁止多 process 同時寫）
 */
const path = require('path');
const fs = require('fs');

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  process.chdir(rootDir);

  const initSqlJs = require('sql.js');
  const { SqliteAdapter } = require('../src/db/db-adapter');
  const SQL = await initSqlJs();

  const tenantsDir = path.join(rootDir, 'data', 'tenants');
  const files = fs.readdirSync(tenantsDir).filter(f => f.endsWith('.db') && !f.includes('.backup'));

  let totalFixed = 0;

  for (const file of files) {
    const dbPath = path.join(tenantsDir, file);
    const buffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(buffer);
    db.run('PRAGMA foreign_keys = ON');
    const adapter = new SqliteAdapter(db, dbPath);

    let candidates;
    try {
      candidates = adapter.query(`
        SELECT id FROM candidates
        WHERE reg_source = 'referral'
          AND (education IS NULL OR education = ''
            OR experience IS NULL OR experience = ''
            OR seniority IS NULL OR seniority = '')
      `);
    } catch (e) {
      // table 不存在（舊租戶未遷移）跳過
      console.log(`[skip] ${file}: ${e.message}`);
      continue;
    }

    if (candidates.length === 0) {
      console.log(`[ok]   ${file}: 無需修補`);
      continue;
    }

    for (const c of candidates) {
      const edus = adapter.query(
        'SELECT school_name, degree_level, major, degree_status FROM candidate_education WHERE candidate_id = ? ORDER BY sort_order',
        [c.id]
      );
      const exps = adapter.query(
        'SELECT firm_name, job_name, start_date, end_date FROM candidate_experiences WHERE candidate_id = ? ORDER BY sort_order',
        [c.id]
      );

      const firstEdu = edus[0];
      const educationSummary = firstEdu
        ? [firstEdu.school_name, firstEdu.degree_level, firstEdu.major, firstEdu.degree_status].filter(Boolean).join(' · ')
        : null;

      const firstExp = exps[0];
      const experienceSummary = firstExp
        ? [firstExp.firm_name, firstExp.job_name].filter(Boolean).join(' · ')
        : null;

      const totalMonths = exps.reduce((sum, ex) => {
        if (!ex.start_date) return sum;
        const s = new Date(ex.start_date + '-01');
        const e = ex.end_date ? new Date(ex.end_date + '-01') : new Date();
        if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return sum;
        return sum + (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
      }, 0);
      const experienceYears = Math.max(0, Math.floor(totalMonths / 12));
      const residueMonths = Math.max(0, totalMonths % 12);
      const seniorityText = `${experienceYears}年${residueMonths}個月`;

      adapter.run(
        'UPDATE candidates SET education = ?, experience = ?, experience_years = ?, seniority = ?, updated_at = ? WHERE id = ?',
        [educationSummary, experienceSummary, experienceYears, seniorityText, new Date().toISOString(), c.id]
      );
      totalFixed += 1;
      console.log(`[fix]  ${file} · ${c.id.slice(0, 8)} → education="${educationSummary}" experience="${experienceSummary}" seniority="${seniorityText}"`);
    }

    adapter.save();
    db.close();
  }

  console.log(`\nDone. Total updated rows: ${totalFixed}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
