/**
 * Bombus V6.0 - AI 智能面試評核系統
 * 整合 STT 語音辨識 + NLP 語意分析 + LLM 評分
 * 作者：Bombus Dev Team
 * 日期：2025-11-23
 */

// ==================== 全域變數 ====================

let currentCandidate = null;
let audioPlayer = null;
let emotionChart = null;
let radarChart = null;

// ==================== 模擬數據 ====================

// 候選人列表
const candidates = [
    {
        id: 'c001',
        name: '王小明',
        position: '前端工程師',
        date: '2025-11-20',
        status: 'completed',
        audioUrl: 'demo-interview-1.mp3',
        duration: '18:32',
        scores: {
            keyword: 85,
            semantic: 78,
            match: 82,
            final: 82
        },
        abilities: {
            logic: 85,
            communication: 90,
            technical: 88,
            teamwork: 82,
            pressure: 75,
            learning: 92
        }
    },
    {
        id: 'c002',
        name: '李小華',
        position: '後端工程師',
        date: '2025-11-21',
        status: 'completed',
        audioUrl: 'demo-interview-2.mp3',
        duration: '22:15',
        scores: {
            keyword: 92,
            semantic: 85,
            match: 88,
            final: 88
        },
        abilities: {
            logic: 92,
            communication: 80,
            technical: 95,
            teamwork: 85,
            pressure: 88,
            learning: 87
        }
    },
    {
        id: 'c003',
        name: '張大同',
        position: 'UI/UX 設計師',
        date: '2025-11-22',
        status: 'completed',
        audioUrl: 'demo-interview-3.mp3',
        duration: '16:45',
        scores: {
            keyword: 78,
            semantic: 82,
            match: 75,
            final: 78
        },
        abilities: {
            logic: 75,
            communication: 88,
            technical: 72,
            teamwork: 90,
            pressure: 70,
            learning: 85
        }
    },
    {
        id: 'c004',
        name: '陳美玲',
        position: '專案經理',
        date: '2025-11-23',
        status: 'pending',
        audioUrl: null,
        duration: '--',
        scores: null,
        abilities: null
    },
    {
        id: 'c005',
        name: '林志明',
        position: '資料分析師',
        date: '2025-11-23',
        status: 'completed',
        audioUrl: 'demo-interview-5.mp3',
        duration: '20:30',
        scores: {
            keyword: 88,
            semantic: 90,
            match: 85,
            final: 88
        },
        abilities: {
            logic: 95,
            communication: 82,
            technical: 90,
            teamwork: 80,
            pressure: 85,
            learning: 88
        }
    }
];

// 逐字稿數據 (模擬)
const transcripts = {
    'c001': [
        {
            time: '00:32',
            text: '我在前端開發領域有三年的經驗，主要使用 <span class="keyword-positive">React</span> 和 <span class="keyword-positive">Vue</span> 框架。我非常熱愛學習新技術，並且能夠快速適應團隊的工作節奏。'
        },
        {
            time: '01:15',
            text: '在上一份工作中，我負責開發公司的電商平台前端，這個專案讓我學會了如何處理<span class="keyword-positive">複雜的狀態管理</span>和<span class="keyword-positive">效能優化</span>。'
        },
        {
            time: '02:45',
            text: '關於<span class="keyword-negative">壓力</span>管理，我認為...嗯...這確實是一個挑戰。但我會透過<span class="keyword-positive">時間管理</span>和<span class="keyword-positive">優先順序排列</span>來應對。'
        },
        {
            time: '04:20',
            text: '我最擅長的是<span class="keyword-positive">團隊協作</span>，我相信良好的<span class="keyword-positive">溝通</span>是專案成功的關鍵。在之前的團隊中，我經常主動分享知識和幫助新人。'
        },
        {
            time: '06:10',
            text: '對於這個職位，我認為我的技術背景和<span class="keyword-positive">學習能力</span>都很符合需求。我對貴公司的產品非常感興趣，希望能夠貢獻我的專業。'
        }
    ],
    'c002': [
        {
            time: '00:28',
            text: '我有五年的<span class="keyword-positive">後端開發</span>經驗，精通 <span class="keyword-positive">Node.js</span>、<span class="keyword-positive">Python</span> 和 <span class="keyword-positive">Go</span>。我特別擅長<span class="keyword-positive">系統架構設計</span>和<span class="keyword-positive">效能調優</span>。'
        },
        {
            time: '01:50',
            text: '在前公司，我主導了微服務架構的改造，成功將系統響應時間降低了 60%。這個過程中我學會了如何在<span class="keyword-positive">高壓環境</span>下做出正確的技術決策。'
        },
        {
            time: '03:30',
            text: '我認為<span class="keyword-positive">程式碼品質</span>和<span class="keyword-positive">可維護性</span>非常重要。我會定期進行 Code Review，並且推動團隊採用最佳實踐。'
        },
        {
            time: '05:15',
            text: '關於<span class="keyword-positive">團隊合作</span>，我相信技術人員也需要良好的<span class="keyword-positive">溝通能力</span>。我經常與前端、產品和設計團隊協作，確保需求理解一致。'
        },
        {
            time: '07:00',
            text: '我對這個職位非常感興趣，因為貴公司的技術棧和我的專長高度匹配。我相信我能夠快速融入團隊並創造價值。'
        }
    ],
    'c003': [
        {
            time: '00:35',
            text: '我是一名 UI/UX 設計師，有四年的設計經驗。我擅長<span class="keyword-positive">使用者研究</span>、<span class="keyword-positive">原型設計</span>和<span class="keyword-positive">視覺設計</span>。'
        },
        {
            time: '02:10',
            text: '在設計流程中，我非常重視<span class="keyword-positive">使用者體驗</span>。我會進行<span class="keyword-positive">使用性測試</span>，並根據反饋不斷優化設計。'
        },
        {
            time: '03:45',
            text: '關於<span class="keyword-negative">時間壓力</span>，有時候確實會感到...嗯...有點<span class="keyword-negative">焦慮</span>。但我會透過<span class="keyword-positive">專案管理工具</span>來控制進度。'
        },
        {
            time: '05:20',
            text: '我最喜歡的部分是與<span class="keyword-positive">跨職能團隊</span>合作。設計不是孤立的，需要與工程師、產品經理密切<span class="keyword-positive">溝通</span>才能做出好產品。'
        },
        {
            time: '06:50',
            text: '我對貴公司的設計理念非常認同，希望能夠加入團隊，為產品帶來更好的使用者體驗。'
        }
    ],
    'c005': [
        {
            time: '00:40',
            text: '我是資料分析師，擅長使用 <span class="keyword-positive">Python</span>、<span class="keyword-positive">SQL</span> 和 <span class="keyword-positive">Tableau</span> 進行<span class="keyword-positive">數據分析</span>和<span class="keyword-positive">視覺化</span>。'
        },
        {
            time: '02:15',
            text: '在前公司，我負責建立<span class="keyword-positive">商業智能儀表板</span>，幫助管理層做出<span class="keyword-positive">數據驅動</span>的決策。我對<span class="keyword-positive">統計分析</span>和<span class="keyword-positive">機器學習</span>都有深入了解。'
        },
        {
            time: '04:00',
            text: '我認為數據分析師不僅需要技術能力，還需要<span class="keyword-positive">商業思維</span>。我會主動了解業務需求，並將數據轉化為可執行的<span class="keyword-positive">洞察</span>。'
        },
        {
            time: '05:45',
            text: '關於<span class="keyword-positive">團隊協作</span>，我經常需要與不同部門溝通。我會用<span class="keyword-positive">清晰的視覺化</span>來呈現複雜的數據，讓非技術人員也能理解。'
        },
        {
            time: '07:30',
            text: '我對這個職位充滿熱情，相信我的<span class="keyword-positive">分析能力</span>和<span class="keyword-positive">商業洞察</span>能為公司創造價值。'
        }
    ]
};

// 情緒時間軸數據 (模擬)
const emotionData = {
    'c001': [
        { time: 0, confidence: 85, anxiety: 15, enthusiasm: 70 },
        { time: 2, confidence: 80, anxiety: 20, enthusiasm: 75 },
        { time: 4, confidence: 70, anxiety: 30, enthusiasm: 65 },
        { time: 6, confidence: 75, anxiety: 25, enthusiasm: 70 },
        { time: 8, confidence: 85, anxiety: 15, enthusiasm: 80 },
        { time: 10, confidence: 90, anxiety: 10, enthusiasm: 85 },
        { time: 12, confidence: 88, anxiety: 12, enthusiasm: 82 },
        { time: 14, confidence: 85, anxiety: 15, enthusiasm: 80 },
        { time: 16, confidence: 90, anxiety: 10, enthusiasm: 88 },
        { time: 18, confidence: 92, anxiety: 8, enthusiasm: 90 }
    ],
    'c002': [
        { time: 0, confidence: 90, anxiety: 10, enthusiasm: 85 },
        { time: 2, confidence: 92, anxiety: 8, enthusiasm: 88 },
        { time: 4, confidence: 95, anxiety: 5, enthusiasm: 90 },
        { time: 6, confidence: 93, anxiety: 7, enthusiasm: 88 },
        { time: 8, confidence: 90, anxiety: 10, enthusiasm: 85 },
        { time: 10, confidence: 92, anxiety: 8, enthusiasm: 87 },
        { time: 12, confidence: 95, anxiety: 5, enthusiasm: 92 },
        { time: 14, confidence: 93, anxiety: 7, enthusiasm: 90 },
        { time: 16, confidence: 90, anxiety: 10, enthusiasm: 88 },
        { time: 18, confidence: 92, anxiety: 8, enthusiasm: 90 },
        { time: 20, confidence: 95, anxiety: 5, enthusiasm: 93 },
        { time: 22, confidence: 93, anxiety: 7, enthusiasm: 91 }
    ],
    'c003': [
        { time: 0, confidence: 75, anxiety: 25, enthusiasm: 70 },
        { time: 2, confidence: 78, anxiety: 22, enthusiasm: 75 },
        { time: 4, confidence: 70, anxiety: 30, enthusiasm: 65 },
        { time: 6, confidence: 72, anxiety: 28, enthusiasm: 68 },
        { time: 8, confidence: 80, anxiety: 20, enthusiasm: 75 },
        { time: 10, confidence: 82, anxiety: 18, enthusiasm: 78 },
        { time: 12, confidence: 85, anxiety: 15, enthusiasm: 80 },
        { time: 14, confidence: 83, anxiety: 17, enthusiasm: 78 },
        { time: 16, confidence: 85, anxiety: 15, enthusiasm: 82 }
    ],
    'c005': [
        { time: 0, confidence: 88, anxiety: 12, enthusiasm: 82 },
        { time: 2, confidence: 90, anxiety: 10, enthusiasm: 85 },
        { time: 4, confidence: 92, anxiety: 8, enthusiasm: 88 },
        { time: 6, confidence: 90, anxiety: 10, enthusiasm: 86 },
        { time: 8, confidence: 88, anxiety: 12, enthusiasm: 84 },
        { time: 10, confidence: 90, anxiety: 10, enthusiasm: 87 },
        { time: 12, confidence: 93, anxiety: 7, enthusiasm: 90 },
        { time: 14, confidence: 91, anxiety: 9, enthusiasm: 88 },
        { time: 16, confidence: 90, anxiety: 10, enthusiasm: 87 },
        { time: 18, confidence: 92, anxiety: 8, enthusiasm: 90 },
        { time: 20, confidence: 93, anxiety: 7, enthusiasm: 91 }
    ]
};

// ==================== 初始化 ====================

$(document).ready(function() {
    // 渲染候選人列表
    renderCandidateList();
    
    // 初始化圖表
    initEmotionChart();
    initRadarChart();
    
    // 綁定搜尋事件
    $('#candidateSearch').on('input', function() {
        const searchTerm = $(this).val().toLowerCase();
        filterCandidates(searchTerm);
    });

    // 綁定筆記輸入事件
    $('#interviewerNotes').on('input', function() {
        analyzeNotes($(this).val());
    });
    
    console.log('✓ AI 智能面試系統已載入');
});

// ==================== 設定與筆記功能 ====================

// 開啟設定 Modal
function openSettings() {
    $('#settingsModal').fadeIn(200).css('display', 'flex');
}

// 關閉設定 Modal
function closeSettings() {
    $('#settingsModal').fadeOut(200);
}

// 新增關鍵字
function addKeyword() {
    const keyword = $('#newKeyword').val().trim();
    const type = $('#keywordType').val();
    
    if (!keyword) return;
    
    const classType = type === 'positive' ? 'keyword-positive' : 'keyword-negative';
    const html = `<span class="${classType}">${keyword} <i class="ri-close-line" onclick="$(this).parent().remove()" style="cursor: pointer; margin-left: 4px;"></i></span>`;
    
    $('#keywordList').append(html);
    $('#newKeyword').val('');
}

// 更新權重顯示
function updateWeight(input, labelId) {
    $(`#${labelId}`).text(input.value + '%');
}

// 儲存設定
function saveSettings() {
    // 模擬儲存過程
    const btn = $('button[onclick="saveSettings()"]');
    const originalText = btn.text();
    
    btn.text('儲存中...').prop('disabled', true);
    
    setTimeout(() => {
        btn.text(originalText).prop('disabled', false);
        closeSettings();
        
        // 顯示成功提示
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
            .html('<i class="ri-check-line"></i> 設定已更新')
            .appendTo('body')
            .fadeIn(300)
            .delay(2000)
            .fadeOut(300, function() { $(this).remove(); });
    }, 800);
}

// 切換 Tab
function switchTab(tabName) {
    $('.analysis-tab-btn').removeClass('active');
    
    if (tabName === 'transcript') {
        $('.analysis-tab-btn:first-child').addClass('active');
        $('#transcript-view').show();
        $('#notes-view').hide();
    } else {
        $('.analysis-tab-btn:last-child').addClass('active');
        $('#transcript-view').hide();
        $('#notes-view').show();
    }
}

// 即時筆記分析 (模擬)
let typingTimer;
function analyzeNotes(text) {
    $('#typing-status').show().html('<i class="ri-loader-4-line ri-spin"></i> AI 分析中...');
    
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        // 模擬分析完成
        const keywords = ['團隊', '溝通', '壓力', '學習', '負責'];
        const found = keywords.filter(k => text.includes(k));
        
        if (found.length > 0) {
            $('#typing-status').html(`<i class="ri-check-double-line"></i> 已偵測 ${found.length} 個關鍵指標`);
            
            // 這裡可以加入更複雜的邏輯，例如即時更新分數預覽
        } else {
            $('#typing-status').hide();
        }
    }, 800);
}

// ==================== 候選人列表 ====================

// 渲染候選人列表
function renderCandidateList() {
    const $list = $('#candidateList');
    $list.empty();
    
    candidates.forEach(candidate => {
        const statusClass = candidate.status === 'completed' ? 'status-completed' : 'status-pending';
        const statusText = candidate.status === 'completed' ? '已完成' : '待面試';
        
        const $item = $(`
            <div class="candidate-item" data-id="${candidate.id}">
                <div class="candidate-header">
                    <div class="candidate-avatar">${candidate.name.charAt(0)}</div>
                    <div class="candidate-info">
                        <div class="candidate-name">${candidate.name}</div>
                        <div class="candidate-position">${candidate.position}</div>
                    </div>
                </div>
                <div class="candidate-meta">
                    <span><i class="ri-calendar-line"></i> ${candidate.date}</span>
                    <span class="candidate-status ${statusClass}">${statusText}</span>
                </div>
            </div>
        `);
        
        $item.on('click', function() {
            selectCandidate(candidate.id);
        });
        
        $list.append($item);
    });
}

// 篩選候選人
function filterCandidates(searchTerm) {
    $('.candidate-item').each(function() {
        const $item = $(this);
        const name = $item.find('.candidate-name').text().toLowerCase();
        const position = $item.find('.candidate-position').text().toLowerCase();
        
        if (name.includes(searchTerm) || position.includes(searchTerm)) {
            $item.show();
        } else {
            $item.hide();
        }
    });
}

// 選擇候選人
function selectCandidate(candidateId) {
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;
    
    currentCandidate = candidate;
    
    // 更新選中狀態
    $('.candidate-item').removeClass('active');
    $(`.candidate-item[data-id="${candidateId}"]`).addClass('active');
    
    // 載入面試內容
    loadInterviewContent(candidate);
}

// ==================== 播放器 ====================

// 載入面試內容
function loadInterviewContent(candidate) {
    const $container = $('#playerContainer');
    
    if (candidate.status === 'pending') {
        $container.html(`
            <div class="player-placeholder">
                <i class="ri-time-line"></i>
                <p>此候選人尚未完成面試</p>
                <small>面試日期：${candidate.date}</small>
            </div>
        `);
        
        // 清空逐字稿和評分
        clearTranscript();
        clearScores();
        return;
    }
    
    // 渲染播放器
    $container.html(`
        <div class="audio-player">
            <audio controls id="audioPlayer">
                <source src="${candidate.audioUrl}" type="audio/mpeg">
                您的瀏覽器不支援音訊播放。
            </audio>
            <div class="player-info">
                <span><i class="ri-user-line"></i> ${candidate.name} - ${candidate.position}</span>
                <span><i class="ri-time-line"></i> ${candidate.duration}</span>
            </div>
        </div>
        <div class="player-controls">
            <button class="control-btn" onclick="playAudio()">
                <i class="ri-play-line"></i>
                播放
            </button>
            <button class="control-btn" onclick="pauseAudio()">
                <i class="ri-pause-line"></i>
                暫停
            </button>
            <button class="control-btn" onclick="resetAudio()">
                <i class="ri-restart-line"></i>
                重新開始
            </button>
        </div>
    `);
    
    audioPlayer = document.getElementById('audioPlayer');
    
    // 載入逐字稿
    loadTranscript(candidate.id);
    
    // 更新情緒圖表
    updateEmotionChart(candidate.id);
    
    // 更新評分
    updateScores(candidate.scores);
    
    // 更新雷達圖
    updateRadarChart(candidate.abilities);

    // 確保圖表大小正確 (處理動態內容導致的寬度變化)
    setTimeout(() => {
        if (emotionChart) emotionChart.resize();
        if (radarChart) radarChart.resize();
    }, 200);
}

// 播放音訊
function playAudio() {
    if (audioPlayer) {
        audioPlayer.play();
    }
}

// 暫停音訊
function pauseAudio() {
    if (audioPlayer) {
        audioPlayer.pause();
    }
}

// 重新開始
function resetAudio() {
    if (audioPlayer) {
        audioPlayer.currentTime = 0;
        audioPlayer.play();
    }
}

// ==================== 逐字稿 ====================

// 載入逐字稿
function loadTranscript(candidateId) {
    // 確保顯示逐字稿 Tab
    switchTab('transcript');

    const $content = $('#transcript-view');
    const transcript = transcripts[candidateId];
    
    if (!transcript || transcript.length === 0) {
        $content.html(`
            <p style="text-align: center; color: var(--color-text-secondary); padding: 40px 20px;">
                <i class="ri-chat-3-line" style="font-size: 48px; display: block; margin-bottom: 15px; opacity: 0.3;"></i>
                此候選人暫無逐字稿<br>
                <small>系統正在處理中...</small>
            </p>
        `);
        return;
    }
    
    $content.empty();
    
    transcript.forEach(line => {
        const $line = $(`
            <div class="transcript-line">
                <div class="transcript-time">${line.time}</div>
                <div class="transcript-text">${line.text}</div>
            </div>
        `);
        $content.append($line);
    });
}

// 清空逐字稿
function clearTranscript() {
    $('#transcript-view').html(`
        <p style="text-align: center; color: var(--color-text-secondary); padding: 40px 20px;">
            <i class="ri-chat-3-line" style="font-size: 48px; display: block; margin-bottom: 15px; opacity: 0.3;"></i>
            尚無逐字稿內容<br>
            <small>播放面試錄音後將自動顯示</small>
        </p>
    `);
    
    // 清空筆記
    $('#interviewerNotes').val('');
    $('#typing-status').hide();
}

// ==================== 情緒圖表 ====================

// 初始化情緒圖表
function initEmotionChart() {
    const chartDom = document.getElementById('emotionChart');
    if (!chartDom) return;
    
    // 延遲初始化以確保 DOM 渲染完成
    setTimeout(() => {
        if (emotionChart) emotionChart.dispose();
        emotionChart = echarts.init(chartDom);
        
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
                data: ['自信度', '焦慮度', '熱情度'],
                bottom: '5%',
                textStyle: {
                    color: '#464E56',
                    fontSize: 12
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '15%',
                top: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: [],
                axisLabel: {
                    formatter: '{value} 分',
                    color: '#858E96',
                    fontSize: 11
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
                    fontSize: 11
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
                    name: '自信度',
                    type: 'line',
                    data: [],
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
                    name: '焦慮度',
                    type: 'line',
                    data: [],
                    smooth: true,
                    lineStyle: {
                        width: 3,
                        color: '#C77F7F'
                    },
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                                { offset: 0, color: 'rgba(199, 127, 127, 0.3)' },
                                { offset: 1, color: 'rgba(199, 127, 127, 0.05)' }
                            ]
                        }
                    },
                    itemStyle: {
                        color: '#C77F7F'
                    }
                },
                {
                    name: '熱情度',
                    type: 'line',
                    data: [],
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
        
        emotionChart.setOption(option);
        
        window.addEventListener('resize', function() {
            if (emotionChart) {
                emotionChart.resize();
            }
        });
    }, 100);
}

// 更新情緒圖表
function updateEmotionChart(candidateId) {
    const data = emotionData[candidateId];
    
    if (!data || data.length === 0) {
        return;
    }
    
    const timeLabels = data.map(d => d.time);
    const confidenceData = data.map(d => d.confidence);
    const anxietyData = data.map(d => d.anxiety);
    const enthusiasmData = data.map(d => d.enthusiasm);
    
    emotionChart.setOption({
        xAxis: {
            data: timeLabels
        },
        series: [
            { data: confidenceData },
            { data: anxietyData },
            { data: enthusiasmData }
        ]
    });
}

// ==================== 評分系統 ====================

// 更新評分
function updateScores(scores) {
    if (!scores) {
        clearScores();
        return;
    }
    
    // 動畫效果更新分數
    animateScore('#scoreKeyword', scores.keyword);
    animateScore('#scoreSemantic', scores.semantic);
    animateScore('#scoreMatch', scores.match);
    animateScore('#scoreFinal', scores.final);
}

// 清空評分
function clearScores() {
    $('#scoreKeyword').text('--');
    $('#scoreSemantic').text('--');
    $('#scoreMatch').text('--');
    $('#scoreFinal').text('--');
}

// 分數動畫
function animateScore(selector, targetScore) {
    const $element = $(selector);
    let currentScore = 0;
    const increment = targetScore / 30; // 30 幀動畫
    
    const interval = setInterval(() => {
        currentScore += increment;
        if (currentScore >= targetScore) {
            currentScore = targetScore;
            clearInterval(interval);
        }
        $element.text(Math.round(currentScore));
    }, 20);
}

// ==================== 雷達圖 ====================

// 初始化雷達圖
function initRadarChart() {
    const chartDom = document.getElementById('radarChart');
    if (!chartDom) return;

    // 延遲初始化以確保 DOM 渲染完成
    setTimeout(() => {
        if (radarChart) radarChart.dispose();
        radarChart = echarts.init(chartDom);
        
        const option = {
            title: {
                text: '能力雷達圖',
                left: 'center',
                top: '3%',
                textStyle: {
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#464E56'
                }
            },
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: '#E2E4E8',
                borderWidth: 1,
                textStyle: {
                    color: '#464E56'
                }
            },
            legend: {
                data: ['候選人能力'],
                bottom: '3%',
                textStyle: {
                    color: '#464E56',
                    fontSize: 12
                }
            },
            radar: {
                center: ['50%', '55%'],
                radius: '60%',
                indicator: [
                    { name: '邏輯思考', max: 100 },
                    { name: '溝通能力', max: 100 },
                    { name: '技術能力', max: 100 },
                    { name: '團隊合作', max: 100 },
                    { name: '抗壓性', max: 100 },
                    { name: '學習能力', max: 100 }
                ],
                splitArea: {
                    areaStyle: {
                        color: ['rgba(141, 163, 153, 0.05)', 'rgba(141, 163, 153, 0.1)']
                    }
                },
                axisLine: {
                    lineStyle: {
                        color: 'rgba(141, 163, 153, 0.3)'
                    }
                },
                splitLine: {
                    lineStyle: {
                        color: 'rgba(141, 163, 153, 0.3)'
                    }
                }
            },
            series: [{
                name: '候選人能力',
                type: 'radar',
                data: [
                    {
                        value: [0, 0, 0, 0, 0, 0],
                        name: '候選人能力',
                        areaStyle: {
                            color: 'rgba(141, 163, 153, 0.3)'
                        },
                        lineStyle: {
                            color: '#8DA399',
                            width: 2
                        },
                        itemStyle: {
                            color: '#8DA399'
                        }
                    }
                ]
            }]
        };
        
        radarChart.setOption(option);
        
        window.addEventListener('resize', function() {
            if (radarChart) {
                radarChart.resize();
            }
        });
    }, 100);
}

// 更新雷達圖
function updateRadarChart(abilities) {
    if (!abilities) {
        radarChart.setOption({
            series: [{
                data: [
                    {
                        value: [0, 0, 0, 0, 0, 0]
                    }
                ]
            }]
        });
        return;
    }
    
    const radarData = [
        abilities.logic,
        abilities.communication,
        abilities.technical,
        abilities.teamwork,
        abilities.pressure,
        abilities.learning
    ];
    
    radarChart.setOption({
        series: [{
            data: [
                {
                    value: radarData,
                    name: '候選人能力'
                }
            ]
        }]
    });
}

// ==================== 匯出功能 ====================

// 匯出報告
function exportReport() {
    if (!currentCandidate) {
        alert('請先選擇候選人');
        return;
    }
    
    alert(`📄 評估報告已匯出！

候選人：${currentCandidate.name}
職位：${currentCandidate.position}
綜合評分：${currentCandidate.scores ? currentCandidate.scores.final : '--'} 分

報告包含：
- 面試逐字稿
- AI 評分分析
- 能力雷達圖
- 錄用建議

檔案已儲存至下載資料夾（Demo 模式）`);
}

// 錄用建議
function hireRecommendation() {
    if (!currentCandidate || !currentCandidate.scores) {
        alert('請先選擇已完成面試的候選人');
        return;
    }
    
    const score = currentCandidate.scores.final;
    let recommendation = '';
    let icon = '';
    let salaryRange = '';
    let highlights = '';
    let risks = '';
    
    if (score >= 85) {
        recommendation = '強烈推薦錄用';
        icon = '✅';
        salaryRange = '65k - 75k';
        highlights = '• 技術能力卓越，即戰力強\n• 溝通邏輯清晰，具備領導潛力';
        risks = '• 期望薪資可能高於預算';
    } else if (score >= 75) {
        recommendation = '建議錄用';
        icon = '👍';
        salaryRange = '55k - 65k';
        highlights = '• 核心技能符合需求\n• 團隊協作態度佳';
        risks = '• 專案管理經驗稍弱，需主管帶領';
    } else if (score >= 65) {
        recommendation = '可考慮錄用';
        icon = '🤔';
        salaryRange = '45k - 55k';
        highlights = '• 學習意願高\n• 基礎能力達標';
        risks = '• 實務經驗不足，培訓成本較高';
    } else {
        recommendation = '不建議錄用';
        icon = '❌';
        salaryRange = '--';
        highlights = '• 無明顯亮點';
        risks = '• 技術能力與職位要求落差大';
    }
    
    alert(`${icon} AI 錄用建議報告

候選人：${currentCandidate.name}
綜合評分：${score} 分
建議結果：${recommendation}

💰 建議薪資範圍
NT$ ${salaryRange} / 月

✨ 亮點摘要
${highlights}

⚠️ 風險提示
${risks}

📊 評分細節
• 關鍵字匹配：${currentCandidate.scores.keyword} 分
• 語意分析：${currentCandidate.scores.semantic} 分
• JD 適配度：${currentCandidate.scores.match} 分

${score >= 75 ? '此候選人表現優異，建議進入下一輪面試或直接發送 Offer。' : '建議進一步評估或考慮其他候選人。'}`);
}

