import { Injectable } from '@angular/core';
import { JobDescription } from '../models/competency.model';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {

  /**
   * 生成職務說明書 PDF（符合 A4 列印格式，正確分頁）
   */
  async exportJobDescription(jd: JobDescription): Promise<void> {
    // 創建一個專用的列印容器
    const container = document.createElement('div');
    container.id = 'pdf-print-container';
    container.innerHTML = this.generatePrintableHtml(jd);
    document.body.appendChild(container);

    // 等待字體載入
    await document.fonts.ready;
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      const element = container.querySelector('.pdf-page-wrapper') as HTMLElement;

      // 使用更高的 scale 確保清晰度，但不拉伸
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = 210;  // A4 寬度 mm
      const pdfHeight = 297; // A4 高度 mm

      // 計算圖片在 PDF 中的寬度（保持比例）
      const imgWidthMM = pdfWidth;
      const imgHeightMM = (canvas.height * pdfWidth) / canvas.width;

      // 如果內容只有一頁
      if (imgHeightMM <= pdfHeight) {
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidthMM, imgHeightMM);
      } else {
        // 多頁處理：按照實際 A4 高度裁切
        const pageHeightPx = (pdfHeight / pdfWidth) * canvas.width;
        const totalPages = Math.ceil(canvas.height / pageHeightPx);

        for (let i = 0; i < totalPages; i++) {
          if (i > 0) {
            pdf.addPage();
          }

          // 計算這一頁的實際高度（最後一頁可能不滿）
          const srcY = i * pageHeightPx;
          const srcHeight = Math.min(pageHeightPx, canvas.height - srcY);
          const destHeightMM = (srcHeight / canvas.width) * pdfWidth;

          // 創建這一頁的 canvas
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = srcHeight;
          const ctx = pageCanvas.getContext('2d');

          if (ctx) {
            ctx.drawImage(
              canvas,
              0, srcY, canvas.width, srcHeight,  // 來源區域
              0, 0, canvas.width, srcHeight       // 目標區域（保持原始比例）
            );

            const pageImgData = pageCanvas.toDataURL('image/png');
            pdf.addImage(pageImgData, 'PNG', 0, 0, pdfWidth, destHeightMM);
          }
        }
      }

      pdf.save(`${jd.positionCode}-${jd.positionName}職務說明書.pdf`);
    } finally {
      document.body.removeChild(container);
    }
  }

  /**
   * 生成可列印的 HTML（符合官方格式，使用分頁符號避免切割）
   */
  private generatePrintableHtml(jd: JobDescription): string {
    const formatDate = (date: Date) => {
      const d = new Date(date);
      const year = d.getFullYear() - 1911; // 民國年
      return `${year}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
    };

    return `
      <style>
        #pdf-print-container {
          position: fixed;
          left: -9999px;
          top: 0;
          z-index: -1;
        }
        .pdf-page-wrapper {
          width: 794px;
          background: white;
          font-family: 'Microsoft JhengHei', 'PingFang TC', 'Noto Sans TC', 'Heiti TC', sans-serif;
          color: #333;
          font-size: 14px;
          line-height: 1.8;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .pdf-content {
          padding: 60px 65px 80px 65px;
        }

        /* 頁首 */
        .page-header {
          text-align: center;
          margin-bottom: 35px;
          padding-bottom: 22px;
          border-bottom: 3px solid #c77d5e;
        }
        .company-name {
          font-size: 22px;
          font-weight: bold;
          color: #333;
          margin-bottom: 16px;
          letter-spacing: 2px;
        }
        .doc-meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          margin-bottom: 10px;
          padding: 0 30px;
        }
        .doc-meta-item {
          display: flex;
          gap: 10px;
        }
        .doc-meta-label {
          color: #666;
        }
        .doc-meta-value {
          font-weight: 600;
        }
        .doc-title {
          font-size: 20px;
          font-weight: bold;
          color: #c77d5e;
          margin: 16px 0;
          letter-spacing: 1px;
        }

        /* 基本資訊區塊 */
        .info-bar {
          display: flex;
          gap: 60px;
          margin-bottom: 25px;
          font-size: 14px;
          padding: 10px 0;
          border-bottom: 1px solid #eee;
        }
        .info-item {
          display: flex;
          gap: 12px;
        }
        .info-label {
          color: #666;
          font-weight: 500;
        }
        .info-value {
          font-weight: 600;
        }

        /* 區段 - 使用 break-inside: avoid 防止切割 */
        .section {
          margin-bottom: 28px;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 16px;
          font-weight: bold;
          color: #333;
          margin-bottom: 14px;
          padding-bottom: 6px;
          border-bottom: 2px solid #c77d5e;
          display: inline-block;
        }
        .section-content {
          padding-left: 10px;
        }

        /* 清單項目 */
        .list-item {
          margin-bottom: 10px;
          padding-left: 24px;
          position: relative;
          text-align: justify;
          line-height: 1.8;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .list-item::before {
          content: '';
          position: absolute;
          left: 8px;
          top: 10px;
          width: 6px;
          height: 6px;
          background: #c77d5e;
          border-radius: 50%;
        }
        .list-item-numbered {
          margin-bottom: 10px;
          line-height: 1.8;
          text-align: justify;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        /* 職能區塊 */
        .competency-block {
          margin-bottom: 20px;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .competency-category-title {
          font-size: 14px;
          font-weight: bold;
          color: #555;
          margin-bottom: 12px;
          padding-bottom: 6px;
          border-bottom: 1px dashed #ccc;
        }
        .competency-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .competency-tag {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 16px;
          background: #f5f5f5;
          border-radius: 20px;
          font-size: 12px;
          border: 1px solid #ddd;
          white-space: nowrap;
          line-height: 1.4;
          text-align: center;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .competency-tag.core {
          background: #e3f2fd;
          border-color: #90caf9;
          color: #1565c0;
        }
        .competency-tag.knowledge {
          background: #e8f5e9;
          border-color: #a5d6a7;
          color: #2e7d32;
        }
        .competency-tag.skill {
          background: #fff3e0;
          border-color: #ffcc80;
          color: #ef6c00;
        }
        .competency-tag.attitude {
          background: #fce4ec;
          border-color: #f48fb1;
          color: #c2185b;
        }

        /* 檢查清單表格 */
        .checklist-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 13px;
        }
        .checklist-table th,
        .checklist-table td {
          border: 1px solid #ccc;
          padding: 10px 14px;
          text-align: left;
        }
        .checklist-table th {
          background: #f5f5f5;
          font-weight: 600;
        }
        .checklist-table td:last-child {
          width: 80px;
          text-align: center;
          font-weight: 600;
        }

        /* 版本資訊 */
        .version-section {
          margin-top: 40px;
          padding-top: 25px;
          border-top: 2px solid #eee;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .version-title {
          font-size: 15px;
          font-weight: bold;
          color: #333;
          margin-bottom: 14px;
        }
        .version-grid {
          display: flex;
          gap: 60px;
          font-size: 13px;
        }
        .version-item {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .version-label {
          color: #888;
          font-size: 12px;
        }
        .version-value {
          font-weight: 600;
          color: #333;
        }

        /* 頁尾 */
        .page-footer {
          margin-top: 50px;
          padding-top: 18px;
          border-top: 2px solid #c77d5e;
          text-align: center;
          font-size: 12px;
          color: #999;
          letter-spacing: 1px;
        }
      </style>

      <div class="pdf-page-wrapper">
        <div class="pdf-content">
          <!-- 頁首 -->
          <div class="page-header">
            <div class="company-name">邦鉑科技股份有限公司</div>
            <div class="doc-meta-row">
              <div class="doc-meta-item">
                <span class="doc-meta-label">編號</span>
                <span class="doc-meta-value">${jd.positionCode}</span>
              </div>
              <div class="doc-meta-item">
                <span class="doc-meta-label">等級</span>
                <span class="doc-meta-value">內部</span>
              </div>
            </div>
            <div class="doc-title">${jd.positionName}工作職務說明書</div>
            <div class="doc-meta-row">
              <div class="doc-meta-item">
                <span class="doc-meta-label">版次</span>
                <span class="doc-meta-value">${jd.version}</span>
              </div>
              <div class="doc-meta-item">
                <span class="doc-meta-label">版本日期</span>
                <span class="doc-meta-value">${formatDate(jd.updatedAt)}</span>
              </div>
            </div>
          </div>

          <!-- 基本資訊 -->
          <div class="info-bar">
            <div class="info-item">
              <span class="info-label">部門：</span>
              <span class="info-value">${jd.department}</span>
            </div>
            <div class="info-item">
              <span class="info-label">職等：</span>
              <span class="info-value">${jd.gradeLevel}</span>
            </div>
          </div>

          <!-- 一、主要職責 -->
          ${this.renderSection('一、主要職責', jd.responsibilities)}

          <!-- 二、職務目的 -->
          ${this.renderSection('二、職務目的', jd.jobPurpose)}

          <!-- 三、職務要求 -->
          ${this.renderSection('三、職務要求', jd.qualifications)}

          <!-- 四、最終有價值產品 VFP -->
          ${this.renderSection('四、最終有價值產品 VFP', jd.vfp)}

          <!-- 五、職能需求 -->
          <div class="section">
            <div class="section-title">五、職能需求</div>
            <div class="section-content">
              ${this.renderCompetencySection(jd)}
            </div>
          </div>

          <!-- 六、工作描述 -->
          ${this.renderSection('六、工作描述', jd.workDescription)}

          <!-- 七、檢查清單 -->
          ${this.renderChecklist(jd.checklist)}

          <!-- 八、職務責任 -->
          ${this.renderSection('八、職務責任', jd.jobDuties)}

          <!-- 九、每日工作 -->
          ${this.renderSection('九、每日工作', jd.dailyTasks)}

          <!-- 十、每週工作 -->
          ${this.renderSection('十、每週工作', jd.weeklyTasks)}

          <!-- 十一、每月工作 -->
          ${this.renderSection('十一、每月工作', jd.monthlyTasks)}

          <!-- 版本資訊 -->
          <div class="version-section">
            <div class="version-title">版本資訊</div>
            <div class="version-grid">
              <div class="version-item">
                <span class="version-label">建立者</span>
                <span class="version-value">${jd.createdBy}</span>
              </div>
              <div class="version-item">
                <span class="version-label">建立日期</span>
                <span class="version-value">${formatDate(jd.createdAt)}</span>
              </div>
              <div class="version-item">
                <span class="version-label">最後更新</span>
                <span class="version-value">${formatDate(jd.updatedAt)}</span>
              </div>
            </div>
          </div>

          <!-- 頁尾 -->
          <div class="page-footer">
            內部文件，未經允許嚴禁影印或複製交付外部方
          </div>
        </div>
      </div>
    `;
  }

  private renderSection(title: string, items: string[] | undefined): string {
    if (!items || items.length === 0) return '';

    return `
      <div class="section">
        <div class="section-title">${title}</div>
        <div class="section-content">
          ${items.map((item, index) =>
            `<div class="list-item-numbered">${index + 1}. ${item}</div>`
          ).join('')}
        </div>
      </div>
    `;
  }

  private renderChecklist(checklist: { item: string; points: number }[] | undefined): string {
    if (!checklist || checklist.length === 0) return '';

    return `
      <div class="section">
        <div class="section-title">七、檢查清單</div>
        <div class="section-content">
          <table class="checklist-table">
            <thead>
              <tr>
                <th>檢查項目</th>
                <th>分數</th>
              </tr>
            </thead>
            <tbody>
              ${checklist.map(item => `
                <tr>
                  <td>${item.item}</td>
                  <td>${item.points}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  private renderCompetencySection(jd: JobDescription): string {
    let html = '';

    // 總權重
    const totalWeight = jd.requiredCompetencies?.reduce((sum, c) => sum + c.weight, 0) || 0;
    html += `<div style="text-align: right; margin-bottom: 15px; font-size: 13px; font-weight: bold; color: #c77d5e;">總權重：${totalWeight}%</div>`;

    // 核心職能
    if (jd.requiredCompetencies && jd.requiredCompetencies.length > 0) {
      html += `
        <div class="competency-block">
          <div class="competency-category-title">核心職能</div>
          <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px;">
            <thead>
              <tr style="background: #f5f5f5;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">職能名稱</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: center; width: 80px;">需求等級</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: center; width: 60px;">權重</th>
              </tr>
            </thead>
            <tbody>
              ${jd.requiredCompetencies.map(comp => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">${comp.competencyName}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">
                    <span style="padding: 2px 8px; background: #e3f2fd; color: #1565c0; border-radius: 10px; font-size: 11px;">L${comp.requiredLevel}</span>
                  </td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: 600; color: #c77d5e;">${comp.weight}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // KSA 職能
    if (jd.ksaContent) {
      if (jd.ksaContent.knowledge && jd.ksaContent.knowledge.length > 0) {
        html += `
          <div class="competency-block">
            <div class="competency-category-title">知識 (Knowledge)</div>
            <div class="competency-tags">
              ${jd.ksaContent.knowledge.map(item => `
                <span class="competency-tag knowledge">${item.code} - ${item.name}</span>
              `).join('')}
            </div>
          </div>
        `;
      }

      if (jd.ksaContent.skills && jd.ksaContent.skills.length > 0) {
        html += `
          <div class="competency-block">
            <div class="competency-category-title">技能 (Skills)</div>
            <div class="competency-tags">
              ${jd.ksaContent.skills.map(item => `
                <span class="competency-tag skill">${item.code} - ${item.name}</span>
              `).join('')}
            </div>
          </div>
        `;
      }

      if (jd.ksaContent.attitudes && jd.ksaContent.attitudes.length > 0) {
        html += `
          <div class="competency-block">
            <div class="competency-category-title">態度 (Attitude)</div>
            <div class="competency-tags">
              ${jd.ksaContent.attitudes.map(item => `
                <span class="competency-tag attitude">${item.code} - ${item.name}</span>
              `).join('')}
            </div>
          </div>
        `;
      }
    }

    return html || '<div style="color: #999; font-style: italic;">未設定職能需求</div>';
  }
}
