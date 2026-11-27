package com.anmoljha.ultradian;

import android.accessibilityservice.AccessibilityService;
import android.content.ComponentName;
import android.content.Context;
import android.content.pm.PackageManager;
import android.provider.Settings;
import android.text.TextUtils;
import android.view.accessibility.AccessibilityEvent;
import java.util.HashMap;
import java.util.Map;

/**
 * Instant Habit Lock: Android tells us the moment any app's screen comes to the front (from the
 * home screen, the recent-apps list, a notification, anywhere), so a locked app is covered
 * immediately, with no gap. Only the package and screen name of the app in front are looked at;
 * nothing on screen is read, stored or sent.
 */
public class HabitLockAccessibility extends AccessibilityService {
    /** The app whose screen is in front right now, and when we heard (0 = never) */
    static volatile String front = "";
    static volatile long frontAt = 0;
    static volatile boolean connected = false;

    private final Map<String, Boolean> isActivity = new HashMap<>();

    @Override
    protected void onServiceConnected() {
        connected = true;
        HabitLock.refresh(getApplicationContext());
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent e) {
        if (e == null || e.getEventType() != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return;
        CharSequence p = e.getPackageName(), cls = e.getClassName();
        if (p == null || cls == null) return;
        String pkg = p.toString();
        // Only real app screens count: not our own lock cover, keyboards, the notification shade,
        // toasts or pop-ups (those keep whatever app is underneath as "in front")
        if (!activity(pkg, cls.toString())) return;
        front = pkg;
        frontAt = System.currentTimeMillis();
        HabitLockService.onFront(getApplicationContext(), pkg);
    }

    private boolean activity(String pkg, String cls) {
        String key = pkg + "/" + cls;
        Boolean known = isActivity.get(key);
        if (known != null) return known;
        boolean yes;
        try {
            getPackageManager().getActivityInfo(new ComponentName(pkg, cls), 0);
            yes = true;
        } catch (PackageManager.NameNotFoundException ex) {
            yes = false;
        } catch (Exception ex) {
            yes = false;
        }
        if (isActivity.size() > 500) isActivity.clear();
        isActivity.put(key, yes);
        return yes;
    }

    @Override
    public void onInterrupt() {
        // nothing to stop
    }

    @Override
    public void onDestroy() {
        connected = false;
        super.onDestroy();
    }

    /** Is the instant lock switched on in Settings > Accessibility? */
    static boolean enabled(Context c) {
        try {
            if (Settings.Secure.getInt(c.getContentResolver(), Settings.Secure.ACCESSIBILITY_ENABLED, 0) != 1) return false;
            String list = Settings.Secure.getString(c.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
            if (list == null) return false;
            String me = new ComponentName(c, HabitLockAccessibility.class).flattenToString();
            TextUtils.SimpleStringSplitter s = new TextUtils.SimpleStringSplitter(':');
            s.setString(list);
            while (s.hasNext()) if (s.next().equalsIgnoreCase(me)) return true;
            return false;
        } catch (Exception e) {
            return false;
        }
    }
}
