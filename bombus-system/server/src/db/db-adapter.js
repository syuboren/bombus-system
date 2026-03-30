/**
 * DBAdapter — 資料庫抽象層
 *
 * 提供 query/run/transaction 介面，封裝 sql.js 操作。
 * 未來遷移 PostgreSQL 時只需實作同一介面 (PostgresAdapter)。
 */

const fs = require('fs');
const path = require('path');

// ─── 抽象基底類別 ───

class DBAdapter {
  /**
   * 執行 SELECT 查詢，回傳結果陣列
   * @param {string} sql - SQL 語句 (Prepared Statement)
   * @param {any[]} params - 綁定參數
   * @returns {Object[]} 結果列陣列
   */
  query(sql, params = []) {
    throw new Error('query() must be implemented by subclass');
  }

  /**
   * 執行 SELECT 查詢，回傳第一筆結果或 null
   * @param {string} sql
   * @param {any[]} params
   * @returns {Object|null}
   */
  queryOne(sql, params = []) {
    throw new Error('queryOne() must be implemented by subclass');
  }

  /**
   * 執行 INSERT/UPDATE/DELETE，回傳 { changes }
   * @param {string} sql
   * @param {any[]} params
   * @returns {{ changes: number }}
   */
  run(sql, params = []) {
    throw new Error('run() must be implemented by subclass');
  }

  /**
   * 交易封裝，確保原子性
   * @param {function(DBAdapter): any} fn - 在交易內執行的函數
   * @returns {any} fn 的回傳值
   */
  transaction(fn) {
    throw new Error('transaction() must be implemented by subclass');
  }

  /**
   * 取得與既有 prepare() API 相容的物件
   * 讓已使用 prepare(sql).all() / .get() / .run() 的路由無需改動呼叫方式
   * @param {string} sql
   * @returns {{ all: Function, get: Function, run: Function }}
   */
  prepare(sql) {
    throw new Error('prepare() must be implemented by subclass');
  }

  /**
   * 將記憶體中的資料庫持久化至檔案
   */
  save() {
    throw new Error('save() must be implemented by subclass');
  }

  /**
   * 關閉資料庫連線
   */
  close() {
    throw new Error('close() must be implemented by subclass');
  }
}

// ─── sql.js 實作 ───

class SqliteAdapter extends DBAdapter {
  /**
   * @param {import('sql.js').Database} sqlJsDb - sql.js Database 實例
   * @param {string|null} filePath - 資料庫檔案路徑（null 表示純記憶體）
   */
  constructor(sqlJsDb, filePath = null) {
    super();
    this._db = sqlJsDb;
    this._filePath = filePath;
    this._inTransaction = false;
  }

  /** @returns {import('sql.js').Database} 底層 sql.js 實例 */
  get raw() {
    return this._db;
  }

  query(sql, params = []) {
    try {
      const stmt = this._db.prepare(sql);
      const safeParams = params.map(p => p === undefined ? null : p);
      if (safeParams.length > 0) {
        stmt.bind(safeParams);
      }
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    } catch (e) {
      console.error('SQL Error (query):', e.message, 'SQL:', sql, 'Params:', params);
      return [];
    }
  }

  queryOne(sql, params = []) {
    try {
      const stmt = this._db.prepare(sql);
      const safeParams = params.map(p => p === undefined ? null : p);
      if (safeParams.length > 0) {
        stmt.bind(safeParams);
      }
      let result = null;
      if (stmt.step()) {
        result = stmt.getAsObject();
      }
      stmt.free();
      return result;
    } catch (e) {
      console.error('SQL Error (queryOne):', e.message, 'SQL:', sql, 'Params:', params);
      return null;
    }
  }

  run(sql, params = []) {
    try {
      const stmt = this._db.prepare(sql);
      const safeParams = params.map(p => p === undefined ? null : p);
      if (safeParams.length > 0) {
        stmt.bind(safeParams);
      }
      stmt.step();
      stmt.free();
      const changes = this._db.getRowsModified();
      // 在交易內不呼叫 save()：sql.js 的 export() 會破壞活躍的交易狀態
      if (!this._inTransaction) {
        this.save();
      }
      return { changes };
    } catch (e) {
      // 在交易內必須拋出錯誤以觸發 ROLLBACK，確保原子性
      if (this._inTransaction) {
        throw e;
      }
      console.error('SQL Error (run):', e.message, 'SQL:', sql, 'Params:', params);
      return { changes: 0 };
    }
  }

  transaction(fn) {
    this._db.run('BEGIN TRANSACTION');
    this._inTransaction = true;
    try {
      const result = fn(this);
      this._db.run('COMMIT');
      this.save();
      return result;
    } catch (e) {
      try {
        this._db.run('ROLLBACK');
      } catch (rollbackErr) {
        // 交易可能已因錯誤自動回滾
        console.error('Rollback warning:', rollbackErr.message);
      }
      throw e;
    } finally {
      this._inTransaction = false;
    }
  }

  /**
   * 相容既有 prepare(sql).all() / .get() / .run() 介面
   */
  prepare(sql) {
    const self = this;
    return {
      all: (...params) => self.query(sql, params),
      get: (...params) => self.queryOne(sql, params),
      run: (...params) => self.run(sql, params)
    };
  }

  save() {
    if (this._filePath) {
      try {
        const data = this._db.export();
        const buf = Buffer.from(data);

        // 防護：若匯出結果明顯小於既有檔案（>50% 縮小），保留備份並警告
        if (fs.existsSync(this._filePath)) {
          const existingSize = fs.statSync(this._filePath).size;
          if (existingSize > 1024 && buf.length < existingSize * 0.5) {
            const bakPath = this._filePath + '.bak';
            fs.copyFileSync(this._filePath, bakPath);
            console.warn(`⚠️ DB save: ${path.basename(this._filePath)} 大幅縮小 (${existingSize} → ${buf.length})，已備份至 .bak`);
          }
        }

        // 寫入暫存檔再 rename（原子寫入）
        const tmpPath = this._filePath + '.tmp';
        fs.writeFileSync(tmpPath, buf);
        fs.renameSync(tmpPath, this._filePath);
      } catch (e) {
        console.error('DB save error:', e.message);
      }
    }
  }

  close() {
    this.save();
    this._db.close();
  }
}

module.exports = { DBAdapter, SqliteAdapter };
