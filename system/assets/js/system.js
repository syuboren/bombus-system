/**
 * Bombus 企業管理系統 - 主 JavaScript
 * 處理側邊欄、選單展開收合、互動效果
 */

(function($) {
    'use strict';

    // ========================================
    // Document Ready
    // ========================================
    $(document).ready(function() {
        initSidebar();
        initMenu();
        initHeader();
        updateCurrentDate();
    });

    // ========================================
    // 側邊欄控制
    // ========================================
    function initSidebar() {
        const $aside = $('#kt_aside');
        const $toggleBtn = $('#aside_toggle');
        const $mobileToggle = $('#mobile_toggle');

        // 桌面版：最小化/展開側邊欄
        $toggleBtn.on('click', function() {
            $aside.toggleClass('minimized');
            
            // 保存狀態到 localStorage
            const isMinimized = $aside.hasClass('minimized');
            localStorage.setItem('aside_minimized', isMinimized);
        });

        // 手機版：開啟/關閉側邊欄
        $mobileToggle.on('click', function() {
            $aside.toggleClass('show');
        });

        // 點擊外部關閉手機版側邊欄
        $(document).on('click', function(e) {
            if ($(window).width() < 992) {
                if (!$(e.target).closest('#kt_aside, #mobile_toggle').length) {
                    $aside.removeClass('show');
                }
            }
        });

        // 載入儲存的狀態
        const savedState = localStorage.getItem('aside_minimized');
        if (savedState === 'true') {
            $aside.addClass('minimized');
        }

        // 視窗大小改變時處理
        $(window).on('resize', function() {
            if ($(window).width() >= 992) {
                $aside.removeClass('show');
            }
        });
    }

    // ========================================
    // 選單展開收合
    // ========================================
    function initMenu() {
        // Accordion 選單
        $('.menu-accordion > .menu-link').on('click', function(e) {
            e.preventDefault();
            
            const $parent = $(this).parent('.menu-accordion');
            const $siblingsAccordions = $parent.siblings('.menu-accordion');
            
            // 關閉其他已展開的選單
            $siblingsAccordions.removeClass('show');
            
            // 切換當前選單
            $parent.toggleClass('show');
        });

        // 設定當前頁面的 active 狀態
        setActiveMenuItem();
    }

    // ========================================
    // 設定當前頁面的 active 狀態
    // ========================================
    function setActiveMenuItem() {
        const currentPath = window.location.pathname;
        
        // 移除所有 active 狀態
        $('.menu-link').removeClass('active');
        
        // 查找匹配當前路徑的選單項目
        $('.menu-item a.menu-link').each(function() {
            const href = $(this).attr('href');
            if (href && currentPath.includes(href)) {
                $(this).addClass('active');
                
                // 如果是子選單項目，展開其父選單
                const $accordion = $(this).closest('.menu-accordion');
                if ($accordion.length) {
                    $accordion.addClass('show');
                }
            }
        });
    }

    // ========================================
    // Header 互動
    // ========================================
    function initHeader() {
        // 搜尋按鈕
        $('#search_btn').on('click', function() {
            showNotification('搜尋功能開發中', 'info');
        });

        // 通知按鈕
        $('#notification_btn').on('click', function() {
            showNotification('您有 5 條新通知', 'info');
        });

        // 快速操作按鈕
        $('#quick_actions_btn').on('click', function() {
            showNotification('快速操作選單', 'info');
        });

        // 使用者選單按鈕
        $('#user_menu_btn').on('click', function() {
            showNotification('使用者選單', 'info');
        });
    }

    // ========================================
    // 更新當前日期
    // ========================================
    function updateCurrentDate() {
        const $dateElement = $('#current_date');
        if ($dateElement.length) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
            const weekday = weekdays[today.getDay()];
            
            const dateString = `${year}-${month}-${day} (${weekday})`;
            $dateElement.text(dateString);
        }
    }

    // ========================================
    // 通知提示
    // ========================================
    function showNotification(message, type = 'info') {
        // 創建通知元素
        const $notification = $('<div class="system-notification"></div>');
        $notification.addClass(`notification-${type}`);
        
        // 根據類型設定圖示
        let icon = 'ri-information-line';
        if (type === 'success') icon = 'ri-checkbox-circle-line';
        if (type === 'warning') icon = 'ri-alert-line';
        if (type === 'error') icon = 'ri-close-circle-line';
        
        $notification.html(`
            <div class="notification-content">
                <i class="${icon}"></i>
                <span>${message}</span>
            </div>
        `);
        
        // 添加到頁面
        $('body').append($notification);
        
        // 顯示動畫
        setTimeout(function() {
            $notification.addClass('show');
        }, 10);
        
        // 3秒後自動移除
        setTimeout(function() {
            $notification.removeClass('show');
            setTimeout(function() {
                $notification.remove();
            }, 300);
        }, 3000);
        
        // 點擊關閉
        $notification.on('click', function() {
            $(this).removeClass('show');
            setTimeout(function() {
                $notification.remove();
            }, 300);
        });
    }

    // ========================================
    // Smooth Scroll
    // ========================================
    $('a[href^="#"]').on('click', function(e) {
        const target = $(this.hash);
        if (target.length) {
            e.preventDefault();
            $('html, body').animate({
                scrollTop: target.offset().top - 70
            }, 500);
        }
    });

    // ========================================
    // 載入動畫
    // ========================================
    $(window).on('load', function() {
        // 頁面載入完成後的處理
        $('body').addClass('loaded');
    });

    // ========================================
    // Tooltip 初始化 (如需使用)
    // ========================================
    function initTooltips() {
        $('[data-tooltip]').each(function() {
            const $this = $(this);
            const text = $this.attr('data-tooltip');
            
            $this.on('mouseenter', function(e) {
                const $tooltip = $('<div class="system-tooltip"></div>').text(text);
                $('body').append($tooltip);
                
                const offset = $this.offset();
                const top = offset.top - $tooltip.outerHeight() - 10;
                const left = offset.left + ($this.outerWidth() / 2) - ($tooltip.outerWidth() / 2);
                
                $tooltip.css({
                    top: top + 'px',
                    left: left + 'px'
                }).addClass('show');
            });
            
            $this.on('mouseleave', function() {
                $('.system-tooltip').remove();
            });
        });
    }

    // ========================================
    // 全域變數供其他頁面使用
    // ========================================
    window.BombusSystem = {
        showNotification: showNotification,
        initTooltips: initTooltips
    };

})(jQuery);

// ========================================
// 通知樣式 (CSS in JS for quick notification)
// ========================================
const notificationStyles = `
<style>
.system-notification {
    position: fixed;
    top: 100px;
    right: -400px;
    min-width: 300px;
    max-width: 400px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.12);
    padding: 16px 20px;
    z-index: 9999;
    transition: all 0.3s ease;
    cursor: pointer;
}

.system-notification.show {
    right: 30px;
}

.notification-content {
    display: flex;
    align-items: center;
    gap: 12px;
}

.notification-content i {
    font-size: 24px;
    flex-shrink: 0;
}

.notification-content span {
    flex: 1;
    font-size: 14px;
    color: #464E56;
}

.notification-info i {
    color: #8DA8BE;
}

.notification-success i {
    color: #7FB095;
}

.notification-warning i {
    color: #E3C088;
}

.notification-error i {
    color: #C77F7F;
}

.system-tooltip {
    position: absolute;
    background: #2d3748;
    color: white;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    z-index: 10000;
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
}

.system-tooltip.show {
    opacity: 1;
}
</style>
`;

// 將樣式注入到頁面
document.head.insertAdjacentHTML('beforeend', notificationStyles);
