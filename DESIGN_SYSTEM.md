# **UI DESIGN SYSTEM**

**Role**: UI/UX Designer & Frontend Developer

**Source**: Based on Bombus IDP (Interface Design Plan).

**Purpose**: The SINGLE source of truth for visual styles.

## **1\. 核心色彩規範 (Color Palette)**

**Strictly use these CSS variables. Do NOT hardcode hex values.**

### **A. 基礎色調 (Neutrals)**

Used for backgrounds, borders, and text.

* **Background Base**: var(--color-bg-base) \-\> \#F5F5F7 (雲霧灰)  
* **Background Card**: var(--color-bg-card) \-\> \#FCFCFD (極致灰白)  
* **Text Primary**: var(--color-text-primary) \-\> \#464E56 (岩石灰)  
* **Text Secondary**: var(--color-text-secondary) \-\> \#858E96 (迷霧灰)  
* **Border**: var(--color-border) \-\> \#E2E4E8 (淡灰)

### **B. 品牌主色 (Brand Colors)**

Subtle, desaturated blue-purple tones.

* **Brand Main**: var(--color-brand-main) \-\> \#64748B (Slate Blue)  
* **Brand Light**: var(--color-brand-light) \-\> \#94A3B8 (Dusty Blue)  
* **Brand Dark**: var(--color-brand-dark) \-\> \#475569 (Deep Slate)

### **C. 模組識別色 (Module Semantic Tokens)**

Unique identity colors for each feature module.

* **L1 員工 (Green)**: \#8DA399 (鼠尾草綠)  
* **L2 職能 (Orange)**: \#D6A28C (陶土橙)  
* **L3 教訓 (Teal)**: \#7F9CA0 (復古藍綠)  
* **L4 專案 (Purple)**: \#9A8C98 (錦葵紫)  
* **L5 績效 (Red)**: \#B87D7B (磚紅)  
* **L6 文化 (Pink)**: \#C4A4A1 (乾燥玫瑰)

### **D. 狀態色 (Status Tokens)**

Morandi-style feedback colors (Low saturation).

* **Success**: var(--color-success) \-\> \#7FB095 (薄荷灰綠)  
* **Warning**: var(--color-warning) \-\> \#E3C088 (亞麻黃)  
* **Danger**: var(--color-danger) \-\> \#C77F7F (珊瑚灰紅)  
* **Info**: var(--color-info) \-\> \#8DA8BE (霧霾藍)

## **2\. 排版與圖示 (Typography & Icons)**

### **A. 字體排版 (Typography)**

* **Font Family**: \-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", sans-serif.  
* **H1 (Page Title)**: 24px, Medium, Text Primary.  
* **H2 (Section Title)**: 18px, Medium, Brand Main.  
* **Body**: 14px, Regular, Text Secondary, Line-height 1.6.  
* **Tag/Label**: 12px, Medium. Background uses **15% opacity** of the corresponding color.

### **B. 圖示系統 (Iconography)**

* **Library**: Phosphor Icons or Remix Icon.  
* **Style**: **Outline** (Default) or **Duotone** (Active).  
* **Size/Weight**: 1.5px stroke width (Regular).  
* **Coloring**: Icons should match their Module Token (e.g., L1 icons uses \#8DA399).

## **3\. 視覺風格與佈局 (Visual Style & Layout)**

* **Core Style**: **Soft UI** (Minimalist, Breathable, Floating).  
* **Radius**: 12px (Consistent on Cards, Inputs, Modals).  
* **Shadow**: box-shadow: 0 4px 20px rgba(0,0,0,0.05) (Soft, diffused).  
* **Whitespace**: Relaxed padding (p-6 / 24px).

### **Navigation Layout**

* **Sidebar**: Background Bg Card. Selected item uses Bg Base \+ Brand Main text.  
* **Top Bar**: Clean white background. Minimal content.

## **4\. 互動與反饋 (Interaction & Feedback)**

### **A. 載入狀態 (Loading States)**

* **Skeleton Screen**: Use Bg Base \+ Border with a shimmer animation.  
* **AI Processing**: "Breathing Light" animation (oscillate between Brand Light and Brand Main).

### **B. 操作回饋 (Feedback)**

* **Toast**:  
  * Background: Text Primary (\#464E56) for high contrast.  
  * Icon: Corresponding Status Token (e.g., Success \#7FB095).  
* **Button States**:  
  * **Default**: Brand Main (Solid).  
  * **Hover**: Brightness \-10% or add Shadow (Do NOT change hue).  
  * **Disabled**: Border color (\#E2E4E8).

### **C. 響應式策略 (RWD)**

* **Mobile (\<768px)**:  
  * Sidebar collapses into **Bottom Navigation**.  
  * Icons use **Outline** style; Active state becomes **Filled** with Brand Main.

## **5\. 組件實作標準 (Component Standards)**

**SCSS Mixins must be used:**

### **A. 結構組件**

* **Filter Bar**: Wrapper .filter-bar \-\> @include filter-bar($module-color).  
* **Data Table**: Wrapper .table-wrapper \-\> @include data-table($module-color).

### **B. 互動元件**

* **Buttons**:  
  * Base: @include button-base.  
  * Module: @include button-module($module-color).

## **6\. AI Implementation Rules**

1. **SCSS Variables**: Define these colors in src/styles/\_variables.scss first.  
2. **No Magic Numbers**: Use the defined spacing and radius variables.  
3. **Module Awareness**: When building a feature, automatically select the correct Module Token.  
   * *Example*: Building a "Task List"? Use **L4 (Purple)**.  
   * *Example*: Building a "Staff Profile"? Use **L1 (Green)**.