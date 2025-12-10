/**
 * Bombus V6.0 - 關鍵人才儀表板 (Key Talent Dashboard)
 * 整合 L1 員工ROI + L2 職能評估 + L5 績效數據 + L6 EAP使用
 * 作者：Bombus Dev Team
 * 日期：2025-11-22
 */

// ==================== 全域變數 ====================

let coverageChart = null;
let costChart = null;

// ==================== 模擬數據 ====================

// 高風險人才列表
const riskTalents = [
    {
        id: 't001',
        name: '張資深',
        dept: '研發部',
        position: '技術主管',
        riskScore: 85,
        riskLevel: 'high',
        reasons: ['市場薪資落差 25%', '近期績效波動', '團隊衝突記錄'],
        avatar: '張'
    },
    {
        id: 't002',
        name: '李專家',
        dept: '產品部',
        position: '產品經理',
        riskScore: 78,
        riskLevel: 'high',
        reasons: ['外部挖角接觸', '晉升受阻', '工作滿意度下降'],
        avatar: '李'
    },
    {
        id: 't003',
        name: '王主任',
        dept: '業務部',
        position: '業務主任',
        riskScore: 72,
        riskLevel: 'high',
        reasons: ['績效目標壓力大', '工作生活平衡差', 'EAP 使用頻繁'],
        avatar: '王'
    },
    {
        id: 't004',
        name: '陳經理',
        dept: '行銷部',
        position: '行銷經理',
        riskScore: 68,
        riskLevel: 'medium',
        reasons: ['近期家庭因素', '職涯發展不明確'],
        avatar: '陳'
    },
    {
        id: 't005',
        name: '林總監',
        dept: '財務部',
        position: '財務總監',
        riskScore: 65,
        riskLevel: 'medium',
        reasons: ['工作倦怠徵兆', '培訓資源不足'],
        avatar: '林'
    }
];

// 關鍵職位接班人資料
const successionPlans = [
    {
        position: '技術長 (CTO)',
        level: 'C-Level',
        coverage: 'high',
        coverageRate: 3,
        successors: [
            { name: '張資深', readiness: 85 },
            { name: '李工程師', readiness: 72 },
            { name: '王架構師', readiness: 68 }
        ]
    },
    {
        position: '財務長 (CFO)',
        level: 'C-Level',
        coverage: 'medium',
        coverageRate: 2,
        successors: [
            { name: '林總監', readiness: 78 },
            { name: '陳經理', readiness: 65 }
        ]
    },
    {
        position: '產品總監',
        level: 'Director',
        coverage: 'high',
        coverageRate: 3,
        successors: [
            { name: '李專家', readiness: 82 },
            { name: '劉PM', readiness: 75 },
            { name: '黃主管', readiness: 70 }
        ]
    },
    {
        position: '業務總監',
        level: 'Director',
        coverage: 'medium',
        coverageRate: 2,
        successors: [
            { name: '王主任', readiness: 80 },
            { name: '趙經理', readiness: 68 }
        ]
    },
    {
        position: '技術主管',
        level: 'Manager',
        coverage: 'low',
        coverageRate: 1,
        successors: [
            { name: '吳工程師', readiness: 60 }
        ]
    },
    {
        position: '行銷主管',
        level: 'Manager',
        coverage: 'low',
        coverageRate: 1,
        successors: [
            { name: '鄭專員', readiness: 55 }
        ]
    }
];

// ==================== 畫面渲染 ====================

// 渲染高風險人才列表
function renderRiskTalents() {
    const $list = $('#alertList');
    $list.empty();
    
    riskTalents.forEach(talent => {
        const card = $(`
            <div class="alert-item ${talent.riskLevel}">
                <div class="avatar">${talent.avatar}</div>
                <div class="info">
                    <div class="name">${talent.name}</div>
                    <div class="detail">${talent.dept} · ${talent.position}</div>
                    <div class="detail" style="margin-top: 4px; color: #C77F7F;">
                        ${talent.reasons.join(' · ')}
                    </div>
                </div>
                <div class="risk-score">${talent.riskScore}%</div>
                <button class="action-btn" onclick="initiateRetention('${talent.id}')">
                    啟動留才計畫
                </button>
            </div>
        `);
        
        $list.append(card);
    });
}

// 渲染接班人規劃卡片
function renderSuccessionPlans() {
    const $panel = $('#successionPanel');
    $panel.empty();
    
    successionPlans.forEach(plan => {
        const coverageText = plan.coverage === 'high' ? '覆蓋充足' : 
                            plan.coverage === 'medium' ? '覆蓋中等' : '覆蓋不足';
        
        const successorsHtml = plan.successors.map((successor, index) => `
            <div class="successor-item">
                <div class="successor-rank">${index + 1}</div>
                <div class="successor-name">${successor.name}</div>
                <div class="readiness-bar">
                    <div class="readiness-fill" style="width: ${successor.readiness}%;"></div>
                </div>
                <div class="readiness-score">${successor.readiness}%</div>
            </div>
        `).join('');
        
        const card = $(`
            <div class="succession-card">
                <div class="succession-header">
                    <div class="position-title">${plan.position}</div>
                    <div class="coverage-badge ${plan.coverage}">
                        ${coverageText} (${plan.coverageRate})
                    </div>
                </div>
                <div class="succession-list">
                    ${successorsHtml}
                </div>
            </div>
        `);
        
        $panel.append(card);
    });
}

// ==================== 圖表渲染 ====================

// 初始化所有關鍵人才圖表
function initKeyTalentCharts() {
    initCoverageChart();
    initCostChart();
}

// 初始化覆蓋率圖表
function initCoverageChart() {
    const chartDom = document.getElementById('coverageChart');
    if (!chartDom) return;
    
    if (coverageChart) {
        coverageChart.dispose();
    }
    
    coverageChart = echarts.init(chartDom);
    
    const option = {
        title: {
            text: '接班人覆蓋率',
            left: 'center',
            top: '0%',
            textStyle: {
                fontSize: 16,
                fontWeight: 600,
                color: '#464E56'
            }
        },
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c}% ({d}%)',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#E2E4E8',
            borderWidth: 1,
            textStyle: {
                color: '#464E56'
            }
        },
        legend: {
            orient: 'horizontal',
            left: 'center',
            bottom: '0%',
            textStyle: {
                color: '#464E56',
                fontSize: 12
            },
            itemGap: 15,
            itemWidth: 14,
            itemHeight: 14
        },
        series: [
            {
                name: '接班人覆蓋率',
                type: 'pie',
                radius: ['40%', '65%'],
                center: ['50%', '55%'],
                avoidLabelOverlap: true,
                itemStyle: {
                    borderRadius: 8,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: false
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 14,
                        fontWeight: 'bold',
                        formatter: '{b}\n{c}%'
                    },
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.3)'
                    }
                },
                data: [
                    { value: 78, name: '已有接班人' },
                    { value: 15, name: '準備中' },
                    { value: 7, name: '無接班人' }
                ],
                color: ['#7FB095', '#E3C088', '#C77F7F']
            }
        ]
    };
    
    coverageChart.setOption(option);
    
    window.addEventListener('resize', function() {
        if (coverageChart) coverageChart.resize();
    });
}

// 初始化成本圖表
function initCostChart() {
    const chartDom = document.getElementById('costChart');
    if (!chartDom) return;

    if (costChart) {
        costChart.dispose();
    }

    costChart = echarts.init(chartDom);
    
    const option = {
        title: {
            text: '人才流失成本估算',
            left: 'center',
            top: '0%',
            textStyle: {
                fontSize: 16,
                fontWeight: 600,
                color: '#464E56'
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: function(params) {
                let result = params[0].name + '<br/>';
                params.forEach(item => {
                    result += item.marker + item.seriesName + ': $' + item.value + 'K<br/>';
                });
                return result;
            },
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#E2E4E8',
            borderWidth: 1,
            textStyle: {
                color: '#464E56'
            }
        },
        legend: {
            data: ['替換成本', '培訓成本', '產出損失'],
            bottom: '0%',
            left: 'center',
            textStyle: {
                color: '#464E56',
                fontSize: 12
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '10%',
            top: '10%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: ['張資深', '李專家', '王主任', '陳經理', '林總監'],
            axisLabel: {
                color: '#858E96',
                fontSize: 12
            },
            axisLine: {
                lineStyle: {
                    color: '#E2E4E8'
                }
            }
        },
        yAxis: {
            type: 'value',
            name: '成本 ($K)',
            axisLabel: {
                formatter: '${value}K',
                color: '#858E96',
                fontSize: 12
            },
            splitLine: {
                lineStyle: {
                    color: '#E2E4E8',
                    type: 'dashed'
                }
            }
        },
        series: [
            {
                name: '替換成本',
                type: 'bar',
                stack: 'total',
                data: [180, 150, 120, 100, 200],
                itemStyle: {
                    color: '#C77F7F',
                    borderRadius: [0, 0, 4, 4]
                }
            },
            {
                name: '培訓成本',
                type: 'bar',
                stack: 'total',
                data: [120, 100, 80, 70, 150],
                itemStyle: {
                    color: '#E3C088'
                }
            },
            {
                name: '產出損失',
                type: 'bar',
                stack: 'total',
                data: [250, 200, 180, 150, 300],
                itemStyle: {
                    color: '#8DA8BE',
                    borderRadius: [4, 4, 0, 0]
                }
            }
        ]
    };
    
    costChart.setOption(option);
    
    window.addEventListener('resize', function() {
        if (costChart) costChart.resize();
    });
}

// ==================== 互動功能 ====================

// 啟動留才計畫
function initiateRetention(talentId) {
    const talent = riskTalents.find(t => t.id === talentId);
    if (!talent) return;
    
    // 顯示確認對話框
    const message = `
<div style="padding: 20px; line-height: 1.8;">
    <h3 style="margin-bottom: 15px; color: #464E56;">啟動留才計畫 - ${talent.name}</h3>
    <div style="background: #F5F5F7; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <strong>風險因素：</strong><br/>
        ${talent.reasons.map(r => `• ${r}`).join('<br/>')}
    </div>
    <strong style="color: #667eea;">建議行動方案：</strong><br/>
    • 立即安排一對一面談，了解真實離職意願<br/>
    • 評估薪資調整空間（建議調幅 15-20%）<br/>
    • 提供職涯發展機會或晉升路徑<br/>
    • 安排 EAP 心理諮商服務<br/>
    • 彈性工作安排（如週休三日試行）<br/>
    <br/>
    <strong>預估挽留成功率：</strong>
    <span style="color: #7FB095; font-size: 18px; font-weight: 700;">72%</span>
</div>
    `;
    
    const modal = $('<div>')
        .css({
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        })
        .html(`
            <div style="
                background: white;
                border-radius: 16px;
                max-width: 600px;
                width: 100%;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            ">
                ${message}
                <div style="padding: 0 20px 20px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn btn-secondary" onclick="$(this).closest('[style*=fixed]').remove()">
                        取消
                    </button>
                    <button class="btn btn-primary" onclick="confirmRetention('${talentId}')">
                        確認啟動
                    </button>
                </div>
            </div>
        `)
        .appendTo('body')
        .hide()
        .fadeIn(300);
}

// 確認啟動留才計畫
function confirmRetention(talentId) {
    const talent = riskTalents.find(t => t.id === talentId);
    
    // 關閉 modal
    $('[style*="fixed"]').fadeOut(300, function() {
        $(this).remove();
    });
    
    // 顯示成功訊息
    const toast = $('<div>')
        .css({
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#7FB095',
            color: 'white',
            padding: '20px 25px',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            zIndex: 10000,
            fontSize: '14px',
            fontWeight: '600',
            minWidth: '300px'
        })
        .html(`
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 24px;">✓</span>
                <div>
                    <div style="font-size: 16px; margin-bottom: 4px;">留才計畫已啟動</div>
                    <div style="font-size: 13px; opacity: 0.9;">
                        ${talent.name} 的留才方案已建立，HR 將在 24 小時內聯繫
                    </div>
                </div>
            </div>
        `)
        .appendTo('body')
        .fadeIn(300)
        .delay(4000)
        .fadeOut(300, function() {
            $(this).remove();
        });
    
    console.log('留才計畫已啟動：', talent);
}

// 重新整理數據
function refreshData() {
    // 模擬數據重新載入
    renderRiskTalents();
    renderSuccessionPlans();
    
    // 顯示提示
    const toast = $('<div>')
        .css({
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#7FB095',
            color: 'white',
            padding: '15px 20px',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            fontSize: '14px',
            fontWeight: '600'
        })
        .text('✓ 數據已更新')
        .appendTo('body')
        .fadeIn(300)
        .delay(2000)
        .fadeOut(300, function() {
            $(this).remove();
        });
}

// 匯出報告
function exportReport() {
    const report = {
        title: '關鍵人才管理報告',
        date: new Date().toLocaleDateString('zh-TW'),
        metrics: {
            覆蓋率: '78%',
            高風險人數: riskTalents.length,
            潛在流失成本: '$2.8M',
            接班人準備度: '72%'
        },
        highRiskTalents: riskTalents.length,
        successionPlans: successionPlans.length
    };
    
    console.log('匯出報告：', report);
    
    alert(`📊 關鍵人才管理報告已匯出

報告日期：${report.date}

關鍵指標：
• 接班人覆蓋率：${report.metrics.覆蓋率}
• 高風險人才：${report.metrics.高風險人數} 人
• 潛在流失成本：${report.metrics.潛在流失成本}
• 接班人準備度：${report.metrics.接班人準備度}

報告包含：
- 高風險人才詳細分析
- 接班人規劃矩陣
- 留才建議方案
- 成本效益分析

檔案已匯出為 PDF 格式（Demo 模式）`);
}

// ==================== 初始化 ====================

$(document).ready(function() {
    // 渲染數據 (圖表初始化由 tab 切換觸發)
    renderRiskTalents();
    renderSuccessionPlans();
    
    console.log('✓ 關鍵人才儀表板模組已載入');
    console.log('- 高風險人才：', riskTalents.length, '人');
    console.log('- 關鍵職位：', successionPlans.length, '個');
});
