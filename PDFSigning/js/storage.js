/**
 * localStorage 資料管理模組
 * 模擬後端資料庫功能
 */

const Storage = {
    // 儲存模板
    saveTemplate: function(template) {
        const templates = this.getTemplates();
        const index = templates.findIndex(t => t.id === template.id);
        
        if (index >= 0) {
            templates[index] = template;
        } else {
            templates.push(template);
        }
        
        localStorage.setItem('templates', JSON.stringify(templates));
        return template;
    },

    // 取得所有模板
    getTemplates: function() {
        const data = localStorage.getItem('templates');
        return data ? JSON.parse(data) : [];
    },

    // 根據 ID 取得模板
    getTemplate: function(id) {
        const templates = this.getTemplates();
        return templates.find(t => t.id === id);
    },

    // 刪除模板
    deleteTemplate: function(id) {
        const templates = this.getTemplates();
        const filtered = templates.filter(t => t.id !== id);
        localStorage.setItem('templates', JSON.stringify(filtered));
    },

    // 儲存提交資料
    saveSubmission: function(submission) {
        const submissions = this.getSubmissions();
        const index = submissions.findIndex(s => s.id === submission.id);
        
        if (index >= 0) {
            submissions[index] = submission;
        } else {
            submissions.push(submission);
        }
        
        localStorage.setItem('submissions', JSON.stringify(submissions));
        return submission;
    },

    // 取得所有提交
    getSubmissions: function() {
        const data = localStorage.getItem('submissions');
        return data ? JSON.parse(data) : [];
    },

    // 根據 ID 取得提交
    getSubmission: function(id) {
        const submissions = this.getSubmissions();
        return submissions.find(s => s.id === id);
    },

    // 根據 token 取得提交
    getSubmissionByToken: function(token) {
        const submissions = this.getSubmissions();
        return submissions.find(s => s.token === token);
    },

    // 生成 UUID（簡易版）
    generateId: function() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
};

