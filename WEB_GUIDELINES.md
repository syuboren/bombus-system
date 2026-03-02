# **WEB INTERFACE GUIDELINES (ANGULAR EDITION)**

**Purpose**: QA Checklist for Accessibility (A11y), Interaction, and Performance.

**Source**: Adapted from Vercel Engineering for Angular 18\.

## **How to Use**

**When asked to "Review UI", "Check A11y", or "Polish UX":**

1. Read the target component files (.html, .ts, .scss).  
2. Audit against the categories below.  
3. Output findings in file:line format.

## **✅ Quality Checklist**

### **Focus States (A11y)**

* **Visible Focus**: Interactive elements need :focus-visible.  
* **Anti-Pattern**: NEVER use outline: none without a replacement focus style.  
* **Click Safety**: Use :focus-visible instead of :focus to avoid ugly rings on mouse clicks.

### **Forms & Inputs**

* **Attributes**: Inputs need autocomplete, name, and correct type (email, tel, number).  
* **Labels**: MUST have for attribute linking to input id, or wrap the input.  
* **No Dead Zones**: Checkbox/Radio labels must be clickable.  
* **Safety**:  
  * spellcheck="false" on emails/usernames.  
  * autocomplete="off" for sensitive non-auth fields.  
  * **Do NOT block paste** (paste event prevention is forbidden).  
* **Feedback**: Submit button should show spinner/disabled state during isLoading().

### **Animation & Motion**

* **Performance**: Animate transform and opacity only. Avoid animating width/height (causes layout thrashing).  
* **Respect User**: Honor prefers-reduced-motion media query.  
* **Syntax**: Never use transition: all. List properties explicitly.

### **Typography**

* **Characters**: Use real ellipsis … (not ...) and curly quotes “”.  
* **Formatting**: Use text-wrap: balance on headlines to prevent orphans.  
* **Numbers**: Use font-variant-numeric: tabular-nums for data tables.

### **Content & Layout**

* **Truncation**: Text containers must handle overflow (text-overflow: ellipsis) or line-clamping.  
* **Empty States**: Use @if (list().length \=== 0\) to show a friendly "No items found" state.  
* **Flexbox**: Flex children often need min-width: 0 to allow text truncation to work.

### **Images (Angular Specific)**

* **Optimization**: Use NgOptimizedImage (ngSrc) instead of src.  
* **LCP**: Above-fold images must have priority attribute.  
* **CLS**: Always specify width and height to prevent layout shifts.

### **Navigation & State**

* **URL Sync**: Filters, tabs, and search queries should reflect in the URL (Query Params).  
* **Links**: Use \<a\> with routerLink.  
* **Destructive Actions**: Delete buttons require a confirmation dialog/modal.

### **Touch & Mobile**

* **Tap Targets**: Buttons must be at least 44x44px.  
* **Zoom**: touch-action: manipulation prevents double-tap zoom delay.  
* **Overscroll**: Modals/Drawers need overscroll-behavior: contain.

### **Dark Mode**

* **Meta**: \<meta name="theme-color"\> should match the page background.  
* **Native UI**: Set color-scheme: dark in CSS to ensure native scrollbars/inputs adapt.

## **🚫 Anti-patterns (Flag These\!)**

* user-scalable=no (Accessibility violation).  
* outline: none (Accessibility violation).  
* transition: all (Performance hit).  
* Images without dimensions (Layout shift).  
* Icon buttons without aria-label.  
* Hardcoded date formats (Use DatePipe or Intl).  
* Using \<div\> with (click) (Should be \<button\> or add role="button" \+ keyboard support).

## **Output Format Example**

src/app/features/login/login.component.html:12 \- Input missing 'autocomplete' attribute.  
src/app/features/login/login.component.scss:45 \- 'outline: none' found without focus replacement.  
src/app/shared/btn.component.ts:8 \- Icon button missing aria-label input.  
