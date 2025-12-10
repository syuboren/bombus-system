/**
 * Bombus V6.0 - 職能熱力圖 (Competency Heatmap)
 * 整合 L1 員工檔案 + L2 職能評估數據
 * 作者：Bombus Dev Team
 * 日期：2025-11-22
 */

// ==================== 模擬數據 ====================

// 部門列表
const departments = ['研發部', '業務部', '行銷部', '人資部', '財務部', '客服部', '產品部', '設計部'];

// 職能項目列表（根據IDP規範分類）
const competencies = {
    core: ['溝通協調', '團隊合作', '問題解決', '創新思維', '學習能力'],
    professional: ['專業技術', '數據分析', '專案管理', '流程優化', '品質管理'],
    management: ['領導統御', '決策能力', '目標管理', '資源配置', '績效管理']
};

// 生成模擬熱力圖數據
function generateHeatmapData(viewLevel, deptFilter, competencyType) {
    let yAxisData = [];
    let xAxisData = [];
    let data = [];

    // 根據職能類別篩選
    if (competencyType === 'all') {
        xAxisData = [...competencies.core, ...competencies.professional, ...competencies.management];
    } else {
        xAxisData = competencies[competencyType] || [];
    }

    // 根據檢視層級和部門篩選決定 Y 軸
    if (viewLevel === 'org') {
        yAxisData = departments;
    } else if (viewLevel === 'dept') {
        if (deptFilter === 'all') {
            yAxisData = departments;
        } else {
            // 顯示部門內的員工
            yAxisData = generateEmployeeList(deptFilter);
        }
    } else {
        // 個人層級 - 顯示所有員工
        yAxisData = generateAllEmployees();
    }

    // 生成熱力圖數據點
    yAxisData.forEach((dept, i) => {
        xAxisData.forEach((comp, j) => {
            // 生成 30-100 之間的隨機分數，並根據部門和職能類型調整
            let score = Math.floor(Math.random() * 70) + 30;
            
            // 某些部門在特定職能上表現較好
            if (dept.includes('研發') && comp.includes('技術')) score += 15;
            if (dept.includes('業務') && comp.includes('溝通')) score += 15;
            if (dept.includes('人資') && comp.includes('協調')) score += 15;
            if (dept.includes('財務') && comp.includes('分析')) score += 15;
            
            // 確保分數在 0-100 範圍內
            score = Math.min(100, score);
            
            data.push([j, i, score]);
        });
    });

    return { xAxisData, yAxisData, data };
}

// 生成部門員工列表
function generateEmployeeList(dept) {
    const deptNames = {
        'rd': '研發部',
        'sales': '業務部',
        'marketing': '行銷部',
        'hr': '人資部',
        'finance': '財務部'
    };
    
    const employees = [
        '王小明', '李小華', '張大同', '陳美玲', '林志明',
        '黃雅婷', '吳建國', '劉佳慧', '鄭文豪', '蔡淑芬'
    ];
    
    return employees.map(name => `${deptNames[dept]}-${name}`);
}

// 生成所有員工列表（精簡版）
function generateAllEmployees() {
    return [
        '王小明', '李小華', '張大同', '陳美玲', '林志明',
        '黃雅婷', '吳建國', '劉佳慧', '鄭文豪', '蔡淑芬'
    ];
}

// ==================== ECharts 配置 ====================

let heatmapChart = null;

// 初始化熱力圖
function initHeatmap() {
    const chartDom = document.getElementById('heatmapChart');
    heatmapChart = echarts.init(chartDom);
    
    updateHeatmap();
    
    // 綁定點擊事件
    heatmapChart.on('click', function(params) {
        if (params.componentType === 'series') {
            showDetailModal(params);
        }
    });

    // 響應式調整
    window.addEventListener('resize', function() {
        heatmapChart.resize();
    });
}

// 更新熱力圖
function updateHeatmap() {
    const viewLevel = $('#viewLevel').val();
    const deptFilter = $('#deptFilter').val();
    const competencyType = $('#competencyType').val();
    
    const { xAxisData, yAxisData, data } = generateHeatmapData(viewLevel, deptFilter, competencyType);
    
    const option = {
        tooltip: {
            position: 'top',
            formatter: function(params) {
                const competency = xAxisData[params.value[0]];
                const dept = yAxisData[params.value[1]];
                const score = params.value[2];
                const level = getScoreLevel(score);
                
                return `
                    <div style="padding: 10px;">
                        <div style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">
                            ${dept} - ${competency}
                        </div>
                        <div style="color: #718096; font-size: 13px;">
                            職能分數：<strong style="color: ${level.color};">${score} 分</strong><br/>
                            狀態：<strong style="color: ${level.color};">${level.label}</strong>
                        </div>
                        <div style="margin-top: 8px; font-size: 12px; color: #a0aec0;">
                            點擊查看詳細資訊
                        </div>
                    </div>
                `;
            },
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#E2E4E8',
            borderWidth: 1,
            textStyle: {
                color: '#464E56'
            },
            extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 8px;'
        },
        grid: {
            top: '5%',
            left: '5%',
            right: '15%',
            bottom: '20%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: xAxisData,
            splitArea: {
                show: true,
                areaStyle: {
                    color: ['rgba(250,250,250,0.1)', 'rgba(245,245,247,0.3)']
                }
            },
            axisLabel: {
                rotate: 45,
                interval: 0,
                fontSize: 12,
                color: '#464E56',
                fontWeight: 500
            },
            axisLine: {
                lineStyle: {
                    color: '#E2E4E8'
                }
            }
        },
        yAxis: {
            type: 'category',
            data: yAxisData,
            splitArea: {
                show: true,
                areaStyle: {
                    color: ['rgba(250,250,250,0.1)', 'rgba(245,245,247,0.3)']
                }
            },
            axisLabel: {
                fontSize: 12,
                color: '#464E56',
                fontWeight: 500
            },
            axisLine: {
                lineStyle: {
                    color: '#E2E4E8'
                }
            }
        },
        visualMap: {
            min: 0,
            max: 100,
            calculable: true,
            orient: 'vertical',
            left: 'right',
            bottom: 'center',
            padding: [0, 50, 0, 0], // 上右下左
            inRange: {
                color: [
                    '#C77F7F',  // 紅色 <50
                    '#E3C088',  // 黃色 50-69
                    '#7FB095',  // 淺綠 70-89
                    '#2d5f3e'   // 深綠 90-100
                ]
            },
            text: ['高分', '低分'],
            textStyle: {
                color: '#464E56',
                fontSize: 12
            }
        },
        series: [{
            name: '職能分數',
            type: 'heatmap',
            data: data,
            label: {
                show: true,
                fontSize: 11,
                color: '#fff',
                fontWeight: 600,
                formatter: function(params) {
                    return params.value[2];
                }
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.3)',
                    borderColor: '#fff',
                    borderWidth: 2
                }
            },
            itemStyle: {
                borderColor: '#fff',
                borderWidth: 2,
                borderRadius: 4
            }
        }]
    };
    
    heatmapChart.setOption(option, true);
    
    // 更新統計數據
    updateStatistics(data);
}

// 根據分數判定等級
function getScoreLevel(score) {
    if (score >= 90) {
        return { label: '職能優秀', color: '#2d5f3e', tag: 'excellent' };
    } else if (score >= 70) {
        return { label: '職能達標', color: '#7FB095', tag: 'good' };
    } else if (score >= 50) {
        return { label: '接近標準', color: '#E3C088', tag: 'warning' };
    } else {
        return { label: '需重點培育', color: '#C77F7F', tag: 'danger' };
    }
}

// 更新統計數據
function updateStatistics(data) {
    const scores = data.map(item => item[2]);
    const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const excellentCount = scores.filter(s => s >= 90).length;
    const needTrainingCount = scores.filter(s => s < 50).length;
    
    $('#avgScore').text(avgScore);
    $('#excellentCount').text(excellentCount);
    $('#needTrainingCount').text(needTrainingCount);
}

// ==================== 互動功能 ====================

// 顯示詳細資訊 Modal
function showDetailModal(params) {
    const viewLevel = $('#viewLevel').val();
    const { xAxisData, yAxisData } = generateHeatmapData(viewLevel, $('#deptFilter').val(), $('#competencyType').val());
    
    const competency = xAxisData[params.value[0]];
    const dept = yAxisData[params.value[1]];
    const score = params.value[2];
    const level = getScoreLevel(score);
    const required = 70; // 標準要求分數
    const gap = score - required;
    const rank = Math.floor(Math.random() * 5) + 1; // 模擬排名
    
    // 設置 Modal 內容
    $('#modalTitle').text(`${competency} - ${dept}`);
    $('#modalSubtitle').text(`職能狀態：${level.label}`);
    $('#modalCurrentScore').text(`${score} 分`).css('color', level.color);
    $('#modalRequiredScore').text(`${required} 分`);
    $('#modalGap').text(gap >= 0 ? `+${gap} 分` : `${gap} 分`).css('color', gap >= 0 ? '#7FB095' : '#C77F7F');
    $('#modalRank').text(`第 ${rank} 名 / 8`);
    
    // 生成推薦課程
    const courses = generateRecommendedCourses(competency, score);
    const coursesHtml = courses.map(course => 
        `<li>📚 ${course.name} <span style="color: #7FB095;">(預估提升 +${course.improvement} 分)</span></li>`
    ).join('');
    $('#recommendedCourses').html(coursesHtml);
    
    // 顯示 Modal
    $('#detailModal').fadeIn(300);
}

// 關閉 Modal
function closeModal() {
    $('#detailModal').fadeOut(300);
}

// 生成推薦課程
function generateRecommendedCourses(competency, currentScore) {
    const allCourses = {
        '溝通協調': [
            { name: '高效溝通技巧實戰班', improvement: 8 },
            { name: '跨部門協作工作坊', improvement: 6 },
            { name: '衝突管理與談判技巧', improvement: 7 }
        ],
        '專業技術': [
            { name: 'Python 進階開發課程', improvement: 12 },
            { name: '系統架構設計實務', improvement: 10 },
            { name: '敏捷開發方法論', improvement: 8 }
        ],
        '數據分析': [
            { name: 'Excel 進階分析技巧', improvement: 7 },
            { name: 'Power BI 數據視覺化', improvement: 9 },
            { name: 'SQL 資料庫查詢優化', improvement: 8 }
        ],
        '領導統御': [
            { name: '中階主管領導力培訓', improvement: 10 },
            { name: '團隊激勵與輔導技巧', improvement: 8 },
            { name: '變革管理實務工作坊', improvement: 9 }
        ]
    };
    
    // 根據職能選擇課程，如果沒有匹配則返回通用課程
    const courses = allCourses[competency] || [
        { name: `${competency}基礎培訓課程`, improvement: 8 },
        { name: `${competency}進階實戰班`, improvement: 10 },
        { name: `${competency}專家認證課程`, improvement: 12 }
    ];
    
    // 根據分數推薦合適的課程數量
    if (currentScore < 50) {
        return courses; // 返回全部課程
    } else if (currentScore < 70) {
        return courses.slice(0, 2); // 返回2門課程
    } else {
        return courses.slice(0, 1); // 返回1門課程
    }
}

// 指派培訓課程
function assignTraining() {
    alert('功能開發中：將開啟培訓課程指派介面，自動連結到 L3.1 培訓計畫管理模組');
}

// 查看歷史紀錄
function viewHistory() {
    alert('功能開發中：將顯示該職能項目的歷史評估紀錄與趨勢圖');
}

// 重新整理數據
function refreshData() {
    updateHeatmap();
    
    // 顯示提示訊息
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

// 匯出圖表
function exportChart() {
    if (heatmapChart) {
        const url = heatmapChart.getDataURL({
            type: 'png',
            pixelRatio: 2,
            backgroundColor: '#fff'
        });
        
        const link = document.createElement('a');
        link.download = `職能熱力圖_${new Date().toISOString().split('T')[0]}.png`;
        link.href = url;
        link.click();
        
        // 顯示成功提示
        alert('✓ 圖表已成功匯出！');
    }
}

// ==================== 初始化 ====================

$(document).ready(function() {
    // 初始化圖表
    initHeatmap();
    
    // 點擊 Modal 外部關閉
    $('#detailModal').on('click', function(e) {
        if (e.target.id === 'detailModal') {
            closeModal();
        }
    });
    
    // ESC 鍵關閉 Modal
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
    
    console.log('✓ 職能熱力圖模組已載入');
});

