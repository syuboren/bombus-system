/**
 * HR 後台新增候選人 API
 * POST /api/recruitment/candidates
 *
 * 掛在 authMiddleware + tenantMiddleware 後（HR 登入）。
 * 與公開內推提交共用 insertFullCandidate 服務。
 */

const express = require('express');
const router = express.Router();
const { requireFeaturePerm } = require('../middleware/permission');
const { insertFullCandidate } = require('../services/candidate-write.service');

router.post(
  '/',
  requireFeaturePerm('L1.recruitment', 'edit'),
  (req, res) => {
    const form = req.body || {};
    const { jobId } = form;

    if (!jobId) {
      return res.status(400).json({ error: 'JOB_ID_REQUIRED', message: '缺少職缺' });
    }

    // 職缺存在性檢查
    const job = req.tenantDB.prepare('SELECT id, status FROM jobs WHERE id = ?').get(jobId);
    if (!job) {
      return res.status(400).json({ error: 'JOB_NOT_FOUND', message: '職缺不存在' });
    }

    // 必填驗證
    if (!form.name || !form.email || !form.phone || !form.gender || !form.birthday || !form.nationality) {
      return res.status(400).json({ error: 'MISSING_FIELDS', message: '基本資料必填欄位未完成' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return res.status(400).json({ error: 'INVALID_EMAIL', message: 'Email 格式錯誤' });
    }
    const educationList = Array.isArray(form.educationList) ? form.educationList : [];
    if (educationList.length === 0 || !educationList[0].schoolName) {
      return res.status(400).json({ error: 'MISSING_EDUCATION', message: '請至少填寫一筆學歷' });
    }
    const specialityList = Array.isArray(form.specialityList) ? form.specialityList : [];
    if (specialityList.length === 0 || !specialityList[0].skill) {
      return res.status(400).json({ error: 'MISSING_SPECIALITY', message: '請至少填寫一筆技能專長' });
    }
    const languageList = Array.isArray(form.languageList) ? form.languageList : [];
    if (languageList.length === 0 || !languageList[0].langType) {
      return res.status(400).json({ error: 'MISSING_LANGUAGE', message: '請至少填寫一筆語言能力' });
    }

    // 重複檢查：同 job_id + 同 email 候選人已存在？
    const dup = req.tenantDB.prepare(
      'SELECT id FROM candidates WHERE job_id = ? AND lower(email) = lower(?)'
    ).get(jobId, form.email);
    if (dup) {
      return res.status(409).json({
        error: 'DUPLICATE_CANDIDATE',
        message: '此 email 已應徵過此職缺'
      });
    }

    try {
      const { candidateId } = insertFullCandidate(req.tenantDB, {
        jobId,
        lockedEmail: form.email,
        regSource: 'manual',
        sourceDetail: null,
        form
      });
      res.status(201).json({ success: true, candidateId });
    } catch (err) {
      console.error('[recruitment-candidates] insert failed:', err);
      res.status(500).json({ error: 'DB_ERROR', message: '新增候選人失敗' });
    }
  }
);

module.exports = router;
