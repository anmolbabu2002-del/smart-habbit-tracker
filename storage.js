/* ==================== APP STORAGE ====================
 * Synchronous wrapper over localStorage + localForage backup.
 * 
 * How it works:
 * - Reads/writes are synchronous via localStorage (app stays fast)
 * - Every write is also mirrored to localForage (IndexedDB) in the background
 * - On app startup, if localStorage was wiped (Android cache clear, etc.),
 *   init() restores everything from the localForage backup automatically
 * 
 * Usage: Replace all `localStorage.xxx()` calls with `appStorage.xxx()`
 * ====================================================== */

const appStorage = {
  _ready: false,

  /**
   * Initialize: restore from localForage backup if localStorage was wiped.
   * Call this ONCE before loadState() on app startup.
   * Returns a Promise that resolves when restoration is complete.
   */
  async init() {
    if (typeof localforage === "undefined") {
      console.warn("localForage not loaded — using localStorage only");
      this._ready = true;
      return;
    }

    try {
      // Configure localForage to use IndexedDB with a named database
      localforage.config({
        name: "UltradianApp",
        storeName: "appData",
        driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE]
      });

      // Check if localStorage seems empty (possibly wiped)
      const hasMainState = localStorage.getItem("habitAppState");
      
      if (!hasMainState) {
        // localStorage might be wiped — try to restore from localForage backup
        console.log("[AppStorage] localStorage empty, attempting restore from IndexedDB...");
        const keys = await localforage.keys();
        let restoredCount = 0;
        
        for (const key of keys) {
          const val = await localforage.getItem(key);
          if (val !== null && val !== undefined) {
            localStorage.setItem(key, typeof val === "string" ? val : JSON.stringify(val));
            restoredCount++;
          }
        }

        if (restoredCount > 0) {
          console.log(`[AppStorage] Restored ${restoredCount} items from IndexedDB backup!`);
        }
      } else {
        // localStorage is fine — make sure localForage has a copy of everything
        // (sync in background, don't block startup)
        this._syncToBackup();
      }
    } catch (e) {
      console.warn("[AppStorage] Init error (will use localStorage only):", e);
    }

    this._ready = true;
  },

  /**
   * Background sync: copy all localStorage items to localForage
   */
  async _syncToBackup() {
    if (typeof localforage === "undefined") return;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key);
          await localforage.setItem(key, val);
        }
      }
    } catch (e) {
      // Silent fail — backup sync is best-effort
    }
  },

  /**
   * Set an item — writes to localStorage AND mirrors to localForage backup
   */
  setItem(key, value) {
    localStorage.setItem(key, value);
    // Mirror to localForage in background (fire-and-forget)
    if (typeof localforage !== "undefined") {
      localforage.setItem(key, value).catch(() => {});
    }
  },

  /**
   * Get an item — reads from localStorage (synchronous, instant)
   */
  getItem(key) {
    return localStorage.getItem(key);
  },

  /**
   * Remove an item — removes from both localStorage and localForage
   */
  removeItem(key) {
    localStorage.removeItem(key);
    if (typeof localforage !== "undefined") {
      localforage.removeItem(key).catch(() => {});
    }
  },

  /**
   * Clear all data — clears both localStorage and localForage
   */
  clear() {
    localStorage.clear();
    if (typeof localforage !== "undefined") {
      localforage.clear().catch(() => {});
    }
  },

  /**
   * Store binary data (ArrayBuffer/Blob) directly in IndexedDB.
   * Bypasses localStorage entirely (no 5 MB limit).
   */
  async setBinaryItem(key, data) {
    if (typeof localforage !== "undefined") {
      await localforage.setItem(key, data);
    }
  },

  /**
   * Retrieve binary data from IndexedDB.
   */
  async getBinaryItem(key) {
    if (typeof localforage !== "undefined") {
      return await localforage.getItem(key);
    }
    return null;
  },

  /**
   * Remove binary data from IndexedDB.
   */
  async removeBinaryItem(key) {
    if (typeof localforage !== "undefined") {
      await localforage.removeItem(key).catch(() => {});
    }
  }
};
