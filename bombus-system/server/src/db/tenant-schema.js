/**
 * Tenant Schema — 租戶資料庫 Schema 定義
 *
 * 包含：
 * - RBAC 表（users, org_units, roles, permissions, role_permissions, user_roles, refresh_tokens）
 * - L1~L6 業務表（從 db/index.js 提取的 69 張表）
 */

// ─── 共用遷移常數（供 tenant-db-manager.js 共用） ───

const EMPLOYEE_MIGRATIONS = [
  'ALTER TABLE employees ADD COLUMN job_title TEXT',
  'ALTER TABLE employees ADD COLUMN candidate_id TEXT',
  'ALTER TABLE employees ADD COLUMN probation_end_date TEXT',
  'ALTER TABLE employees ADD COLUMN probation_months INTEGER',
  'ALTER TABLE employees ADD COLUMN onboarding_status TEXT',
  'ALTER TABLE employees ADD COLUMN converted_at TEXT',
  'ALTER TABLE employees ADD COLUMN org_unit_id TEXT REFERENCES org_units(id)'
];

const USER_MIGRATIONS = [
  'ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0'
];

const INTERVIEW_MIGRATIONS = [
  'ALTER TABLE interviews ADD COLUMN address TEXT'
];

// ─── RBAC 表 SQL ───

const RBAC_TABLES_SQL = `
  -- 使用者帳號（與 employees 表並存，透過 employee_id 關聯）
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    employee_id TEXT REFERENCES employees(id),
    avatar TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','locked')),
    last_login TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- 組織單位（集團/子公司/部門）
  CREATE TABLE IF NOT EXISTS org_units (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('group','subsidiary','department')),
    parent_id TEXT REFERENCES org_units(id),
    level INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- 角色定義
  CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    scope_type TEXT NOT NULL CHECK(scope_type IN ('global','subsidiary','department')),
    is_system INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- 權限定義
  CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    UNIQUE(resource, action)
  );

  -- 角色-權限對應
  CREATE TABLE IF NOT EXISTS role_permissions (
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
  );

  -- 使用者-角色對應（含作用範圍）
  CREATE TABLE IF NOT EXISTS user_roles (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    org_unit_id TEXT REFERENCES org_units(id),
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, role_id, org_unit_id)
  );

  -- Refresh Token 儲存
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`;

// ─── L1~L6 業務表 SQL ───

const BUSINESS_TABLES_SQL = `
  -- =====================================================
  -- 表單模板系統
  -- =====================================================
  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    is_public INTEGER DEFAULT 0,
    is_required INTEGER DEFAULT 0,
    description TEXT,
    pdf_base64 TEXT,
    mapping_config TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    template_version INTEGER DEFAULT 1,
    token TEXT UNIQUE,
    employee_id TEXT,
    employee_name TEXT,
    employee_email TEXT,
    status TEXT DEFAULT 'DRAFT',
    form_data TEXT,
    signature_base64 TEXT,
    signed_at TEXT,
    ip_address TEXT,
    approval_status TEXT DEFAULT 'NONE',
    approver_id TEXT,
    approval_note TEXT,
    approved_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (template_id) REFERENCES templates(id)
  );

  CREATE TABLE IF NOT EXISTS template_versions (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    mapping_config TEXT,
    pdf_base64 TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (template_id) REFERENCES templates(id)
  );

  -- =====================================================
  -- 招募管理
  -- =====================================================
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    department TEXT,
    description TEXT,
    recruiter TEXT,
    status TEXT DEFAULT 'draft',
    publish_date TEXT,
    jd_id TEXT,
    job104_no TEXT,
    sync_status TEXT DEFAULT 'local_only',
    job104_data TEXT,
    synced_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS candidates (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    stage TEXT DEFAULT 'Collected',
    scoring_status TEXT DEFAULT 'Pending',
    score INTEGER DEFAULT 0,
    apply_date TEXT,
    resume_url TEXT,
    ai_summary TEXT,
    thank_you_sent_at TEXT,
    resume_104_id TEXT,
    name TEXT NOT NULL,
    name_en TEXT,
    gender TEXT,
    email TEXT,
    phone TEXT,
    sub_phone TEXT,
    tel TEXT,
    contact_info TEXT,
    address TEXT,
    birthday TEXT,
    reg_source TEXT,
    employment_status TEXT,
    military_status TEXT,
    military_retire_date TEXT,
    introduction TEXT,
    motto TEXT,
    characteristic TEXT,
    personal_page TEXT,
    driving_licenses TEXT,
    transports TEXT,
    special_identities TEXT,
    nationality TEXT,
    disabled_types TEXT,
    disability_card INTEGER DEFAULT 0,
    assistive_devices TEXT,
    avatar TEXT,
    seniority TEXT,
    job_characteristic TEXT,
    work_interval TEXT,
    other_work_interval TEXT,
    shift_work INTEGER DEFAULT 0,
    start_date_opt TEXT,
    expected_salary TEXT,
    preferred_location TEXT,
    remote_work TEXT,
    preferred_job_name TEXT,
    preferred_job_category TEXT,
    preferred_industry TEXT,
    work_desc TEXT,
    biography TEXT,
    biography_en TEXT,
    certificates TEXT,
    other_certificates TEXT,
    current_position TEXT,
    current_company TEXT,
    location TEXT,
    education TEXT,
    experience TEXT,
    experience_years INTEGER DEFAULT 0,
    skills TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT,
    FOREIGN KEY (job_id) REFERENCES jobs(id)
  );

  CREATE TABLE IF NOT EXISTS candidate_education (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    school_name TEXT,
    degree_level TEXT,
    major TEXT,
    major_category TEXT,
    degree_status TEXT,
    school_country TEXT,
    start_date TEXT,
    end_date TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS candidate_experiences (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    firm_name TEXT,
    industry_category TEXT,
    company_size TEXT,
    work_place TEXT,
    job_name TEXT,
    job_role TEXT,
    job_category TEXT,
    start_date TEXT,
    end_date TEXT,
    job_desc TEXT,
    skills TEXT,
    management TEXT,
    wage_type_desc TEXT,
    wage INTEGER,
    wage_year INTEGER,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS candidate_specialities (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    skill TEXT,
    description TEXT,
    tags TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS candidate_languages (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    lang_type TEXT,
    language_category TEXT,
    listen_degree TEXT,
    speak_degree TEXT,
    read_degree TEXT,
    write_degree TEXT,
    degree TEXT,
    certificates TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS candidate_attachments (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    type INTEGER,
    title TEXT,
    file_name TEXT,
    resource_link TEXT,
    website TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS candidate_projects (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    title TEXT,
    start_date TEXT,
    end_date TEXT,
    description TEXT,
    type INTEGER,
    resource_link TEXT,
    website TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS candidate_custom_contents (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    title TEXT,
    content TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS candidate_recommenders (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    name TEXT,
    corp TEXT,
    job_title TEXT,
    email TEXT,
    tel TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS candidate_apply_records (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    apply_date TEXT,
    job_name TEXT,
    job_no TEXT,
    apply_source TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS candidate_apply_questions (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    type TEXT,
    question TEXT,
    answer TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS candidate_resume_analysis (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    job_id TEXT NOT NULL,
    overall_match_score INTEGER DEFAULT 0,
    requirement_match_score INTEGER DEFAULT 0,
    keyword_match_score INTEGER DEFAULT 0,
    experience_relevance_score INTEGER DEFAULT 0,
    matched_requirements TEXT,
    unmatched_requirements TEXT,
    bonus_skills TEXT,
    extracted_tech_skills TEXT,
    extracted_soft_skills TEXT,
    jd_required_match_count INTEGER DEFAULT 0,
    jd_required_total_count INTEGER DEFAULT 0,
    jd_bonus_match_count INTEGER DEFAULT 0,
    jd_bonus_total_count INTEGER DEFAULT 0,
    experience_analysis TEXT,
    total_relevant_years REAL DEFAULT 0,
    jd_required_years REAL DEFAULT 0,
    writing_style TEXT,
    analysis_confidence INTEGER DEFAULT 0,
    content_features TEXT,
    areas_to_clarify TEXT,
    tech_verification_points TEXT,
    experience_supplement_points TEXT,
    analyzed_at TEXT,
    analysis_engine_version TEXT,
    resume_word_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    UNIQUE(candidate_id, job_id)
  );

  -- =====================================================
  -- 面試評分
  -- =====================================================
  CREATE TABLE IF NOT EXISTS interview_evaluations (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    interview_id TEXT,
    evaluator_id TEXT,
    performance_description TEXT,
    dimension_scores TEXT,
    overall_comment TEXT,
    total_score INTEGER DEFAULT 0,
    transcript_text TEXT,
    media_url TEXT,
    media_size INTEGER DEFAULT 0,
    ai_analysis_result TEXT,
    status TEXT DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    scoring_items TEXT,
    process_checklist TEXT,
    comprehensive_assessment TEXT,
    pros_comment TEXT,
    cons_comment TEXT,
    recommendation TEXT,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id)
  );

  -- =====================================================
  -- 人才庫
  -- =====================================================
  CREATE TABLE IF NOT EXISTS talent_pool (
    id TEXT PRIMARY KEY,
    candidate_id TEXT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    avatar TEXT,
    current_position TEXT,
    current_company TEXT,
    experience_years INTEGER DEFAULT 0,
    education TEXT,
    expected_salary TEXT,
    skills TEXT,
    resume_url TEXT,
    source TEXT DEFAULT 'other',
    status TEXT DEFAULT 'active',
    match_score INTEGER DEFAULT 0,
    contact_priority TEXT DEFAULT 'medium',
    decline_stage TEXT,
    decline_reason TEXT,
    original_job_id TEXT,
    original_job_title TEXT,
    added_date TEXT DEFAULT (datetime('now')),
    last_contact_date TEXT,
    next_contact_date TEXT,
    contact_count INTEGER DEFAULT 0,
    contact_reminder_enabled INTEGER DEFAULT 0,
    contact_reminder_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE SET NULL,
    FOREIGN KEY (original_job_id) REFERENCES jobs(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS talent_contact_history (
    id TEXT PRIMARY KEY,
    talent_id TEXT NOT NULL,
    contact_date TEXT NOT NULL,
    contact_method TEXT,
    contact_by TEXT,
    summary TEXT,
    outcome TEXT,
    next_action TEXT,
    next_action_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (talent_id) REFERENCES talent_pool(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS talent_reminders (
    id TEXT PRIMARY KEY,
    talent_id TEXT NOT NULL,
    reminder_date TEXT NOT NULL,
    reminder_type TEXT,
    message TEXT,
    is_completed INTEGER DEFAULT 0,
    completed_at TEXT,
    assigned_to TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT,
    FOREIGN KEY (talent_id) REFERENCES talent_pool(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS talent_tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#3B82F6',
    category TEXT DEFAULT 'custom',
    description TEXT,
    usage_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS talent_tag_mapping (
    id TEXT PRIMARY KEY,
    talent_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (talent_id) REFERENCES talent_pool(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES talent_tags(id) ON DELETE CASCADE,
    UNIQUE(talent_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS talent_job_matches (
    id TEXT PRIMARY KEY,
    talent_id TEXT NOT NULL,
    job_id TEXT NOT NULL,
    match_score INTEGER DEFAULT 0,
    match_details TEXT,
    analysis_summary TEXT,
    analyzed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT,
    FOREIGN KEY (talent_id) REFERENCES talent_pool(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    UNIQUE(talent_id, job_id)
  );

  -- =====================================================
  -- 面試管理
  -- =====================================================
  CREATE TABLE IF NOT EXISTS interview_invitations (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    job_id TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    proposed_slots TEXT,
    selected_slots TEXT,
    message TEXT,
    reply_deadline TEXT,
    confirmed_at TEXT,
    response_token TEXT UNIQUE,
    candidate_response TEXT,
    reschedule_note TEXT,
    responded_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id),
    FOREIGN KEY (job_id) REFERENCES jobs(id)
  );

  CREATE TABLE IF NOT EXISTS interviews (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    job_id TEXT NOT NULL,
    interviewer_id TEXT,
    round INTEGER DEFAULT 1,
    interview_at TEXT,
    location TEXT,
    address TEXT,
    meeting_link TEXT,
    evaluation_json TEXT,
    result TEXT DEFAULT 'Pending',
    remark TEXT,
    cancel_token TEXT UNIQUE,
    cancelled_at TEXT,
    cancel_reason TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id),
    FOREIGN KEY (job_id) REFERENCES jobs(id)
  );

  CREATE TABLE IF NOT EXISTS candidate_interview_forms (
    id TEXT PRIMARY KEY,
    interview_id TEXT NOT NULL,
    form_token TEXT UNIQUE NOT NULL,
    form_data TEXT,
    status TEXT DEFAULT 'Pending',
    time_limit_minutes INTEGER DEFAULT 60,
    started_at TEXT,
    submitted_at TEXT,
    locked_at TEXT,
    current_step INTEGER DEFAULT 1,
    last_saved_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS invitation_decisions (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    decision TEXT NOT NULL,
    decided_by TEXT,
    reason TEXT,
    decided_at TEXT DEFAULT (datetime('now')),
    response_token TEXT UNIQUE,
    reply_deadline TEXT,
    candidate_response TEXT,
    responded_at TEXT,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id)
  );

  -- =====================================================
  -- 員工管理
  -- =====================================================
  CREATE TABLE IF NOT EXISTS employee_documents (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    type TEXT NOT NULL,
    label TEXT NOT NULL,
    custom_name TEXT,
    file_name TEXT,
    file_url TEXT,
    file_size INTEGER,
    mime_type TEXT,
    status TEXT DEFAULT 'uploaded',
    reject_reason TEXT,
    uploaded_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    employee_no TEXT UNIQUE,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    department TEXT,
    position TEXT,
    role TEXT DEFAULT 'employee',
    level TEXT,
    grade TEXT,
    manager_id TEXT,
    hire_date TEXT,
    contract_type TEXT DEFAULT 'full-time',
    work_location TEXT,
    avatar TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT,
    FOREIGN KEY (manager_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS employee_education (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    degree TEXT NOT NULL,
    school TEXT NOT NULL,
    major TEXT,
    graduation_year INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS employee_skills (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    skill_name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS employee_certifications (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    cert_name TEXT NOT NULL,
    issued_date TEXT,
    expiry_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS employee_job_changes (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    effective_date TEXT NOT NULL,
    change_type TEXT NOT NULL,
    from_position TEXT,
    to_position TEXT,
    from_department TEXT,
    to_department TEXT,
    from_level TEXT,
    to_level TEXT,
    salary_change REAL,
    reason TEXT,
    approved_by TEXT,
    approved_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS employee_salaries (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    base_salary REAL NOT NULL,
    allowances REAL DEFAULT 0,
    bonus REAL DEFAULT 0,
    effective_date TEXT NOT NULL,
    end_date TEXT,
    adjustment_reason TEXT,
    approved_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS employee_training (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    course_name TEXT NOT NULL,
    course_type TEXT DEFAULT 'internal',
    completion_date TEXT,
    score REAL,
    certificate TEXT,
    hours REAL DEFAULT 0,
    cost REAL DEFAULT 0,
    status TEXT DEFAULT 'completed',
    instructor TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS employee_performance (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    year INTEGER NOT NULL,
    quarter INTEGER,
    review_type TEXT,
    overall_score REAL,
    goals_achieved INTEGER,
    goals_total INTEGER,
    strengths TEXT,
    improvements TEXT,
    reviewer_id TEXT,
    reviewer_name TEXT,
    review_date TEXT,
    comments TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS employee_roi (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER,
    revenue_generated REAL DEFAULT 0,
    cost_saved REAL DEFAULT 0,
    projects_completed INTEGER DEFAULT 0,
    training_cost REAL DEFAULT 0,
    salary_cost REAL DEFAULT 0,
    calculated_roi REAL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
  );

  -- =====================================================
  -- 會議管理
  -- =====================================================
  CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'scheduled',
    location TEXT,
    is_online INTEGER DEFAULT 0,
    meeting_link TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    duration INTEGER,
    recurrence TEXT DEFAULT 'none',
    recurrence_end_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS meeting_reminders (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL,
    timing TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS meeting_attendees (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL,
    employee_id TEXT,
    name TEXT NOT NULL,
    email TEXT,
    department TEXT,
    position TEXT,
    avatar TEXT,
    is_organizer INTEGER DEFAULT 0,
    is_required INTEGER DEFAULT 1,
    attendance_status TEXT DEFAULT 'pending',
    signed_in INTEGER DEFAULT 0,
    signed_in_time TEXT,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS meeting_agenda_items (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    discussion_points TEXT,
    presenter TEXT,
    duration INTEGER,
    status TEXT DEFAULT 'pending',
    order_index INTEGER DEFAULT 0,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS meeting_conclusions (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL,
    agenda_item_id TEXT,
    content TEXT NOT NULL,
    responsible_id TEXT,
    responsible_name TEXT,
    department TEXT,
    due_date TEXT,
    status TEXT DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    progress_notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS meeting_attachments (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    size INTEGER,
    url TEXT NOT NULL,
    uploaded_by TEXT,
    uploaded_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
  );

  -- =====================================================
  -- 績效評估系統
  -- =====================================================
  CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS monthly_check_templates (
    id TEXT PRIMARY KEY,
    department TEXT NOT NULL,
    position TEXT NOT NULL,
    name TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    measurement TEXT,
    order_num INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS monthly_checks (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    manager_id TEXT,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    status TEXT DEFAULT 'self_assessment',
    self_assessment_date TEXT,
    manager_review_date TEXT,
    hr_review_date TEXT,
    total_score REAL,
    manager_comment TEXT,
    hr_comment TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT,
    UNIQUE(employee_id, year, month)
  );

  CREATE TABLE IF NOT EXISTS monthly_check_items (
    id TEXT PRIMARY KEY,
    monthly_check_id TEXT NOT NULL,
    template_id TEXT,
    name TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    measurement TEXT,
    order_num INTEGER DEFAULT 0,
    self_score INTEGER,
    manager_score INTEGER,
    weighted_score REAL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (monthly_check_id) REFERENCES monthly_checks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS quarterly_reviews (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    manager_id TEXT,
    year INTEGER NOT NULL,
    quarter INTEGER NOT NULL,
    form_type TEXT DEFAULT 'employee',
    status TEXT DEFAULT 'employee_submitted',
    monthly_avg_score REAL,
    interview_date TEXT,
    interview_location TEXT,
    total_score REAL,
    manager_comment TEXT,
    development_plan TEXT,
    hr_comment TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT,
    UNIQUE(employee_id, year, quarter, form_type)
  );

  CREATE TABLE IF NOT EXISTS quarterly_review_sections (
    id TEXT PRIMARY KEY,
    review_id TEXT NOT NULL,
    section_type TEXT NOT NULL,
    content TEXT,
    order_num INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (review_id) REFERENCES quarterly_reviews(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS satisfaction_surveys (
    id TEXT PRIMARY KEY,
    review_id TEXT NOT NULL,
    question_id INTEGER NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (review_id) REFERENCES quarterly_reviews(id) ON DELETE CASCADE,
    UNIQUE(review_id, question_id)
  );

  CREATE TABLE IF NOT EXISTS weekly_reports (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    reviewer_id TEXT,
    year INTEGER NOT NULL,
    week INTEGER NOT NULL,
    week_start TEXT,
    week_end TEXT,
    status TEXT DEFAULT 'draft',
    submit_date TEXT,
    review_date TEXT,
    reviewer_comment TEXT,
    next_week_plan TEXT,
    weekly_summary TEXT,
    routine_total_minutes INTEGER DEFAULT 0,
    non_routine_total_minutes INTEGER DEFAULT 0,
    employee_signature TEXT,
    employee_signature_date TEXT,
    manager_signature TEXT,
    manager_signature_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT,
    UNIQUE(employee_id, year, week)
  );

  CREATE TABLE IF NOT EXISTS weekly_report_items (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL,
    item_type TEXT NOT NULL,
    order_num INTEGER DEFAULT 0,
    content TEXT,
    estimated_time INTEGER DEFAULT 0,
    actual_time INTEGER DEFAULT 0,
    completed_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS weekly_todo_items (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL,
    order_num INTEGER DEFAULT 0,
    task TEXT NOT NULL,
    start_date TEXT,
    due_date TEXT,
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'not_started',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS weekly_problem_items (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL,
    order_num INTEGER DEFAULT 0,
    problem TEXT NOT NULL,
    solution TEXT,
    resolved INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS weekly_training_items (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL,
    order_num INTEGER DEFAULT 0,
    course_name TEXT NOT NULL,
    status TEXT DEFAULT 'not_started',
    total_hours REAL DEFAULT 0,
    completed_hours REAL DEFAULT 0,
    completed_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS weekly_project_items (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL,
    order_num INTEGER DEFAULT 0,
    task TEXT NOT NULL,
    progress_rate INTEGER DEFAULT 0,
    collaboration TEXT,
    challenges TEXT,
    expected_date TEXT,
    actual_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE
  );

  -- =====================================================
  -- 通知系統
  -- =====================================================
  CREATE TABLE IF NOT EXISTS competency_notifications (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    recipient_email TEXT,
    subject TEXT,
    content TEXT,
    reference_type TEXT,
    reference_id TEXT,
    status TEXT DEFAULT 'pending',
    sent_at TEXT,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS satisfaction_questions (
    id INTEGER PRIMARY KEY,
    question_text TEXT NOT NULL,
    order_num INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1
  );

  -- =====================================================
  -- 職能管理
  -- =====================================================
  CREATE TABLE IF NOT EXISTS competencies (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS competency_levels (
    id TEXT PRIMARY KEY,
    competency_id TEXT NOT NULL,
    level TEXT NOT NULL,
    indicators TEXT NOT NULL,
    FOREIGN KEY (competency_id) REFERENCES competencies(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS competency_ksa_details (
    id TEXT PRIMARY KEY,
    competency_id TEXT NOT NULL,
    behavior_indicators TEXT NOT NULL,
    linked_courses TEXT DEFAULT '[]',
    FOREIGN KEY (competency_id) REFERENCES competencies(id) ON DELETE CASCADE
  );

  -- =====================================================
  -- 部門與職等職級系統
  -- =====================================================
  CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    code TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS grade_levels (
    id TEXT PRIMARY KEY,
    grade INTEGER UNIQUE NOT NULL,
    code_range TEXT,
    title_management TEXT,
    title_professional TEXT,
    education_requirement TEXT,
    responsibility_description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS grade_salary_levels (
    id TEXT PRIMARY KEY,
    grade INTEGER NOT NULL,
    code TEXT UNIQUE NOT NULL,
    salary INTEGER NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (grade) REFERENCES grade_levels(grade)
  );

  CREATE TABLE IF NOT EXISTS department_positions (
    id TEXT PRIMARY KEY,
    department TEXT NOT NULL,
    grade INTEGER NOT NULL,
    title TEXT NOT NULL,
    track TEXT NOT NULL,
    supervised_departments TEXT DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (department) REFERENCES departments(name),
    FOREIGN KEY (grade) REFERENCES grade_levels(grade)
  );

  CREATE TABLE IF NOT EXISTS promotion_criteria (
    id TEXT PRIMARY KEY,
    from_grade INTEGER NOT NULL,
    to_grade INTEGER NOT NULL,
    track TEXT NOT NULL,
    required_skills TEXT,
    required_courses TEXT,
    performance_threshold INTEGER,
    kpi_focus TEXT,
    additional_criteria TEXT,
    promotion_procedure TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (from_grade) REFERENCES grade_levels(grade),
    FOREIGN KEY (to_grade) REFERENCES grade_levels(grade)
  );

  CREATE TABLE IF NOT EXISTS career_paths (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    from_position TEXT,
    to_position TEXT,
    estimated_time TEXT,
    steps TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS grade_tracks (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    max_grade INTEGER DEFAULT 7,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS grade_change_history (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    old_data TEXT,
    new_data TEXT,
    changed_by TEXT NOT NULL,
    approved_by TEXT,
    status TEXT DEFAULT 'pending',
    reject_reason TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    approved_at TEXT
  );

  -- =====================================================
  -- 職務說明書
  -- =====================================================
  CREATE TABLE IF NOT EXISTS job_descriptions (
    id TEXT PRIMARY KEY,
    position_code TEXT UNIQUE NOT NULL,
    position_name TEXT NOT NULL,
    department TEXT NOT NULL,
    grade INTEGER,
    grade_code TEXT,
    position_title TEXT,
    summary TEXT,
    version TEXT DEFAULT '1.0',
    status TEXT DEFAULT 'draft',
    responsibilities TEXT DEFAULT '[]',
    job_purpose TEXT DEFAULT '[]',
    qualifications TEXT DEFAULT '[]',
    vfp TEXT DEFAULT '[]',
    competency_standards TEXT DEFAULT '[]',
    required_competencies TEXT DEFAULT '[]',
    core_competency_requirements TEXT DEFAULT '[]',
    management_competency_requirements TEXT DEFAULT '[]',
    professional_competency_requirements TEXT DEFAULT '[]',
    ksa_competency_requirements TEXT DEFAULT '[]',
    ksa_content TEXT,
    work_description TEXT DEFAULT '[]',
    checklist TEXT DEFAULT '[]',
    job_duties TEXT DEFAULT '[]',
    daily_tasks TEXT DEFAULT '[]',
    weekly_tasks TEXT DEFAULT '[]',
    monthly_tasks TEXT DEFAULT '[]',
    created_by TEXT DEFAULT 'system',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (department) REFERENCES departments(name),
    FOREIGN KEY (grade) REFERENCES grade_levels(grade)
  );

  CREATE TABLE IF NOT EXISTS job_description_versions (
    id TEXT PRIMARY KEY,
    job_description_id TEXT NOT NULL,
    version TEXT NOT NULL,
    snapshot TEXT NOT NULL,
    status TEXT NOT NULL,
    effective_from TEXT,
    effective_until TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    published_at TEXT,
    archived_at TEXT,
    FOREIGN KEY (job_description_id) REFERENCES job_descriptions(id)
  );

  CREATE TABLE IF NOT EXISTS job_description_approvals (
    id TEXT PRIMARY KEY,
    job_description_id TEXT NOT NULL,
    version TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_id TEXT,
    actor_name TEXT,
    actor_role TEXT,
    comment TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (job_description_id) REFERENCES job_descriptions(id)
  );

  -- =====================================================
  -- 部門協作關係
  -- =====================================================
  CREATE TABLE IF NOT EXISTS department_collaborations (
    id TEXT PRIMARY KEY,
    source_dept_id TEXT NOT NULL,
    target_dept_id TEXT NOT NULL,
    relation_type TEXT NOT NULL CHECK(relation_type IN ('parallel','downstream')),
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`;

/**
 * 初始化租戶資料庫 schema（RBAC + 業務表）
 * @param {import('./db-adapter').SqliteAdapter} adapter
 */
function initTenantSchema(adapter) {
  const db = adapter.raw;

  // 啟用外鍵約束
  db.run('PRAGMA foreign_keys = ON');

  // 先建立業務表（employees 表需先存在，users 表有外鍵參考）
  // 使用 db.exec() 支援多語句一次執行
  db.exec(BUSINESS_TABLES_SQL);

  // 再建立 RBAC 表
  db.exec(RBAC_TABLES_SQL);

  // departments 表欄位遷移（冪等：try-catch 忽略已存在欄位）
  const deptMigrations = [
    'ALTER TABLE departments ADD COLUMN manager_id TEXT REFERENCES employees(id)',
    'ALTER TABLE departments ADD COLUMN head_count INTEGER DEFAULT 0',
    "ALTER TABLE departments ADD COLUMN responsibilities TEXT DEFAULT '[]'",
    "ALTER TABLE departments ADD COLUMN kpi_items TEXT DEFAULT '[]'",
    "ALTER TABLE departments ADD COLUMN competency_focus TEXT DEFAULT '[]'"
  ];
  for (const sql of deptMigrations) {
    try { db.run(sql); } catch (e) { /* 欄位已存在則忽略 */ }
  }

  // department_collaborations 表欄位遷移（錨點欄位）
  const collabMigrations = [
    'ALTER TABLE department_collaborations ADD COLUMN source_anchor TEXT',
    'ALTER TABLE department_collaborations ADD COLUMN target_anchor TEXT'
  ];
  for (const sql of collabMigrations) {
    try { db.run(sql); } catch (e) { /* 欄位已存在則忽略 */ }
  }

  // org_units 表欄位遷移（公司詳情欄位）
  const orgUnitMigrations = [
    'ALTER TABLE org_units ADD COLUMN code TEXT',
    'ALTER TABLE org_units ADD COLUMN address TEXT',
    'ALTER TABLE org_units ADD COLUMN phone TEXT',
    'ALTER TABLE org_units ADD COLUMN email TEXT',
    'ALTER TABLE org_units ADD COLUMN description TEXT',
    'ALTER TABLE org_units ADD COLUMN tax_id TEXT',
    "ALTER TABLE org_units ADD COLUMN status TEXT DEFAULT 'active'",
    'ALTER TABLE org_units ADD COLUMN established_date TEXT'
  ];
  for (const sql of orgUnitMigrations) {
    try { db.run(sql); } catch (e) { /* 欄位已存在則忽略 */ }
  }

  // employees 表欄位遷移（修復 convert-candidate 必需欄位 + 組織單位關聯）
  for (const sql of EMPLOYEE_MIGRATIONS) {
    try { db.run(sql); } catch (e) { /* 欄位已存在則忽略 */ }
  }

  // users 表欄位遷移（首次登入強制改密碼）
  for (const sql of USER_MIGRATIONS) {
    try { db.run(sql); } catch (e) { /* 欄位已存在則忽略 */ }
  }

  // 子公司資料關聯遷移：6 張表加入 org_unit_id（nullable, NULL = 全組織共用）
  const subsidiaryMigrations = [
    { table: 'job_descriptions', index: 'idx_jd_org_unit' },
    { table: 'competencies', index: 'idx_comp_org_unit' },
    { table: 'grade_salary_levels', index: 'idx_gsl_org_unit' },
    { table: 'department_positions', index: 'idx_dp_org_unit' },
    { table: 'promotion_criteria', index: 'idx_pc_org_unit' },
    { table: 'career_paths', index: 'idx_cp_org_unit' }
  ];
  for (const { table, index } of subsidiaryMigrations) {
    try {
      db.run(`ALTER TABLE ${table} ADD COLUMN org_unit_id TEXT REFERENCES org_units(id)`);
    } catch (e) { /* 欄位已存在則忽略 */ }
    db.run(`CREATE INDEX IF NOT EXISTS ${index} ON ${table}(org_unit_id)`);
  }

  adapter.save();
}

module.exports = { initTenantSchema, RBAC_TABLES_SQL, BUSINESS_TABLES_SQL, EMPLOYEE_MIGRATIONS, USER_MIGRATIONS, INTERVIEW_MIGRATIONS };
