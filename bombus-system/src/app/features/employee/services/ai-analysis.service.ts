import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, of, delay, map, forkJoin, catchError } from 'rxjs';
import { JobKeywordsService } from './job-keywords.service';
import {
    JobKeywordsConfig,
    KeywordMatch,
    EvaluationDimension
} from '../models/job-keywords.model';

// ============================================================
// AI 分析相關介面定義
// ============================================================

/**
 * 關鍵字分析結果
 */
export interface KeywordAnalysis {
    score: number;                    // 關鍵字分數 0-100
    matches: KeywordMatch[];          // 匹配的關鍵字列表
    positiveCount: number;            // 正向關鍵字數量
    negativeCount: number;            // 負向關鍵字數量
    dimensionBreakdown: DimensionScore[];  // 各維度分數明細
}

/**
 * 維度分數明細
 */
export interface DimensionScore {
    dimensionId: string;
    dimensionName: string;
    weight: number;                   // 維度權重
    score: number;                    // 該維度分數 0-100
    matchedKeywords: string[];        // 該維度匹配的關鍵字
}

/**
 * 語意分析結果
 */
export interface SemanticAnalysis {
    score: number;                    // 語意分數 0-100
    insights: SemanticInsight[];      // 語意洞察列表
    communicationStyle: string;       // 溝通風格描述
    confidence: number;               // 分析信心度 0-100
}

/**
 * 語意洞察項目
 */
export interface SemanticInsight {
    type: 'strength' | 'concern' | 'neutral';  // 類型
    category: string;                 // 類別（如「自信程度」、「邏輯表達」）
    description: string;              // 描述
    evidence: string[];               // 支持證據（引用文字）
}

/**
 * JD 適配度結果
 */
export interface JDMatchResult {
    score: number;                    // 適配度分數 0-100
    matchedRequirements: JDRequirementMatch[];  // 匹配的職缺需求
    missingSkills: string[];          // 缺少的技能
    bonusSkills: string[];            // 額外加分技能
}

/**
 * JD 需求匹配項
 */
export interface JDRequirementMatch {
    requirement: string;              // 職缺需求
    matched: boolean;                 // 是否匹配
    evidence?: string;                // 匹配證據
    weight: number;                   // 權重
}

/**
 * 錄用建議類型
 */
export type HireRecommendation =
    | 'strongly_recommended'     // ≥85 強烈推薦
    | 'recommended'              // ≥70 推薦
    | 'on_hold'                  // ≥55 待觀察
    | 'not_recommended';         // <55 不推薦

/**
 * 錄用建議詳細資訊
 */
export interface HireRecommendationDetail {
    level: HireRecommendation;
    label: string;                    // 中文標籤
    description: string;              // 詳細說明
    color: string;                    // 顯示顏色
    icon: string;                     // 圖示類別
}

/**
 * AI 完整分析結果
 */
export interface AIAnalysisResult {
    candidateId: string;
    jobId: string;
    analyzedAt: string;

    // 關鍵字分析 (40%)
    keywordAnalysis: KeywordAnalysis;

    // 語意分析 (30%)
    semanticAnalysis: SemanticAnalysis;

    // JD 適配度 (30%)
    jdMatchResult: JDMatchResult;

    // 綜合評分
    overallScore: number;             // 加權總分 0-100
    recommendation: HireRecommendationDetail;

    // 分數明細
    scoreBreakdown: {
        keywordScore: number;         // 關鍵字分數
        keywordWeight: number;        // 關鍵字權重 40%
        semanticScore: number;        // 語意分數
        semanticWeight: number;       // 語意權重 30%
        jdMatchScore: number;         // 適配度分數
        jdMatchWeight: number;        // 適配度權重 30%
    };
}

// ============================================================
// AI 分析服務
// ============================================================

/**
 * AI 分析服務
 * 提供面試評估的 AI 量化分析功能
 * 
 * 評分權重：
 * - 關鍵字匹配：40%
 * - 語意分析：30%
 * - JD 適配度：30%
 * 
 * 錄用建議門檻：
 * - ≥85：強烈推薦
 * - ≥70：推薦
 * - ≥55：待觀察
 * - <55：不推薦
 */
@Injectable({
    providedIn: 'root'
})
export class AIAnalysisService {
    private jobKeywordsService = inject(JobKeywordsService);

    // 權重配置
    private readonly KEYWORD_WEIGHT = 0.4;      // 40%
    private readonly SEMANTIC_WEIGHT = 0.3;     // 30%
    private readonly JD_MATCH_WEIGHT = 0.3;     // 30%

    // 錄用建議門檻
    private readonly THRESHOLD_STRONGLY_RECOMMENDED = 85;
    private readonly THRESHOLD_RECOMMENDED = 70;
    private readonly THRESHOLD_ON_HOLD = 55;

    // ============================================================
    // 主要分析方法
    // ============================================================

    /**
     * 執行完整 AI 分析
     * @param candidateId 候選人 ID
     * @param jobId 職缺 ID
     * @param transcript 面試逐字稿文字
     * @param candidateSkills 候選人技能列表
     * @param jdRequirements JD 職缺需求列表
     */
    runFullAnalysis(
        candidateId: string,
        jobId: string,
        transcript: string,
        candidateSkills: string[],
        jdRequirements: string[]
    ): Observable<AIAnalysisResult> {
        return this.jobKeywordsService.getJobKeywords(jobId).pipe(
            map(config => {
                // 1. 關鍵字分析
                const keywordAnalysis = this.analyzeKeywords(transcript, config);

                // 2. 語意分析
                const semanticAnalysis = this.analyzeSemantics(transcript);

                // 3. JD 適配度
                const jdMatchResult = this.calculateJDMatch(candidateSkills, jdRequirements);

                // 4. 計算綜合評分
                const overallScore = this.calculateOverallScore(
                    keywordAnalysis.score,
                    semanticAnalysis.score,
                    jdMatchResult.score
                );

                // 5. 生成錄用建議
                const recommendation = this.generateRecommendation(overallScore);

                return {
                    candidateId,
                    jobId,
                    analyzedAt: new Date().toISOString(),
                    keywordAnalysis,
                    semanticAnalysis,
                    jdMatchResult,
                    overallScore,
                    recommendation,
                    scoreBreakdown: {
                        keywordScore: keywordAnalysis.score,
                        keywordWeight: this.KEYWORD_WEIGHT * 100,
                        semanticScore: semanticAnalysis.score,
                        semanticWeight: this.SEMANTIC_WEIGHT * 100,
                        jdMatchScore: jdMatchResult.score,
                        jdMatchWeight: this.JD_MATCH_WEIGHT * 100
                    }
                };
            }),
            delay(1500), // 模擬 AI 處理時間
            catchError(err => {
                console.error('AI Analysis Error:', err);
                throw new Error('AI 分析失敗，請稍後再試');
            })
        );
    }

    // ============================================================
    // 關鍵字分析
    // ============================================================

    /**
     * 分析逐字稿中的關鍵字匹配
     */
    analyzeKeywords(transcript: string, config: JobKeywordsConfig): KeywordAnalysis {
        // 使用 JobKeywordsService 的分析方法
        const matches = this.jobKeywordsService.analyzeKeywords(transcript, config);

        // 統計正向/負向關鍵字
        const positiveMatches = matches.filter(m => m.type === 'positive');
        const negativeMatches = matches.filter(m => m.type === 'negative');

        // 計算關鍵字分數
        const score = this.jobKeywordsService.calculateKeywordScore(matches);

        // 計算各維度分數明細
        const dimensionBreakdown = this.calculateDimensionScores(matches, config.dimensions);

        return {
            score,
            matches,
            positiveCount: positiveMatches.length,
            negativeCount: negativeMatches.length,
            dimensionBreakdown
        };
    }

    /**
     * 計算各維度的分數明細
     */
    private calculateDimensionScores(
        matches: KeywordMatch[],
        dimensions: EvaluationDimension[]
    ): DimensionScore[] {
        return dimensions.map(dim => {
            const dimMatches = matches.filter(m => m.dimensionId === dim.id);
            const positiveImpact = dimMatches
                .filter(m => m.type === 'positive')
                .reduce((sum, m) => sum + m.weight * m.matchCount, 0);
            const negativeImpact = dimMatches
                .filter(m => m.type === 'negative')
                .reduce((sum, m) => sum + m.weight * m.matchCount, 0);

            // 基礎分 50，根據匹配調整
            const rawScore = 50 + positiveImpact * 2 - negativeImpact * 2;
            const score = Math.max(0, Math.min(100, rawScore));

            return {
                dimensionId: dim.id,
                dimensionName: dim.name,
                weight: dim.weight,
                score,
                matchedKeywords: dimMatches.map(m => m.keyword)
            };
        });
    }

    // ============================================================
    // 語意分析 (Mock 實作)
    // ============================================================

    /**
     * 分析逐字稿的語意特徵
     * 注意：目前為前端 Mock 實作，待未來串接真實 AI API
     */
    analyzeSemantics(transcript: string): SemanticAnalysis {
        const insights: SemanticInsight[] = [];
        const lowerTranscript = transcript.toLowerCase();

        // Mock: 基於簡單規則分析

        // 1. 自信程度分析
        const confidentPhrases = ['我擅長', '我成功', '我主導', '我負責', '成功提升', '達成目標'];
        const hesitantPhrases = ['我可能', '我不確定', '我覺得', '可能吧', '大概'];

        const confidentCount = confidentPhrases.filter(p => transcript.includes(p)).length;
        const hesitantCount = hesitantPhrases.filter(p => transcript.includes(p)).length;

        if (confidentCount > hesitantCount) {
            insights.push({
                type: 'strength',
                category: '自信程度',
                description: '候選人表達自信，能清楚說明個人成就與貢獻',
                evidence: confidentPhrases.filter(p => transcript.includes(p))
            });
        } else if (hesitantCount > 1) {
            insights.push({
                type: 'concern',
                category: '自信程度',
                description: '候選人表達較為保守，可能需要更多自信',
                evidence: hesitantPhrases.filter(p => transcript.includes(p))
            });
        }

        // 2. 團隊合作意識
        const teamPhrases = ['團隊', '合作', '協作', '一起', '我們', '跨部門'];
        const teamCount = teamPhrases.filter(p => transcript.includes(p)).length;

        if (teamCount >= 2) {
            insights.push({
                type: 'strength',
                category: '團隊合作',
                description: '候選人展現良好的團隊合作意識',
                evidence: teamPhrases.filter(p => transcript.includes(p))
            });
        }

        // 3. 成就導向
        const achievementPhrases = ['提升', '改善', '達成', '完成', '成功', '貢獻'];
        const achievementCount = achievementPhrases.filter(p => transcript.includes(p)).length;

        if (achievementCount >= 2) {
            insights.push({
                type: 'strength',
                category: '成就導向',
                description: '候選人著重量化成果與具體貢獻',
                evidence: achievementPhrases.filter(p => transcript.includes(p))
            });
        }

        // 4. 學習態度
        const learningPhrases = ['學習', '成長', '挑戰', '新的', '進修', '研究'];
        const learningCount = learningPhrases.filter(p => transcript.includes(p)).length;

        if (learningCount >= 1) {
            insights.push({
                type: 'strength',
                category: '學習潛力',
                description: '候選人展現持續學習與成長的態度',
                evidence: learningPhrases.filter(p => transcript.includes(p))
            });
        }

        // 計算語意分數
        const strengthCount = insights.filter(i => i.type === 'strength').length;
        const concernCount = insights.filter(i => i.type === 'concern').length;

        // 基礎分 60，每個 strength +10，每個 concern -10
        const baseScore = 60;
        const adjustedScore = baseScore + (strengthCount * 10) - (concernCount * 10);
        const score = Math.max(0, Math.min(100, adjustedScore));

        // 判斷溝通風格
        let communicationStyle = '中性平穩';
        if (confidentCount >= 3 && achievementCount >= 2) {
            communicationStyle = '自信積極型';
        } else if (teamCount >= 3) {
            communicationStyle = '團隊協作型';
        } else if (learningCount >= 2) {
            communicationStyle = '學習成長型';
        }

        return {
            score,
            insights,
            communicationStyle,
            confidence: 75 // Mock 信心度
        };
    }

    // ============================================================
    // JD 適配度評分
    // ============================================================

    /**
     * 計算候選人技能與職缺需求的適配度
     */
    calculateJDMatch(candidateSkills: string[], jdRequirements: string[]): JDMatchResult {
        const matchedRequirements: JDRequirementMatch[] = [];
        const matchedSkills: string[] = [];
        const missingSkills: string[] = [];

        // 遍歷每個職缺需求，檢查是否匹配
        jdRequirements.forEach((req, index) => {
            if (!req) return; // Skip if req is empty/undefined

            const reqLower = req.toLowerCase();
            const matched = candidateSkills.some(skill => {
                if (!skill) return false; // Skip if skill is empty/undefined
                const skillLower = skill.toLowerCase();
                // 模糊匹配：包含關係
                return reqLower.includes(skillLower) || skillLower.includes(reqLower);
            });

            matchedRequirements.push({
                requirement: req,
                matched,
                evidence: matched ? `候選人具備相關技能` : undefined,
                weight: 1 / jdRequirements.length  // 平均權重
            });

            if (!matched) {
                missingSkills.push(req);
            }
        });

        // 找出額外技能（候選人有但 JD 未要求的）
        const bonusSkills = candidateSkills.filter(skill => {
            if (!skill) return false;
            const skillLower = skill.toLowerCase();
            return !jdRequirements.some(req => {
                if (!req) return false;
                const reqLower = req.toLowerCase();
                return reqLower.includes(skillLower) || skillLower.includes(reqLower);
            });
        });

        // 計算適配度分數
        const matchCount = matchedRequirements.filter(r => r.matched).length;
        const totalRequirements = jdRequirements.length || 1;
        const baseScore = (matchCount / totalRequirements) * 100;

        // 額外技能加分（每個 +2 分，最多 +10）
        const bonusPoints = Math.min(bonusSkills.length * 2, 10);
        const score = Math.min(100, baseScore + bonusPoints);

        return {
            score: Math.round(score),
            matchedRequirements,
            missingSkills,
            bonusSkills
        };
    }

    // ============================================================
    // 綜合評分與錄用建議
    // ============================================================

    /**
     * 計算加權綜合評分
     */
    calculateOverallScore(
        keywordScore: number,
        semanticScore: number,
        jdMatchScore: number
    ): number {
        const weighted =
            keywordScore * this.KEYWORD_WEIGHT +
            semanticScore * this.SEMANTIC_WEIGHT +
            jdMatchScore * this.JD_MATCH_WEIGHT;

        return Math.round(weighted);
    }

    /**
     * 根據綜合評分生成錄用建議
     */
    generateRecommendation(overallScore: number): HireRecommendationDetail {
        if (overallScore >= this.THRESHOLD_STRONGLY_RECOMMENDED) {
            return {
                level: 'strongly_recommended',
                label: '強烈推薦錄用',
                description: '候選人表現優異，強烈建議錄用。各項評估維度均達優秀水準。',
                color: '#4CAF50',  // 綠色
                icon: 'ri-checkbox-circle-fill'
            };
        } else if (overallScore >= this.THRESHOLD_RECOMMENDED) {
            return {
                level: 'recommended',
                label: '推薦錄用',
                description: '候選人表現良好，建議錄用。部分維度可透過培訓加強。',
                color: '#8DA399',  // 鼠尾草綠（模組主色）
                icon: 'ri-thumb-up-fill'
            };
        } else if (overallScore >= this.THRESHOLD_ON_HOLD) {
            return {
                level: 'on_hold',
                label: '待觀察',
                description: '候選人表現一般，建議進行額外面試或考察後再決定。',
                color: '#FFB74D',  // 橙色
                icon: 'ri-time-fill'
            };
        } else {
            return {
                level: 'not_recommended',
                label: '不建議錄用',
                description: '候選人與職缺需求適配度較低，建議另尋其他候選人。',
                color: '#EF5350',  // 紅色
                icon: 'ri-close-circle-fill'
            };
        }
    }

    // ============================================================
    // 輔助方法
    // ============================================================

    /**
     * 取得推薦等級的顯示資訊
     */
    getRecommendationDisplay(level: HireRecommendation): HireRecommendationDetail {
        const score = level === 'strongly_recommended' ? 90 :
            level === 'recommended' ? 75 :
                level === 'on_hold' ? 60 : 40;
        return this.generateRecommendation(score);
    }

    /**
     * 格式化分數為百分比字串
     */
    formatScore(score: number): string {
        return `${Math.round(score)}%`;
    }

    /**
     * 取得分數對應的顏色等級
     */
    getScoreColor(score: number): string {
        if (score >= 85) return '#4CAF50';      // 綠色
        if (score >= 70) return '#8DA399';      // 鼠尾草綠
        if (score >= 55) return '#FFB74D';      // 橙色
        return '#EF5350';                        // 紅色
    }

    /**
     * 取得分數對應的標籤
     */
    getScoreLabel(score: number): string {
        if (score >= 85) return '優秀';
        if (score >= 70) return '良好';
        if (score >= 55) return '一般';
        return '待加強';
    }
}
