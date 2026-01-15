/**
 * 員工填寫精靈邏輯
 */

const Wizard = {
    currentStep: 0,
    formData: {},
    template: null,
    steps: [],
    signatureData: null,

    init: function() {
        this.loadTemplateFromURL();
        this.bindEvents();
        if (this.steps.length > 0) {
            this.renderStep(0);
        }
    },

    loadTemplateFromURL: function() {
        // 從 URL 參數取得 token 或 template ID
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const templateId = urlParams.get('template');
        
        // 模擬載入模板資料
        if (templateId) {
            this.template = Storage.getTemplate(templateId);
        } else {
            // 預設模板（用於示範）
            this.template = {
                id: 'demo-template',
                name: '113年入職合約包',
                mapping_config: {
                    fields: [
                        {
                            id: 'field_001',
                            key: 'user_name',
                            label: '姓名',
                            type: 'text',
                            is_required: true
                        },
                        {
                            id: 'field_002',
                            key: 'user_id',
                            label: '身分證字號',
                            type: 'text',
                            is_required: true
                        },
                        {
                            id: 'field_003',
                            key: 'user_phone',
                            label: '手機號碼',
                            type: 'text',
                            is_required: true
                        },
                        {
                            id: 'field_004',
                            key: 'user_email',
                            label: '電子信箱',
                            type: 'text',
                            is_required: true
                        },
                        {
                            id: 'field_005',
                            key: 'signature_main',
                            label: '員工簽名',
                            type: 'signature',
                            is_required: true
                        }
                    ]
                }
            };
        }
        
        this.buildSteps();
    },

    buildSteps: function() {
        if (!this.template || !this.template.mapping_config) return;
        
        const fields = this.template.mapping_config.fields || [];
        
        // 將欄位分組為步驟
        const basicFields = fields.filter(f => f.type === 'text' || f.type === 'date');
        const signatureFields = fields.filter(f => f.type === 'signature');
        
        this.steps = [];
        
        if (basicFields.length > 0) {
            this.steps.push({
                title: '基本資料',
                fields: basicFields
            });
        }
        
        if (signatureFields.length > 0) {
            this.steps.push({
                title: '條款簽署',
                fields: signatureFields,
                hasTerms: true
            });
        }
        
        // 初始化步驟指示器
        this.renderStepIndicator();
    },

    renderStepIndicator: function() {
        const $indicator = $('.wizard-steps');
        $indicator.empty();
        
        this.steps.forEach((step, index) => {
            const $step = $('<div>')
                .addClass('wizard-step')
                .addClass(index === this.currentStep ? 'active' : '')
                .addClass(index < this.currentStep ? 'completed' : '')
                .html(`
                    <div class="wizard-step-circle">${index + 1}</div>
                    <div class="wizard-step-label">${step.title}</div>
                `);
            $indicator.append($step);
        });
    },

    renderStep: function(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.steps.length) return;
        
        this.currentStep = stepIndex;
        const step = this.steps[stepIndex];
        
        // 更新步驟指示器
        $('.wizard-step').removeClass('active');
        $('.wizard-step').eq(stepIndex).addClass('active');
        $('.wizard-step').slice(0, stepIndex).addClass('completed');
        
        // 渲染步驟內容
        const $content = $('.wizard-content');
        let html = `<h2 class="step-title">${step.title}</h2>`;
        
        // 條款內容（如果有的話）
        if (step.hasTerms) {
            html += `
                <div class="terms-section">
                    <div class="terms-content">
                        <h3>勞動契約條款</h3>
                        <p>本人同意遵守公司相關規章制度，並確認所填寫資料屬實。本人了解並同意本契約內容，願意接受本契約所規範之權利與義務。</p>
                        <p>本契約自簽署日起生效，雙方應嚴格遵守本契約各項條款。如有違反，應承擔相應法律責任。</p>
                    </div>
                </div>
                <div class="checkbox-group">
                    <input type="checkbox" id="agreed_terms" required>
                    <label for="agreed_terms">我已詳細閱讀並同意上述條款</label>
                </div>
            `;
        }
        
        // 欄位表單
        step.fields.forEach(field => {
            if (field.type === 'signature') {
                html += this.renderSignatureField(field);
            } else {
                html += this.renderTextField(field);
            }
        });
        
        $content.html(html);
        
        // 綁定欄位事件
        this.bindFieldEvents();
        
        // 初始化簽名板
        if (step.fields.some(f => f.type === 'signature')) {
            SignaturePad.init('signature-pad');
        }
        
        // 更新導航按鈕
        this.updateNavigation();
    },

    renderTextField: function(field) {
        const value = this.formData[field.key] || '';
        const required = field.is_required ? '<span class="required">*</span>' : '';
        
        return `
            <div class="field-group">
                <label class="field-label">
                    ${field.label}${required}
                </label>
                <input 
                    type="${field.type === 'date' ? 'date' : 'text'}" 
                    class="field-input" 
                    data-key="${field.key}"
                    value="${value}"
                    ${field.is_required ? 'required' : ''}
                >
                <div class="field-error">請填寫此欄位</div>
            </div>
        `;
    },

    renderSignatureField: function(field) {
        return `
            <div class="field-group signature-section">
                <label class="field-label">
                    ${field.label}<span class="required">*</span>
                </label>
                <div class="signature-pad-container">
                    <canvas id="signature-pad" class="signature-pad"></canvas>
                </div>
                <div class="signature-actions">
                    <button type="button" class="btn btn-secondary" id="btn-clear-signature">清除簽名</button>
                </div>
                <div class="field-error">請完成簽名</div>
            </div>
        `;
    },

    bindFieldEvents: function() {
        const self = this;
        
        // 文字欄位輸入
        $('.field-input[type="text"], .field-input[type="date"]').on('input', function() {
            const key = $(this).data('key');
            self.formData[key] = $(this).val();
        });
        
        // 清除簽名
        $('#btn-clear-signature').on('click', function() {
            SignaturePad.clear();
            self.signatureData = null;
        });
        
        // 表單驗證
        $('.wizard-content form, .wizard-content').on('submit', function(e) {
            e.preventDefault();
            if (self.validateStep()) {
                self.nextStep();
            }
        });
    },

    validateStep: function() {
        let isValid = true;
        const step = this.steps[this.currentStep];
        
        // 驗證文字欄位
        step.fields.forEach(field => {
            if (field.type !== 'signature') {
                const $input = $(`.field-input[data-key="${field.key}"]`);
                const value = $input.val();
                
                if (field.is_required && !value) {
                    $input.closest('.field-group').addClass('error');
                    isValid = false;
                } else {
                    $input.closest('.field-group').removeClass('error');
                }
            }
        });
        
        // 驗證簽名
        const signatureField = step.fields.find(f => f.type === 'signature');
        if (signatureField && signatureField.is_required) {
            if (SignaturePad.isEmpty()) {
                $('.signature-section').addClass('error');
                isValid = false;
            } else {
                this.signatureData = SignaturePad.getSignatureData();
                this.formData[signatureField.key] = this.signatureData;
                $('.signature-section').removeClass('error');
            }
        }
        
        // 驗證條款同意
        if (step.hasTerms) {
            if (!$('#agreed_terms').is(':checked')) {
                alert('請先閱讀並同意條款');
                isValid = false;
            }
        }
        
        return isValid;
    },

    updateNavigation: function() {
        const $nav = $('.wizard-navigation');
        let html = '';
        
        if (this.currentStep > 0) {
            html += '<button class="btn btn-secondary" id="btn-prev">上一步</button>';
        } else {
            html += '<div></div>';
        }
        
        if (this.currentStep < this.steps.length - 1) {
            html += '<button class="btn btn-primary" id="btn-next">下一步</button>';
        } else {
            html += '<button class="btn btn-success" id="btn-submit">提交簽署</button>';
        }
        
        $nav.html(html);
        
        // 綁定按鈕事件
        $('#btn-prev').on('click', () => this.prevStep());
        $('#btn-next').on('click', () => {
            if (this.validateStep()) {
                this.nextStep();
            }
        });
        $('#btn-submit').on('click', () => this.submit());
    },

    nextStep: function() {
        if (this.currentStep < this.steps.length - 1) {
            this.renderStep(this.currentStep + 1);
        }
    },

    prevStep: function() {
        if (this.currentStep > 0) {
            this.renderStep(this.currentStep - 1);
        }
    },

    submit: function() {
        if (!this.validateStep()) {
            return;
        }
        
        // 儲存提交資料
        const submission = {
            id: Storage.generateId(),
            template_id: this.template.id,
            token: 'token_' + Date.now(),
            status: 'SIGNED',
            form_data: this.formData,
            signed_at: new Date().toISOString(),
            ip_address: '127.0.0.1'
        };
        
        Storage.saveSubmission(submission);
        
        // 顯示成功訊息
        this.showSuccess();
    },

    showSuccess: function() {
        const $content = $('.wizard-content');
        $content.html(`
            <div class="submit-confirmation">
                <div class="submit-confirmation-icon">✅</div>
                <div class="submit-confirmation-title">簽署完成！</div>
                <div class="submit-confirmation-message">
                    您的入職文件已成功提交並簽署。<br>
                    感謝您的配合！
                </div>
                <button class="btn btn-primary" onclick="window.location.href='index.html'">返回首頁</button>
            </div>
        `);
        
        $('.wizard-navigation').hide();
    }
};

// 頁面載入時初始化
$(document).ready(function() {
    Wizard.init();
});

