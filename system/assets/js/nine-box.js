/**
 * Bombus V6.0 - 人才九宮格 (Talent 9-Box Grid)
 * 整合 L5 績效考核 + L2 職能評估 + L1 員工ROI
 * 作者：Bombus Dev Team
 * 日期：2025-11-22
 */

// ==================== 全域變數 ====================

var nineBoxEmployees = [];
let isSimulationMode = false;
let distributionChart = null;
let scatterChart = null;

// ==================== 模擬數據生成 ====================

// 生成員工數據
function generateEmployees() {
    const names = [
        '王小明', '李小華', '張大同', '陳美玲', '林志明',
        '黃雅婷', '吳建國', '劉佳慧', '鄭文豪', '蔡淑芬',
        '周俊傑', '徐麗娟', '趙偉強', '孫曉雲', '馬建華',
        '朱麗麗', '胡志勇', '郭靜怡', '許文龍', '謝明哲',
        '楊雅雯', '賴俊宏', '羅雅婷', '葉建國', '江美惠',
        '簡志豪', '游淑芬', '曾雅玲', '薛文傑', '顏麗君'
    ];
    
    const depts = {
        'rd': '研發部',
        'sales': '業務部',
        'marketing': '行銷部',
        'hr': '人資部',
        'finance': '財務部',
        'customer': '客服部'
    };
    
    const levels = ['staff', 'middle', 'senior'];
    const levelNames = { 'staff': '一般員工', 'middle': '中階主管', 'senior': '高階主管' };
    
    return names.map((name, index) => {
        // 生成績效分數 (30-100)
        const performance = Math.floor(Math.random() * 70) + 30;
        
        // 生成潛力分數 (30-100)
        // 潛力計算公式：(職能成長率 × 0.4) + (培訓轉化率 × 0.3) + (年齡係數 × 0.3)
        const competencyGrowth = Math.floor(Math.random() * 40) + 30;
        const trainingConversion = Math.floor(Math.random() * 40) + 40;
        const ageCoefficient = Math.floor(Math.random() * 30) + 50;
        const potential = Math.floor(
            (competencyGrowth * 0.4) + 
            (trainingConversion * 0.3) + 
            (ageCoefficient * 0.3)
        );
        
        // 決定分類
        const category = determineCategory(performance, potential);
        
        // 隨機分配部門和職級
        const deptKeys = Object.keys(depts);
        const deptKey = deptKeys[Math.floor(Math.random() * deptKeys.length)];
        const level = levels[Math.floor(Math.random() * levels.length)];
        
        return {
            id: `emp-${index + 1}`,
            name: name,
            dept: depts[deptKey],
            deptKey: deptKey,
            level: level,
            levelName: levelNames[level],
            performance: performance,
            potential: potential,
            category: category,
            avatar: name.charAt(0)
        };
    });
}

// 根據績效和潛力判定分類
function determineCategory(performance, potential) {
    // 績效分級：高 >= 75, 中 50-74, 低 < 50
    // 潛力分級：高 >= 70, 中 45-69, 低 < 45
    
    let perfLevel, potLevel;
    
    if (performance >= 75) perfLevel = 'high';
    else if (performance >= 50) perfLevel = 'medium';
    else perfLevel = 'low';
    
    if (potential >= 70) potLevel = 'high';
    else if (potential >= 45) potLevel = 'medium';
    else potLevel = 'low';
    
    // 九宮格映射
    const categoryMap = {
        'high-high': 'star',          // 明星員工
        'high-medium': 'specialist',  // 核心骨幹
        'high-low': 'expert',         // 專業專家
        'medium-high': 'potential',   // 潛力股
        'medium-medium': 'stable',    // 穩定員工
        'medium-low': 'need-improve', // 需改善
        'low-high': 'develop',        // 待開發
        'low-medium': 'risk',         // 風險員工
        'low-low': 'exit'             // 淘汰名單
    };
    
    return categoryMap[`${perfLevel}-${potLevel}`];
}

// ==================== 畫面渲染 ====================

// 更新九宮格
function updateNineBox() {
    const deptFilter = $('#nineBoxDeptFilter').val();
    const levelFilter = $('#nineBoxLevelFilter').val();
    
    // 篩選員工
    let filteredEmployees = nineBoxEmployees.filter(emp => {
        if (deptFilter && deptFilter !== 'all' && emp.deptKey !== deptFilter) return false;
        if (levelFilter && levelFilter !== 'all' && emp.level !== levelFilter) return false;
        return true;
    });
    
    // 清空所有列表
    $('.employee-list').empty();
    
    // 分類計數
    const counts = {};
    filteredEmployees.forEach(emp => {
        if (!counts[emp.category]) counts[emp.category] = 0;
        counts[emp.category]++;
    });
    
    // 更新計數顯示
    Object.keys(counts).forEach(cat => {
        $(`#count-${cat}`).text(counts[cat] || 0);
    });
    
    // 將沒有員工的分類計數設為0
    const allCategories = ['star', 'specialist', 'expert', 'potential', 'stable', 'need-improve', 'develop', 'risk', 'exit'];
    allCategories.forEach(cat => {
        if (!counts[cat]) {
            $(`#count-${cat}`).text(0);
        }
    });
    
    // 渲染員工卡片
    filteredEmployees.forEach(emp => {
        const card = createEmployeeCard(emp);
        $(`#list-${emp.category}`).append(card);
    });
    
    // 更新所有圖表 (優先執行，避免被拖拽初始化錯誤中斷)
    updateDistributionChart(filteredEmployees);
    updateScatterChart(filteredEmployees);
    
    // 初始化拖拽功能
    initDragDrop();
}

// 創建員工卡片
function createEmployeeCard(emp) {
    return $(`
        <div class="employee-card" data-emp-id="${emp.id}" data-category="${emp.category}">
            <div class="employee-avatar">${emp.avatar}</div>
            <div class="employee-info">
                <div class="employee-name">${emp.name}</div>
                <div class="employee-dept">${emp.dept} · ${emp.levelName}</div>
            </div>
            <div class="employee-scores">
                <div class="score-item">
                    <span class="score-label">績:</span>
                    <span class="score-value">${emp.performance}</span>
                </div>
                <div class="score-item">
                    <span class="score-label">潛:</span>
                    <span class="score-value">${emp.potential}</span>
                </div>
            </div>
        </div>
    `);
}

// ==================== 拖拽功能 ====================

// 初始化拖拽功能
function initDragDrop() {
    // 如果不在模擬模式，禁用拖拽
    if (!isSimulationMode) {
        // 僅對已初始化的元素執行 destroy，避免報錯
        try {
            if ($('.employee-card').hasClass('ui-draggable')) {
                $('.employee-card').draggable('destroy');
            }
        } catch (e) {
            console.warn('Draggable destroy skipped:', e);
        }
        $('.employee-card').off('mouseenter');
        return;
    }
    
    // 啟用拖拽
    $('.employee-card').draggable({
        revert: 'invalid',
        helper: 'clone',
        cursor: 'move',
        zIndex: 1000,
        opacity: 0.8,
        start: function(event, ui) {
            $(this).css('opacity', '0.5');
        },
        stop: function(event, ui) {
            $(this).css('opacity', '1');
        }
    });
    
    // 設定放置區域
    $('.employee-list').droppable({
        accept: '.employee-card',
        hoverClass: 'ui-state-hover',
        drop: function(event, ui) {
            const $card = ui.draggable;
            const empId = $card.data('emp-id');
            const oldCategory = $card.data('category');
            const newCategory = $(this).parent().data('category');
            
            // 如果拖到同一個區域，不處理
            if (oldCategory === newCategory) {
                return;
            }
            
            // 移動卡片
            $card.detach().appendTo($(this));
            $card.data('category', newCategory);
            
            // 更新員工數據
            const emp = nineBoxEmployees.find(e => e.id === empId);
            if (emp) {
                emp.category = newCategory;
            }
            
            // 更新計數
            updateCounts();
            
            // 顯示模擬結果
            showSimulationResult(emp, oldCategory, newCategory);
            
            // 更新圖表
            const currentFiltered = getCurrentFilteredEmployees();
            updateDistributionChart(currentFiltered);
            updateScatterChart(currentFiltered);
        }
    });
}

// 獲取當前篩選後的員工 (用於拖拽後更新)
function getCurrentFilteredEmployees() {
    const deptFilter = $('#nineBoxDeptFilter').val();
    const levelFilter = $('#nineBoxLevelFilter').val();
    
    return nineBoxEmployees.filter(emp => {
        if (deptFilter && deptFilter !== 'all' && emp.deptKey !== deptFilter) return false;
        if (levelFilter && levelFilter !== 'all' && emp.level !== levelFilter) return false;
        return true;
    });
}

// 更新計數
function updateCounts() {
    const allCategories = ['star', 'specialist', 'expert', 'potential', 'stable', 'need-improve', 'develop', 'risk', 'exit'];
    
    allCategories.forEach(cat => {
        const count = $(`#list-${cat} .employee-card`).length;
        $(`#count-${cat}`).text(count);
    });
}

// 顯示模擬結果
function showSimulationResult(emp, oldCat, newCat) {
    const categoryNames = {
        'star': '明星員工',
        'specialist': '核心骨幹',
        'expert': '專業專家',
        'potential': '潛力股',
        'stable': '穩定員工',
        'need-improve': '需改善',
        'develop': '待開發',
        'risk': '風險員工',
        'exit': '淘汰名單'
    };
    
    const message = `
        <div style="
            position: fixed;
            top: 80px;
            right: 20px;
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            z-index: 9999;
            max-width: 350px;
            border-left: 4px solid #667eea;
        " class="simulation-toast">
            <div style="font-weight: 700; font-size: 16px; color: #464E56; margin-bottom: 10px;">
                🎯 情境模擬結果
            </div>
            <div style="font-size: 14px; color: #718096; line-height: 1.8;">
                <strong>${emp.name}</strong> 從 <span style="color: #C77F7F;">${categoryNames[oldCat]}</span> 
                移至 <span style="color: #7FB095;">${categoryNames[newCat]}</span>
                <br><br>
                <strong>預期影響：</strong><br>
                • 組織能力提升：<strong style="color: #7FB095;">+2.3%</strong><br>
                • 接班人覆蓋率：<strong style="color: #7FB095;">+5%</strong><br>
                • 培訓需求調整：需安排進階課程
            </div>
        </div>
    `;
    
    $(message).appendTo('body').fadeIn(300).delay(4000).fadeOut(300, function() {
        $(this).remove();
    });
}

// ==================== 圖表渲染 ====================

// 初始化所有九宮格圖表
function initNineBoxCharts() {
    initDistributionChart();
    initScatterChart();
}

// 初始化分佈圖表 (Pie)
function initDistributionChart() {
    const chartDom = document.getElementById('distributionChart');
    if (!chartDom) return;
    
    // 如果已存在實例，先銷毀
    if (distributionChart) {
        distributionChart.dispose();
    }
    
    distributionChart = echarts.init(chartDom);
    
    // 監聽視窗調整
    window.addEventListener('resize', function() {
        if (distributionChart) {
            distributionChart.resize();
        }
    });
}

// 初始化散佈圖表 (Scatter)
function initScatterChart() {
    const chartDom = document.getElementById('scatterChart');
    if (!chartDom) return;
    
    // 如果已存在實例，先銷毀
    if (scatterChart) {
        scatterChart.dispose();
    }
    
    scatterChart = echarts.init(chartDom);
    
    // 監聽視窗調整
    window.addEventListener('resize', function() {
        if (scatterChart) {
            scatterChart.resize();
        }
    });
}

// 更新分佈圖表
function updateDistributionChart(employeeList) {
    if (!distributionChart) {
        initDistributionChart();
        if (!distributionChart) return; // 如果還是初始化失敗，則跳過
    }
    
    // 統計各分類人數
    const counts = {
        '明星員工': 0, '核心骨幹': 0, '專業專家': 0,
        '潛力股': 0, '穩定員工': 0, '需改善': 0,
        '待開發': 0, '風險員工': 0, '淘汰名單': 0
    };
    
    const categoryMap = {
        'star': '明星員工', 'specialist': '核心骨幹', 'expert': '專業專家',
        'potential': '潛力股', 'stable': '穩定員工', 'need-improve': '需改善',
        'develop': '待開發', 'risk': '風險員工', 'exit': '淘汰名單'
    };
    
    employeeList.forEach(emp => {
        const catName = categoryMap[emp.category];
        if (catName) counts[catName]++;
    });
    
    const option = {
        title: {
            text: '人才分類分佈',
            left: 'center',
            top: '3%',
            textStyle: { fontSize: 16, fontWeight: 600, color: '#464E56' }
        },
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} 人 ({d}%)',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#E2E4E8',
            borderWidth: 1,
            textStyle: { color: '#464E56' }
        },
        legend: {
            orient: 'horizontal',
            left: 'center',
            bottom: '3%',
            textStyle: { color: '#464E56', fontSize: 12 },
            itemGap: 15,
            itemWidth: 14,
            itemHeight: 14
        },
        series: [{
            name: '人才分佈',
            type: 'pie',
            radius: ['40%', '65%'],
            center: ['50%', '50%'],
            avoidLabelOverlap: true,
            itemStyle: {
                borderRadius: 8,
                borderColor: '#fff',
                borderWidth: 2
            },
            label: { show: false },
            emphasis: {
                label: {
                    show: true,
                    fontSize: 14,
                    fontWeight: 'bold',
                    formatter: '{b}\n{c} 人'
                },
                itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.3)'
                }
            },
            data: Object.entries(counts).map(([name, value]) => ({
                name: name,
                value: value
            })),
            color: [
                '#8DA399', '#7F9CA0', '#D6A28C',
                '#7FB095', '#8DA8BE', '#B87D7B',
                '#E3C088', '#C77F7F', '#858E96'
            ]
        }]
    };
    
    distributionChart.setOption(option, true);
}

// 更新散佈圖表
function updateScatterChart(employeeList) {
    if (!scatterChart) {
        initScatterChart();
        if (!scatterChart) return; // 如果還是初始化失敗，則跳過
    }
    
    // 取得顏色映射函數
    function getCategoryColor(category) {
        const colors = {
            'star': '#8DA399', 'potential': '#7FB095', 'specialist': '#7F9CA0',
            'expert': '#D6A28C', 'stable': '#8DA8BE', 'risk': '#C77F7F',
            'develop': '#E3C088', 'need-improve': '#B87D7B', 'exit': '#858E96'
        };
        return colors[category] || '#ccc';
    }
    
    const option = {
        title: {
            text: '人才分佈散佈圖',
            left: 'center',
            textStyle: { fontSize: 16 }
        },
        tooltip: {
            formatter: function (param) {
                const p = param.data;
                return `${p.name}<br/>績效: ${p.value[0]}<br/>潛力: ${p.value[1]}<br/>${p.dept}`;
            }
        },
        grid: {
            left: '10%',
            right: '15%',
            top: '15%',
            bottom: '10%'
        },
        xAxis: {
            name: '績效',
            type: 'value',
            min: 0, max: 100,
            splitLine: { show: false }
        },
        yAxis: {
            name: '潛力',
            type: 'value',
            min: 0, max: 100,
            splitLine: { show: false }
        },
        series: [{
            symbolSize: 10,
            data: employeeList.map(item => ({
                name: item.name,
                value: [item.performance, item.potential],
                dept: item.dept,
                itemStyle: {
                    color: getCategoryColor(item.category)
                }
            })),
            type: 'scatter'
        },
        {
            type: 'line',
            markLine: {
                silent: true,
                symbol: 'none',
                label: { show: false },
                lineStyle: { type: 'dashed', color: '#ccc' },
                data: [
                    { xAxis: 50 }, { xAxis: 75 },
                    { yAxis: 45 }, { yAxis: 70 }
                ]
            }
        }]
    };
    
    scatterChart.setOption(option, true);
}

// ==================== 互動功能 ====================

// 切換模擬模式
function toggleSimulationMode() {
    isSimulationMode = !isSimulationMode;
    
    if (isSimulationMode) {
        $('#simulationPanel').slideDown(300);
        initDragDrop();
        $('.btn-warning').text('🔒 退出模擬模式').css('background', '#C77F7F');
    } else {
        $('#simulationPanel').slideUp(300);
        $('.employee-card').draggable('destroy');
        $('.btn-warning').text('🎯 情境模擬模式').css('background', '#E3C088');
    }
}

// 重置九宮格
function resetGrid() {
    if (confirm('確定要重置九宮格到初始狀態嗎？')) {
        // 重新生成員工數據
        nineBoxEmployees = generateEmployees();
        updateNineBox();
        
        alert('✓ 九宮格已重置到初始狀態');
    }
}

// 儲存模擬
function saveSimulation() {
    if (!isSimulationMode) {
        alert('請先啟動情境模擬模式');
        return;
    }
    
    // 模擬儲存邏輯
    const simulationData = {
        timestamp: new Date().toISOString(),
        employees: nineBoxEmployees.map(emp => ({
            id: emp.id,
            name: emp.name,
            category: emp.category
        }))
    };
    
    console.log('儲存模擬結果：', simulationData);
    
    alert('✓ 模擬結果已儲存！\n您可以隨時載入此情境進行比較分析。');
}

// 匯出九宮格
function exportGrid() {
    // 生成報告數據
    const report = {
        title: '人才九宮格分析報告',
        date: new Date().toLocaleDateString('zh-TW'),
        summary: {
            total: nineBoxEmployees.length,
            star: $(`#list-star .employee-card`).length,
            potential: $(`#list-potential .employee-card`).length,
            risk: $(`#list-risk .employee-card`).length + $(`#list-exit .employee-card`).length
        }
    };
    
    console.log('匯出報告：', report);
    
    alert(`📊 人才九宮格分析報告
    
總人數：${report.summary.total} 人
明星員工：${report.summary.star} 人
潛力股：${report.summary.potential} 人
風險員工：${report.summary.risk} 人

報告已匯出為 PDF 格式（Demo 模式）`);
}

// ==================== 初始化 ====================

$(document).ready(function() {
    // 生成初始員工數據
    nineBoxEmployees = generateEmployees();
    
    // 初始化圖表 (DOM可能還沒準備好，由 tab 切換時觸發更佳)
    // 這裡保留是為了防呆，如果直接進入頁面
    initNineBoxCharts();
    
    // 渲染九宮格
    updateNineBox();
    
    console.log('✓ 人才九宮格模組已載入，共', nineBoxEmployees.length, '位員工');
});
