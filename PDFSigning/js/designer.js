/**
 * HR 模板定義器邏輯
 */

const Designer = {
    currentTemplate: null,
    selectedField: null,
    fields: [],
    fieldCounter: 0,
    pdfDoc: null,
    pdfData: null,

    init: function() {
        this.bindEvents();
        this.loadTemplateFromURL();
    },

    bindEvents: function() {
        const self = this;

        // 欄位庫拖曳
        $('.field-item').on('mousedown', function(e) {
            if (e.which !== 1) return;
            const fieldType = $(this).data('type');
            const fieldKey = $(this).data('key');
            const fieldLabel = $(this).data('label');
            
            $(this).addClass('dragging');
            
            // 建立拖曳的欄位
            const offsetX = e.offsetX;
            const offsetY = e.offsetY;
            
            $(document).on('mousemove.dragging', function(e) {
                // 拖曳邏輯
            });
            
            $(document).on('mouseup.dragging', function(e) {
                $('.field-item').removeClass('dragging');
                $(document).off('mousemove.dragging mouseup.dragging');
                
                // 檢查是否在畫布上
                const canvas = $('.canvas-wrapper');
                const canvasOffset = canvas.offset();
                const canvasWidth = canvas.outerWidth();
                const canvasHeight = canvas.outerHeight();
                
                if (canvasOffset && 
                    e.pageX >= canvasOffset.left && 
                    e.pageX <= canvasOffset.left + canvasWidth &&
                    e.pageY >= canvasOffset.top && 
                    e.pageY <= canvasOffset.top + canvasHeight) {
                    
                    const x = e.pageX - canvasOffset.left;
                    const y = e.pageY - canvasOffset.top;
                    
                    self.addFieldToCanvas(fieldType, fieldKey, fieldLabel, x, y);
                }
            });
        });

        // PDF 上傳
        $('#pdf-upload-input').on('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // 檢查檔案類型（某些瀏覽器可能不會正確識別 MIME type，所以也檢查檔案名稱）
                const isPDF = file.type === 'application/pdf' || 
                             file.type === 'application/x-pdf' ||
                             file.name.toLowerCase().endsWith('.pdf');
                
                if (isPDF) {
                    self.handlePDFUpload(file);
                } else {
                    alert('請上傳 PDF 檔案（.pdf）');
                    $(this).val(''); // 清除選擇
                }
            }
        });

        $('.upload-area').on('click', function(e) {
            e.preventDefault();
            $('#pdf-upload-input').click();
        });
        
        // 拖放上傳
        const $canvasArea = $('.designer-canvas-area');
        $canvasArea.on('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            $(this).addClass('drag-over');
        });
        
        $canvasArea.on('dragleave', function(e) {
            e.preventDefault();
            e.stopPropagation();
            $(this).removeClass('drag-over');
        });
        
        $canvasArea.on('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            $(this).removeClass('drag-over');
            
            const files = e.originalEvent.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                const isPDF = file.type === 'application/pdf' || 
                             file.type === 'application/x-pdf' ||
                             file.name.toLowerCase().endsWith('.pdf');
                
                if (isPDF) {
                    self.handlePDFUpload(file);
                } else {
                    alert('請拖放 PDF 檔案（.pdf）');
                }
            }
        });

        // 儲存按鈕
        $('#btn-save').on('click', function() {
            self.saveTemplate();
        });

        // 返回按鈕
        $('#btn-back').on('click', function() {
            if (confirm('確定要返回嗎？未儲存的變更將遺失。')) {
                window.location.href = 'index.html';
            }
        });
    },

    loadTemplateFromURL: function() {
        const urlParams = new URLSearchParams(window.location.search);
        const templateId = urlParams.get('id');
        
        if (templateId) {
            const template = Storage.getTemplate(templateId);
            if (template) {
                this.currentTemplate = template;
                this.loadTemplate(template);
            }
        } else {
            // 建立新模板
            this.currentTemplate = {
                id: Storage.generateId(),
                name: '新模板',
                mapping_config: { fields: [] },
                created_at: new Date().toISOString()
            };
        }
    },

    loadTemplate: function(template) {
        $('#template-name').text(template.name || '未命名模板');
        this.fields = template.mapping_config?.fields || [];
        this.renderFields();
    },

    handlePDFUpload: function(file) {
        const self = this;
        
        console.log('開始處理 PDF 上傳:', file.name, file.size + ' bytes');
        
        // 檢查 PDF.js 是否載入
        if (typeof pdfjsLib === 'undefined') {
            alert('PDF.js 庫載入失敗，請重新整理頁面後再試');
            return;
        }
        
        // 顯示載入訊息
        const $uploadArea = $('.upload-area');
        const originalHTML = $uploadArea.html();
        $uploadArea.html('<div style="padding: 20px; color: #666;">正在載入 PDF...</div>');
        
        // 讀取 PDF 檔案
        const reader = new FileReader();
        reader.onerror = function(error) {
            console.error('檔案讀取失敗:', error);
            alert('檔案讀取失敗，請重試');
            $uploadArea.html(originalHTML);
        };
        
        reader.onload = function(e) {
            try {
                const arrayBuffer = e.target.result;
                console.log('PDF 檔案讀取完成，大小:', arrayBuffer.byteLength, 'bytes');
                
                // 使用 PDF.js 載入 PDF（不儲存 base64，避免堆疊溢出和 localStorage 限制）
                pdfjsLib.getDocument({ data: arrayBuffer }).promise.then(function(pdfDoc) {
                    console.log('PDF 載入成功，總頁數:', pdfDoc.numPages);
                    self.pdfDoc = pdfDoc;
                    
                    // 渲染第一頁
                    self.renderPDFPage(1);
                    
                    // 隱藏上傳區域
                    $('.upload-area').parent().hide();
                }).catch(function(error) {
                    console.error('PDF 解析失敗:', error);
                    alert('PDF 檔案解析失敗：' + (error.message || '請確認檔案格式正確'));
                    $uploadArea.html(originalHTML);
                });
            } catch (error) {
                console.error('處理 PDF 時發生錯誤:', error);
                alert('處理 PDF 時發生錯誤：' + error.message);
                $uploadArea.html(originalHTML);
            }
        };
        
        reader.readAsArrayBuffer(file);
    },
    
    renderPDFPage: function(pageNumber) {
        const self = this;
        
        if (!this.pdfDoc) return;
        
        // 取得頁面
        this.pdfDoc.getPage(pageNumber).then(function(page) {
            // 設定縮放比例（2倍解析度以確保清晰度）
            const scale = 2.0;
            const viewport = page.getViewport({ scale: scale });
            
            // 建立 Canvas 元素
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            // 渲染 PDF 頁面到 Canvas
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            
            page.render(renderContext).promise.then(function() {
                // 將 Canvas 轉換為圖片
                const imageData = canvas.toDataURL('image/png');
                
                // 顯示在畫布上
                const $canvasBackground = $('.canvas-background');
                $canvasBackground.css({
                    'background-image': 'url(' + imageData + ')',
                    'background-size': 'contain',
                    'background-repeat': 'no-repeat',
                    'background-position': 'top center',
                    'min-height': viewport.height / scale + 'px',
                    'width': '100%'
                });
                
                // 儲存 PDF 尺寸資訊
                if (self.currentTemplate) {
                    self.currentTemplate.pdf_dimensions = {
                        width: viewport.width / scale,
                        height: viewport.height / scale
                    };
                }
            });
        }).catch(function(error) {
            console.error('PDF 頁面渲染失敗:', error);
            alert('PDF 頁面渲染失敗');
        });
    },

    addFieldToCanvas: function(type, key, label, x, y) {
        const fieldId = 'field_' + (++this.fieldCounter);
        const field = {
            id: fieldId,
            key: key,
            label: label,
            type: type,
            is_required: false,
            font_size: 12,
            placements: [{
                page_number: 1,
                x: x,
                y: y,
                width: 150,
                height: 30
            }]
        };

        this.fields.push(field);
        this.renderFields();
        this.selectField(field);
    },

    renderFields: function() {
        $('.canvas-background').find('.canvas-field').remove();
        
        this.fields.forEach(field => {
            if (field.placements && field.placements.length > 0) {
                const placement = field.placements[0];
                const $field = $('<div>')
                    .addClass('canvas-field')
                    .data('field-id', field.id)
                    .css({
                        left: placement.x + 'px',
                        top: placement.y + 'px',
                        width: placement.width + 'px',
                        height: placement.height + 'px'
                    })
                    .html('<div class="canvas-field-label">' + field.label + '</div>');
                
                $('.canvas-background').append($field);
                
                // 欄位點擊選取
                $field.on('click', (e) => {
                    e.stopPropagation();
                    this.selectField(field);
                });
                
                // 欄位拖曳移動
                this.makeFieldDraggable($field, field);
            }
        });
    },

    makeFieldDraggable: function($field, field) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        $field.on('mousedown', function(e) {
            if ($(e.target).hasClass('canvas-field-resize-handle')) return;
            
            isDragging = true;
            startX = e.pageX;
            startY = e.pageY;
            startLeft = parseInt($field.css('left'));
            startTop = parseInt($field.css('top'));
            
            $field.css('cursor', 'move');
            e.preventDefault();
        });
        
        $(document).on('mousemove.field-drag', function(e) {
            if (!isDragging) return;
            
            const deltaX = e.pageX - startX;
            const deltaY = e.pageY - startY;
            
            $field.css({
                left: (startLeft + deltaX) + 'px',
                top: (startTop + deltaY) + 'px'
            });
        });
        
        $(document).on('mouseup.field-drag', function() {
            if (isDragging) {
                isDragging = false;
                $field.css('cursor', '');
                
                // 更新欄位位置
                if (field.placements && field.placements[0]) {
                    field.placements[0].x = parseInt($field.css('left'));
                    field.placements[0].y = parseInt($field.css('top'));
                }
            }
        });
    },

    selectField: function(field) {
        this.selectedField = field;
        
        // 更新視覺選取
        $('.canvas-field').removeClass('selected');
        $('.canvas-field[data-field-id="' + field.id + '"]').addClass('selected');
        
        // 更新屬性面板
        this.updatePropertiesPanel(field);
    },

    updatePropertiesPanel: function(field) {
        const self = this;
        
        $('#property-key').val(field.key);
        $('#property-label').val(field.label);
        $('#property-font-size').val(field.font_size || 12);
        $('#property-required').prop('checked', field.is_required || false);
        
        $('.properties-panel').show();
        $('#properties-empty').hide();
        
        // 綁定屬性變更事件
        $('#property-label').off('input').on('input', function() {
            field.label = $(this).val();
            const $fieldEl = $('.canvas-field[data-field-id="' + field.id + '"]');
            $fieldEl.find('.canvas-field-label').text(field.label);
        });
        
        $('#property-font-size').off('change').on('change', function() {
            field.font_size = parseInt($(this).val()) || 12;
        });
        
        $('#property-required').off('change').on('change', function() {
            field.is_required = $(this).is(':checked');
        });
        
        // 刪除欄位
        $('#btn-delete-field').off('click').on('click', function() {
            if (confirm('確定要刪除此欄位嗎？')) {
                self.deleteField(field);
            }
        });
        
        // 點擊畫布空白處取消選取
        $(document).off('click.canvas').on('click.canvas', function(e) {
            if (!$(e.target).closest('.canvas-field, .designer-sidebar-right').length) {
                self.deselectField();
            }
        });
    },
    
    deselectField: function() {
        this.selectedField = null;
        $('.canvas-field').removeClass('selected');
        $('.properties-panel').hide();
        $('#properties-empty').show();
    },
    
    deleteField: function(field) {
        this.fields = this.fields.filter(f => f.id !== field.id);
        $('.canvas-field[data-field-id="' + field.id + '"]').remove();
        this.deselectField();
    },

    saveTemplate: function() {
        const templateName = prompt('請輸入模板名稱：', this.currentTemplate.name || '新模板');
        if (!templateName) return;
        
        this.currentTemplate.name = templateName;
        this.currentTemplate.mapping_config = {
            fields: this.fields
        };
        this.currentTemplate.updated_at = new Date().toISOString();
        
        // 儲存 PDF 資料（如果有的話）
        if (this.pdfData) {
            this.currentTemplate.pdf_data = this.pdfData;
        }
        
        Storage.saveTemplate(this.currentTemplate);
        
        alert('模板已儲存！');
        $('#template-name').text(templateName);
    }
};

// 頁面載入時初始化
$(document).ready(function() {
    Designer.init();
});

