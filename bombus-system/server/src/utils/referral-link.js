/**
 * Referral Link Builder
 *
 * 組出內推邀請的公開連結，供 HR 複製分享給候選人（系統不代寄信）。
 * 與既有 4 種 token（interview/offer response 等）的 /public/* 路徑慣例一致。
 */

let _warnedMissingFrontendUrl = false;

/**
 * 組出 referral 分享連結
 * @param {string} token - UUIDv4 token
 * @returns {string} 絕對 URL（有 FRONTEND_URL 時）或相對路徑
 */
function buildReferralLink(token) {
  const base = process.env.FRONTEND_URL;
  if (!base) {
    if (!_warnedMissingFrontendUrl) {
      console.warn('[referral-link] FRONTEND_URL is not set; returning relative path. Set it in server/.env for production.');
      _warnedMissingFrontendUrl = true;
    }
    return `/public/referral/${token}`;
  }
  const trimmed = base.replace(/\/+$/, '');
  return `${trimmed}/public/referral/${token}`;
}

module.exports = { buildReferralLink };
