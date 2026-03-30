# Candidates 相關資料表彙整

**資料庫**：`bombus-system/server/src/db/onboarding.db`  
**彙整日期**：2025-01-29（資料更新於 2025-01-29）

---

## 一、總覽

| 資料表 | 欄位數 | 筆數 | 說明 |
| -------- | -------- | ------ | ------ |
| **candidates** | 63 | 16 | 候選人主表（104 履歷對應 + 系統欄位） |
| **candidate_education** | 12 | 23 | 候選人學歷（104 education[]） |
| **candidate_experiences** | 19 | 26 | 候選人工作經歷（104 experiences[]） |
| **candidate_specialities** | 7 | 78 | 候選人技能專長（104 speciality[]） |
| **candidate_languages** | 12 | 38 | 候選人語言能力（104 foreign/local language[]） |
| **candidate_attachments** | 9 | 16 | 候選人附件（104 attachFiles[]） |
| **candidate_projects** | 11 | 11 | 候選人專案作品（104 projectDatas[]） |
| **candidate_custom_contents** | 6 | 0 | 候選人自訂內容（104 customContentDatas[]） |
| **candidate_recommenders** | 9 | 16 | 候選人推薦人（104 recommenders[]） |
| **candidate_apply_records** | 7 | 16 | 候選人應徵紀錄（104 applyJob[]） |
| **candidate_apply_questions** | 7 | 32 | 候選人應徵問答（104 applyQuestion[]） |
| **talent_pool** | 28 | 5 | 人才庫主表（可關聯 candidate_id） |
| **talent_contact_history** | 10 | 0 | 人才庫聯繫紀錄 |
| **talent_reminders** | 10 | 0 | 人才庫提醒 |
| **talent_tags** | 8 | 10 | 人才標籤定義 |
| **talent_tag_mapping** | 4 | 0 | 人才–標籤多對多 |
| **interview_invitations** | 15 | 8 | 面試邀約 |
| **interviews** | 13 | 7 | 面試紀錄 |
| **invitation_decisions** | 10 | 13 | 錄取/婉拒決策（含 Offer 回覆） |
| **interview_evaluations** | 15 | 6 | 面試評分與 AI 分析 |

---

## 二、依用途分類

### 1. 候選人主體與 104 履歷明細（candidates + 明細表）

- **candidates**：主表，`job_id` 關聯職缺；含 status、stage、scoring_status、104 基本資料與求職條件等。
- **candidate_education**、**candidate_experiences**、**candidate_specialities**、**candidate_languages**、**candidate_attachments**、**candidate_projects**、**candidate_custom_contents**、**candidate_recommenders**、**candidate_apply_records**、**candidate_apply_questions**：皆以 `candidate_id` 關聯 `candidates`，對應 104 履歷結構。

### 2. 招募流程（面試邀約 → 面試 → 決策 → 評分）

- **interview_invitations**：面試邀約，`candidate_id`、`job_id`；含 proposed_slots、candidate_response、response_token 等。
- **interviews**：面試安排，`candidate_id`、`job_id`、`interviewer_id`；含 round、interview_at、location、meeting_link、result、cancel_token 等。
- **invitation_decisions**：錄取/婉拒決策，`candidate_id`；含 decision、response_token、candidate_response、responded_at 等。
- **interview_evaluations**：面試評分，`candidate_id`、`interview_id`、`evaluator_id`；含 dimension_scores、overall_comment、total_score、ai_analysis_result 等。

### 3. 人才庫（Talent Pool）

- **talent_pool**：人才庫主表，`candidate_id` 可選填；含 source、status、match_score、decline_stage、original_job_id 等。
- **talent_contact_history**、**talent_reminders**：以 `talent_id` 關聯 `talent_pool`。
- **talent_tags**、**talent_tag_mapping**：標籤定義及人才–標籤關聯。

---

## 三、各表欄位清單

### candidates（63 欄）

`id`, `job_id`, `name`, `name_en`, `email`, `phone`, `status`, `score`, `apply_date`, `education`, `experience`, `experience_years`, `skills`, `resume_url`, `ai_summary`, `created_at`, `updated_at`, `stage`, `scoring_status`, `thank_you_sent_at`, `current_position`, `current_company`, `expected_salary`, `location`, `avatar`, `resume_104_id`, `gender`, `birthday`, `employment_status`, `seniority`, `sub_phone`, `tel`, `contact_info`, `address`, `reg_source`, `military_status`, `military_retire_date`, `introduction`, `motto`, `characteristic`, `personal_page`, `driving_licenses`, `transports`, `special_identities`, `nationality`, `disabled_types`, `disability_card`, `assistive_devices`, `job_characteristic`, `work_interval`, `other_work_interval`, `shift_work`, `start_date_opt`, `preferred_location`, `remote_work`, `preferred_job_name`, `preferred_job_category`, `preferred_industry`, `work_desc`, `biography`, `biography_en`, `certificates`, `other_certificates`

### candidate_education（12 欄）

`id`, `candidate_id`, `school_name`, `degree_level`, `major`, `major_category`, `degree_status`, `school_country`, `start_date`, `end_date`, `sort_order`, `created_at`

### candidate_experiences（19 欄）

`id`, `candidate_id`, `firm_name`, `industry_category`, `company_size`, `work_place`, `job_name`, `job_role`, `job_category`, `start_date`, `end_date`, `job_desc`, `skills`, `management`, `wage_type_desc`, `wage`, `wage_year`, `sort_order`, `created_at`

### candidate_specialities（7 欄）

`id`, `candidate_id`, `skill`, `description`, `tags`, `sort_order`, `created_at`

### candidate_languages（12 欄）

`id`, `candidate_id`, `lang_type`, `language_category`, `listen_degree`, `speak_degree`, `read_degree`, `write_degree`, `degree`, `certificates`, `sort_order`, `created_at`

### candidate_attachments（9 欄）

`id`, `candidate_id`, `type`, `title`, `file_name`, `resource_link`, `website`, `sort_order`, `created_at`

### candidate_projects（11 欄）

`id`, `candidate_id`, `title`, `start_date`, `end_date`, `description`, `type`, `resource_link`, `website`, `sort_order`, `created_at`

### candidate_custom_contents（6 欄）

`id`, `candidate_id`, `title`, `content`, `sort_order`, `created_at`

### candidate_recommenders（9 欄）

`id`, `candidate_id`, `name`, `corp`, `job_title`, `email`, `tel`, `sort_order`, `created_at`

### candidate_apply_records（7 欄）

`id`, `candidate_id`, `apply_date`, `job_name`, `job_no`, `apply_source`, `created_at`

### candidate_apply_questions（7 欄）

`id`, `candidate_id`, `type`, `question`, `answer`, `sort_order`, `created_at`

### talent_pool（28 欄）

`id`, `candidate_id`, `name`, `email`, `phone`, `avatar`, `current_position`, `current_company`, `experience_years`, `education`, `expected_salary`, `skills`, `resume_url`, `source`, `status`, `match_score`, `contact_priority`, `decline_stage`, `decline_reason`, `original_job_id`, `original_job_title`, `added_date`, `last_contact_date`, `next_contact_date`, `contact_count`, `notes`, `created_at`, `updated_at`

### talent_contact_history（10 欄）

`id`, `talent_id`, `contact_date`, `contact_method`, `contact_by`, `summary`, `outcome`, `next_action`, `next_action_date`, `created_at`

### talent_reminders（10 欄）

`id`, `talent_id`, `reminder_date`, `reminder_type`, `message`, `is_completed`, `completed_at`, `assigned_to`, `created_at`, `updated_at`

### talent_tags（8 欄）

`id`, `name`, `color`, `category`, `description`, `usage_count`, `created_at`, `updated_at`

### talent_tag_mapping（4 欄）

`id`, `talent_id`, `tag_id`, `created_at`

### interview_invitations（15 欄）

`id`, `candidate_id`, `job_id`, `status`, `proposed_slots`, `message`, `reply_deadline`, `confirmed_at`, `created_at`, `updated_at`, `selected_slots`, `candidate_response`, `responded_at`, `response_token`, `reschedule_note`

### interviews（13 欄）

`id`, `candidate_id`, `job_id`, `interviewer_id`, `round`, `interview_at`, `location`, `evaluation_json`, `result`, `remark`, `created_at`, `updated_at`, `meeting_link`

### invitation_decisions（10 欄）

`id`, `candidate_id`, `decision`, `decided_by`, `reason`, `decided_at`, `response_token`, `reply_deadline`, `candidate_response`, `responded_at`

### interview_evaluations（15 欄）

`id`, `candidate_id`, `interview_id`, `evaluator_id`, `performance_description`, `dimension_scores`, `overall_comment`, `total_score`, `transcript_text`, `media_url`, `ai_analysis_result`, `status`, `created_at`, `updated_at`, `media_size`

---

## 四、補充說明

1. **有資料的表**：
   - 候選人主體：`candidates`(16)、`candidate_education`(23)、`candidate_experiences`(26)、`candidate_specialities`(78)、`candidate_languages`(38)、`candidate_attachments`(16)、`candidate_projects`(11)、`candidate_recommenders`(16)、`candidate_apply_records`(16)、`candidate_apply_questions`(32)
   - 人才庫：`talent_pool`(5)、`talent_tags`(10)
   - 招募流程：`interview_invitations`(8)、`interviews`(7)、`invitation_decisions`(13)、`interview_evaluations`(6)
2. **關聯鍵**：候選人相關表多以 `candidate_id` → `candidates.id`；人才庫為 `talent_id` → `talent_pool.id`，`talent_pool.candidate_id` 可選填關聯候選人。
3. **schema 來源**：`server/src/db/index.js`（主表與人才庫）、`server/src/routes/recruitment.js`（`interview_evaluations`）。欄位數與筆數以 `PRAGMA table_info` 與 `SELECT COUNT(*)` 查詢結果為準。
