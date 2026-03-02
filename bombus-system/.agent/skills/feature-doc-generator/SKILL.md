---
name: feature-doc-generator
description: Analyzes a full-stack feature (Frontend, Backend, DB) and generates comprehensive technical documentation.
---

# Feature Documentation Generator

Use this skill when the user asks to "document a feature", "explain how this feature works", "generate technical docs", or "retrieve field definitions" for a specific functionality.

## Core Objective
Systematically analyze the frontend, backend, and database layers of a specific feature to produce a structured technical documentation file (Markdown).

## Workflow

### Phase 1: Discovery (Codebase Analysis)
1.  **Frontend**:
    *   Locate the main Angular Page/Component.
    *   Identify the HTML template for UI labels (Chinese names).
    *   Find the Angular Service handling API calls.
2.  **Backend**:
    *   Identify the API Route Handler (Express/Node.js).
    *   Trace the logic to find SQL queries or ORM calls.
3.  **Database**:
    *   Identify the relevant Tables.
    *   Retrieve the Schema (Column names, Types).
    *   **Crucial**: Fetch actual data samples (via `sqlite3` or seed files) to make the docs concrete.

### Phase 2: Mapping & Extraction
Construct a mapping table for the data:
*   **Field Name (English)**: From Database Column or Code Variable.
*   **Field Name (Chinese)**: From UI Label or Comments.
*   **Type**: Data type (String, Integer, JSON, etc.).
*   **Description**: Brief explanation of the field.
*   **Example Data**: Real content from the database.

### Phase 3: Documentation Generation
Generate a Markdown file with the following structure:

```markdown
# [Feature Name] System Implementation Documentation

## 1. Codebase Locations
*   **Frontend**: [Path to Component], [Path to Service]
*   **Backend**: [Path to Route], [Path to DB File]

## 2. 資料庫結構與欄位對照 (Database Schema & Fields)
(Repeat for each table)
### [Table Name]
| 欄位名稱 (English) | 欄位名稱 (Chinese) | 類型 | 說明 | 範例資料 (Example) |
| :--- | :--- | :--- | :--- | :--- |
| `id` | ID | TEXT | UUID, 主鍵 | `uuid-001` |
| ... | ... | ... | ... | ... |

## 3. API Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | /api/... | ... |

## 4. Implementation Notes
(Any specific logic, enum values, or relationships)
```

## Best Practices
*   **Always Verify**: Don't guess field names; check the actual DB schema.
*   **Real Examples**: Documentation is useless without examples. Query the DB to show what the data actually looks like.
*   **Bilingual**: Always provide both English (Code) and Chinese (Business) terms.
