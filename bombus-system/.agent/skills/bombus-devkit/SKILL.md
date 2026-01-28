---
name: bombus-devkit
description: Comprehensive development kit for Angular/SQLite projects, including Angular Signals generators, Express/SQLite patterns, and UI/UX checklists.
---

# Team Standard Development Kit

This skill provides standardized templates and guidelines for developing within the team's ecosystem. It integrates best practices from Angular Signals, Node.js backend patterns, and High-End UI/UX standards.

## 1. Frontend: Angular Component Generator (Signals Optimized)

**Goal**: Create modern, performant Angular components using Signals and Standalone APIs.

### 📋 Component Template

When creating a new component (e.g., `feature-card`), follow this structure:

```typescript
// feature-card.component.ts
import { Component, ChangeDetectionStrategy, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-feature-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './feature-card.component.html',
  styleUrl: './feature-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeatureCardComponent {
  // Inputs (Signal Inputs)
  title = input.required<string>();
  isActive = input(false);

  // Outputs
  action = output<void>();

  // Internal State (Signals)
  isLoading = signal(false);

  // Methods
  handleAction() {
    this.isLoading.set(true);
    // ... logic
    this.action.emit();
    this.isLoading.set(false);
  }
}
```

### 🎨 SCSS Best Practices

- Use CSS variables for theme colors (`var(--primary-color)`).
- Use BEM-like naming or simple nested classes.
- Ensure `display: block` or `flex` is defined on the `:host`.

```scss
:host {
  display: block; // Important for custom elements
}

.card {
  // styles
}
```

## 2. Backend: Express & SQLite Pattern

**Goal**: Consistent, safe, and readable API endpoints using `better-sqlite3`.

### 📋 Route Template

When adding a new route file (e.g., `src/routes/items.js`):

```javascript
const express = require('express');
const router = express.Router();
const { prepare } = require('../db'); // Centralized DB access
const { v4: uuidv4 } = require('uuid');

// GET /api/items
router.get('/', (req, res) => {
    try {
        const items = prepare('SELECT * FROM items ORDER BY created_at DESC').all();
        res.json(items);
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
});

// POST /api/items
router.post('/', (req, res) => {
    try {
        const { name, type } = req.body;
        
        // 1. Validation
        if (!name) return res.status(400).json({ error: 'Name is required' });

        // 2. Logic
        const id = uuidv4();
        const stmt = prepare('INSERT INTO items (id, name, type) VALUES (?, ?, ?)');
        const result = stmt.run(id, name, type);

        // 3. Response
        res.status(201).json({ id, name, type });
    } catch (error) {
        console.error('Error creating item:', error);
        res.status(500).json({ error: 'Failed to create item' });
    }
});

module.exports = router;
```

### 🔒 Security & Performance Rules

- **Prepared Statements**: ALWAYS use `prepare('SQL...?').run(params)`. NEVER concatenate strings.
- **Transactions**: For multi-step writes, wrap in `db.transaction(() => { ... })()`.
- **Validation**: Validate `req.body` and `req.params` before DB operations.

## 3. Design: UI/UX Pro Max Checklist

**Goal**: "WOW" the user with premium aesthetics and smooth interactions.

### ✅ Pre-Delivery Checklist

#### 1. Visual Polish

- [ ] **Whitespace**: Is there enough breathing room? (Avoid clutter).
- [ ] **Alignment**: Are elements perfectly aligned?
- [ ] **Consistency**: Are button styles, colors, and fonts consistent with the design system?
- [ ] **Empty States**: does the UI look good when there is no data? (Show a nice illustration or message).

#### 2. Interaction & Feedback

- [ ] **Hover Effects**: Do buttons and interactive elements have hover states?
- [ ] **Loading States**: Are spinners/skeletons shown during async operations?
- [ ] **Feedback**: Do success/error toasts appear after actions?
- [ ] **Cursor**: Is `cursor: pointer` applied to all clickable elements?

#### 3. Responsiveness

- [ ] **Mobile View**: Does the layout stack correctly on small screens?
- [ ] **Overflow**: Are there any unwanted scrollbars?

#### 4. Dark Mode (If applicable)

- [ ] **Contrast**: Is text readable on dark backgrounds?
- [ ] **Borders**: Are borders subtle enough in dark mode?

---

## 4. Security & Code Review Standards

**Goal**: Ensure code quality, security, and maintainability.

### 🛡️ Security Checklist

- [ ] **Input Validation**: Are all API inputs validated? (e.g. `req.body.name` exists).
- [ ] **Injection Prevention**: Are all SQL queries using Prepared Statements? (No string concatenation).
- [ ] **Authentication**: Are protected routes checking for valid sessions/tokens?
- [ ] **Data Exposure**: Are we accidentally returning sensitive fields (passwords, internal IDs)?

### 🏗️ Quality & Architecture

- [ ] **Readability**: Is the code easy to understand? Are complex logic blocks commented?
- [ ] **DRY (Don't Repeat Yourself)**: Can repeated logic be extracted into a helper or service?
- [ ] **Error Handling**: Are `try/catch` blocks used in async/await functions? Are errors logged?

---

## 5. Web Design & Responsiveness Checks

**Goal**: Ensure a consistent, unbroken experience across all devices.

### 📱 Responsive Inspection

| Issue Type | What to Check |
| ---------- | ------------- |
| **Layout** | No horizontal scrollbars on mobile? No overlapping elements? |
| **Touch** | Are buttons clickable (min 44px) on touch screens? |
| **Text** | Is text readable without zooming? proper line-height? |

### 📐 Standard Viewports

- **Mobile**: 375px (iPhone SE/Mini) - *Critical*
- **Tablet**: 768px (iPad Portrait)
- **Desktop**: 1280px (Laptop)
- **Wide**: 1920px+ (Monitor)

### ♿ Accessibility Quick Check

- [ ] **Contrast**: Text ratio > 4.5:1?
- [ ] **Focus**: Do inputs/buttons have visible focus states?
- [ ] **Alt Text**: Do all meaningful images have `alt` tags?

---
