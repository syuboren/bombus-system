/**
 * 簽名板功能模組
 */

const SignaturePad = {
    canvas: null,
    ctx: null,
    isDrawing: false,
    lastX: 0,
    lastY: 0,

    init: function(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        this.bindEvents();
    },

    setupCanvas: function() {
        const canvas = this.canvas;
        const rect = canvas.getBoundingClientRect();
        
        // 設定畫布尺寸
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        
        // 調整座標系統
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // 設定繪圖樣式
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // 清除畫布
        this.clear();
    },

    bindEvents: function() {
        const self = this;
        const canvas = this.canvas;

        // 滑鼠事件
        canvas.addEventListener('mousedown', function(e) {
            self.startDrawing(e);
        });

        canvas.addEventListener('mousemove', function(e) {
            self.draw(e);
        });

        canvas.addEventListener('mouseup', function() {
            self.stopDrawing();
        });

        canvas.addEventListener('mouseout', function() {
            self.stopDrawing();
        });

        // 觸控事件（支援行動裝置）
        canvas.addEventListener('touchstart', function(e) {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        });

        canvas.addEventListener('touchmove', function(e) {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        });

        canvas.addEventListener('touchend', function(e) {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            canvas.dispatchEvent(mouseEvent);
        });

        // 視窗大小改變時重新設定
        window.addEventListener('resize', function() {
            self.setupCanvas();
        });
    },

    getCoordinates: function(e) {
        const canvas = this.canvas;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX / window.devicePixelRatio,
            y: (e.clientY - rect.top) * scaleY / window.devicePixelRatio
        };
    },

    startDrawing: function(e) {
        this.isDrawing = true;
        const coords = this.getCoordinates(e);
        this.lastX = coords.x;
        this.lastY = coords.y;
    },

    draw: function(e) {
        if (!this.isDrawing) return;
        
        const coords = this.getCoordinates(e);
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(coords.x, coords.y);
        this.ctx.stroke();
        
        this.lastX = coords.x;
        this.lastY = coords.y;
    },

    stopDrawing: function() {
        this.isDrawing = false;
    },

    clear: function() {
        const canvas = this.canvas;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, canvas.width, canvas.height);
        this.ctx.fillStyle = '#000000';
    },

    getSignatureData: function() {
        return this.canvas.toDataURL('image/png');
    },

    isEmpty: function() {
        const canvas = this.canvas;
        const imageData = this.ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // 檢查是否有非白色像素
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) {
                return false;
            }
        }
        return true;
    }
};

