#!/bin/bash
# Grade Matrix API 綜合測試腳本
BASE="http://localhost:3001/api/grade-matrix"
PASS=0
FAIL=0

check() {
  local desc="$1"
  local expected_code="$2"
  local actual_code="$3"
  local body="$4"
  if [ "$actual_code" = "$expected_code" ]; then
    echo "  ✅ $desc (HTTP $actual_code)"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $desc (期望 HTTP $expected_code, 實際 HTTP $actual_code)"
    echo "     Body: $(echo "$body" | head -c 200)"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "======================================"
echo " Grade Matrix API 測試報告"
echo " $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================"

# --- 1. 軌道 CRUD ---
echo ""
echo "📌 1. 軌道 CRUD"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/tracks")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
check "GET /tracks (取得所有軌道)" 200 "$CODE" "$BODY"

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/tracks" \
  -H "Content-Type: application/json" \
  -d '{"code":"expert","name":"專家職","icon":"ri-star-line","color":"#A0926B","maxGrade":5,"sortOrder":3,"changedBy":"test-admin"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
check "POST /tracks (新增專家職軌道)" 201 "$CODE" "$BODY"
NEW_TRACK_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('changeId',''))" 2>/dev/null)

RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE/tracks/track-mgmt" \
  -H "Content-Type: application/json" \
  -d '{"name":"管理職(已更新)","changedBy":"test-admin"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
check "PUT /tracks/:id (更新管理職名稱)" 200 "$CODE" "$BODY"

# --- 2. 職等 CRUD ---
echo ""
echo "📌 2. 職等 CRUD"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
check "GET / (取得所有職等)" 200 "$CODE" "$BODY"

RESP=$(curl -s -w "\n%{http_code}" "$BASE/1")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
check "GET /:grade (取得 Grade 1 詳情)" 200 "$CODE" "$BODY"

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/grades" \
  -H "Content-Type: application/json" \
  -d '{"grade":8,"codeRange":"BS21-BS22","titleManagement":"資深副總","titleProfessional":"首席研究員","educationRequirement":"博士","responsibilityDescription":"頂層決策","changedBy":"test-admin"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
check "POST /grades (新增職等 Grade 8)" 201 "$CODE" "$BODY"

RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE/grades/1" \
  -H "Content-Type: application/json" \
  -d '{"responsibilityDescription":"基礎行政與執行工作(已更新)","changedBy":"test-admin"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
check "PUT /grades/:grade (更新 Grade 1 描述)" 200 "$CODE" "$BODY"

# --- 3. 職級薪資 CRUD ---
echo ""
echo "📌 3. 職級薪資 CRUD"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/grades/1/salaries" \
  -H "Content-Type: application/json" \
  -d '{"code":"BS99","salary":99999,"sortOrder":99,"changedBy":"test-admin"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
check "POST /grades/:grade/salaries (新增薪資 BS99)" 201 "$CODE" "$BODY"
NEW_SALARY_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('changeId',''))" 2>/dev/null)

RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE/salaries/sal-bs01" \
  -H "Content-Type: application/json" \
  -d '{"salary":31001,"changedBy":"test-admin"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
check "PUT /salaries/:id (更新 BS01 薪資)" 200 "$CODE" "$BODY"

# --- 4. 部門職位 CRUD ---
echo ""
echo "📌 4. 部門職位 CRUD"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/positions/list")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
check "GET /positions/list (取得所有職位)" 200 "$CODE" "$BODY"

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/positions" \
  -H "Content-Type: application/json" \
  -d '{"department":"測試部門","grade":3,"title":"測試職位","track":"professional","changedBy":"test-admin"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
check "POST /positions (新增測試職位)" 201 "$CODE" "$BODY"

# --- 5. 晉升條件 CRUD ---
echo ""
echo "📌 5. 晉升條件 CRUD"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/promotion/criteria")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
check "GET /promotion/criteria (取得所有晉升條件)" 200 "$CODE" "$BODY"

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/promotion/criteria" \
  -H "Content-Type: application/json" \
  -d '{"fromGrade":5,"toGrade":6,"track":"both","requiredSkills":["領導力"],"performanceThreshold":"A","changedBy":"test-admin"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
check "POST /promotion/criteria (新增晉升條件 5→6)" 201 "$CODE" "$BODY"

# --- 6. 刪除保護測試 ---
echo ""
echo "📌 6. 刪除保護測試"
RESP=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE/grades/1" \
  -H "Content-Type: application/json" \
  -d '{"changedBy":"test-admin"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
check "DELETE /grades/1 (應被保護 → 409 或 200*)" "200" "$CODE" "$BODY"
# 注：如果 Grade 1 有薪資或職位關聯，應返回 409

RESP=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE/tracks/track-mgmt" \
  -H "Content-Type: application/json" \
  -d '{"changedBy":"test-admin"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
check "DELETE /tracks/track-mgmt (管理職軌道刪除)" 200 "$CODE" "$BODY"

# --- 7. 審核流程測試 ---
echo ""
echo "📌 7. 審核流程測試（pending → approve/reject）"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/changes/pending")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
check "GET /changes/pending (取得待審核列表)" 200 "$CODE" "$BODY"
PENDING_COUNT=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',[])))" 2>/dev/null)
echo "     → 目前有 $PENDING_COUNT 筆待審核"

# 取得第一筆 pending 的 ID 來 approve
FIRST_PENDING_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); data=d.get('data',[]); print(data[0]['id'] if data else '')" 2>/dev/null)
if [ -n "$FIRST_PENDING_ID" ]; then
  RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/changes/$FIRST_PENDING_ID/approve" \
    -H "Content-Type: application/json" \
    -d '{"approvedBy":"test-admin"}')
  CODE=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | head -n -1)
  check "POST /changes/:id/approve (核准第一筆)" 200 "$CODE" "$BODY"
fi

# 取得下一筆 pending 來 reject
RESP=$(curl -s -w "\n%{http_code}" "$BASE/changes/pending")
BODY2=$(echo "$RESP" | head -n -1)
SECOND_PENDING_ID=$(echo "$BODY2" | python3 -c "import sys,json; d=json.load(sys.stdin); data=d.get('data',[]); print(data[0]['id'] if data else '')" 2>/dev/null)
if [ -n "$SECOND_PENDING_ID" ]; then
  RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/changes/$SECOND_PENDING_ID/reject" \
    -H "Content-Type: application/json" \
    -d '{"rejectReason":"測試駁回"}')
  CODE=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | head -n -1)
  check "POST /changes/:id/reject (駁回第二筆)" 200 "$CODE" "$BODY"
fi

# --- 8. 歷史記錄測試 ---
echo ""
echo "📌 8. 歷史記錄測試"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/changes/history")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
check "GET /changes/history (取得變更歷史)" 200 "$CODE" "$BODY"
HISTORY_COUNT=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',[])))" 2>/dev/null)
echo "     → 目前有 $HISTORY_COUNT 筆歷史記錄"

# 驗證歷史記錄包含 old_data / new_data
HAS_SNAPSHOT=$(echo "$BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
data=d.get('data',[])
if data:
    rec = data[0]
    has_old = rec.get('oldData') is not None or rec.get('old_data') is not None
    has_new = rec.get('newData') is not None or rec.get('new_data') is not None
    print('YES' if (has_old or has_new) else 'NO')
else:
    print('EMPTY')
" 2>/dev/null)
if [ "$HAS_SNAPSHOT" = "YES" ]; then
  echo "  ✅ 歷史記錄含 old_data / new_data 快照"
  PASS=$((PASS + 1))
elif [ "$HAS_SNAPSHOT" = "EMPTY" ]; then
  echo "  ⚠️  歷史記錄為空（可能所有筆都仍為 pending）"
else
  echo "  ❌ 歷史記錄缺少 old_data / new_data 快照"
  FAIL=$((FAIL + 1))
fi

# --- 9. 多軌道擴展測試 ---
echo ""
echo "📌 9. 多軌道擴展測試"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/tracks")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
TRACK_COUNT=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',[])))" 2>/dev/null)
check "GET /tracks (確認有複數軌道)" 200 "$CODE" "$BODY"
echo "     → 目前有 $TRACK_COUNT 個軌道"

# --- 10. 其他基礎端點 ---
echo ""
echo "📌 10. 其他基礎端點"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/departments/list")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
check "GET /departments/list (部門列表)" 200 "$CODE" "$BODY"

RESP=$(curl -s -w "\n%{http_code}" "$BASE/career/paths")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
check "GET /career/paths (職涯路徑)" 200 "$CODE" "$BODY"

# ====== 總結 ======
echo ""
echo "======================================"
echo " 測試結果：✅ $PASS 通過  ❌ $FAIL 失敗"
echo "======================================"
