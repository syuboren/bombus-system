---
description: Standardize UI components for a specific module
---

# UI Standardization Workflow

Use this workflow to refactor a module's UI pages to match the system-wide design system.

## Usage
When asking the AI to standardize a module, provide the **Module Name** and **Module Color Variable**.

**Example Prompt:**
> "Run the UI Standardization workflow for the **L4 Project Management module**. The module color is **$color-l4-mauve**."

## Steps

1.  **Analyze the Module**:
    - Identify all pages in `src/app/features/[module]/pages`.
    - Check current HTML/SCSS implementation.
    - Confirm the module color variable in `assets/styles/_variables.scss`.

2.  **Refactor Pages (Iterative)**:
    - For each page component:
        - **Define Module Color**: Add `$module-color: [color-variable];` at the top of the SCSS file (after imports).
        - **Filter Bar (篩選區塊)**:
            - **HTML Structure**:
                - Wrapper: `<div class="filter-bar">`
                - Item: `<div class="filter-item">` (Replace old `.filter-group`)
                - Label: `<label class="filter-label">`
                - Select: `<select class="filter-select">` or `<select class="form-select">`
                - Actions: `<div class="filter-actions">` (Used for buttons or view toggles)
            - **SCSS**: `@include filter-bar($module-color);`
            - **Integration**: If the page has a View Toggle, move it into `.filter-actions` within the `.filter-bar`.
        - **Data Table (資料表格)**:
            - **HTML Structure**:
                - Wrapper: `<div class="table-wrapper">` (or specific name like `.courses-table-wrapper`)
                - Table: `<table class="standard-table">` (or similar class)
            - **SCSS**:
                - Wrapper: `@include card; padding: 0; overflow: hidden;` (Matches L1/L2 look)
                - Table: `@include data-table($module-color);`
                - **CRITICAL**: Do NOT add manual `border-bottom` or `background` to `th`. Let the mixin handle it.
        - **Buttons (按鈕)**:
            - Use `@include button-base;`
            - Use `@include button-module($module-color);` for primary actions.
        - **Status Badges (狀態標記)**:
            - SCSS: Use `@include status-badge;`
            - For module-colored badges: `background: rgba($module-color, 0.15); color: $module-color;`
        - **View Toggle (視圖切換)**:
            - **Priority**: Always use the shared `<app-view-toggle>` component.
            - **Implementation**:
                - TS: Import `ViewToggleComponent` and set `viewMode = signal<'list' | 'card'>('list');`.
                - HTML: `<app-view-toggle [viewMode]="viewMode()" [moduleColor]="'#hex'" (viewModeChange)="setViewMode($event)" />`.
            - **CRITICAL**: Standardize the mode value to `list` (not `table`) to stay compatible with the shared component.
            - **Visuals**: The active button must have a solid module-color background and a white icon.
        - **Variable Cleanup**:
            - Replace hardcoded hex codes with shared variables (e.g., `$color-soft-gray`, `$color-text-dark`).
            - Replace legacy variables (e.g., `$color-l2-clay`, `$color-border`) with new system variables.

3.  **Verify**:
    - Ensure no "Undefined mixin" errors.
    - Check for redundant CSS code or manual overrides that break consistency.
    - Confirm responsive layout (e.g., filter bar stacks on mobile).
    - Run `npm run start` to visually verify consistency with L1/L2.

4.  **Report**:
    - Documentation: Update `walkthrough.md`.
    - Visual Proof: Provide screenshots or descriptions of the refactored components.
