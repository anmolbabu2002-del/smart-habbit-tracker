/* ==================== ANDROID APP MODE ====================
 * storage.js loads before the other app scripts, so this runs first.
 * When Ultradian runs as the installed Android app (Capacitor build in app-android/),
 * its files are served from the phone itself (https://localhost), so:
 *   • /.netlify/functions/* calls (AI, quiz, TTS, book proxy) go to the live site,
 *     where the API keys stay hidden
 *   • .mp3/.mp4 files aren't packaged (≈150 MB); they stream from the live site
 *   • Android's WebView has no Notification API, so it gets a safe stand-in
 * On the website nothing here changes anything.
 * ========================================================== */
(function () {
  const REMOTE = 'https://ultradiann.netlify.app';
  const C = window.Capacitor;
  let isNative = false;
  try {
    if (C && typeof C.isNativePlatform === 'function') isNative = C.isNativePlatform();
    else if (C && typeof C.getPlatform === 'function') isNative = C.getPlatform() !== 'web';
    else isNative = !!window.androidBridge;
  } catch (e) { isNative = !!window.androidBridge; }
  window.ULTRADIAN_NATIVE = isNative;

  // Call a Capacitor plugin method without a bundler. Rejects outside the app.
  window.ultradianNative = function (plugin, method, options) {
    const cap = window.Capacitor;
    if (!isNative || !cap) return Promise.reject(new Error('Not running in the Android app'));
    const p = cap.Plugins && cap.Plugins[plugin];
    if (p && typeof p[method] === 'function') return p[method](options || {});
    if (typeof cap.nativePromise === 'function') return cap.nativePromise(plugin, method, options || {});
    return Promise.reject(new Error(plugin + ' plugin is not available'));
  };

  if (!isNative) return;
  document.documentElement.classList.add('is-native-app');

  function fixUrl(url) {
    if (typeof url !== 'string' || !url) return url;
    if (url.startsWith('/.netlify/functions/')) return REMOTE + url;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(url) && !url.startsWith('//') && /\.(mp3|mp4)(\?|#|$)/i.test(url)) {
      return REMOTE + '/' + url.replace(/^\.?\//, '');
    }
    return url;
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    if (typeof input === 'string') input = fixUrl(input);
    else if (input instanceof URL) input = fixUrl(input.href.replace(location.origin, ''));
    else if (input instanceof Request) {
      const u = new URL(input.url);
      if (u.origin === location.origin && u.pathname.startsWith('/.netlify/functions/')) {
        input = new Request(REMOTE + u.pathname + u.search, input);
      }
    }
    return nativeFetch(input, init);
  };

  const NativeAudio = window.Audio;
  function AppAudio(src) { return arguments.length ? new NativeAudio(fixUrl(src)) : new NativeAudio(); }
  AppAudio.prototype = NativeAudio.prototype;
  window.Audio = AppAudio;

  const srcProp = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
  if (srcProp && srcProp.set) {
    Object.defineProperty(HTMLMediaElement.prototype, 'src', {
      configurable: true,
      enumerable: srcProp.enumerable,
      get: srcProp.get,
      set(value) { srcProp.set.call(this, fixUrl(value)); }
    });
  }

  if (!('Notification' in window)) {
    function AppNotification() { /* system notifications aren't wired up in the app yet */ }
    AppNotification.permission = 'denied';
    AppNotification.requestPermission = function (cb) {
      if (typeof cb === 'function') cb('denied');
      return Promise.resolve('denied');
    };
    window.Notification = AppNotification;
  }
})();

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
   * Snapshot of every key/value currently in localStorage (for backups).
   */
  exportAll() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) data[key] = localStorage.getItem(key);
    }
    return data;
  },

  /**
   * Replace all data with a backup snapshot. Waits for the IndexedDB mirror
   * to be cleared first so the restored values can't be wiped by a late clear().
   */
  async importAll(data) {
    localStorage.clear();
    if (typeof localforage !== "undefined") {
      await localforage.clear().catch(() => {});
    }
    for (const [key, value] of Object.entries(data)) {
      this.setItem(key, value);
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
