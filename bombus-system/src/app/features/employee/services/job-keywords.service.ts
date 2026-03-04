import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map, catchError } from 'rxjs';
import {
    JobKeywordsConfig,
    EvaluationDimension,
    KeywordConfig,
    EvaluationTemplate,
    KeywordMatch,
    DEFAULT_DIMENSIONS,
    DEFAULT_POSITIVE_KEYWORDS,
    DEFAULT_NEGATIVE_KEYWORDS
} from '../models/job-keywords.model';

/**
 * 職缺關鍵字管理服務
 * 提供評估維度、關鍵字庫、評估範本的 CRUD 操作
 */
@Injectable({
    providedIn: 'root'
})
export class JobKeywordsService {
    private http = inject(HttpClient);
    private apiUrl = '/api/recruitment';

    // ============================================================
    // Mock Data (Demo 用)
    // ============================================================

    private mockTemplates: EvaluationTemplate[] = [
        {
            id: 'tpl-1',
            name: '軟體工程師標準評估',
            description: '適用於前端、後端、全端工程師職位',
            dimensions: DEFAULT_DIMENSIONS,
            keywords: this.generateMockKeywords('tpl-1'),
            source: 'manual',
            createdAt: '2025-01-15T10:00:00Z'
        },
        {
            id: 'tpl-2',
            name: '專案經理評估範本',
            description: '適用於PM、PMO職位，著重溝通與管理能力',
            dimensions: [
                { id: 'dim-pm-1', name: '專案管理', weight: 30, order: 1 },
                { id: 'dim-pm-2', name: '溝通協調', weight: 25, order: 2 },
                { id: 'dim-pm-3', name: '風險管理', weight: 20, order: 3 },
                { id: 'dim-pm-4', name: '團隊領導', weight: 15, order: 4 },
                { id: 'dim-pm-5', name: '問題解決', weight: 10, order: 5 }
            ],
            keywords: [],
            source: 'manual',
            createdAt: '2025-01-10T10:00:00Z'
        },
        {
            id: 'tpl-3',
            name: '高績效員工範本 - 王小明',
            description: '從高績效員工王小明的面試記錄中匯入',
            dimensions: DEFAULT_DIMENSIONS,
            keywords: [],
            source: 'imported',
            sourceEmployeeId: 'emp-001',
            sourceEmployeeName: '王小明',
            createdAt: '2025-01-05T10:00:00Z'
        }
    ];

    private mockJobConfigs: Record<string, JobKeywordsConfig> = {};

    // ============================================================
    // Public API Methods
    // ============================================================

    /**
     * 取得職缺的關鍵字配置
     */
    getJobKeywords(jobId: string): Observable<JobKeywordsConfig> {
        // 先檢查是否有已儲存的配置
        if (this.mockJobConfigs[jobId]) {
            return of(this.mockJobConfigs[jobId]).pipe(delay(200));
        }

        // 回傳預設配置
        const defaultConfig: JobKeywordsConfig = {
            jobId,
            dimensions: [...DEFAULT_DIMENSIONS],
            keywords: this.generateDefaultKeywords(jobId),
            updatedAt: new Date().toISOString()
        };

        return of(defaultConfig).pipe(delay(300));
    }

    /**
     * 儲存職缺的關鍵字配置
     */
    saveJobKeywords(config: JobKeywordsConfig): Observable<void> {
        // Mock: 儲存到記憶體
        this.mockJobConfigs[config.jobId] = {
            ...config,
            updatedAt: new Date().toISOString()
        };

        return of(undefined).pipe(delay(500));
    }

    /**
     * 取得預設評估維度列表
     */
    getDimensions(): Observable<EvaluationDimension[]> {
        return of([...DEFAULT_DIMENSIONS]).pipe(delay(100));
    }

    /**
     * 取得所有評估範本
     */
    getTemplates(): Observable<EvaluationTemplate[]> {
        return of(this.mockTemplates).pipe(delay(200));
    }

    /**
     * 取得單一評估範本
     */
    getTemplate(templateId: string): Observable<EvaluationTemplate | null> {
        const template = this.mockTemplates.find(t => t.id === templateId);
        return of(template || null).pipe(delay(100));
    }

    /**
     * 套用範本到職缺
     */
    applyTemplate(jobId: string, templateId: string): Observable<JobKeywordsConfig> {
        const template = this.mockTemplates.find(t => t.id === templateId);

        if (!template) {
            throw new Error('Template not found');
        }

        const config: JobKeywordsConfig = {
            jobId,
            dimensions: [...template.dimensions],
            keywords: template.keywords.map((k, i) => ({
                ...k,
                id: `kw-${jobId}-${i}`,
                jobId
            })),
            templateId: template.id,
            templateName: template.name,
            updatedAt: new Date().toISOString()
        };

        this.mockJobConfigs[jobId] = config;
        return of(config).pipe(delay(300));
    }

    /**
     * 從高績效員工匯入關鍵字
     * (Mock: 產生模擬資料)
     */
    importFromEmployee(jobId: string, employeeId: string): Observable<KeywordConfig[]> {
        // Mock: 根據員工 ID 產生不同的關鍵字
        const importedKeywords: KeywordConfig[] = [
            { id: `imp-1`, jobId, dimensionId: 'dim-1', keyword: '專案經驗豐富', type: 'positive', weight: 8, createdAt: new Date().toISOString() },
            { id: `imp-2`, jobId, dimensionId: 'dim-1', keyword: '技術深度', type: 'positive', weight: 9, createdAt: new Date().toISOString() },
            { id: `imp-3`, jobId, dimensionId: 'dim-2', keyword: '表達清晰', type: 'positive', weight: 7, createdAt: new Date().toISOString() },
            { id: `imp-4`, jobId, dimensionId: 'dim-3', keyword: '主動溝通', type: 'positive', weight: 8, createdAt: new Date().toISOString() },
            { id: `imp-5`, jobId, dimensionId: 'dim-4', keyword: '邏輯清晰', type: 'positive', weight: 8, createdAt: new Date().toISOString() },
            { id: `imp-6`, jobId, dimensionId: 'dim-5', keyword: '持續學習', type: 'positive', weight: 7, createdAt: new Date().toISOString() }
        ];

        return of(importedKeywords).pipe(delay(500));
    }

    /**
     * 新增單一關鍵字
     */
    addKeyword(jobId: string, keyword: Omit<KeywordConfig, 'id' | 'jobId' | 'createdAt'>): Observable<KeywordConfig> {
        const newKeyword: KeywordConfig = {
            ...keyword,
            id: `kw-${Date.now()}`,
            jobId,
            createdAt: new Date().toISOString()
        };

        return of(newKeyword).pipe(delay(200));
    }

    /**
     * 批量新增關鍵字
     */
    addKeywordsBatch(jobId: string, keywords: string[], dimensionId: string, type: 'positive' | 'negative', weight: number): Observable<KeywordConfig[]> {
        const newKeywords: KeywordConfig[] = keywords.map((kw, i) => ({
            id: `kw-${Date.now()}-${i}`,
            jobId,
            dimensionId,
            keyword: kw.trim(),
            type,
            weight,
            createdAt: new Date().toISOString()
        }));

        return of(newKeywords).pipe(delay(300));
    }

    /**
     * 刪除關鍵字
     */
    deleteKeyword(keywordId: string): Observable<void> {
        return of(undefined).pipe(delay(100));
    }

    // ============================================================
    // Keyword Analysis Methods
    // ============================================================

    /**
     * 分析文本中的關鍵字匹配
     */
    analyzeKeywords(text: string, config: JobKeywordsConfig): KeywordMatch[] {
        const matches: KeywordMatch[] = [];

        config.keywords.forEach(kw => {
            // 建立正則表達式（包含同義詞）
            const searchTerms = [kw.keyword, ...(kw.synonyms || [])];
            const pattern = new RegExp(`(${searchTerms.join('|')})`, 'gi');
            const foundMatches = text.match(pattern);

            if (foundMatches && foundMatches.length > 0) {
                const dimension = config.dimensions.find(d => d.id === kw.dimensionId);

                matches.push({
                    keywordId: kw.id,
                    keyword: kw.keyword,
                    type: kw.type,
                    dimensionId: kw.dimensionId,
                    dimensionName: dimension?.name || '未分類',
                    weight: kw.weight,
                    matchCount: foundMatches.length,
                    contexts: this.extractContexts(text, kw.keyword)
                });
            }
        });

        return matches;
    }

    /**
     * 計算關鍵字分數
     */
    calculateKeywordScore(matches: KeywordMatch[]): number {
        let score = 50; // 基礎分數

        matches.forEach(match => {
            const impact = match.weight * match.matchCount;
            if (match.type === 'positive') {
                score += impact;
            } else {
                score -= impact;
            }
        });

        // 限制在 0-100 範圍
        return Math.max(0, Math.min(100, score));
    }

    /**
     * 取得預設正向關鍵字
     */
    getDefaultPositiveKeywords(): string[] {
        return [...DEFAULT_POSITIVE_KEYWORDS];
    }

    /**
     * 取得預設負向關鍵字
     */
    getDefaultNegativeKeywords(): string[] {
        return [...DEFAULT_NEGATIVE_KEYWORDS];
    }

    // ============================================================
    // Private Helper Methods
    // ============================================================

    private generateDefaultKeywords(jobId: string): KeywordConfig[] {
        const keywords: KeywordConfig[] = [];
        const now = new Date().toISOString();

        // 正向關鍵字
        DEFAULT_POSITIVE_KEYWORDS.slice(0, 10).forEach((kw, i) => {
            keywords.push({
                id: `kw-${jobId}-pos-${i}`,
                jobId,
                dimensionId: DEFAULT_DIMENSIONS[i % DEFAULT_DIMENSIONS.length].id,
                keyword: kw,
                type: 'positive',
                weight: 5,
                createdAt: now
            });
        });

        // 負向關鍵字
        DEFAULT_NEGATIVE_KEYWORDS.slice(0, 5).forEach((kw, i) => {
            keywords.push({
                id: `kw-${jobId}-neg-${i}`,
                jobId,
                dimensionId: DEFAULT_DIMENSIONS[0].id,
                keyword: kw,
                type: 'negative',
                weight: 3,
                createdAt: now
            });
        });

        return keywords;
    }

    private generateMockKeywords(templateIdOrJobId: string): Omit<KeywordConfig, 'jobId'>[] {
        const keywords: Omit<KeywordConfig, 'jobId'>[] = [];
        const now = new Date().toISOString();

        // 工程師相關正向關鍵字
        const engineerKeywords = [
            { keyword: 'React', dimension: 'dim-1', weight: 8 },
            { keyword: 'Angular', dimension: 'dim-1', weight: 8 },
            { keyword: 'TypeScript', dimension: 'dim-1', weight: 7 },
            { keyword: '架構設計', dimension: 'dim-1', weight: 9 },
            { keyword: '效能優化', dimension: 'dim-1', weight: 8 },
            { keyword: 'Code Review', dimension: 'dim-3', weight: 6 },
            { keyword: '敏捷開發', dimension: 'dim-3', weight: 7 },
            { keyword: '問題分析', dimension: 'dim-4', weight: 8 }
        ];

        engineerKeywords.forEach((kw, i) => {
            keywords.push({
                id: `tpl-kw-${i}`,
                dimensionId: kw.dimension,
                keyword: kw.keyword,
                type: 'positive',
                weight: kw.weight,
                createdAt: now
            });
        });

        return keywords;
    }

    private extractContexts(text: string, keyword: string, contextLength: number = 50): string[] {
        const contexts: string[] = [];
        const lowerText = text.toLowerCase();
        const lowerKeyword = keyword.toLowerCase();
        let pos = 0;

        while ((pos = lowerText.indexOf(lowerKeyword, pos)) !== -1) {
            const start = Math.max(0, pos - contextLength);
            const end = Math.min(text.length, pos + keyword.length + contextLength);
            contexts.push('...' + text.substring(start, end) + '...');
            pos += keyword.length;
        }

        return contexts.slice(0, 3); // 最多回傳 3 個上下文
    }
}
