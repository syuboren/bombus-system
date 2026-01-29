/**
 * Initialize Interview Data Script
 * 
 * This script:
 * 1. Adds candidates to ensure each job has at least 5 candidates
 * 2. Creates complete resume data for all candidates
 * 3. Resets all candidates to 'new' status
 * 4. Clears all interview records
 * 
 * Usage: node scripts/init-interview-data.js
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../src/db/onboarding.db');

// ============================================================
// Mock Data Generators
// ============================================================

const CANDIDATE_NAMES = [
  // 男性名字
  { name: '王建宏', nameEn: 'Kevin Wang', gender: 'male' },
  { name: '李志偉', nameEn: 'William Lee', gender: 'male' },
  { name: '張文傑', nameEn: 'Jason Chang', gender: 'male' },
  { name: '陳俊安', nameEn: 'Andy Chen', gender: 'male' },
  { name: '林承翰', nameEn: 'Hans Lin', gender: 'male' },
  { name: '黃柏翔', nameEn: 'Brian Huang', gender: 'male' },
  { name: '吳宗憲', nameEn: 'Jacky Wu', gender: 'male' },
  { name: '劉德華', nameEn: 'Andy Lau', gender: 'male' },
  { name: '蔡明軒', nameEn: 'Michael Tsai', gender: 'male' },
  { name: '楊子豪', nameEn: 'Howard Yang', gender: 'male' },
  { name: '周杰倫', nameEn: 'Jay Chou', gender: 'male' },
  { name: '鄭宇翔', nameEn: 'Sean Cheng', gender: 'male' },
  { name: '許志遠', nameEn: 'Eric Hsu', gender: 'male' },
  { name: '謝宗翰', nameEn: 'Tom Hsieh', gender: 'male' },
  { name: '曾國城', nameEn: 'Sam Tseng', gender: 'male' },
  { name: '徐智賢', nameEn: 'Daniel Hsu', gender: 'male' },
  { name: '朱立倫', nameEn: 'Eric Chu', gender: 'male' },
  { name: '呂建和', nameEn: 'Ken Lu', gender: 'male' },
  { name: '葉俊廷', nameEn: 'Justin Yeh', gender: 'male' },
  { name: '蘇志燮', nameEn: 'Steven Su', gender: 'male' },
  { name: '方大同', nameEn: 'Khalil Fong', gender: 'male' },
  { name: '盧廣仲', nameEn: 'Crowd Lu', gender: 'male' },
  { name: '韋禮安', nameEn: 'WeiBird', gender: 'male' },
  { name: '蕭敬騰', nameEn: 'Jam Hsiao', gender: 'male' },
  { name: '林俊傑', nameEn: 'JJ Lin', gender: 'male' },
  { name: '潘瑋柏', nameEn: 'Wilber Pan', gender: 'male' },
  { name: '羅志祥', nameEn: 'Show Lo', gender: 'male' },
  { name: '周湯豪', nameEn: 'Nick Chou', gender: 'male' },
  { name: '蔣勁夫', nameEn: 'Jiang Jinfu', gender: 'male' },
  { name: '陳曉東', nameEn: 'Daniel Chan', gender: 'male' },
  // 女性名字
  { name: '王心凌', nameEn: 'Cyndi Wang', gender: 'female' },
  { name: '李佳薇', nameEn: 'Jess Lee', gender: 'female' },
  { name: '張惠妹', nameEn: 'A-Mei', gender: 'female' },
  { name: '陳淑芬', nameEn: 'Sophia Chen', gender: 'female' },
  { name: '林依晨', nameEn: 'Ariel Lin', gender: 'female' },
  { name: '黃小柔', nameEn: 'Sherry Huang', gender: 'female' },
  { name: '吳佩慈', nameEn: 'Pace Wu', gender: 'female' },
  { name: '劉若英', nameEn: 'Rene Liu', gender: 'female' },
  { name: '蔡依林', nameEn: 'Jolin Tsai', gender: 'female' },
  { name: '楊丞琳', nameEn: 'Rainie Yang', gender: 'female' },
  { name: '周慧敏', nameEn: 'Vivian Chow', gender: 'female' },
  { name: '鄭秀文', nameEn: 'Sammi Cheng', gender: 'female' },
  { name: '許茹芸', nameEn: 'Valen Hsu', gender: 'female' },
  { name: '謝金燕', nameEn: 'Jeannie Hsieh', gender: 'female' },
  { name: '曾寶儀', nameEn: 'Bowie Tsang', gender: 'female' },
  { name: '徐若瑄', nameEn: 'Vivian Hsu', gender: 'female' },
  { name: '朱俐靜', nameEn: 'Miu Chu', gender: 'female' },
  { name: '呂薔', nameEn: 'Amuyi', gender: 'female' },
  { name: '葉蒨文', nameEn: 'Sally Yeh', gender: 'female' },
  { name: '蘇慧倫', nameEn: 'Tarcy Su', gender: 'female' },
  { name: '田馥甄', nameEn: 'Hebe Tien', gender: 'female' },
  { name: '郭靜', nameEn: 'Claire Kuo', gender: 'female' },
  { name: '戴佩妮', nameEn: 'Penny Tai', gender: 'female' },
  { name: '丁噹', nameEn: 'Della Ding', gender: 'female' },
  { name: '艾怡良', nameEn: 'Eve Ai', gender: 'female' },
  { name: '魏如萱', nameEn: 'Waa Wei', gender: 'female' },
  { name: '徐佳瑩', nameEn: 'LaLa Hsu', gender: 'female' },
  { name: '白安', nameEn: 'Ann Bai', gender: 'female' },
  { name: '閻奕格', nameEn: 'Janice Yan', gender: 'female' },
  { name: '孫盛希', nameEn: 'Shi Shi', gender: 'female' },
];

const SCHOOLS = [
  { name: '國立台灣大學', country: '台灣' },
  { name: '國立清華大學', country: '台灣' },
  { name: '國立交通大學', country: '台灣' },
  { name: '國立成功大學', country: '台灣' },
  { name: '國立政治大學', country: '台灣' },
  { name: '國立中山大學', country: '台灣' },
  { name: '國立台北科技大學', country: '台灣' },
  { name: '國立台灣科技大學', country: '台灣' },
  { name: '輔仁大學', country: '台灣' },
  { name: '東吳大學', country: '台灣' },
  { name: '淡江大學', country: '台灣' },
  { name: '實踐大學', country: '台灣' },
  { name: '銘傳大學', country: '台灣' },
  { name: '世新大學', country: '台灣' },
  { name: '中原大學', country: '台灣' },
  { name: '逢甲大學', country: '台灣' },
  { name: '東海大學', country: '台灣' },
  { name: '中國文化大學', country: '台灣' },
];

// Job-specific configurations
const JOB_CONFIGS = {
  '人員招募專員': {
    majors: ['人力資源管理學系', '企業管理學系', '心理學系', '勞工關係學系', '社會學系'],
    skills: ['招募面談', '人才甄選', '薪資談判', '勞動法規', 'Excel', 'PowerPoint', 'ATS系統', '社群招募', '校園徵才', '獵才技巧'],
    titles: ['人資專員', '招募專員', '人力資源助理', 'HR Recruiter', '獵才顧問'],
    companies: ['104資訊科技', '1111人力銀行', '鴻海精密', '台積電', 'Manpower', 'Robert Half', '藝珂人事', '德明財經科技', '台北市政府']
  },
  '主辦會計': {
    majors: ['會計學系', '財務金融學系', '企業管理學系', '經濟學系', '財稅學系'],
    skills: ['財務報表編製', '稅務申報', '成本分析', '應收應付管理', 'SAP', 'Oracle', 'Excel VBA', '審計', '內部控制', 'ERP系統'],
    titles: ['會計專員', '財務專員', '主辦會計', '會計主管', '財務分析師'],
    companies: ['勤業眾信', '資誠會計師事務所', '安永', '安侯建業', '台積電', '鴻海精密', '中華電信', '富邦金控', '國泰金控']
  },
  '人資專員': {
    majors: ['人力資源管理學系', '企業管理學系', '心理學系', '勞工關係學系', '法律學系'],
    skills: ['勞動法規', '薪酬管理', '績效考核', '教育訓練', '員工關係', 'HRM系統', 'Excel', 'PowerPoint', '出勤管理', '福利規劃'],
    titles: ['人資專員', 'HR專員', '人力資源管理師', '薪酬專員', '訓練專員'],
    companies: ['台積電', '鴻海精密', '聯發科技', '華碩電腦', '宏碁電腦', '中華電信', '遠傳電信', '國泰金控', '富邦金控']
  },
  '專案部副理': {
    majors: ['企業管理學系', '資訊管理學系', '工業工程學系', '財務金融學系', '國際貿易學系'],
    skills: ['專案管理', 'PMP', 'Agile', 'Scrum', 'JIRA', '風險管理', '利害關係人管理', '簡報技巧', '團隊領導', '預算控管'],
    titles: ['專案經理', 'PM', '專案副理', '產品經理', '技術專案經理'],
    companies: ['台積電', '聯發科技', 'Google', 'Microsoft', 'LINE Taiwan', 'Shopee', '趨勢科技', '緯創資通', '廣達電腦']
  },
  '薪酬與福利專員': {
    majors: ['人力資源管理學系', '企業管理學系', '財務金融學系', '會計學系', '勞工關係學系'],
    skills: ['薪資計算', '勞健保作業', '所得稅申報', '福利規劃', 'Excel', 'HR系統', '出勤管理', '獎金制度設計', '員工福利', '薪酬調查'],
    titles: ['薪酬專員', '福利專員', '人資專員', '薪資管理師', 'C&B專員'],
    companies: ['台積電', '鴻海精密', '聯發科技', '國泰金控', '富邦金控', '中華電信', '遠傳電信', '緯創資通', '和碩聯合']
  },
  '出納會計': {
    majors: ['會計學系', '財務金融學系', '企業管理學系', '經濟學系', '財稅學系'],
    skills: ['現金管理', '銀行往來', '票據管理', '零用金管理', 'Excel', '會計軟體', '資金調度', '銀行對帳', '付款作業', '傳票處理'],
    titles: ['出納', '出納專員', '財務出納', '資金專員', '出納會計'],
    companies: ['中國信託', '國泰金控', '富邦金控', '台新金控', '玉山金控', '元大金控', '永豐金控', '兆豐金控', '第一金控']
  },
  '技術部工程師': {
    majors: ['資訊工程學系', '資訊管理學系', '電機工程學系', '電子工程學系', '軟體工程學系'],
    skills: ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'React', 'Vue.js', 'Node.js', 'Docker', 'AWS', 'MySQL', 'MongoDB', 'Git', 'CI/CD', 'Agile'],
    titles: ['軟體工程師', '後端工程師', '全端工程師', '系統工程師', '資深工程師'],
    companies: ['台積電', '聯發科技', 'Google', 'Microsoft', 'LINE Taiwan', 'Shopee', '趨勢科技', '緯創資通', '廣達電腦', 'TSMC']
  },
  '財務長': {
    majors: ['財務金融學系', '會計學系', '企業管理學系', 'MBA', '經濟學系'],
    skills: ['財務規劃', '投資分析', '風險管理', '資本運作', 'M&A', 'IPO', '董事會報告', '投資人關係', '稅務規劃', '財務預測'],
    titles: ['財務長', 'CFO', '財務總監', '財務副總', '財務處長'],
    companies: ['台積電', '鴻海精密', '聯發科技', '國泰金控', '富邦金控', '中華電信', '台塑集團', '統一企業', '遠東集團']
  },
  '業務部業務': {
    majors: ['企業管理學系', '國際貿易學系', '行銷學系', '經濟學系', '財務金融學系'],
    skills: ['業務開發', '客戶關係管理', '談判技巧', '簡報技巧', 'CRM系統', '銷售策略', '市場分析', '客戶服務', '業績達成', '跨部門溝通'],
    titles: ['業務專員', '業務代表', '客戶經理', '業務主管', '銷售代表'],
    companies: ['鴻海精密', '緯創資通', '廣達電腦', '宏碁電腦', '華碩電腦', '神達電腦', '仁寶電腦', '和碩聯合', '英業達']
  },
  '專業經理人': {
    majors: ['企業管理學系', 'MBA', '財務金融學系', '行銷學系', '國際貿易學系'],
    skills: ['策略規劃', '團隊領導', '績效管理', '預算管理', '跨部門協調', '商業分析', '數據驅動決策', '組織發展', '變革管理', 'OKR'],
    titles: ['經理', '協理', '處長', '副總經理', '總監'],
    companies: ['台積電', '聯發科技', 'Google', 'Microsoft', 'Apple', 'Meta', 'Amazon', '麥肯錫', '波士頓顧問', '貝恩策略']
  },
  '前端工程師': {
    majors: ['資訊工程學系', '資訊管理學系', '多媒體設計學系', '數位媒體設計學系', '軟體工程學系'],
    skills: ['JavaScript', 'TypeScript', 'React', 'Vue.js', 'Angular', 'HTML5', 'CSS3', 'SASS', 'Webpack', 'Vite', 'Redux', 'REST API', 'GraphQL', 'Jest', 'Cypress'],
    titles: ['前端工程師', 'Frontend Developer', 'Web Developer', 'UI Developer', '全端工程師'],
    companies: ['LINE Taiwan', 'Shopee', 'Google', 'Microsoft', '趨勢科技', 'PChome', 'momo購物', '91APP', '蝦皮購物', '17直播']
  },
};

// Default config for jobs not in the list
const DEFAULT_CONFIG = {
  majors: ['企業管理學系', '資訊管理學系', '經濟學系', '財務金融學系', '國際貿易學系'],
  skills: ['溝通協調', 'Excel', 'PowerPoint', '問題解決', '團隊合作', '時間管理', '簡報技巧', '資料分析', '客戶服務', '專案管理'],
  titles: ['專員', '助理', '執行人員', '行政人員', '管理師'],
  companies: ['台積電', '鴻海精密', '聯發科技', '中華電信', '遠傳電信', '國泰金控', '富邦金控', '統一企業', '長榮集團']
};

const LANGUAGES = [
  { type: '英文', listen: '精通', speak: '精通', read: '精通', write: '精通', cert: 'TOEIC:950' },
  { type: '英文', listen: '中等', speak: '中等', read: '精通', write: '中等', cert: 'TOEIC:750' },
  { type: '英文', listen: '略懂', speak: '略懂', read: '中等', write: '略懂', cert: 'TOEIC:550' },
  { type: '日文', listen: '中等', speak: '略懂', read: '中等', write: '略懂', cert: 'JLPT N2' },
  { type: '日文', listen: '略懂', speak: '略懂', read: '略懂', write: '略懂', cert: 'JLPT N3' },
];

// ============================================================
// Additional Mock Data for Complete Resume
// ============================================================

// 附件類型
const ATTACHMENT_TYPES = [
  { type: '履歷', title: '個人履歷表' },
  { type: '作品集', title: '專業作品集' },
  { type: '證照', title: '專業證照影本' },
  { type: '推薦信', title: '前主管推薦信' },
  { type: '其他', title: '相關附件資料' },
];

// 專案範例
const PROJECT_TEMPLATES = [
  { type: '工作專案', title: '企業數位轉型專案', desc: '主導公司內部系統數位化，導入雲端解決方案，提升作業效率30%。' },
  { type: '工作專案', title: '客戶關係管理系統建置', desc: '規劃並導入CRM系統，整合銷售與客服流程，提升客戶滿意度。' },
  { type: '工作專案', title: '年度招募計畫執行', desc: '統籌年度招募作業，成功招募50+位優秀人才，達成率120%。' },
  { type: '工作專案', title: '薪酬制度優化專案', desc: '重新設計薪酬結構，建立績效連結制度，降低離職率15%。' },
  { type: '工作專案', title: '財務報表自動化', desc: '開發Excel VBA工具，自動化月結報表產出，節省70%作業時間。' },
  { type: '個人專案', title: '技術部落格經營', desc: '建立個人技術部落格，分享專業知識，累積5000+訂閱者。' },
  { type: '學術專案', title: '畢業專題研究', desc: '運用機器學習技術進行市場預測分析，獲得系上專題優等獎。' },
];

// 推薦人職稱
const RECOMMENDER_TITLES = [
  '部門主管', '直屬主管', '人資經理', '專案經理', '技術總監',
  '財務長', '營運長', '副總經理', '總經理', '執行長'
];

// 應徵問答範例
const APPLY_QUESTIONS = [
  { q: '請簡述您應徵此職位的動機？', a: '對貴公司的企業文化與發展前景非常認同，希望能貢獻我的專業能力，與團隊一起成長。' },
  { q: '您認為自己最大的優勢是什麼？', a: '我具備良好的溝通協調能力，能快速理解需求並提出有效解決方案，過去曾成功完成多項跨部門專案。' },
  { q: '您預期的待遇範圍？', a: '根據市場行情及個人能力，希望年薪能在70-90萬之間，但我更看重發展機會與團隊氛圍。' },
  { q: '您最快何時可以到職？', a: '目前仍在職中，需提前一個月告知現職公司，預計可在一個月內到職。' },
  { q: '對於加班或出差您的看法？', a: '我理解工作中偶爾需要加班或出差，我可以配合公司需求，但也希望能維持工作與生活的平衡。' },
];

// 自我介紹範本
const INTRODUCTIONS = [
  '我是一位具有高度責任感的專業人士，擁有豐富的產業經驗。在過去的工作中，我持續精進專業技能，並致力於團隊合作與創新思維。',
  '具備積極進取的工作態度與優異的問題解決能力。善於跨部門溝通協調，能在壓力下保持冷靜並有效完成任務。',
  '熱愛學習新事物，對工作充滿熱情。具備優秀的執行力與規劃能力，能夠獨立作業也善於團隊協作。',
  '以結果為導向的專業工作者，注重效率與品質。具備優秀的邏輯分析能力，能快速掌握問題核心並提出解決方案。',
  '具有豐富的專案管理經驗，善於整合資源並推動專案如期完成。對於新技術與趨勢保持高度敏感，持續精進專業能力。',
];

// 座右銘
const MOTTOS = [
  '把每一件簡單的事做好就是不簡單，把每一件平凡的事做好就是不平凡',
  '機會是留給準備好的人',
  '態度決定高度，格局決定結局',
  '不斷學習，持續成長',
  '做對的事，把事做對',
  '追求卓越，成功自然隨之而來',
  '每天進步一點點，累積起來就是大進步',
];

// 人格特質
const CHARACTERISTICS = [
  '積極主動、責任感強、注重細節、善於溝通',
  '細心謹慎、邏輯清晰、追求效率、團隊合作',
  '創新思維、快速學習、抗壓性強、樂觀正向',
  '謹慎負責、分析能力強、善於規劃、執行力佳',
  '熱情積極、溝通協調、領導力強、目標導向',
];

// 工作偏好描述
const WORK_DESCS = [
  '希望能在具有發展潛力的公司任職，發揮專業所長並持續學習成長。期待與優秀團隊合作，共同創造價值。',
  '期望加入重視員工發展的企業，在專業領域深耕發展。願意接受挑戰，追求個人與組織的共同成長。',
  '尋找能夠發揮專業能力的工作機會，希望在穩定中求發展。重視工作與生活的平衡，追求長期職涯發展。',
];

// ============================================================
// Utility Functions
// ============================================================

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateId(prefix) {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 10000)}`;
}

function generateEmail(name) {
  const domains = ['gmail.com', 'yahoo.com.tw', 'hotmail.com', 'outlook.com', 'icloud.com'];
  const pinyin = name.replace(/[\u4e00-\u9fa5]/g, () => String.fromCharCode(97 + Math.floor(Math.random() * 26)));
  return `${pinyin.toLowerCase()}${randomInt(1, 999)}@${randomElement(domains)}`;
}

function generatePhone() {
  return `09${randomInt(10000000, 99999999)}`;
}

function generateBirthday(minAge = 22, maxAge = 45) {
  const age = randomInt(minAge, maxAge);
  const year = new Date().getFullYear() - age;
  const month = randomInt(1, 12).toString().padStart(2, '0');
  const day = randomInt(1, 28).toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 英文名字列表（用於生成沒有預設英文名的候選人）
const ENGLISH_FIRST_NAMES_MALE = ['James', 'John', 'Robert', 'Michael', 'David', 'William', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian', 'George', 'Timothy', 'Ronald', 'Edward', 'Jason', 'Jeffrey', 'Ryan'];
const ENGLISH_FIRST_NAMES_FEMALE = ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Lisa', 'Nancy', 'Betty', 'Margaret', 'Sandra', 'Ashley', 'Kimberly', 'Emily', 'Donna', 'Michelle', 'Dorothy', 'Carol', 'Amanda', 'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Sharon', 'Laura', 'Cynthia'];

function generateEnglishName(chineseName) {
  // 根據中文名字的字來推測性別
  const femaleChars = ['玲', '芬', '美', '麗', '華', '珍', '雯', '婷', '萍', '燕', '秀', '娟', '慧', '蘭', '琴', '瑩', '怡', '琳', '靜', '莉'];
  const isFemale = femaleChars.some(char => chineseName.includes(char));
  
  const firstNames = isFemale ? ENGLISH_FIRST_NAMES_FEMALE : ENGLISH_FIRST_NAMES_MALE;
  const firstName = randomElement(firstNames);
  
  // 取中文姓氏的第一個字轉成拼音作為英文姓氏
  const surnameMap = {
    '王': 'Wang', '李': 'Lee', '張': 'Chang', '劉': 'Liu', '陳': 'Chen',
    '楊': 'Yang', '黃': 'Huang', '趙': 'Chao', '周': 'Chou', '吳': 'Wu',
    '徐': 'Hsu', '孫': 'Sun', '馬': 'Ma', '朱': 'Chu', '胡': 'Hu',
    '郭': 'Kuo', '林': 'Lin', '何': 'Ho', '高': 'Kao', '羅': 'Lo',
    '鄭': 'Cheng', '梁': 'Liang', '謝': 'Hsieh', '宋': 'Sung', '唐': 'Tang',
    '許': 'Hsu', '韓': 'Han', '馮': 'Feng', '鄧': 'Teng', '曹': 'Tsao',
    '彭': 'Peng', '曾': 'Tseng', '蕭': 'Hsiao', '田': 'Tien', '董': 'Tung',
    '潘': 'Pan', '袁': 'Yuan', '蔡': 'Tsai', '蔣': 'Chiang', '余': 'Yu',
    '杜': 'Tu', '葉': 'Yeh', '程': 'Cheng', '魏': 'Wei', '蘇': 'Su',
    '呂': 'Lu', '丁': 'Ting', '任': 'Jen', '盧': 'Lu', '姚': 'Yao',
    '方': 'Fang', '金': 'Chin', '邱': 'Chiu', '夏': 'Hsia', '譚': 'Tan',
    '韋': 'Wei', '賈': 'Chia', '鄒': 'Tsou', '石': 'Shih', '熊': 'Hsiung',
    '孟': 'Meng', '秦': 'Chin', '江': 'Chiang', '史': 'Shih', '顧': 'Ku',
    '侯': 'Hou', '邵': 'Shao', '龍': 'Lung', '萬': 'Wan', '段': 'Tuan',
    '章': 'Chang', '錢': 'Chien', '湯': 'Tang', '尹': 'Yin', '黎': 'Li',
    '易': 'Yi', '常': 'Chang', '武': 'Wu', '喬': 'Chiao', '賀': 'Ho',
    '賴': 'Lai', '龔': 'Kung', '文': 'Wen', '閻': 'Yen', '白': 'Pai',
    '艾': 'Ai', '戴': 'Tai', '郎': 'Lang'
  };
  
  const surname = chineseName.charAt(0);
  const englishSurname = surnameMap[surname] || 'Chen';
  
  return `${firstName} ${englishSurname}`;
}

function generateApplyDate() {
  const daysAgo = randomInt(1, 30);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

// ============================================================
// Main Script
// ============================================================

async function main() {
  console.log('🚀 Starting Interview Data Initialization...\n');
  
  const SQL = await initSqlJs();
  
  // Load existing database
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database file not found:', DB_PATH);
    process.exit(1);
  }
  
  const fileBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(fileBuffer);
  
  try {
    // Step 1: Get all jobs
    console.log('📋 Step 1: Analyzing jobs and candidates...');
    const jobsResult = db.exec('SELECT id, title, department FROM jobs ORDER BY id');
    const jobs = jobsResult.length > 0 ? jobsResult[0].values.map(row => ({
      id: row[0],
      title: row[1],
      department: row[2]
    })) : [];
    
    console.log(`   Found ${jobs.length} jobs`);
    
    // Get current candidate counts per job
    const countsResult = db.exec(`
      SELECT job_id, COUNT(*) as count 
      FROM candidates 
      GROUP BY job_id
    `);
    const candidateCounts = {};
    if (countsResult.length > 0) {
      countsResult[0].values.forEach(row => {
        candidateCounts[row[0]] = row[1];
      });
    }
    
    // Step 2: Get used names to avoid duplicates
    const usedNamesResult = db.exec('SELECT name FROM candidates');
    const usedNames = new Set();
    if (usedNamesResult.length > 0) {
      usedNamesResult[0].values.forEach(row => usedNames.add(row[0]));
    }
    
    // Step 3: Clear interview-related data
    console.log('\n🧹 Step 2: Clearing interview data...');
    db.run('DELETE FROM interviews');
    db.run('DELETE FROM interview_evaluations');
    console.log('   ✅ Cleared interviews and evaluations');
    
    // Step 4: Add candidates to jobs that need more
    console.log('\n👥 Step 3: Adding candidates to ensure 5+ per job...');
    
    let totalNewCandidates = 0;
    let usedNameIndex = 0;
    const availableNames = CANDIDATE_NAMES.filter(n => !usedNames.has(n.name));
    
    for (const job of jobs) {
      const currentCount = candidateCounts[job.id] || 0;
      const needed = Math.max(0, 5 - currentCount);
      
      if (needed > 0) {
        console.log(`   ${job.title} (${job.id}): ${currentCount} -> adding ${needed} candidates`);
        
        const config = JOB_CONFIGS[job.title] || DEFAULT_CONFIG;
        
        for (let i = 0; i < needed; i++) {
          if (usedNameIndex >= availableNames.length) {
            // Generate a unique name if we run out
            const baseName = randomElement(CANDIDATE_NAMES);
            availableNames.push({
              name: `${baseName.name}${randomInt(1, 99)}`,
              gender: baseName.gender
            });
          }
          
          const nameData = availableNames[usedNameIndex++];
          const candidateId = generateId('C');
          
          // Pre-generate data for main table display
          const school = randomElement(SCHOOLS);
          const major = randomElement(config.majors);
          const degreeLevel = randomElement(['大學', '碩士', '博士']);
          const company = randomElement(config.companies);
          const title = randomElement(config.titles);
          const skillCount = randomInt(3, 6);
          const selectedSkills = [];
          for (let j = 0; j < skillCount; j++) {
            let skill = randomElement(config.skills);
            if (!selectedSkills.includes(skill)) {
              selectedSkills.push(skill);
            }
          }
          const experienceYears = randomInt(1, 15);
          
          // Insert candidate with complete data (including additional profile fields)
          const expectedSalaryMin = randomInt(35000, 80000);
          const expectedSalaryMax = randomInt(expectedSalaryMin + 5000, 120000);
          const introduction = randomElement(INTRODUCTIONS);
          const motto = randomElement(MOTTOS);
          const characteristic = randomElement(CHARACTERISTICS);
          const workDesc = randomElement(WORK_DESCS);
          const location = randomElement(['台北市', '新北市', '桃園市', '新竹市', '台中市', '高雄市']);
          
          db.run(`
            INSERT INTO candidates (
              id, job_id, name, name_en, email, phone, status, stage, 
              apply_date, reg_source, gender, birthday, avatar,
              expected_salary, start_date_opt, employment_status,
              experience_years, education, current_company, current_position, skills,
              introduction, motto, characteristic, work_desc, location,
              preferred_location, preferred_job_name, preferred_job_category,
              military_status, nationality,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'new', 'New', ?, '104主動應徵', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `, [
            candidateId,
            job.id,
            nameData.name,
            nameData.nameEn || '',
            generateEmail(nameData.name),
            generatePhone(),
            generateApplyDate(),
            nameData.gender,
            generateBirthday(),
            `https://ui-avatars.com/api/?name=${encodeURIComponent(nameData.name)}&background=random`,
            `月薪:${expectedSalaryMin}~${expectedSalaryMax}`,
            randomElement(['可立即上班', '需一個月', '需兩週', '需兩個月']),
            randomElement(['在職中', '待業中', '服役中']),
            experienceYears,
            `${school.name} ${major}`,
            company,
            title,
            JSON.stringify(selectedSkills),
            introduction,
            motto,
            characteristic,
            workDesc,
            location,
            location,  // preferred_location
            job.title, // preferred_job_name
            randomElement(['人資類', '財會類', '資訊類', '業務類', '管理類']),
            nameData.gender === 'male' ? randomElement(['役畢', '免役', '未役']) : '免役',
            '中華民國'
          ]);
          
          // Add education (using correct table: candidate_education) - use pre-generated data
          db.run(`
            INSERT INTO candidate_education (
              id, candidate_id, school_name, degree_level, major,
              major_category, degree_status, school_country,
              start_date, end_date, sort_order, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `, [
            generateId('EDU'),
            candidateId,
            school.name,
            degreeLevel,
            major,
            randomElement(['商業及管理學門', '資訊學門', '工程學門', '社會及行為科學學門']),
            '畢業',
            school.country,
            `${randomInt(2005, 2015)}-09`,
            `${randomInt(2009, 2020)}-06`,
            1
          ]);
          
          // Add work experience (1-3 records) using correct table: candidate_experiences
          const expCount = randomInt(1, 3);
          for (let j = 0; j < expCount; j++) {
            // First experience uses the pre-generated company/title for consistency
            const expCompany = j === 0 ? company : randomElement(config.companies);
            const expTitle = j === 0 ? title : randomElement(config.titles);
            const startYear = randomInt(2015, 2022);
            const endYear = j === 0 ? null : randomInt(startYear + 1, 2025);
            
            db.run(`
              INSERT INTO candidate_experiences (
                id, candidate_id, firm_name, industry_category, company_size,
                work_place, job_name, job_role, job_category,
                start_date, end_date, job_desc, skills,
                management, wage_type_desc, wage, wage_year,
                sort_order, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `, [
              generateId('EXP'),
              candidateId,
              expCompany,
              randomElement(['科技業', '金融業', '製造業', '服務業', '傳產業']),
              randomElement(['1000人以上', '500~1000人', '100~500人', '30~100人']),
              randomElement(['台北市', '新北市', '桃園市', '新竹市', '台中市']),
              expTitle,
              randomElement(['專業人員', '主管', '技術人員', '行政人員']),
              randomElement(['人資類', '財會類', '資訊類', '業務類', '管理類']),
              `${startYear}-${randomInt(1, 12).toString().padStart(2, '0')}`,
              endYear ? `${endYear}-${randomInt(1, 12).toString().padStart(2, '0')}` : null,
              `負責${expTitle}相關工作，包括日常業務處理與專案執行。`,
              config.skills.slice(0, 3).join(','),
              randomElement(['無', '有', '無']),
              '月薪',
              randomInt(35000, 80000),
              new Date().getFullYear(),
              j + 1
            ]);
          }
          
          // Add skills using correct table: candidate_specialities - use pre-generated selectedSkills
          selectedSkills.forEach((skill, j) => {
            db.run(`
              INSERT INTO candidate_specialities (
                id, candidate_id, skill, description, tags,
                sort_order, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `, [
              generateId('SKL'),
              candidateId,
              skill,
              `具備${skill}相關經驗與能力`,
              randomElement(['專業技能', '軟體工具', '管理能力', '語言能力']),
              j + 1
            ]);
          });
          
          // Add language (1-2 languages) using correct table: candidate_languages
          const langCount = randomInt(1, 2);
          const addedLangs = new Set();
          for (let j = 0; j < langCount; j++) {
            const lang = randomElement(LANGUAGES);
            if (!addedLangs.has(lang.type)) {
              addedLangs.add(lang.type);
              db.run(`
                INSERT INTO candidate_languages (
                  id, candidate_id, lang_type, language_category,
                  listen_degree, speak_degree, read_degree, write_degree,
                  degree, certificates, sort_order, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
              `, [
                generateId('LNG'),
                candidateId,
                lang.type,
                randomElement(['歐語系', '亞語系']),
                lang.listen,
                lang.speak,
                lang.read,
                lang.write,
                randomElement(['精通', '中等', '略懂']),
                lang.cert,
                j + 1
              ]);
            }
          }
          
          // Add attachments (1-2 attachments) - candidate_attachments
          const attachCount = randomInt(1, 2);
          for (let j = 0; j < attachCount; j++) {
            const attach = randomElement(ATTACHMENT_TYPES);
            db.run(`
              INSERT INTO candidate_attachments (
                id, candidate_id, type, title, file_name, 
                resource_link, website, sort_order, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `, [
              generateId('ATT'),
              candidateId,
              attach.type,
              attach.title,
              `${nameData.name}_${attach.type}_${new Date().getFullYear()}.pdf`,
              `https://storage.example.com/resume/${candidateId}/${j + 1}.pdf`,
              null,
              j + 1
            ]);
          }
          
          // Add projects (0-2 projects) - candidate_projects
          const projCount = randomInt(0, 2);
          for (let j = 0; j < projCount; j++) {
            const proj = randomElement(PROJECT_TEMPLATES);
            const projStartYear = randomInt(2018, 2023);
            db.run(`
              INSERT INTO candidate_projects (
                id, candidate_id, title, start_date, end_date,
                description, type, resource_link, website, sort_order, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `, [
              generateId('PRJ'),
              candidateId,
              proj.title,
              `${projStartYear}-${randomInt(1, 6).toString().padStart(2, '0')}`,
              `${projStartYear + randomInt(0, 1)}-${randomInt(7, 12).toString().padStart(2, '0')}`,
              proj.desc,
              proj.type,
              null,
              null,
              j + 1
            ]);
          }
          
          // Add recommenders (1-2 recommenders) - candidate_recommenders
          const recCount = randomInt(1, 2);
          for (let j = 0; j < recCount; j++) {
            const recName = randomElement(CANDIDATE_NAMES);
            const recCompany = randomElement(config.companies);
            db.run(`
              INSERT INTO candidate_recommenders (
                id, candidate_id, name, corp, job_title,
                email, tel, sort_order, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `, [
              generateId('REC'),
              candidateId,
              recName.name,
              recCompany,
              randomElement(RECOMMENDER_TITLES),
              generateEmail(recName.name),
              generatePhone(),
              j + 1
            ]);
          }
          
          // Add apply records (1-3 records) - candidate_apply_records
          const applyCount = randomInt(1, 3);
          for (let j = 0; j < applyCount; j++) {
            const applyYear = randomInt(2023, 2026);
            db.run(`
              INSERT INTO candidate_apply_records (
                id, candidate_id, apply_date, job_name, job_no,
                apply_source, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `, [
              generateId('APR'),
              candidateId,
              `${applyYear}-${randomInt(1, 12).toString().padStart(2, '0')}-${randomInt(1, 28).toString().padStart(2, '0')}`,
              randomElement(config.titles),
              `JOB-${applyYear}${randomInt(1000, 9999)}`,
              randomElement(['104人力銀行', '1111人力銀行', '官網投遞', '獵頭推薦', '員工推薦']),
              j + 1
            ]);
          }
          
          // Add apply questions (2-3 questions) - candidate_apply_questions
          const qCount = randomInt(2, 3);
          const selectedQuestions = [];
          for (let j = 0; j < qCount && j < APPLY_QUESTIONS.length; j++) {
            const qIdx = j % APPLY_QUESTIONS.length;
            if (!selectedQuestions.includes(qIdx)) {
              selectedQuestions.push(qIdx);
              const qa = APPLY_QUESTIONS[qIdx];
              db.run(`
                INSERT INTO candidate_apply_questions (
                  id, candidate_id, type, question, answer,
                  sort_order, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
              `, [
                generateId('APQ'),
                candidateId,
                '應徵問答',
                qa.q,
                qa.a,
                j + 1
              ]);
            }
          }
          
          totalNewCandidates++;
        }
      } else {
        console.log(`   ${job.title} (${job.id}): ${currentCount} candidates (OK)`);
      }
    }
    
    console.log(`   ✅ Added ${totalNewCandidates} new candidates`);
    
    // Step 4.5: Update existing candidates with incomplete data (including profile fields)
    console.log('\n📝 Step 3.5: Updating incomplete candidate records...');
    const incompleteCandidates = db.exec(`
      SELECT c.id, c.job_id, c.name, j.title
      FROM candidates c
      JOIN jobs j ON j.id = c.job_id
      WHERE c.education IS NULL OR c.education = '' 
         OR c.current_company IS NULL 
         OR c.skills IS NULL
         OR c.introduction IS NULL
         OR c.motto IS NULL
         OR c.characteristic IS NULL
         OR c.name_en IS NULL OR c.name_en = ''
    `);
    
    let updatedCount = 0;
    if (incompleteCandidates.length > 0 && incompleteCandidates[0].values.length > 0) {
      incompleteCandidates[0].values.forEach(row => {
        const [candidateId, jobId, candidateName, jobTitle] = row;
        const config = JOB_CONFIGS[jobTitle] || DEFAULT_CONFIG;
        
        // Generate data
        const school = randomElement(SCHOOLS);
        const major = randomElement(config.majors);
        const degreeLevel = randomElement(['大學', '碩士', '博士']);
        const company = randomElement(config.companies);
        const title = randomElement(config.titles);
        const skillCount = randomInt(3, 6);
        const selectedSkills = [];
        for (let j = 0; j < skillCount; j++) {
          let skill = randomElement(config.skills);
          if (!selectedSkills.includes(skill)) {
            selectedSkills.push(skill);
          }
        }
        const experienceYears = randomInt(1, 15);
        
        // Update candidate main record with all profile fields
        const introduction = randomElement(INTRODUCTIONS);
        const motto = randomElement(MOTTOS);
        const characteristic = randomElement(CHARACTERISTICS);
        const workDesc = randomElement(WORK_DESCS);
        const location = randomElement(['台北市', '新北市', '桃園市', '新竹市', '台中市', '高雄市']);
        
        // Find matching English name
        const nameMatch = CANDIDATE_NAMES.find(n => n.name === candidateName);
        const nameEn = nameMatch ? nameMatch.nameEn : generateEnglishName(candidateName);
        
        db.run(`
          UPDATE candidates SET
            name_en = COALESCE(name_en, ?),
            education = COALESCE(education, ?),
            current_company = COALESCE(current_company, ?),
            current_position = COALESCE(current_position, ?),
            skills = COALESCE(skills, ?),
            experience_years = COALESCE(experience_years, ?),
            reg_source = COALESCE(reg_source, '104主動應徵'),
            introduction = COALESCE(introduction, ?),
            motto = COALESCE(motto, ?),
            characteristic = COALESCE(characteristic, ?),
            work_desc = COALESCE(work_desc, ?),
            location = COALESCE(location, ?),
            preferred_location = COALESCE(preferred_location, ?),
            nationality = COALESCE(nationality, '中華民國'),
            updated_at = datetime('now')
          WHERE id = ?
        `, [
          nameEn,
          `${school.name} ${major}`,
          company,
          title,
          JSON.stringify(selectedSkills),
          experienceYears,
          introduction,
          motto,
          characteristic,
          workDesc,
          location,
          location,
          candidateId
        ]);
        
        // Check if education record exists
        const hasEdu = db.exec(`SELECT COUNT(*) FROM candidate_education WHERE candidate_id = '${candidateId}'`)[0].values[0][0];
        if (hasEdu === 0) {
          db.run(`
            INSERT INTO candidate_education (
              id, candidate_id, school_name, degree_level, major,
              major_category, degree_status, school_country,
              start_date, end_date, sort_order, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `, [
            generateId('EDU'),
            candidateId,
            school.name,
            degreeLevel,
            major,
            randomElement(['商業及管理學門', '資訊學門', '工程學門', '社會及行為科學學門']),
            '畢業',
            school.country,
            `${randomInt(2005, 2015)}-09`,
            `${randomInt(2009, 2020)}-06`,
            1
          ]);
        }
        
        // Check if experience record exists
        const hasExp = db.exec(`SELECT COUNT(*) FROM candidate_experiences WHERE candidate_id = '${candidateId}'`)[0].values[0][0];
        if (hasExp === 0) {
          const startYear = randomInt(2015, 2022);
          db.run(`
            INSERT INTO candidate_experiences (
              id, candidate_id, firm_name, industry_category, company_size,
              work_place, job_name, job_role, job_category,
              start_date, end_date, job_desc, skills,
              management, wage_type_desc, wage, wage_year,
              sort_order, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `, [
            generateId('EXP'),
            candidateId,
            company,
            randomElement(['科技業', '金融業', '製造業', '服務業', '傳產業']),
            randomElement(['1000人以上', '500~1000人', '100~500人', '30~100人']),
            randomElement(['台北市', '新北市', '桃園市', '新竹市', '台中市']),
            title,
            randomElement(['專業人員', '主管', '技術人員', '行政人員']),
            randomElement(['人資類', '財會類', '資訊類', '業務類', '管理類']),
            `${startYear}-${randomInt(1, 12).toString().padStart(2, '0')}`,
            null,
            `負責${title}相關工作，包括日常業務處理與專案執行。`,
            selectedSkills.slice(0, 3).join(','),
            randomElement(['無', '有', '無']),
            '月薪',
            randomInt(35000, 80000),
            new Date().getFullYear(),
            1
          ]);
        }
        
        // Check if skills record exists
        const hasSkills = db.exec(`SELECT COUNT(*) FROM candidate_specialities WHERE candidate_id = '${candidateId}'`)[0].values[0][0];
        if (hasSkills === 0) {
          selectedSkills.forEach((skill, j) => {
            db.run(`
              INSERT INTO candidate_specialities (
                id, candidate_id, skill, description, tags,
                sort_order, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `, [
              generateId('SKL'),
              candidateId,
              skill,
              `具備${skill}相關經驗與能力`,
              randomElement(['專業技能', '軟體工具', '管理能力', '語言能力']),
              j + 1
            ]);
          });
        }
        
        // Check if language record exists
        const hasLang = db.exec(`SELECT COUNT(*) FROM candidate_languages WHERE candidate_id = '${candidateId}'`)[0].values[0][0];
        if (hasLang === 0) {
          const lang = randomElement(LANGUAGES);
          db.run(`
            INSERT INTO candidate_languages (
              id, candidate_id, lang_type, language_category,
              listen_degree, speak_degree, read_degree, write_degree,
              degree, certificates, sort_order, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `, [
            generateId('LNG'),
            candidateId,
            lang.type,
            randomElement(['歐語系', '亞語系']),
            lang.listen,
            lang.speak,
            lang.read,
            lang.write,
            randomElement(['精通', '中等', '略懂']),
            lang.cert,
            1
          ]);
        }
        
        // Check if attachments exist
        const hasAttach = db.exec(`SELECT COUNT(*) FROM candidate_attachments WHERE candidate_id = '${candidateId}'`)[0].values[0][0];
        if (hasAttach === 0) {
          const attach = randomElement(ATTACHMENT_TYPES);
          db.run(`
            INSERT INTO candidate_attachments (
              id, candidate_id, type, title, file_name,
              resource_link, website, sort_order, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `, [
            generateId('ATT'),
            candidateId,
            attach.type,
            attach.title,
            `${candidateName}_${attach.type}.pdf`,
            `https://storage.example.com/resume/${candidateId}/1.pdf`,
            null,
            1
          ]);
        }
        
        // Check if projects exist
        const hasProj = db.exec(`SELECT COUNT(*) FROM candidate_projects WHERE candidate_id = '${candidateId}'`)[0].values[0][0];
        if (hasProj === 0 && Math.random() > 0.3) {
          const proj = randomElement(PROJECT_TEMPLATES);
          const projStartYear = randomInt(2018, 2023);
          db.run(`
            INSERT INTO candidate_projects (
              id, candidate_id, title, start_date, end_date,
              description, type, resource_link, website, sort_order, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `, [
            generateId('PRJ'),
            candidateId,
            proj.title,
            `${projStartYear}-${randomInt(1, 6).toString().padStart(2, '0')}`,
            `${projStartYear + 1}-${randomInt(7, 12).toString().padStart(2, '0')}`,
            proj.desc,
            proj.type,
            null,
            null,
            1
          ]);
        }
        
        // Check if recommenders exist
        const hasRec = db.exec(`SELECT COUNT(*) FROM candidate_recommenders WHERE candidate_id = '${candidateId}'`)[0].values[0][0];
        if (hasRec === 0) {
          const recName = randomElement(CANDIDATE_NAMES);
          db.run(`
            INSERT INTO candidate_recommenders (
              id, candidate_id, name, corp, job_title,
              email, tel, sort_order, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `, [
            generateId('REC'),
            candidateId,
            recName.name,
            company,
            randomElement(RECOMMENDER_TITLES),
            generateEmail(recName.name),
            generatePhone(),
            1
          ]);
        }
        
        // Check if apply records exist
        const hasApplyRec = db.exec(`SELECT COUNT(*) FROM candidate_apply_records WHERE candidate_id = '${candidateId}'`)[0].values[0][0];
        if (hasApplyRec === 0) {
          db.run(`
            INSERT INTO candidate_apply_records (
              id, candidate_id, apply_date, job_name, job_no,
              apply_source, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          `, [
            generateId('APR'),
            candidateId,
            `${randomInt(2024, 2026)}-${randomInt(1, 12).toString().padStart(2, '0')}-${randomInt(1, 28).toString().padStart(2, '0')}`,
            jobTitle,
            jobId,
            '104主動應徵'
          ]);
        }
        
        // Check if apply questions exist
        const hasApplyQ = db.exec(`SELECT COUNT(*) FROM candidate_apply_questions WHERE candidate_id = '${candidateId}'`)[0].values[0][0];
        if (hasApplyQ === 0) {
          const qa = APPLY_QUESTIONS[0];
          db.run(`
            INSERT INTO candidate_apply_questions (
              id, candidate_id, type, question, answer,
              sort_order, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          `, [
            generateId('APQ'),
            candidateId,
            '應徵問答',
            qa.q,
            qa.a,
            1
          ]);
        }
        
        updatedCount++;
      });
    }
    console.log(`   ✅ Updated ${updatedCount} incomplete candidate records`);
    
    // Step 3.6: Fill missing sub-table data for all candidates
    console.log('\n📎 Step 3.6: Filling missing sub-table data...');
    const allCandidates = db.exec(`
      SELECT c.id, c.job_id, c.name, j.title
      FROM candidates c
      JOIN jobs j ON j.id = c.job_id
    `);
    
    let filledCount = 0;
    if (allCandidates.length > 0 && allCandidates[0].values.length > 0) {
      allCandidates[0].values.forEach(row => {
        const [candidateId, jobId, candidateName, jobTitle] = row;
        const config = JOB_CONFIGS[jobTitle] || DEFAULT_CONFIG;
        let filled = false;
        
        // Check and fill attachments
        const hasAttach = db.exec(`SELECT COUNT(*) FROM candidate_attachments WHERE candidate_id = '${candidateId}'`)[0].values[0][0];
        if (hasAttach === 0) {
          const attachCount = randomInt(1, 2);
          for (let j = 0; j < attachCount; j++) {
            const attach = randomElement(ATTACHMENT_TYPES);
            db.run(`
              INSERT INTO candidate_attachments (
                id, candidate_id, type, title, file_name,
                resource_link, website, sort_order, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `, [
              generateId('ATT'),
              candidateId,
              attach.type,
              attach.title,
              `${candidateName}_${attach.type}.pdf`,
              `https://storage.example.com/resume/${candidateId}/${j + 1}.pdf`,
              null,
              j + 1
            ]);
          }
          filled = true;
        }
        
        // Check and fill projects
        const hasProj = db.exec(`SELECT COUNT(*) FROM candidate_projects WHERE candidate_id = '${candidateId}'`)[0].values[0][0];
        if (hasProj === 0 && Math.random() > 0.3) {
          const projCount = randomInt(1, 2);
          for (let j = 0; j < projCount; j++) {
            const proj = randomElement(PROJECT_TEMPLATES);
            const projStartYear = randomInt(2018, 2023);
            db.run(`
              INSERT INTO candidate_projects (
                id, candidate_id, title, start_date, end_date,
                description, type, resource_link, website, sort_order, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `, [
              generateId('PRJ'),
              candidateId,
              proj.title,
              `${projStartYear}-${randomInt(1, 6).toString().padStart(2, '0')}`,
              `${projStartYear + randomInt(0, 1)}-${randomInt(7, 12).toString().padStart(2, '0')}`,
              proj.desc,
              proj.type,
              null,
              null,
              j + 1
            ]);
          }
          filled = true;
        }
        
        // Check and fill recommenders
        const hasRec = db.exec(`SELECT COUNT(*) FROM candidate_recommenders WHERE candidate_id = '${candidateId}'`)[0].values[0][0];
        if (hasRec === 0) {
          const recCount = randomInt(1, 2);
          for (let j = 0; j < recCount; j++) {
            const recName = randomElement(CANDIDATE_NAMES);
            const recCompany = randomElement(config.companies);
            db.run(`
              INSERT INTO candidate_recommenders (
                id, candidate_id, name, corp, job_title,
                email, tel, sort_order, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `, [
              generateId('REC'),
              candidateId,
              recName.name,
              recCompany,
              randomElement(RECOMMENDER_TITLES),
              generateEmail(recName.name),
              generatePhone(),
              j + 1
            ]);
          }
          filled = true;
        }
        
        // Check and fill apply records
        const hasApplyRec = db.exec(`SELECT COUNT(*) FROM candidate_apply_records WHERE candidate_id = '${candidateId}'`)[0].values[0][0];
        if (hasApplyRec === 0) {
          const applyCount = randomInt(1, 3);
          for (let j = 0; j < applyCount; j++) {
            db.run(`
              INSERT INTO candidate_apply_records (
                id, candidate_id, apply_date, job_name, job_no,
                apply_source, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `, [
              generateId('APR'),
              candidateId,
              `${randomInt(2024, 2026)}-${randomInt(1, 12).toString().padStart(2, '0')}-${randomInt(1, 28).toString().padStart(2, '0')}`,
              randomElement(config.titles),
              `JOB-${randomInt(2024, 2026)}${randomInt(1000, 9999)}`,
              randomElement(['104人力銀行', '1111人力銀行', '官網投遞', '獵頭推薦', '員工推薦'])
            ]);
          }
          filled = true;
        }
        
        // Check and fill apply questions
        const hasApplyQ = db.exec(`SELECT COUNT(*) FROM candidate_apply_questions WHERE candidate_id = '${candidateId}'`)[0].values[0][0];
        if (hasApplyQ === 0) {
          const qCount = randomInt(2, 3);
          for (let j = 0; j < qCount && j < APPLY_QUESTIONS.length; j++) {
            const qa = APPLY_QUESTIONS[j];
            db.run(`
              INSERT INTO candidate_apply_questions (
                id, candidate_id, type, question, answer,
                sort_order, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `, [
              generateId('APQ'),
              candidateId,
              '應徵問答',
              qa.q,
              qa.a,
              j + 1
            ]);
          }
          filled = true;
        }
        
        if (filled) filledCount++;
      });
    }
    console.log(`   ✅ Filled sub-table data for ${filledCount} candidates`);
    
    // Step 5: Reset all candidates to 'new' status
    console.log('\n🔄 Step 4: Resetting all candidates to "new" status...');
    db.run(`
      UPDATE candidates 
      SET status = 'new', 
          stage = 'New',
          updated_at = datetime('now')
    `);
    
    const totalCandidates = db.exec('SELECT COUNT(*) FROM candidates')[0].values[0][0];
    console.log(`   ✅ Reset ${totalCandidates} candidates to "new" status`);
    
    // Step 6: Save database
    console.log('\n💾 Step 5: Saving database...');
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
    console.log('   ✅ Database saved successfully');
    
    // Final summary
    console.log('\n📊 Final Summary:');
    const finalCounts = db.exec(`
      SELECT j.id, j.title, COUNT(c.id) as count
      FROM jobs j
      LEFT JOIN candidates c ON c.job_id = j.id
      GROUP BY j.id, j.title
      ORDER BY j.id
    `);
    if (finalCounts.length > 0) {
      finalCounts[0].values.forEach(row => {
        console.log(`   ${row[1]}: ${row[2]} candidates`);
      });
    }
    
    console.log(`\n   Total candidates: ${totalCandidates}`);
    console.log('   All candidates status: new (新進履歷)');
    
    console.log('\n✅ Interview data initialization completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
