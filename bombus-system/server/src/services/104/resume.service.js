/**
 * 104 Resume API 服務
 * 用於取得求職者履歷資料
 * 
 * API 規格來源: 規劃文件/Resume API/Resume_API_Usage_and_Spec_v.md
 */
const axios = require('axios');
const resumeAuthService = require('./resume-auth.service');
require('dotenv').config();

class Resume104Service {
    constructor() {
        this.baseUrl = process.env.API_104_BASE_URL || 'https://apis.104api-dev.com.tw';
    }

    /**
     * 取得履歷數量與 ID 清單
     * @param {Object} params - 查詢參數
     * @param {string} params.date - 搜尋日期 (yyyy-mm-dd)
     * @param {number} params.startTime - 起始時間 (0-24)
     * @param {number} params.endTime - 結束時間 (0-24)
     * @param {number} [params.flag] - 履歷來源 (0:配對履歷、1:主應履歷、2:儲存履歷)
     * @param {number} [params.jobNo] - 104 職缺代碼
     * @returns {Promise<Object>} { total, queryDate, idList }
     */
    async queryResumeList({ date, startTime = 0, endTime = 24, flag, jobNo }) {
        try {
            if (!date) {
                throw new Error('Date parameter (yyyy-mm-dd) is required');
            }

            const token = await resumeAuthService.getAccessToken();

            const params = { date, startTime, endTime };
            if (flag !== undefined) params.flag = flag;
            if (jobNo !== undefined) params.jobNo = jobNo;

            console.log(`📋 Querying resume list: ${JSON.stringify(params)}`);
            
            const response = await axios.get(`${this.baseUrl}/ehrweb_resume/1.0/resumes/queryList`, {
                params,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            return response.data;

        } catch (error) {
            console.error('❌ Failed to fetch resume list from 104 API:', error.response?.data || error.message);

            if (error.response?.status === 401) {
                resumeAuthService.clearToken();
                return this.queryResumeList({ date, startTime, endTime, flag, jobNo });
            }

            throw error;
        }
    }

    /**
     * 取得單筆履歷內容
     * @param {Object} params - 查詢參數
     * @param {string} params.date - 搜尋日期 (yyyy-mm-dd)
     * @param {number} params.startTime - 起始時間 (0-24)
     * @param {number} params.endTime - 結束時間 (0-24)
     * @param {string} params.idno - 履歷 ID
     * @param {number} [params.flag] - 履歷來源
     * @param {number} [params.jobNo] - 104 職缺代碼
     * @returns {Promise<Object>} 履歷詳細資料
     */
    async queryResume({ date, startTime = 0, endTime = 24, idno, flag, jobNo }) {
        try {
            if (!date || !idno) {
                throw new Error('Date and idno parameters are required');
            }

            const token = await resumeAuthService.getAccessToken();

            const params = { date, startTime, endTime, idno };
            if (flag !== undefined) params.flag = flag;
            if (jobNo !== undefined) params.jobNo = jobNo;

            console.log(`📄 Querying single resume: ${idno}`);
            
            const response = await axios.get(`${this.baseUrl}/ehrweb_resume/1.0/resumes/query`, {
                params,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            return response.data;

        } catch (error) {
            console.error('❌ Failed to fetch resume from 104 API:', error.response?.data || error.message);

            if (error.response?.status === 401) {
                resumeAuthService.clearToken();
                return this.queryResume({ date, startTime, endTime, idno, flag, jobNo });
            }

            throw error;
        }
    }

    /**
     * 批量取得履歷內容
     * @param {Object} params - 查詢參數
     * @param {string} params.date - 搜尋日期 (yyyy-mm-dd)
     * @param {number} params.startTime - 起始時間 (0-24)
     * @param {number} params.endTime - 結束時間 (0-24)
     * @param {string} params.idnos - 履歷 ID 清單，逗號分隔 (最多 10 個)
     * @param {number} [params.flag] - 履歷來源
     * @param {number} [params.jobNo] - 104 職缺代碼
     * @returns {Promise<Object>} 履歷詳細資料列表
     */
    async queryBatch({ date, startTime = 0, endTime = 24, idnos, flag, jobNo }) {
        try {
            if (!date || !idnos) {
                throw new Error('Date and idnos parameters are required');
            }

            const token = await resumeAuthService.getAccessToken();

            const params = { date, startTime, endTime, idnos };
            if (flag !== undefined) params.flag = flag;
            if (jobNo !== undefined) params.jobNo = jobNo;

            console.log(`📚 Querying batch resumes: ${idnos}`);
            
            const response = await axios.get(`${this.baseUrl}/ehrweb_resume/1.0/resumes/queryBatch`, {
                params,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            return response.data;

        } catch (error) {
            console.error('❌ Failed to fetch batch resumes from 104 API:', error.response?.data || error.message);

            if (error.response?.status === 401) {
                resumeAuthService.clearToken();
                return this.queryBatch({ date, startTime, endTime, idnos, flag, jobNo });
            }

            throw error;
        }
    }

    /**
     * 將 104 Resume API 回傳的履歷資料映射為系統候選人格式 (完整版)
     * 對應所有 104 Resume API 欄位
     * @param {Object} resume104 - 104 API 回傳的履歷物件
     * @returns {Object} 映射後的候選人資料 (含關聯資料)
     */
    mapResumeToCandidate(resume104) {
        // 取得最近一份工作經歷
        const latestExperience = resume104.experiences?.[0] || {};
        
        // 取得最高學歷
        const highestEducation = resume104.education?.[0] || {};
        const educationStr = highestEducation.schoolName 
            ? `${highestEducation.schoolName} ${highestEducation.major || ''}`.trim()
            : '';
        
        // 彙總技能清單
        const skills = this.extractSkills(resume104);
        
        // 求職條件
        const jobReq = resume104.jobRequirement || {};
        
        return {
            // =====================================================
            // 主表欄位 - 基本資料
            // =====================================================
            resume104Id: resume104.resumeId || '',
            name: resume104.fullName || '',
            nameEn: resume104.englishName || '',
            gender: resume104.gender || '',
            email: resume104.email || '',
            phone: resume104.cellPhone || '',
            subPhone: resume104.subCellPhone || '',
            tel: resume104.tel || '',
            contactInfo: resume104.contactInfo || '',
            address: resume104.address || '',
            birthday: resume104.birthday || '',
            regSource: resume104.regSource || '',
            employmentStatus: resume104.employmentStatus || '',
            militaryStatus: resume104.militaryStatus || '',
            militaryRetireDate: resume104.militaryRetireDate || '',
            introduction: resume104.introduction || '',
            motto: resume104.motto || '',
            characteristic: resume104.characteristic || '',
            personalPage: resume104.personalPage || [],
            drivingLicenses: resume104.drivingLicenses || '',
            transports: resume104.transports || '',
            specialIdentities: resume104.specialIdentities || '',
            nationality: resume104.nationality || '',
            disabledTypes: resume104.disabledTypes || '',
            disabilityCard: resume104.disabilityCard || 0,
            assistiveDevices: resume104.assistiveDevices || '',
            avatar: resume104.headshotUrl || '',
            seniority: resume104.seniority || '',
            
            // =====================================================
            // 主表欄位 - 求職條件
            // =====================================================
            jobCharacteristic: jobReq.jobCharacteristic || '',
            workInterval: jobReq.workInterval || '',
            otherWorkInterval: jobReq.otherWorkInterval || '',
            shiftWork: jobReq.shiftWork ? 1 : 0,
            startDateOpt: jobReq.startDateOpt || '',
            expectedSalary: jobReq.wage || '',
            preferredLocation: jobReq.workPlace || '',
            remoteWork: jobReq.remoteWork || '',
            preferredJobName: jobReq.jobName || '',
            preferredJobCategory: jobReq.jobCategory || '',
            preferredIndustry: jobReq.industryCategory || '',
            workDesc: jobReq.workDesc || '',
            
            // =====================================================
            // 主表欄位 - 自傳
            // =====================================================
            biography: resume104.biography?.bio || '',
            biographyEn: resume104.biography?.engBio || '',
            
            // =====================================================
            // 主表欄位 - 證照
            // =====================================================
            certificates: resume104.commonCertificates?.certificates || '',
            otherCertificates: resume104.commonCertificates?.otherCertificates || '',
            
            // =====================================================
            // 主表欄位 - 計算欄位 (摘要)
            // =====================================================
            currentPosition: latestExperience.jobName || '',
            currentCompany: latestExperience.firmName || '',
            location: jobReq.workPlace || resume104.address || '',
            education: educationStr,
            experience: latestExperience.jobDesc || '',
            experienceYears: this.parseSeniority(resume104.seniority),
            skills: skills,
            
            // 應徵相關
            applyDate: resume104.applyJob?.[0]?.applyDate || new Date().toISOString().split('T')[0],
            applyJobNo: resume104.applyJob?.[0]?.jobNo || '',
            applySource: resume104.regSource || '104主動應徵',
            
            // =====================================================
            // 關聯資料 - 學歷列表
            // =====================================================
            educationList: (resume104.education || []).map((edu, idx) => ({
                schoolName: edu.schoolName || '',
                degreeLevel: edu.degreeLevel || '',
                major: edu.major || '',
                majorCategory: edu.majorCategory || '',
                degreeStatus: edu.degreeStatus || '',
                schoolCountry: edu.schoolCountry || '',
                startDate: edu.startDate || '',
                endDate: edu.endDate || '',
                sortOrder: idx
            })),
            
            // =====================================================
            // 關聯資料 - 工作經歷列表
            // =====================================================
            experienceList: (resume104.experiences || []).map((exp, idx) => ({
                firmName: exp.firmName || '',
                industryCategory: exp.industryCategory || '',
                companySize: exp.companySize || '',
                workPlace: exp.workPlace || '',
                jobName: exp.jobName || '',
                jobRole: exp.jobRole || '',
                jobCategory: exp.jobCategory || '',
                startDate: exp.startDate || '',
                endDate: exp.endDate || '',
                jobDesc: exp.jobDesc || '',
                skills: exp.skills || '',
                management: exp.management || '',
                wageTypeDesc: exp.wageTypeDesc || '',
                wage: exp.wage || 0,
                wageYear: exp.wageYear || 0,
                sortOrder: idx
            })),
            
            // =====================================================
            // 關聯資料 - 技能專長列表
            // =====================================================
            specialityList: (resume104.speciality || []).map((spec, idx) => ({
                skill: spec.skill || '',
                description: spec.desc || '',
                tags: spec.tag || '',
                sortOrder: idx
            })),
            
            // =====================================================
            // 關聯資料 - 語言能力列表 (外語 + 方言)
            // =====================================================
            languageList: [
                ...(resume104.foreignLanguage || []).map((lang, idx) => ({
                    langType: lang.langType || '',
                    languageCategory: 'foreign',
                    listenDegree: lang.listenDegree || '',
                    speakDegree: lang.speakDegree || '',
                    readDegree: lang.readDegree || '',
                    writeDegree: lang.writeDegree || '',
                    certificates: lang.certificates || '',
                    sortOrder: idx
                })),
                ...(resume104.localLanguage || []).map((lang, idx) => ({
                    langType: lang.langType || '',
                    languageCategory: 'local',
                    degree: lang.degree || '',
                    sortOrder: 100 + idx
                }))
            ],
            
            // =====================================================
            // 關聯資料 - 附件列表
            // =====================================================
            attachmentList: (resume104.attachFiles || []).map((file, idx) => ({
                type: file.type || 0,
                title: file.title || '',
                fileName: file.fileName || '',
                resourceLink: file.resourceLink || '',
                website: file.website || '',
                sortOrder: idx
            })),
            
            // =====================================================
            // 關聯資料 - 專案作品列表
            // =====================================================
            projectList: (resume104.projectDatas || []).map((proj, idx) => ({
                title: proj.title || '',
                startDate: proj.startDate || '',
                endDate: proj.endDate || '',
                description: proj.description || '',
                type: proj.type || 0,
                resourceLink: proj.resourceLink || '',
                website: proj.website || '',
                sortOrder: idx
            })),
            
            // =====================================================
            // 關聯資料 - 自訂內容列表
            // =====================================================
            customContentList: (resume104.customContentDatas || []).map((content, idx) => ({
                title: content.title || '',
                content: JSON.stringify(content.content || []),
                sortOrder: idx
            })),
            
            // =====================================================
            // 關聯資料 - 推薦人列表
            // =====================================================
            recommenderList: (resume104.recommenders || []).map((rec, idx) => ({
                name: rec.name || '',
                corp: rec.corp || '',
                jobTitle: rec.jobTitle || '',
                email: rec.email || '',
                tel: rec.tel || '',
                sortOrder: idx
            })),
            
            // =====================================================
            // 關聯資料 - 應徵紀錄列表
            // =====================================================
            applyRecordList: (resume104.applyJob || []).map(apply => ({
                applyDate: apply.applyDate || '',
                jobName: apply.name || '',
                jobNo: apply.jobNo || '',
                applySource: apply.applySource || ''
            })),
            
            // =====================================================
            // 關聯資料 - 應徵問答列表
            // =====================================================
            applyQuestionList: (resume104.applyQuestion || []).map((q, idx) => ({
                type: q.type || '',
                question: q.question || '',
                answer: q.answer || '',
                sortOrder: idx
            }))
        };
    }

    /**
     * 從履歷中提取所有技能
     * @param {Object} resume104 - 104 履歷
     * @returns {Array} 技能清單 (去重)
     */
    extractSkills(resume104) {
        const skills = [];
        
        // 從專長中提取
        if (resume104.speciality) {
            resume104.speciality.forEach(s => {
                if (s.skill) skills.push(s.skill);
                if (s.tag) {
                    const tags = s.tag.split(',').map(t => t.trim()).filter(t => t);
                    skills.push(...tags);
                }
            });
        }
        
        // 從工作經歷中提取
        if (resume104.experiences) {
            resume104.experiences.forEach(exp => {
                if (exp.skills) {
                    const expSkills = exp.skills.split(',').map(s => s.trim()).filter(s => s);
                    skills.push(...expSkills);
                }
            });
        }
        
        return [...new Set(skills)]; // 去重
    }

    /**
     * 解析年資字串為數字
     * @param {string} seniority - 年資描述 (e.g., "3年以上", "1年(含)以下")
     * @returns {number} 年資數字
     */
    parseSeniority(seniority) {
        if (!seniority) return 0;
        
        const match = seniority.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    }

    /**
     * 批量映射履歷資料
     * @param {Array} resumes104 - 104 API 回傳的履歷列表
     * @returns {Array} 映射後的候選人列表
     */
    mapResumesToCandidates(resumes104) {
        if (!Array.isArray(resumes104)) return [];
        return resumes104.map(resume => this.mapResumeToCandidate(resume));
    }
}

module.exports = new Resume104Service();
