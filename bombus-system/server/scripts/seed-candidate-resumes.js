/**
 * Seed Candidate Resume Data (based on 104 API format)
 * 
 * This script populates all candidate-related tables with realistic mock data
 * conforming to the 104 Resume API structure.
 * 
 * Usage: node scripts/seed-candidate-resumes.js
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../src/db/onboarding.db');

// ============================================================
// Mock Data Generators
// ============================================================

const SCHOOLS = [
  { name: '國立台灣大學', country: '台灣', level: '大學' },
  { name: '國立清華大學', country: '台灣', level: '大學' },
  { name: '國立交通大學', country: '台灣', level: '大學' },
  { name: '國立成功大學', country: '台灣', level: '大學' },
  { name: '國立政治大學', country: '台灣', level: '大學' },
  { name: '國立中山大學', country: '台灣', level: '大學' },
  { name: '國立台北科技大學', country: '台灣', level: '大學' },
  { name: '國立台灣科技大學', country: '台灣', level: '大學' },
  { name: '輔仁大學', country: '台灣', level: '大學' },
  { name: '東吳大學', country: '台灣', level: '大學' },
  { name: '淡江大學', country: '台灣', level: '大學' },
  { name: '實踐大學', country: '台灣', level: '大學' },
  { name: '銘傳大學', country: '台灣', level: '大學' },
  { name: '世新大學', country: '台灣', level: '大學' },
  { name: 'MIT', country: '美國', level: '碩士' },
  { name: 'Stanford University', country: '美國', level: '碩士' },
  { name: '早稻田大學', country: '日本', level: '大學' },
  { name: '北京大學', country: '中國', level: '碩士' }
];

const MAJORS = {
  tech: ['資訊工程學系', '資訊管理學系', '電機工程學系', '電子工程學系', '軟體工程學系', '人工智慧學系', '資料科學學系', '網路與多媒體學系'],
  business: ['企業管理學系', '財務金融學系', '國際貿易學系', '行銷學系', '會計學系', '經濟學系', '人力資源管理學系'],
  design: ['視覺傳達設計學系', '工業設計學系', '多媒體設計學系', '數位媒體設計學系', '互動設計學系'],
  music: ['音樂學系', '流行音樂學系', '表演藝術學系', '藝術管理學系']
};

const COMPANIES = [
  { name: '台積電', industry: '半導體製造業', size: '1000人以上' },
  { name: '鴻海精密', industry: '電子零組件製造業', size: '1000人以上' },
  { name: '聯發科技', industry: '半導體製造業', size: '1000人以上' },
  { name: 'Google Taiwan', industry: '網際網路相關業', size: '500~1000人' },
  { name: 'Microsoft Taiwan', industry: '軟體及網路相關業', size: '500~1000人' },
  { name: 'LINE Taiwan', industry: '網際網路相關業', size: '100~500人' },
  { name: 'Shopee Taiwan', industry: '網際網路相關業', size: '100~500人' },
  { name: '華碩電腦', industry: '電腦及其週邊設備製造業', size: '1000人以上' },
  { name: '宏碁電腦', industry: '電腦及其週邊設備製造業', size: '1000人以上' },
  { name: '中國信託', industry: '金融業', size: '1000人以上' },
  { name: '國泰人壽', industry: '保險業', size: '1000人以上' },
  { name: '遠傳電信', industry: '電信業', size: '1000人以上' },
  { name: '104資訊科技', industry: '網際網路相關業', size: '500~1000人' },
  { name: 'PChome', industry: '網際網路相關業', size: '500~1000人' },
  { name: 'momo購物', industry: '網際網路相關業', size: '500~1000人' },
  { name: '趨勢科技', industry: '軟體及網路相關業', size: '500~1000人' },
  { name: '新創科技公司', industry: '網際網路相關業', size: '30~100人' },
  { name: '獨立工作室', industry: '設計/傳播業', size: '1~30人' },
  { name: '唱片公司', industry: '傳播/媒體業', size: '30~100人' },
  { name: '環球音樂', industry: '傳播/媒體業', size: '100~500人' },
  { name: '索尼音樂', industry: '傳播/媒體業', size: '100~500人' },
  { name: '相信音樂', industry: '傳播/媒體業', size: '30~100人' }
];

const JOB_TITLES = {
  tech: ['軟體工程師', '前端工程師', '後端工程師', '全端工程師', '資深工程師', '技術主管', '系統架構師', 'DevOps工程師', '資料工程師', 'AI工程師'],
  pm: ['產品經理', '專案經理', '產品企劃', '專案協調人員'],
  design: ['UI設計師', 'UX設計師', '視覺設計師', '平面設計師', '品牌設計師'],
  marketing: ['行銷專員', '數位行銷', '社群經理', '內容行銷', '品牌經理'],
  music: ['音樂製作人', '歌手', '詞曲創作人', '錄音師', '藝人經紀', '演唱會企劃']
};

const SKILLS = {
  tech: ['JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'Go', 'React', 'Vue.js', 'Angular', 'Node.js', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Git', 'CI/CD', 'Agile', 'Scrum'],
  design: ['Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator', 'After Effects', 'Premiere Pro', 'InDesign', 'Blender', 'Cinema 4D'],
  pm: ['Product Management', 'Agile', 'Scrum', 'JIRA', 'Confluence', 'Notion', 'GA4', 'Mixpanel', 'SQL', 'Data Analysis'],
  music: ['Pro Tools', 'Logic Pro', 'Ableton Live', 'Cubase', '作詞', '作曲', '編曲', '錄音', '混音', '母帶處理', '現場演出']
};

const CERTIFICATES = {
  tech: ['AWS Certified Solutions Architect', 'Google Cloud Professional', 'Microsoft Azure Certified', 'Kubernetes Administrator (CKA)', 'PMP', 'Scrum Master (CSM)', 'TOEIC 900+'],
  design: ['Adobe Certified Expert', 'Google UX Design Certificate', 'Interaction Design Foundation'],
  music: ['音樂製作證照', '金曲獎入圍', '金曲獎得獎']
};

const LANGUAGES = [
  { type: '英文', listen: '精通', speak: '精通', read: '精通', write: '精通', cert: 'TOEIC:950' },
  { type: '英文', listen: '中等', speak: '中等', read: '精通', write: '中等', cert: 'TOEIC:750' },
  { type: '日文', listen: '中等', speak: '略懂', read: '中等', write: '略懂', cert: 'JLPT N2' },
  { type: '韓文', listen: '略懂', speak: '略懂', read: '略懂', write: '略懂', cert: '' },
  { type: '法文', listen: '略懂', speak: '略懂', read: '略懂', write: '略懂', cert: '' }
];

const LOCAL_LANGUAGES = [
  { type: '台語', degree: '精通' },
  { type: '台語', degree: '中等' },
  { type: '客家語', degree: '中等' },
  { type: '粵語', degree: '略懂' }
];

const CITIES = ['台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市', '新竹市', '新竹縣'];

// ============================================================
// Candidate Profile Templates
// ============================================================

function generateCandidateProfiles() {
  return {
    'C001': {  // 林小美
      type: 'tech',
      gender: '女',
      englishName: 'Mei Lin',
      birthday: '1995-06-15',
      seniority: '3年以上',
      address: '台北市大安區忠孝東路四段100號',
      education: [
        { school: '國立台灣大學', major: '資訊管理學系', level: '碩士', status: '畢業', start: '2017-09', end: '2019-06' },
        { school: '國立政治大學', major: '資訊管理學系', level: '大學', status: '畢業', start: '2013-09', end: '2017-06' }
      ],
      experiences: [
        { company: 'LINE Taiwan', title: '前端工程師', role: '全職', start: '2021-03', end: null, desc: '負責LINE購物前端開發、優化用戶體驗、開發新功能模組' },
        { company: 'PChome', title: '軟體工程師', role: '全職', start: '2019-07', end: '2021-02', desc: '電商平台開發維護、購物車系統優化' }
      ],
      skills: ['React', 'TypeScript', 'Node.js', 'Vue.js', 'AWS'],
      languages: [{ type: '英文', listen: '精通', speak: '中等', read: '精通', write: '中等', cert: 'TOEIC:850' }],
      certificates: ['AWS Certified Developer', 'Google Analytics'],
      biography: '我是一位熱愛前端開發的工程師，擁有4年以上的網頁開發經驗。在LINE Taiwan擔任前端工程師期間，主導了多項重要功能的開發，包括購物車改版、會員中心重構等專案。我熟悉React生態系統，對於效能優化與用戶體驗有深入的研究。期待能在新的環境中持續成長，為團隊帶來價值。'
    },
    'C002': {  // 張志明
      type: 'tech',
      gender: '男',
      englishName: 'Jimmy Chang',
      birthday: '1992-03-20',
      seniority: '5年以上',
      address: '新北市板橋區文化路一段50號',
      education: [
        { school: '國立清華大學', major: '資訊工程學系', level: '碩士', status: '畢業', start: '2014-09', end: '2016-06' },
        { school: '國立交通大學', major: '電機工程學系', level: '大學', status: '畢業', start: '2010-09', end: '2014-06' }
      ],
      experiences: [
        { company: '台積電', title: '資深軟體工程師', role: '全職', start: '2020-01', end: null, desc: '負責製程自動化系統開發、大數據分析平台建置、AI異常偵測系統' },
        { company: '聯發科技', title: '軟體工程師', role: '全職', start: '2016-07', end: '2019-12', desc: 'IC設計自動化工具開發、系統效能優化' }
      ],
      skills: ['Python', 'Java', 'Machine Learning', 'Docker', 'Kubernetes', 'PostgreSQL'],
      languages: [{ type: '英文', listen: '精通', speak: '精通', read: '精通', write: '精通', cert: 'TOEIC:920' }],
      certificates: ['AWS Solutions Architect', 'Google Cloud Professional', 'PMP'],
      biography: '擁有7年軟體開發經驗，專精於後端系統設計與大數據處理。在台積電負責製程自動化專案，成功導入AI技術提升產線效率15%。具備跨部門溝通協調能力，曾帶領5人團隊完成多項重要專案。期望加入具有挑戰性的團隊，發揮所長。'
    },
    'C003': {  // 陳建國
      type: 'pm',
      gender: '男',
      englishName: 'Ken Chen',
      birthday: '1990-11-08',
      seniority: '7年以上',
      address: '台北市信義區松仁路100號',
      education: [
        { school: 'MIT', major: 'MBA', level: '碩士', status: '畢業', start: '2015-09', end: '2017-06' },
        { school: '國立台灣大學', major: '企業管理學系', level: '大學', status: '畢業', start: '2008-09', end: '2012-06' }
      ],
      experiences: [
        { company: 'Google Taiwan', title: '產品經理', role: '全職', start: '2019-06', end: null, desc: '負責Google Cloud產品在台灣市場的策略規劃與執行' },
        { company: 'Microsoft Taiwan', title: '專案經理', role: '全職', start: '2017-08', end: '2019-05', desc: 'Azure雲端服務專案管理、客戶關係維護' }
      ],
      skills: ['Product Management', 'Agile', 'Data Analysis', 'SQL', 'Tableau', 'Strategic Planning'],
      languages: [
        { type: '英文', listen: '精通', speak: '精通', read: '精通', write: '精通', cert: 'TOEFL:110' },
        { type: '日文', listen: '中等', speak: '中等', read: '中等', write: '略懂', cert: 'JLPT N2' }
      ],
      certificates: ['PMP', 'Scrum Master (CSM)', 'Google Analytics'],
      biography: '資深產品經理，擁有跨國企業工作經驗與MIT MBA學歷。專注於B2B產品策略與市場拓展，成功推動多項產品在台灣市場的成長。具備優秀的跨文化溝通能力與商業分析技能。'
    },
    'C020': {  // 王淑芬
      type: 'design',
      gender: '女',
      englishName: 'Sophia Wang',
      birthday: '1996-08-25',
      seniority: '3年以上',
      address: '台北市中山區南京東路三段200號',
      education: [
        { school: '實踐大學', major: '視覺傳達設計學系', level: '大學', status: '畢業', start: '2014-09', end: '2018-06' }
      ],
      experiences: [
        { company: 'Shopee Taiwan', title: 'UI/UX設計師', role: '全職', start: '2020-04', end: null, desc: '負責App介面設計、用戶研究、設計系統建置' },
        { company: '新創科技公司', title: '視覺設計師', role: '全職', start: '2018-07', end: '2020-03', desc: '品牌識別設計、行銷素材製作' }
      ],
      skills: ['Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator', 'User Research', 'Prototyping'],
      languages: [{ type: '英文', listen: '中等', speak: '中等', read: '精通', write: '中等', cert: 'TOEIC:780' }],
      certificates: ['Google UX Design Certificate'],
      biography: '熱愛用設計解決問題的UI/UX設計師。在Shopee負責電商App的用戶體驗優化，透過數據分析與用戶研究，成功提升轉換率20%。善於與工程師協作，注重設計的可實現性。'
    },
    'C021': {  // 李國華
      type: 'tech',
      gender: '男',
      englishName: 'George Lee',
      birthday: '1988-04-12',
      seniority: '10年以上',
      address: '新竹市東區光復路二段101號',
      education: [
        { school: 'Stanford University', major: 'Computer Science', level: '碩士', status: '畢業', start: '2010-09', end: '2012-06' },
        { school: '國立交通大學', major: '資訊工程學系', level: '大學', status: '畢業', start: '2006-09', end: '2010-06' }
      ],
      experiences: [
        { company: 'Google Taiwan', title: '技術主管', role: '全職', start: '2018-01', end: null, desc: '帶領10人工程團隊、負責搜尋引擎核心演算法優化' },
        { company: 'Facebook', title: '資深工程師', role: '全職', start: '2014-06', end: '2017-12', desc: 'News Feed演算法開發、效能優化' },
        { company: 'Yahoo', title: '軟體工程師', role: '全職', start: '2012-07', end: '2014-05', desc: '搜尋引擎後端開發' }
      ],
      skills: ['System Design', 'Machine Learning', 'Python', 'C++', 'Go', 'Distributed Systems', 'Team Leadership'],
      languages: [{ type: '英文', listen: '精通', speak: '精通', read: '精通', write: '精通', cert: 'TOEFL:118' }],
      certificates: ['Google Cloud Professional Architect'],
      biography: '擁有12年軟體開發經驗，專精於大規模分散式系統與機器學習。曾任職於多家頂尖科技公司，具備豐富的技術領導經驗。熱衷於培養團隊成員，打造高效能的工程文化。'
    },
    'C022': {  // 陳怡君
      type: 'marketing',
      gender: '女',
      englishName: 'Jessica Chen',
      birthday: '1994-12-03',
      seniority: '4年以上',
      address: '台北市松山區民生東路四段88號',
      education: [
        { school: '國立政治大學', major: '廣告學系', level: '碩士', status: '畢業', start: '2016-09', end: '2018-06' },
        { school: '世新大學', major: '新聞學系', level: '大學', status: '畢業', start: '2012-09', end: '2016-06' }
      ],
      experiences: [
        { company: 'LINE Taiwan', title: '數位行銷經理', role: '全職', start: '2021-02', end: null, desc: '負責LINE官方帳號行銷策略、社群經營、KOL合作' },
        { company: 'PChome', title: '行銷專員', role: '全職', start: '2018-07', end: '2021-01', desc: '電商行銷活動企劃、內容行銷、廣告投放' }
      ],
      skills: ['Digital Marketing', 'Social Media Marketing', 'Content Marketing', 'Google Ads', 'Facebook Ads', 'GA4', 'SEO'],
      languages: [{ type: '英文', listen: '中等', speak: '中等', read: '精通', write: '中等', cert: 'TOEIC:800' }],
      certificates: ['Google Ads Certification', 'Facebook Blueprint'],
      biography: '數位行銷專家，擅長整合性行銷策略規劃與執行。在LINE Taiwan負責官方帳號經營，成功將粉絲數提升50%。熟悉各種數位廣告平台操作與數據分析，能有效提升行銷ROI。'
    },
    // Music industry candidates
    'C010': {  // 蔡依林
      type: 'music',
      gender: '女',
      englishName: 'Jolin Tsai',
      birthday: '1980-09-15',
      seniority: '20年以上',
      address: '台北市大安區敦化南路一段200號',
      education: [
        { school: '輔仁大學', major: '英國語文學系', level: '大學', status: '畢業', start: '1998-09', end: '2002-06' }
      ],
      experiences: [
        { company: '索尼音樂', title: '歌手/音樂製作人', role: '全職', start: '2014-01', end: null, desc: '專輯製作、世界巡迴演唱會、音樂創作' },
        { company: '華納音樂', title: '歌手', role: '全職', start: '1999-09', end: '2013-12', desc: '專輯錄製、宣傳活動、演唱會' }
      ],
      skills: ['作曲', '編曲', '現場演出', 'Pro Tools', '舞蹈', '藝術指導'],
      languages: [
        { type: '英文', listen: '精通', speak: '精通', read: '精通', write: '中等', cert: '' },
        { type: '日文', listen: '中等', speak: '略懂', read: '略懂', write: '略懂', cert: '' }
      ],
      certificates: ['金曲獎最佳國語女歌手', '金曲獎最佳專輯'],
      biography: '華語流行音樂天后，出道超過20年，發行多張白金唱片。以精湛的舞台表演與創新的音樂風格聞名，多次獲得金曲獎肯定。近年積極參與音樂製作，致力於培養新人。'
    },
    'C011': {  // 五月天 (阿信)
      type: 'music',
      gender: '男',
      englishName: 'Ashin',
      birthday: '1975-12-06',
      seniority: '25年以上',
      address: '台北市信義區松壽路10號',
      education: [
        { school: '國立台灣大學', major: '歷史學系', level: '大學', status: '肄業', start: '1994-09', end: '1997-06' }
      ],
      experiences: [
        { company: '相信音樂', title: '主唱/詞曲創作人', role: '全職', start: '1999-07', end: null, desc: '五月天主唱、詞曲創作、演唱會企劃' },
        { company: '獨立樂團', title: '樂團主唱', role: '兼職', start: '1995-03', end: '1999-06', desc: 'Live House演出、詞曲創作' }
      ],
      skills: ['作詞', '作曲', '現場演出', '音樂製作', 'Logic Pro', '藝術指導'],
      languages: [{ type: '英文', listen: '中等', speak: '中等', read: '精通', write: '中等', cert: '' }],
      certificates: ['金曲獎最佳作詞人', '金曲獎最佳樂團'],
      biography: '五月天主唱，華語搖滾樂壇代表人物。創作超過200首歌曲，舉辦多次大型演唱會。以真摯的歌詞與激勵人心的音樂風格著稱，被譽為「人生的陪伴者」。'
    },
    'C012': {  // 張惠妹
      type: 'music',
      gender: '女',
      englishName: 'A-mei',
      birthday: '1972-08-09',
      seniority: '25年以上',
      address: '台東縣台東市中華路一段100號',
      education: [
        { school: '國立台北藝術大學', major: '音樂學系', level: '大學', status: '畢業', start: '1990-09', end: '1994-06' }
      ],
      experiences: [
        { company: '環球音樂', title: '歌手/音樂製作人', role: '全職', start: '2010-01', end: null, desc: '專輯製作、跨界合作、演唱會' },
        { company: '豐華唱片', title: '歌手', role: '全職', start: '1996-06', end: '2009-12', desc: '專輯錄製、巡迴演唱會' }
      ],
      skills: ['演唱', '音樂製作', '舞台表演', 'Pro Tools', '現場演出'],
      languages: [
        { type: '英文', listen: '中等', speak: '中等', read: '中等', write: '略懂', cert: '' }
      ],
      certificates: ['金曲獎最佳國語女歌手(四屆)', '金曲獎特別貢獻獎'],
      biography: '華語歌壇天后，擁有「鐵肺」美譽。出道近30年，發行多張經典專輯，四度榮獲金曲獎最佳國語女歌手。以獨特的原住民音樂風格與強大的現場演唱實力聞名。'
    },
    'C013': {  // 林俊傑
      type: 'music',
      gender: '男',
      englishName: 'JJ Lin',
      birthday: '1981-03-27',
      seniority: '20年以上',
      address: '新加坡',
      education: [
        { school: 'Anglo-Chinese School', major: '音樂', level: '高中', status: '畢業', start: '1996-01', end: '1999-12' }
      ],
      experiences: [
        { company: 'JFJ Productions', title: '歌手/音樂製作人', role: '全職', start: '2003-04', end: null, desc: '音樂創作、專輯製作、國際巡演' }
      ],
      skills: ['作曲', '編曲', '音樂製作', 'Ableton Live', 'Logic Pro', '鋼琴', '吉他'],
      languages: [
        { type: '英文', listen: '精通', speak: '精通', read: '精通', write: '精通', cert: '' },
        { type: '中文', listen: '精通', speak: '精通', read: '精通', write: '精通', cert: '' }
      ],
      certificates: ['金曲獎最佳國語男歌手(四屆)', '金曲獎最佳作曲人'],
      biography: '新加坡創作歌手，華語樂壇頂級音樂製作人。創作風格多元，融合R&B、電子與華語流行。四度榮獲金曲獎最佳男歌手，被譽為「行走的CD」。'
    },
    'C014': {  // 田馥甄
      type: 'music',
      gender: '女',
      englishName: 'Hebe Tien',
      birthday: '1983-03-30',
      seniority: '20年以上',
      address: '台北市中山區民權東路三段50號',
      education: [
        { school: '國立台灣師範大學', major: '英語學系', level: '大學', status: '畢業', start: '2001-09', end: '2005-06' }
      ],
      experiences: [
        { company: '華研國際音樂', title: '歌手', role: '全職', start: '2000-09', end: null, desc: 'S.H.E成員、個人專輯發行、演唱會' }
      ],
      skills: ['演唱', '音樂詮釋', '舞台表演', '主持'],
      languages: [{ type: '英文', listen: '精通', speak: '中等', read: '精通', write: '中等', cert: '' }],
      certificates: ['金曲獎最佳國語女歌手', '金曲獎最佳專輯'],
      biography: '從S.H.E時期到個人發展，田馥甄以獨特的嗓音與細膩的音樂詮釋能力著稱。個人專輯風格獨具，融合電子、民謠與實驗音樂元素，深受樂評與歌迷喜愛。'
    },
    'C015': {  // 蕭敬騰
      type: 'music',
      gender: '男',
      englishName: 'Jam Hsiao',
      birthday: '1987-03-30',
      seniority: '15年以上',
      address: '台北市松山區八德路四段200號',
      education: [
        { school: '華崗藝校', major: '音樂科', level: '高職', status: '畢業', start: '2002-09', end: '2005-06' }
      ],
      experiences: [
        { company: '華納音樂', title: '歌手/音樂製作人', role: '全職', start: '2008-06', end: null, desc: '專輯製作、演唱會、綜藝節目' }
      ],
      skills: ['演唱', '爵士鼓', '鋼琴', '吉他', '音樂製作', '即興演出'],
      languages: [{ type: '英文', listen: '中等', speak: '中等', read: '中等', write: '略懂', cert: '' }],
      certificates: ['金曲獎最佳國語男歌手'],
      biography: '從星光幫出身，蕭敬騰以獨特的沙啞嗓音與強烈的舞台魅力聞名。除了歌唱事業，也積極參與音樂製作與綜藝節目，展現多元才華。'
    },
    'C016': {  // 鄧紫棋
      type: 'music',
      gender: '女',
      englishName: 'G.E.M.',
      birthday: '1991-08-16',
      seniority: '15年以上',
      address: '香港',
      education: [
        { school: '香港演藝學院', major: '音樂', level: '大學', status: '肄業', start: '2006-09', end: '2008-06' }
      ],
      experiences: [
        { company: '蜂鳥音樂', title: '歌手/詞曲創作人', role: '全職', start: '2008-10', end: null, desc: '專輯製作、詞曲創作、世界巡演' }
      ],
      skills: ['作詞', '作曲', '鋼琴', '演唱', '音樂製作', 'Pro Tools'],
      languages: [
        { type: '英文', listen: '精通', speak: '精通', read: '精通', write: '精通', cert: '' },
        { type: '粵語', listen: '精通', speak: '精通', read: '精通', write: '精通', cert: '' }
      ],
      certificates: ['金曲獎入圍', '叱咤樂壇女歌手金獎'],
      biography: '香港創作型歌手，以強大的創作能力與穿透力十足的嗓音著稱。自幼學習鋼琴，16歲出道即展現驚人才華。近年活躍於兩岸三地，作品風格多元。'
    },
    'C017': {  // 王力宏
      type: 'music',
      gender: '男',
      englishName: 'Leehom Wang',
      birthday: '1976-05-17',
      seniority: '25年以上',
      address: '美國洛杉磯',
      education: [
        { school: 'Berklee College of Music', major: '音樂製作', level: '大學', status: '畢業', start: '1994-09', end: '1998-06' },
        { school: 'Williams College', major: '音樂', level: '大學', status: '畢業', start: '1994-09', end: '1998-06' }
      ],
      experiences: [
        { company: '宏聲音樂', title: '歌手/音樂製作人', role: '全職', start: '1995-06', end: null, desc: '專輯製作、電影配樂、演唱會' }
      ],
      skills: ['作曲', '編曲', '音樂製作', '小提琴', '鋼琴', '吉他', '二胡'],
      languages: [
        { type: '英文', listen: '精通', speak: '精通', read: '精通', write: '精通', cert: '' },
        { type: '日文', listen: '中等', speak: '中等', read: '中等', write: '略懂', cert: '' }
      ],
      certificates: ['金曲獎最佳國語男歌手', '金曲獎最佳專輯製作人'],
      biography: '華語樂壇創作才子，融合東西方音樂元素的先驅。擁有Berklee與Williams College雙學位，精通多種樂器。創作風格獨特，將嘻哈、R&B與中國傳統音樂完美融合。'
    },
    'C018': {  // 陶喆
      type: 'music',
      gender: '男',
      englishName: 'David Tao',
      birthday: '1969-07-11',
      seniority: '25年以上',
      address: '台北市大安區仁愛路四段100號',
      education: [
        { school: 'UCLA', major: '民族音樂學', level: '碩士', status: '畢業', start: '1991-09', end: '1993-06' },
        { school: 'University of California, Irvine', major: '心理學', level: '大學', status: '畢業', start: '1987-09', end: '1991-06' }
      ],
      experiences: [
        { company: '種子音樂', title: '音樂製作人/歌手', role: '全職', start: '1997-06', end: null, desc: '專輯製作、音樂創作、歌手培訓' }
      ],
      skills: ['作詞', '作曲', '編曲', '音樂製作', 'Pro Tools', 'Logic Pro', '吉他', '貝斯'],
      languages: [{ type: '英文', listen: '精通', speak: '精通', read: '精通', write: '精通', cert: '' }],
      certificates: ['金曲獎最佳國語男歌手', '金曲獎最佳專輯製作人(三屆)'],
      biography: '華語R&B教父，將西方R&B與Soul音樂帶入華語樂壇的先驅。UCLA民族音樂學碩士，以精湛的音樂製作技術與獨特的唱腔著稱。培養出多位金曲歌手。'
    },
    'C019': {  // 陳奕迅
      type: 'music',
      gender: '男',
      englishName: 'Eason Chan',
      birthday: '1974-07-27',
      seniority: '25年以上',
      address: '香港',
      education: [
        { school: 'Kingston University', major: '建築學', level: '大學', status: '畢業', start: '1992-09', end: '1995-06' }
      ],
      experiences: [
        { company: '環球音樂', title: '歌手', role: '全職', start: '1996-06', end: null, desc: '專輯錄製、世界巡演、電影演出' }
      ],
      skills: ['演唱', '音樂詮釋', '舞台表演', '演戲'],
      languages: [
        { type: '英文', listen: '精通', speak: '精通', read: '精通', write: '中等', cert: '' },
        { type: '粵語', listen: '精通', speak: '精通', read: '精通', write: '精通', cert: '' }
      ],
      certificates: ['金曲獎最佳國語男歌手', '香港十大中文金曲最受歡迎男歌手'],
      biography: '華語與粵語歌壇雙棲天王，以獨特的音樂詮釋能力與舞台魅力著稱。演唱風格多元，從情歌到搖滾皆能駕馭。多次獲得兩岸三地音樂獎項肯定。'
    }
  };
}

// ============================================================
// Helper Functions
// ============================================================

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhone() {
  return `09${randomInt(10, 99)}-${randomInt(100, 999)}-${randomInt(100, 999)}`;
}

function generateResume104Id() {
  return `${randomInt(10000000000, 99999999999)}`;
}

// ============================================================
// Main Seeding Logic
// ============================================================

async function seedCandidateResumes() {
  console.log('🚀 Starting candidate resume data seeding...\n');

  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  const profiles = generateCandidateProfiles();

  // Get all candidates
  const stmt = db.prepare('SELECT id, name, email, phone FROM candidates');
  const candidates = [];
  while (stmt.step()) {
    candidates.push(stmt.getAsObject());
  }
  stmt.free();

  console.log(`📋 Found ${candidates.length} candidates to update\n`);

  // Clear existing related data
  console.log('🗑️  Clearing existing candidate detail data...');
  db.run('DELETE FROM candidate_education');
  db.run('DELETE FROM candidate_experiences');
  db.run('DELETE FROM candidate_specialities');
  db.run('DELETE FROM candidate_languages');
  db.run('DELETE FROM candidate_attachments');
  db.run('DELETE FROM candidate_projects');
  db.run('DELETE FROM candidate_custom_contents');
  db.run('DELETE FROM candidate_recommenders');
  db.run('DELETE FROM candidate_apply_records');
  db.run('DELETE FROM candidate_apply_questions');

  let educationCount = 0;
  let experienceCount = 0;
  let specialityCount = 0;
  let languageCount = 0;
  let attachmentCount = 0;
  let projectCount = 0;
  let recommenderCount = 0;
  let applyRecordCount = 0;
  let applyQuestionCount = 0;

  for (const candidate of candidates) {
    const profile = profiles[candidate.id];
    if (!profile) {
      console.log(`⚠️  No profile template for ${candidate.id} (${candidate.name}), generating generic data...`);
      // Generate generic profile for candidates without predefined profile
      const genericProfile = generateGenericProfile(candidate);
      Object.assign(profile || {}, genericProfile);
      profiles[candidate.id] = genericProfile;
    }

    const p = profiles[candidate.id];
    const now = new Date().toISOString();
    const resume104Id = generateResume104Id();
    const phone = candidate.phone || generatePhone();

    console.log(`\n📝 Processing: ${candidate.name} (${candidate.id})`);

    // 1. Update candidates main table
    db.run(`
      UPDATE candidates SET
        resume_104_id = ?,
        phone = ?,
        gender = ?,
        birthday = ?,
        address = ?,
        reg_source = ?,
        employment_status = ?,
        military_status = ?,
        seniority = ?,
        introduction = ?,
        characteristic = ?,
        avatar = ?,
        expected_salary = ?,
        preferred_location = ?,
        preferred_job_name = ?,
        biography = ?,
        certificates = ?,
        skills = ?,
        education = ?,
        experience = ?,
        experience_years = ?,
        current_position = ?,
        current_company = ?,
        updated_at = ?
      WHERE id = ?
    `, [
      resume104Id,
      phone,
      p.gender,
      p.birthday + ' 00:00:00',
      p.address,
      '104主動應徵',
      '就職中',
      p.gender === '男' ? '役畢' : '',
      p.seniority,
      `<p>${p.biography.substring(0, 200)}...</p>`,
      p.skills.slice(0, 3).join(','),
      candidate.name.charAt(0),
      p.type === 'music' ? '面議' : `月薪:${randomInt(60, 150)}000`,
      randomPick(CITIES),
      p.experiences[0]?.title || '軟體工程師',
      p.biography,
      p.certificates.join('、'),
      JSON.stringify(p.skills),
      p.education[0] ? `${p.education[0].school} ${p.education[0].major}` : '',
      p.experiences[0] ? `${p.experiences[0].company} ${p.experiences[0].title}` : '',
      parseInt(p.seniority) || 3,
      p.experiences[0]?.title || '',
      p.experiences[0]?.company || '',
      now,
      candidate.id
    ]);

    // 2. Insert education records
    for (let i = 0; i < p.education.length; i++) {
      const edu = p.education[i];
      db.run(`
        INSERT INTO candidate_education (id, candidate_id, school_name, degree_level, major, degree_status, school_country, start_date, end_date, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `edu_${candidate.id}_${i}`,
        candidate.id,
        edu.school,
        edu.level,
        edu.major,
        edu.status,
        edu.school.includes('MIT') || edu.school.includes('Stanford') || edu.school.includes('UCLA') || edu.school.includes('Berkeley') || edu.school.includes('Kingston') || edu.school.includes('Anglo') ? '美國' : '台灣',
        edu.start + '-01 00:00:00',
        edu.end + '-01 00:00:00',
        i,
        now
      ]);
      educationCount++;
    }

    // 3. Insert experience records
    for (let i = 0; i < p.experiences.length; i++) {
      const exp = p.experiences[i];
      const companyInfo = COMPANIES.find(c => c.name === exp.company) || { industry: '其他', size: '100~500人' };
      db.run(`
        INSERT INTO candidate_experiences (id, candidate_id, firm_name, industry_category, company_size, work_place, job_name, job_role, job_category, start_date, end_date, job_desc, skills, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `exp_${candidate.id}_${i}`,
        candidate.id,
        exp.company,
        companyInfo.industry,
        companyInfo.size,
        randomPick(CITIES),
        exp.title,
        exp.role,
        exp.title,
        exp.start + '-01 00:00:00',
        exp.end ? exp.end + '-01 00:00:00' : null,
        `<p>${exp.desc}</p>`,
        p.skills.slice(0, 6).join(','),
        i,
        now
      ]);
      experienceCount++;
    }

    // 4. Insert specialities (skills)
    for (let i = 0; i < Math.min(p.skills.length, 5); i++) {
      const skill = p.skills[i];
      db.run(`
        INSERT INTO candidate_specialities (id, candidate_id, skill, description, tags, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        `spec_${candidate.id}_${i}`,
        candidate.id,
        skill,
        `<p>熟悉${skill}相關技術與應用</p>`,
        p.skills.slice(i, i + 3).join(','),
        i,
        now
      ]);
      specialityCount++;
    }

    // 5. Insert languages
    for (let i = 0; i < p.languages.length; i++) {
      const lang = p.languages[i];
      db.run(`
        INSERT INTO candidate_languages (id, candidate_id, lang_type, language_category, listen_degree, speak_degree, read_degree, write_degree, certificates, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `lang_${candidate.id}_${i}`,
        candidate.id,
        lang.type,
        'foreign',
        lang.listen,
        lang.speak,
        lang.read,
        lang.write,
        lang.cert || '',
        i,
        now
      ]);
      languageCount++;
    }

    // Add local language
    const localLang = randomPick(LOCAL_LANGUAGES);
    db.run(`
      INSERT INTO candidate_languages (id, candidate_id, lang_type, language_category, degree, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      `lang_${candidate.id}_local`,
      candidate.id,
      localLang.type,
      'local',
      localLang.degree,
      p.languages.length,
      now
    ]);
    languageCount++;

    // 6. Insert attachments (resume)
    db.run(`
      INSERT INTO candidate_attachments (id, candidate_id, type, title, file_name, resource_link, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      `attach_${candidate.id}_0`,
      candidate.id,
      1,
      '履歷檔案',
      `${candidate.name}_resume.pdf`,
      `https://example.com/resumes/${candidate.id}.pdf`,
      0,
      now
    ]);
    attachmentCount++;

    // 7. Insert projects (for some candidates)
    if (Math.random() > 0.3) {
      const projectTitle = p.type === 'tech' ? '技術專案' : p.type === 'music' ? '音樂作品' : '設計專案';
      db.run(`
        INSERT INTO candidate_projects (id, candidate_id, title, start_date, end_date, description, type, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `proj_${candidate.id}_0`,
        candidate.id,
        `${projectTitle}: ${p.skills[0]}應用`,
        '2023-01-01 00:00:00',
        '2023-12-01 00:00:00',
        `<p>使用${p.skills.slice(0, 3).join('、')}完成的專案</p>`,
        1,
        0,
        now
      ]);
      projectCount++;
    }

    // 8. Insert recommenders
    if (p.experiences.length > 0) {
      db.run(`
        INSERT INTO candidate_recommenders (id, candidate_id, name, corp, job_title, email, tel, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `rec_${candidate.id}_0`,
        candidate.id,
        `${randomPick(['王', '李', '陳', '張', '劉'])}${randomPick(['經理', '主管', '總監'])}`,
        p.experiences[0].company,
        '部門主管',
        `ref_${candidate.id}@example.com`,
        generatePhone(),
        0,
        now
      ]);
      recommenderCount++;
    }

    // 9. Insert apply records
    db.run(`
      INSERT INTO candidate_apply_records (id, candidate_id, apply_date, job_name, job_no, apply_source, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      `apply_${candidate.id}_0`,
      candidate.id,
      new Date().toISOString().split('T')[0],
      p.experiences[0]?.title || '軟體工程師',
      `JOB${randomInt(1000000, 9999999)}`,
      '104應徵',
      now
    ]);
    applyRecordCount++;

    // 10. Insert apply questions
    db.run(`
      INSERT INTO candidate_apply_questions (id, candidate_id, type, question, answer, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      `aq_${candidate.id}_0`,
      candidate.id,
      '3',
      '為什麼想加入我們公司？',
      `我對貴公司的${p.type === 'tech' ? '技術發展' : p.type === 'music' ? '音樂理念' : '創新文化'}非常感興趣，希望能貢獻我的${p.skills[0]}專長。`,
      0,
      now
    ]);
    applyQuestionCount++;

    db.run(`
      INSERT INTO candidate_apply_questions (id, candidate_id, type, question, answer, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      `aq_${candidate.id}_1`,
      candidate.id,
      '1',
      '是否能配合加班？',
      '是',
      1,
      now
    ]);
    applyQuestionCount++;
  }

  // Save database
  const data = db.export();
  const bufferOut = Buffer.from(data);
  fs.writeFileSync(DB_PATH, bufferOut);

  console.log('\n✅ Seeding completed!');
  console.log('─'.repeat(50));
  console.log(`📊 Summary:`);
  console.log(`   - Candidates updated: ${candidates.length}`);
  console.log(`   - Education records: ${educationCount}`);
  console.log(`   - Experience records: ${experienceCount}`);
  console.log(`   - Speciality records: ${specialityCount}`);
  console.log(`   - Language records: ${languageCount}`);
  console.log(`   - Attachment records: ${attachmentCount}`);
  console.log(`   - Project records: ${projectCount}`);
  console.log(`   - Recommender records: ${recommenderCount}`);
  console.log(`   - Apply records: ${applyRecordCount}`);
  console.log(`   - Apply questions: ${applyQuestionCount}`);
  console.log('─'.repeat(50));
}

/**
 * Generate generic profile for candidates without predefined template
 */
function generateGenericProfile(candidate) {
  const types = ['tech', 'pm', 'design', 'marketing'];
  const type = randomPick(types);
  const majors = MAJORS[type] || MAJORS.tech;

  return {
    type,
    gender: Math.random() > 0.5 ? '男' : '女',
    englishName: candidate.name,
    birthday: `${randomInt(1985, 2000)}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`,
    seniority: `${randomInt(1, 10)}年以上`,
    address: `${randomPick(CITIES)}${randomPick(['中正區', '大安區', '信義區', '中山區'])}${randomPick(['忠孝', '仁愛', '信義', '和平'])}路${randomInt(1, 500)}號`,
    education: [
      {
        school: randomPick(SCHOOLS).name,
        major: randomPick(majors),
        level: Math.random() > 0.3 ? '大學' : '碩士',
        status: '畢業',
        start: `${randomInt(2008, 2016)}-09`,
        end: `${randomInt(2012, 2020)}-06`
      }
    ],
    experiences: [
      {
        company: randomPick(COMPANIES).name,
        title: randomPick(JOB_TITLES[type] || JOB_TITLES.tech),
        role: '全職',
        start: `${randomInt(2018, 2023)}-${String(randomInt(1, 12)).padStart(2, '0')}`,
        end: null,
        desc: '負責相關業務開發與維護'
      }
    ],
    skills: (SKILLS[type] || SKILLS.tech).slice(0, randomInt(4, 8)),
    languages: [randomPick(LANGUAGES)],
    certificates: (CERTIFICATES[type] || CERTIFICATES.tech).slice(0, randomInt(0, 2)),
    biography: `具有豐富的${type === 'tech' ? '軟體開發' : type === 'design' ? '設計' : type === 'pm' ? '專案管理' : '行銷'}經驗，熱愛學習新技術，期待能在新環境中持續成長。`
  };
}

// Run
seedCandidateResumes().catch(console.error);
