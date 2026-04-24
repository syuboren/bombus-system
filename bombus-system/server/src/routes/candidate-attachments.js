/**
 * 候選人附件上傳端點（HR 後台登入版 + 公開 token 版）
 *
 * HR:     POST /api/recruitment/candidate-attachments/upload       (需登入)
 * Public: POST /api/public/referrals/:token/upload                  (token 驗證)
 *
 * 檔案型別：PDF / DOC / DOCX / JPG / PNG / XLS / XLSX
 * 檔案大小：10 MB
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { getPlatformDB } = require('../db/platform-db');
const { tenantDBManager } = require('../db/tenant-db-manager');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/candidate-attachments');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.xls', '.xlsx'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * 修正 multer 把 multipart 檔名解碼錯誤造成中文亂碼。
 * 某些 client（curl / 舊 multer 路徑）會讓 originalname 以 latin1 byte-by-byte 存放，
 * 需轉回 UTF-8；若本身已是合法 UTF-8 則保留不動。
 */
function decodeOriginalName(file) {
  if (!file || typeof file.originalname !== 'string') return;
  const raw = file.originalname;
  try {
    const asUtf8Decoded = Buffer.from(raw, 'latin1').toString('utf8');
    // 轉換後不含 replacement char、字元數變短，視為原本是 latin1 byte-decoded
    if (!asUtf8Decoded.includes('�') && asUtf8Decoded !== raw && asUtf8Decoded.length < raw.length) {
      file.originalname = asUtf8Decoded;
    }
  } catch {
    /* ignore */
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    decodeOriginalName(file);
    const uniq = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `cand-${uniq}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  decodeOriginalName(file);
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return cb(new Error(`不支援的檔案格式：${ext}`), false);
  }
  cb(null, true);
};

const uploader = multer({ storage, limits: { fileSize: MAX_SIZE_BYTES }, fileFilter });

// ──────── HR 登入後上傳 ────────
const hrRouter = express.Router();
hrRouter.post('/upload', uploader.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'NO_FILE', message: '未收到檔案' });
    const url = `/uploads/candidate-attachments/${req.file.filename}`;
    res.json({
      success: true,
      url,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size
    });
  } catch (err) {
    console.error('[candidate-attachments] HR upload error:', err);
    res.status(500).json({ error: 'UPLOAD_FAILED', message: '上傳失敗' });
  }
});

// ──────── 公開（token 驗證）上傳 ────────
const publicRouter = express.Router({ mergeParams: true });

// Multer error handler: 轉成 JSON 回應（例如檔案過大）
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'FILE_TOO_LARGE', message: `檔案過大，上限 ${MAX_SIZE_BYTES / 1024 / 1024} MB` });
    }
    return res.status(400).json({ error: 'UPLOAD_ERROR', message: err.message });
  }
  if (err) {
    return res.status(400).json({ error: 'INVALID_FILE', message: err.message });
  }
  next();
}

publicRouter.post(
  '/referrals/:token/upload',
  (req, res, next) => {
    // 驗證 token 有效性（存在 + pending + 未過期）
    const token = req.params.token;
    if (!token) return res.status(400).json({ error: 'TOKEN_REQUIRED' });

    const platformDB = getPlatformDB();
    const row = platformDB.queryOne(
      "SELECT tenant_id FROM public_tokens WHERE token = ? AND resource_type = 'referral_invitation'",
      [token]
    );
    if (!row) return res.status(410).json({ error: 'INVALID_TOKEN', message: '連結無效或已失效' });

    let tenantDB;
    try {
      tenantDB = tenantDBManager.getDB(row.tenant_id);
    } catch (err) {
      console.error('[candidate-attachments] tenant load failed:', err);
      return res.status(500).json({ error: 'SERVER_ERROR' });
    }

    const invitation = tenantDB.prepare(
      'SELECT id, status, expires_at FROM referral_invitations WHERE token = ?'
    ).get(token);
    if (!invitation) return res.status(410).json({ error: 'INVALID_TOKEN', message: '連結無效或已失效' });
    if (invitation.status !== 'pending') {
      return res.status(410).json({ error: 'INVALID_STATE', message: '連結已失效' });
    }
    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      return res.status(410).json({ error: 'EXPIRED', message: '連結已過期' });
    }
    next();
  },
  uploader.single('file'),
  handleMulterError,
  (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'NO_FILE', message: '未收到檔案' });
      const url = `/uploads/candidate-attachments/${req.file.filename}`;
      res.json({
        success: true,
        url,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size
      });
    } catch (err) {
      console.error('[candidate-attachments] public upload error:', err);
      res.status(500).json({ error: 'UPLOAD_FAILED', message: '上傳失敗' });
    }
  }
);

module.exports = { hrRouter, publicRouter };
