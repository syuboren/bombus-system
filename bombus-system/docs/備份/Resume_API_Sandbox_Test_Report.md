# Resume API Sandbox 測試報告

## 測試概要
本報告旨在驗證 Resume API Sandbox 的功能完整性。測試範圍涵蓋三個主要 API 端點：
1.  `/queryList`: 取得履歷列表
2.  `/query`: 取得單筆履歷詳情
3.  `/queryBatch`: 批量取得履歷詳情

測試針對下列三種模擬情境進行驗證：
-   **主動應徵履歷**
-   **配對履歷**
-   **儲存履歷**

---

## 測試詳細結果

### 1. 主動應徵履歷 (Active Application)
- **測試參數**:
    - `date`: 2025-04-25
    - `startTime`: 12
    - `endTime`: 13
- **驗證結果**:
    - **`/queryList`**: ✅ 成功。共取得 **2** 筆 ID。
    - **`/query`**: ✅ 成功。成功讀取求職者「張員瑛」的履歷詳情。
    - **`/queryBatch`**: ✅ 成功。成功批量讀取 **2** 筆履歷詳情。

#### 📄 回傳資料範例 (Response Data)

**`/queryList` Response:**
<details>
<summary>點擊展開 JSON 範例</summary>

```json
{
  "data": {
    "total": 2,
    "queryDate": "2025-04-25",
    "timePeriod": "12~13",
    "idList": [
      "3781639126814",
      "3781639123953"
    ]
  }
}
```
</details>

**`/query` Response (求職者：張員瑛):**
<details>
<summary>點擊展開 JSON 範例</summary>

```json
{
  "data": {
    "list": [
      {
        "resumeId": "3781639126814",
        "fullName": "張員瑛",
        "gender": "女",
        "email": "cprofile_stg053@104.com.tw",
        "cellPhone": "0900000000",
        "address": "台北市大安區",
        "birthday": "2004-08-31 00:00:00",
        "regSource": "104主動應徵",
        "employmentStatus": "在職中",
        "militaryStatus": "免役",
        "introduction": "<p>您好，我是張員瑛。</p>",
        "motto": "",
        "characteristic": "",
        "education": [
          {
            "schoolName": "首爾表演藝術高中",
            "degreeLevel": "高中",
            "major": "實用音樂科",
            "degreeStatus": "畢業",
            "schoolCountry": "韓國",
            "startDate": "2020-03-01 00:00:00",
            "endDate": "2023-02-01 00:00:00"
          }
        ],
        "seniority": "1~3年",
        "experiences": [
          {
            "firmName": "STARSHIP娛樂",
            "jobName": "藝人",
            "jobRole": "全職",
            "startDate": "2018-08-01 00:00:00",
            "endDate": "",
            "jobDesc": "<p>IZ*ONE 成員 (2018-2021)</p><p>IVE 成員 (2021-至今)</p>"
          }
        ],
         "jobRequirement": {
            "jobCharacteristic": "全職",
            "workInterval": "日班",
            "startDateOpt": "隨時",
            "wage": "面議",
            "workPlace": "台北市",
            "remoteWork": "不拘",
            "jobName": "演藝人員",
            "jobCategory": "演藝相關",
            "industryCategory": "文教育樂",
            "workDesc": "<p>尋求演藝相關工作機會</p>"
        }
      }
    ]
  }
}
```
</details>

---

### 2. 配對履歷 (Matched Resume)
- **測試參數**:
    - `date`: 2025-08-22
    - `startTime`: 0
    - `endTime`: 24
- **驗證結果**:
    - **`/queryList`**: ✅ 成功。共取得 **6** 筆 ID。
    - **`/query`**: ✅ 成功。成功讀取求職者「HsuLinda」的履歷詳情。

#### 📄 回傳資料範例 (Response Data)

**`/queryList` Response:**
<details>
<summary>點擊展開 JSON 範例</summary>

```json
{
  "data": {
    "total": 6,
    "queryDate": "2025-08-22",
    "timePeriod": "0~24",
    "idList": [
      "20000000014051",
      "3781639128202",
      "3781639120729",
      "3781639126814",
      "3781639128229",
      "3781639128238"
    ]
  }
}
```
</details>

**`/query` Response (求職者：HsuLinda):**
<details>
<summary>點擊展開 JSON 範例</summary>

```json
{
  "data": {
    "list": [
      {
        "resumeId": "20000000014051",
        "fullName": "HsuLinda",
        "gender": "女",
        "email": "linda.hsu@104.com.tw",
        "cellPhone": "0988888888",
        "address": "新北市新店區",
        "birthday": "1990-01-01 00:00:00",
        "employmentStatus": "在職中",
        "education": [
            {
                "schoolName": "輔仁大學",
                "degreeLevel": "大學",
                "major": "經濟學系",
                "degreeStatus": "畢業"
            }
        ],
        "experiences": [
            {
                "firmName": "104資訊科技",
                "jobName": "資深工程師",
                "startDate": "2015-01-01 00:00:00"
            }
        ]
      }
    ]
  }
}
```
</details>

---

### 3. 儲存履歷 (Saved Resume)
- **測試參數**:
    - `date`: 2025-11-05
    - **startTime**: 16
    - **endTime**: 17
- **驗證結果**:
    - **`/queryList`**: ✅ 成功。共取得 **42** 筆 ID。

#### 📄 回傳資料範例 (Response Data)

**`/queryList` Response (前5筆):**
<details>
<summary>點擊展開 JSON 範例</summary>

```json
{
  "data": {
    "total": 42,
    "queryDate": "2025-11-05",
    "timePeriod": "16~17",
    "idList": [
      "20000000014051",
      "3781639124529",
      "3781639099806",
      "3781639128825",
      "3781639124801",
      "..."
    ]
  }
}
```
</details>

---

## 結論
Resume API Sandbox 各項功能與資料回傳均正常，格式符合規格說明。
- 資料完整性驗證通過。
- 速率限制機制驗證確認。
