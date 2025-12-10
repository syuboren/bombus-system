/**
 * Bombus V6.0 - 學習發展路徑圖 (Learning Journey Map)
 * 整合 L2 職能落差 + L3 課程庫 + AI 推薦引擎
 * 作者：Bombus Dev Team
 * 日期：2025-11-22
 */

// ==================== 全域變數 ====================

let currentLevel = 'org'; // org, dept, individual
let timelineChart = null;
let skillTreeChart = null;

// ==================== 模擬數據 ====================

// 員工列表
const learningPathEmployees = [
    { id: 'e001', name: '王小明', dept: '研發部', role: '資深工程師', targetRole: '技術主管' },
    { id: 'e002', name: '李小華', dept: '業務部', role: '業務專員', targetRole: '業務經理' },
    { id: 'e003', name: '張大同', dept: '行銷部', role: '行銷專員', targetRole: '行銷經理' },
    { id: 'e004', name: '陳美玲', dept: '人資部', role: 'HR 專員', targetRole: 'HR 經理' },
    { id: 'e005', name: '林志明', dept: '財務部', role: '財務分析師', targetRole: '財務經理' }
];

// 課程資料
const courses = [
    {
        id: 'c001',
        title: 'Python 進階開發實戰',
        level: 'advanced',
        duration: '24 小時',
        participants: 45,
        description: '深入學習 Python 進階特性，包含裝飾器、生成器、並發編程等主題。',
        competency: '專業技術',
        progress: 0,
        improvement: '+12 分',
        status: 'recommended'
    },
    {
        id: 'c002',
        title: '敏捷專案管理工作坊',
        level: 'basic',
        duration: '16 小時',
        participants: 32,
        description: '學習 Scrum、Kanban 等敏捷方法論，掌握團隊協作與迭代開發技巧。',
        competency: '專案管理',
        progress: 60,
        improvement: '+8 分',
        status: 'in_progress'
    },
    {
        id: 'c003',
        title: '數據分析與商業智能',
        level: 'advanced',
        duration: '32 小時',
        participants: 28,
        description: '掌握 SQL、Python、Power BI 等工具，培養數據驅動決策能力。',
        competency: '數據分析',
        progress: 0,
        improvement: '+15 分',
        status: 'recommended'
    },
    {
        id: 'c004',
        title: '高效溝通與簡報技巧',
        level: 'basic',
        duration: '12 小時',
        participants: 56,
        description: '提升跨部門溝通效率，學習結構化思維與視覺化簡報設計。',
        competency: '溝通協調',
        progress: 100,
        improvement: '+6 分',
        status: 'completed'
    },
    {
        id: 'c005',
        title: '領導力與團隊管理',
        level: 'expert',
        duration: '40 小時',
        participants: 18,
        description: '培養中高階主管的領導力，掌握團隊激勵、衝突管理與變革領導技巧。',
        competency: '領導統御',
        progress: 0,
        improvement: '+18 分',
        status: 'recommended'
    },
    {
        id: 'c006',
        title: 'UI/UX 設計思維',
        level: 'basic',
        duration: '20 小時',
        participants: 38,
        description: '學習以使用者為中心的設計方法，掌握原型設計與使用性測試。',
        competency: '設計思維',
        progress: 30,
        improvement: '+10 分',
        status: 'in_progress'
    }
];

// 技能樹數據
const skillTreeData = {
    name: '職涯發展路徑',
    children: [
        {
            name: '基礎能力',
            children: [
                { name: '溝通協調', value: 85, status: 'completed' },
                { name: '問題解決', value: 78, status: 'completed' },
                { name: '團隊合作', value: 92, status: 'completed' }
            ]
        },
        {
            name: '專業技能',
            children: [
                { name: '技術開發', value: 72, status: 'in_progress' },
                { name: '數據分析', value: 65, status: 'in_progress' },
                { name: '專案管理', value: 58, status: 'pending' }
            ]
        },
        {
            name: '管理能力',
            children: [
                { name: '領導統御', value: 45, status: 'pending' },
                { name: '策略規劃', value: 38, status: 'pending' },
                { name: '變革管理', value: 30, status: 'pending' }
            ]
        }
    ]
};

// ==================== 層級切換 ====================

function switchLevel(level) {
    currentLevel = level;
    
    // 顯示/隱藏員工選擇器
    if (level === 'individual') {
        $('#employeeSelector').slideDown(300);
        populateEmployeeSelect();
    } else {
        $('#employeeSelector').slideUp(300);
        $('#pathSummary').slideUp(300);
    }
    
    // 更新圖表
    updateTimelineChart();
    updateSkillTreeChart();
    updateRecommendations();
}

// 填充員工選擇器
function populateEmployeeSelect() {
    const $select = $('#employeeSelect');
    $select.empty().append('<option value="">請選擇員工...</option>');
    
    learningPathEmployees.forEach(emp => {
        $select.append(`<option value="${emp.id}">${emp.name} - ${emp.dept} - ${emp.role}</option>`);
    });
}

// 更新個人路徑
function updateIndividualPath() {
    const empId = $('#employeeSelect').val();
    if (!empId) {
        $('#pathSummary').slideUp(300);
        return;
    }
    
    const employee = learningPathEmployees.find(e => e.id === empId);
    if (!employee) return;
    
    // 顯示路徑總結
    $('#pathTitle').text(`${employee.name} 的學習路徑`);
    $('#pathDescription').html(`
        <div style="color: #718096; font-size: 14px; line-height: 1.8; margin-top: 10px;">
            <strong>當前職位：</strong>${employee.role}<br>
            <strong>目標職位：</strong>${employee.targetRole}<br>
            <strong>預估學習時間：</strong>6-9 個月<br>
            <strong>推薦課程數：</strong>5 門課程
        </div>
    `);
    
    // 生成路徑步驟
    const steps = [
        { title: '基礎課程', status: 'completed' },
        { title: '進階實戰', status: 'current' },
        { title: '專家認證', status: 'pending' },
        { title: '實務專案', status: 'pending' }
    ];
    
    const stepsHtml = steps.map(step => {
        return `<div class="path-step ${step.status}">${step.title}</div>`;
    }).join('');
    
    $('#pathSteps').html(stepsHtml);
    $('#pathSummary').slideDown(300);
    
    // 更新圖表
    updateTimelineChart();
    updateSkillTreeChart();
}

// ==================== 圖表渲染 ====================

// 初始化所有學習路徑圖表
function initLearningPathCharts() {
    initTimelineChart();
    initSkillTreeChart();
}

// 初始化時間軸圖表
function initTimelineChart() {
    const chartDom = document.getElementById('timelineChart');
    if (!chartDom) return;
    
    if (timelineChart) {
        timelineChart.dispose();
    }
    
    timelineChart = echarts.init(chartDom);
    
    window.addEventListener('resize', function() {
        if (timelineChart) {
            timelineChart.resize();
        }
    });
    
    updateTimelineChart();
}

// 更新時間軸圖表
function updateTimelineChart() {
    // 生成過去6個月的數據
    const months = ['7月', '8月', '9月', '10月', '11月', '12月'];
    
    let data1, data2, data3;
    
    if (currentLevel === 'org') {
        data1 = [58, 62, 65, 68, 70, 72]; // 整體完成率
        data2 = [75, 78, 80, 82, 83, 85]; // 核心職能
        data3 = [60, 62, 64, 65, 67, 68]; // 參與度
    } else if (currentLevel === 'dept') {
        data1 = [55, 60, 63, 67, 69, 72]; // 部門完成率
        data2 = [72, 76, 78, 80, 82, 85]; // 部門職能
        data3 = [58, 60, 62, 64, 66, 68]; // 部門參與度
    } else {
        data1 = [50, 58, 64, 70, 75, 82]; // 個人完成率
        data2 = [68, 72, 76, 80, 84, 88]; // 個人職能
        data3 = [70, 72, 75, 78, 80, 85]; // 個人參與度
    }
    
    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross'
            },
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#E2E4E8',
            borderWidth: 1,
            textStyle: {
                color: '#464E56'
            }
        },
        legend: {
            data: ['培訓完成率', '職能覆蓋率', '課程參與度'],
            top: '5%',
            textStyle: {
                color: '#464E56',
                fontSize: 13
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            top: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: months,
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
            min: 0,
            max: 100,
            axisLabel: {
                formatter: '{value}%',
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
                name: '培訓完成率',
                type: 'line',
                data: data1,
                smooth: true,
                lineStyle: {
                    width: 3,
                    color: '#8DA399'
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(141, 163, 153, 0.3)' },
                            { offset: 1, color: 'rgba(141, 163, 153, 0.05)' }
                        ]
                    }
                },
                itemStyle: {
                    color: '#8DA399'
                }
            },
            {
                name: '職能覆蓋率',
                type: 'line',
                data: data2,
                smooth: true,
                lineStyle: {
                    width: 3,
                    color: '#D6A28C'
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(214, 162, 140, 0.3)' },
                            { offset: 1, color: 'rgba(214, 162, 140, 0.05)' }
                        ]
                    }
                },
                itemStyle: {
                    color: '#D6A28C'
                }
            },
            {
                name: '課程參與度',
                type: 'line',
                data: data3,
                smooth: true,
                lineStyle: {
                    width: 3,
                    color: '#7F9CA0'
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(127, 156, 160, 0.3)' },
                            { offset: 1, color: 'rgba(127, 156, 160, 0.05)' }
                        ]
                    }
                },
                itemStyle: {
                    color: '#7F9CA0'
                }
            }
        ]
    };
    
    timelineChart.setOption(option, true);
}

// 初始化技能樹圖表
function initSkillTreeChart() {
    const chartDom = document.getElementById('skillTreeChart');
    if (!chartDom) return;
    
    if (skillTreeChart) {
        skillTreeChart.dispose();
    }
    
    skillTreeChart = echarts.init(chartDom);
    
    window.addEventListener('resize', function() {
        if (skillTreeChart) {
            skillTreeChart.resize();
        }
    });
    
    updateSkillTreeChart();
}

// 更新技能樹圖表
function updateSkillTreeChart() {
    const option = {
        tooltip: {
            trigger: 'item',
            triggerOn: 'mousemove',
            formatter: function(params) {
                if (params.data.value) {
                    const status = params.data.status === 'completed' ? '已完成' : 
                                   params.data.status === 'in_progress' ? '進行中' : '待學習';
                    const statusColor = params.data.status === 'completed' ? '#7FB095' : 
                                        params.data.status === 'in_progress' ? '#E3C088' : '#C77F7F';
                    return `
                        <div style="padding: 10px;">
                            <strong style="font-size: 14px;">${params.name}</strong><br/>
                            <span style="color: #718096;">職能分數：</span>
                            <strong style="color: #667eea;">${params.data.value} 分</strong><br/>
                            <span style="color: #718096;">狀態：</span>
                            <strong style="color: ${statusColor};">${status}</strong>
                        </div>
                    `;
                }
                return `<strong>${params.name}</strong>`;
            },
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#E2E4E8',
            borderWidth: 1,
            textStyle: {
                color: '#464E56'
            }
        },
        series: [
            {
                type: 'tree',
                data: [skillTreeData],
                top: '10%',
                left: '10%',
                bottom: '10%',
                right: '20%',
                symbolSize: 12,
                orient: 'LR',
                expandAndCollapse: true,
                initialTreeDepth: 2,
                label: {
                    position: 'right',
                    verticalAlign: 'middle',
                    align: 'left',
                    fontSize: 13,
                    color: '#464E56',
                    formatter: function(params) {
                        if (params.data.value) {
                            return `${params.name}: ${params.data.value}分`;
                        }
                        return params.name;
                    }
                },
                leaves: {
                    label: {
                        position: 'right',
                        verticalAlign: 'middle',
                        align: 'left'
                    }
                },
                itemStyle: {
                    color: function(params) {
                        if (params.data.status === 'completed') return '#7FB095';
                        if (params.data.status === 'in_progress') return '#E3C088';
                        if (params.data.status === 'pending') return '#C77F7F';
                        return '#64748B';
                    },
                    borderColor: '#fff',
                    borderWidth: 2
                },
                lineStyle: {
                    color: '#E2E4E8',
                    width: 2,
                    curveness: 0.5
                },
                emphasis: {
                    focus: 'descendant',
                    itemStyle: {
                        borderColor: '#667eea',
                        borderWidth: 3
                    }
                }
            }
        ]
    };
    
    skillTreeChart.setOption(option, true);
}

// ==================== 課程推薦 ====================

// 更新課程推薦
function updateRecommendations() {
    const $panel = $('#recommendationPanel');
    $panel.empty();
    
    courses.forEach(course => {
        const card = createCourseCard(course);
        $panel.append(card);
    });
}

// 創建課程卡片
function createCourseCard(course) {
    const levelText = course.level === 'basic' ? '基礎' : 
                      course.level === 'advanced' ? '進階' : '專家';
    
    const statusIcon = course.status === 'completed' ? '✓ 已完成' : 
                       course.status === 'in_progress' ? '⏳ 進行中' : '🎯 推薦';
    
    return $(`
        <div class="course-card">
            <div class="course-header">
                <span class="course-badge ${course.level}">${levelText}</span>
            </div>
            <div class="course-title">${course.title}</div>
            <div class="course-meta">
                <span>⏱️ ${course.duration}</span>
                <span>👥 ${course.participants} 人參加</span>
            </div>
            <div class="course-description">${course.description}</div>
            <div class="course-footer">
                <div class="course-progress">
                    <div class="mini-progress-bar">
                        <div class="mini-progress-fill" style="width: ${course.progress}%;"></div>
                    </div>
                    <span>${course.progress}%</span>
                </div>
                <span style="color: #7FB095; font-weight: 600; font-size: 12px;">
                    ${course.improvement}
                </span>
            </div>
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #E2E4E8; font-size: 12px; color: #718096;">
                ${statusIcon} · 提升職能：${course.competency}
            </div>
        </div>
    `);
}

// ==================== 互動功能 ====================

// AI 生成路徑
function generatePath() {
    // 顯示載入動畫
    const loading = $('<div>')
        .css({
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'white',
            padding: '30px 40px',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            zIndex: 9999,
            textAlign: 'center'
        })
        .html(`
            <div class="loading-spinner" style="margin: 0 auto 15px;"></div>
            <div style="font-size: 14px; color: #718096;">AI 正在分析並生成個人化學習路徑...</div>
        `)
        .appendTo('body');
    
    // 模擬 AI 處理時間
    setTimeout(() => {
        loading.fadeOut(300, function() {
            $(this).remove();
        });
        
        alert(`✓ AI 學習路徑已生成！

基於您的職能評估結果，系統推薦以下學習順序：

1. Python 進階開發實戰 (立即開始)
2. 數據分析與商業智能 (預計 2025-02-01)
3. 領導力與團隊管理 (預計 2025-04-01)

預估完成時間：6-9 個月
預估職能提升：+35 分`);
    }, 2000);
}

// 匯出路徑圖
function exportPath() {
    const level = currentLevel === 'org' ? '組織' : 
                  currentLevel === 'dept' ? '部門' : '個人';
    
    alert(`📥 學習路徑圖已匯出！

層級：${level}層級
格式：PDF
包含內容：
- 學習進度時間軸
- 技能發展樹狀圖
- AI 推薦課程清單
- 預估完成時間與效益分析

檔案已儲存至下載資料夾（Demo 模式）`);
}

// ==================== 初始化 ====================

$(document).ready(function() {
    // 初始化課程推薦 (圖表初始化由 tab 切換觸發)
    updateRecommendations();
    
    console.log('✓ 學習發展路徑圖模組已載入');
});
