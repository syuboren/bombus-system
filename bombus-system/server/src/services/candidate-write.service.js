/**
 * 候選人寫入共用邏輯 — 給 HR 新增候選人 & 公開內推提交共用
 *
 * 輸入 payload 應符合 shared/components/candidate-full-form/candidate-full-form.model.ts
 * 輸出：{ candidateId }
 */

const { v4: uuidv4 } = require('uuid');

/**
 * 將完整 candidate 表單寫入 candidates + 關聯表。
 * @param {object} tenantDB       租戶 DB adapter
 * @param {object} params
 * @param {string} params.jobId
 * @param {string} params.lockedEmail       公開模式鎖定；HR 模式傳 payload.email
 * @param {string} params.regSource         'referral' | 'manual' | '104' | ...
 * @param {string|null} params.sourceDetail JSON string，referral 會帶推薦人資訊
 * @param {object} params.form              CandidateFullForm
 * @returns {{ candidateId: string }}
 */
function insertFullCandidate(tenantDB, { jobId, lockedEmail, regSource, sourceDetail, form }) {
  const candidateId = uuidv4();
  const now = new Date().toISOString();

  const educationList = Array.isArray(form.educationList) ? form.educationList.filter(e => e && e.schoolName) : [];
  const experienceList = Array.isArray(form.experienceList) ? form.experienceList.filter(e => e && e.firmName) : [];
  const specialityList = Array.isArray(form.specialityList) ? form.specialityList.filter(s => s && s.skill) : [];
  const languageList = Array.isArray(form.languageList) ? form.languageList.filter(l => l && l.langType) : [];
  const projectList = Array.isArray(form.projectList) ? form.projectList.filter(p => p && p.title) : [];
  const attachments = Array.isArray(form.attachments) ? form.attachments.filter(a => a && a.resourceLink) : [];

  // 推導 current_* 與 summary 欄位
  const latestExp = experienceList[0] || {};
  const currentCompany = latestExp.firmName || null;
  const currentPosition = latestExp.jobName || null;

  const firstEdu = educationList[0] || {};
  const educationSummary = firstEdu.schoolName
    ? [firstEdu.schoolName, firstEdu.degreeLevel, firstEdu.major, firstEdu.degreeStatus].filter(Boolean).join(' · ')
    : null;

  const experienceSummary = latestExp.firmName
    ? [latestExp.firmName, latestExp.jobName].filter(Boolean).join(' · ')
    : null;

  const totalMonths = experienceList.reduce((sum, exp) => {
    if (!exp || !exp.startDate) return sum;
    const s = new Date(exp.startDate + '-01');
    const e = exp.endDate ? new Date(exp.endDate + '-01') : new Date();
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return sum;
    return sum + (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  }, 0);
  const experienceYears = Math.max(0, Math.floor(totalMonths / 12));
  const residueMonths = Math.max(0, totalMonths % 12);
  const seniorityText = `${experienceYears}年${residueMonths}個月`;

  // 主表 insert
  tenantDB.prepare(`
    INSERT INTO candidates (
      id, job_id, status, stage, apply_date,
      name, name_en, gender, birthday,
      email, phone, tel, contact_info, address,
      nationality, military_status, driving_licenses, transports,
      job_characteristic, work_interval, shift_work, start_date_opt,
      expected_salary, preferred_location, preferred_job_name, preferred_job_category, preferred_industry,
      introduction, motto, characteristic, certificates,
      current_position, current_company,
      education, experience, experience_years, seniority,
      skills, avatar,
      reg_source, source_detail,
      created_at, updated_at
    ) VALUES (?, ?, 'new', 'Collected', ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?,
              ?, ?, ?, ?,
              ?, ?,
              ?, ?,
              ?, ?)
  `).run(
    candidateId, jobId, now,
    form.name, form.nameEn || null, form.gender || null, form.birthday || null,
    lockedEmail, form.phone, form.tel || null, form.contactInfo || null, form.address || null,
    form.nationality || null, form.militaryStatus || null, form.drivingLicenses || null, form.transports || null,
    form.jobCharacteristic || null, form.workInterval || null,
    form.shiftWork === true ? 1 : (form.shiftWork === false ? 0 : null),
    form.startDateOpt || null,
    form.expectedSalary || null, form.preferredLocation || null, form.preferredJobName || null,
    form.preferredJobCategory || null, form.preferredIndustry || null,
    form.introduction || null, form.motto || null, form.characteristic || null, form.certificates || null,
    currentPosition, currentCompany,
    educationSummary, experienceSummary, experienceYears, seniorityText,
    form.skillsText || null, form.avatar || null,
    regSource, sourceDetail,
    now, now
  );

  // 學歷
  const eduStmt = tenantDB.prepare(`
    INSERT INTO candidate_education (id, candidate_id, school_name, major, degree_level, degree_status, start_date, end_date, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  educationList.forEach((edu, idx) => {
    eduStmt.run(
      uuidv4(), candidateId,
      edu.schoolName, edu.major || null, edu.degreeLevel || null, edu.degreeStatus || null,
      edu.startDate || null, edu.endDate || null,
      idx
    );
  });

  // 工作經歷
  const expStmt = tenantDB.prepare(`
    INSERT INTO candidate_experiences (
      id, candidate_id, firm_name, job_name, industry_category,
      company_size, work_place, start_date, end_date, job_desc, skills, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  experienceList.forEach((exp, idx) => {
    expStmt.run(
      uuidv4(), candidateId,
      exp.firmName, exp.jobName || null, exp.industryCategory || null,
      exp.companySize || null, exp.workPlace || null,
      exp.startDate || null, exp.endDate || null,
      exp.jobDesc || null, exp.skills || null,
      idx
    );
  });

  // 技能專長
  const spStmt = tenantDB.prepare(`
    INSERT INTO candidate_specialities (id, candidate_id, skill, description, tags, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  specialityList.forEach((sp, idx) => {
    spStmt.run(uuidv4(), candidateId, sp.skill, sp.description || null, sp.tags || null, idx);
  });

  // 語言能力
  const langStmt = tenantDB.prepare(`
    INSERT INTO candidate_languages (
      id, candidate_id, lang_type, listen_degree, speak_degree, read_degree, write_degree, certificates, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  languageList.forEach((lg, idx) => {
    langStmt.run(
      uuidv4(), candidateId,
      lg.langType, lg.listenDegree || null, lg.speakDegree || null,
      lg.readDegree || null, lg.writeDegree || null, lg.certificates || null,
      idx
    );
  });

  // 專案作品
  const projStmt = tenantDB.prepare(`
    INSERT INTO candidate_projects (id, candidate_id, title, start_date, end_date, description, resource_link, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  projectList.forEach((pj, idx) => {
    projStmt.run(
      uuidv4(), candidateId,
      pj.title, pj.startDate || null, pj.endDate || null, pj.description || null, pj.resourceLink || null,
      idx
    );
  });

  // 附件
  const attStmt = tenantDB.prepare(`
    INSERT INTO candidate_attachments (id, candidate_id, title, file_name, resource_link, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  attachments.forEach((att, idx) => {
    attStmt.run(uuidv4(), candidateId, att.title || att.fileName, att.fileName, att.resourceLink, idx);
  });

  return { candidateId };
}

module.exports = { insertFullCandidate };
