# **ANGULAR 18 FULL-STACK PROJECT RULES (MASTER GUIDE)**

## **1\. 技術堆疊與核心原則 (Tech Stack)**

* **Frontend**: Angular 18+ (Standalone Only), TypeScript (Strict), SASS (BEM).  
* **Backend**: Node.js (Express), SQLite (better-sqlite3).  
* **State Management**: Signals (UI State) \+ RxJS (Data Stream).  
* **Performance**: ChangeDetectionStrategy.OnPush is MANDATORY.

## **2\. 前端開發規範 (Frontend Standards)**

### **元件結構順序 (Component Order)**

所有元件必須設定 standalone: true。Class 內部順序：

1. inject() declarations (NO constructor).  
2. input() / output() / model() (Signal APIs).  
3. Internal Signals (signal, computed).  
4. Effects & Methods.

### **樣板與樣式 (Template & Style)**

* **Control Flow**: 強制使用 @if, @for (必須加 track), @switch。  
* **Images**: 使用 NgOptimizedImage。  
* **SCSS**: 使用 CSS Variables (var(--color-bg)), 避免 Magic Numbers。

### **⭐ 標準元件範本 (Reference Template)**

**AI 生成元件時，請嚴格參考此結構：**

@Component({  
  selector: 'app-feature-card',  
  standalone: true,  
  imports: \[CommonModule\],  
  templateUrl: './feature.html',  
  styleUrl: './feature.scss',  
  changeDetection: ChangeDetectionStrategy.OnPush  
})  
export class FeatureCardComponent {  
  // 1\. Dependency Injection  
  private api \= inject(ApiService);  
    
  // 2\. Inputs/Outputs  
  title \= input.required\<string\>();  
  action \= output\<void\>();

  // 3\. State  
  isLoading \= signal(false);  
    
  // 4\. Logic  
  handleAction() {  
    this.isLoading.set(true);  
    this.action.emit();  
  }  
}

## **3\. 後端開發規範 (Backend Standards)**

### **架構模式 (Express & SQLite)**

* **Database**: 使用 better-sqlite3。  
* **Security**:  
  * **SQL Injection**: 一律使用 Prepared Statements (prepare('SQL...').run())。**嚴格禁止**字串拼接 SQL。  
  * **Transactions**: 多步驟寫入必須包裹在 db.transaction() 中。  
  * **Validation**: 在 DB 操作前必須驗證 req.body。

### **⭐ 標準 API 範本 (Reference Route)**

router.post('/', (req, res) \=\> {  
    try {  
        const { name } \= req.body;  
        if (\!name) return res.status(400).json({ error: 'Name required' }); // Validation

        const stmt \= prepare('INSERT INTO items (id, name) VALUES (?, ?)'); // Prepared Statement  
        const result \= stmt.run(uuidv4(), name);

        res.status(201).json({ success: true });  
    } catch (error) {  
        console.error('API Error:', error); // Log error  
        res.status(500).json({ error: 'Internal Server Error' }); // Generic user message  
    }  
});

## **4\. 檔案與目錄結構 (File Structure)**

src/  
  app/ (Frontend)  
    core/       \# Singleton services  
    shared/     \# Reusable UI components  
    features/   \# Feature modules (e.g., features/login/)  
  server/ (Backend)  
    routes/     \# Express routes  
    db/         \# Database connection & migrations

## **5\. UI/UX 與視覺檢核 (Visual Polish Checklist)**

**AI 在生成畫面時必須自我檢查：**

* \[ \] **Whitespace**: 確保元件間有足夠留白 (Padding/Margin)，避免視覺擁擠。  
* \[ \] **Loading States**: 所有非同步操作 (API 呼叫) 必須顯示 Skeleton 或 Spinner。  
* \[ \] **Feedback**: 成功、失敗或警告操作，必須彈出 Toast 或 Snackbar 提示。  
* \[ \] **Interactive**: 所有按鈕、連結與卡片必須具備 Hover 與 Active 樣式。  
* \[ \] **Responsive**: 介面必須同時支援 Mobile (375px) 到 Desktop (1920px)。

## **6\. PM 溝通轉譯 (Communication)**

* **解釋邏輯**: 說明程式碼時，請解釋「為什麼這樣寫」以及「這對使用者的影響」。  
* **視覺輔助**: 若邏輯複雜，請繪製 ASCII 流程圖。