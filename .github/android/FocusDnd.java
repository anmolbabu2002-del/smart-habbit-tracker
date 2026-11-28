package com.anmoljha.ultradian;

import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;

/**
 * Do Not Disturb during a focus session (optional, needs "Do Not Disturb access").
 * Turns it on when a session starts and puts the user's own settings back when it ends,
 * however it ends: finished, given up, app killed (the end alarm calls refresh) or a reboot.
 * Alarms always ring. Calls: allowed, or silenced except someone calling twice in 15 minutes.
 */
final class FocusDnd {
    private FocusDnd() {}

    static boolean granted(Context c) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return false;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        return nm != null && nm.isNotificationPolicyAccessGranted();
    }

    static void sync(Context c) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        SharedPreferences p = HabitLock.prefs(c);
        boolean applied = p.getBoolean("dndApplied", false);
        boolean want = HabitLock.focusActive(c) && p.getBoolean("focusDnd", false) && granted(c);
        try {
            if (want && !applied) {
                NotificationManager.Policy old = nm.getNotificationPolicy();
                SharedPreferences.Editor e = p.edit()
                    .putInt("dndPrevFilter", nm.getCurrentInterruptionFilter())
                    .putBoolean("dndHadPolicy", old != null);
                if (old != null) {
                    e.putInt("dndPrevCats", old.priorityCategories)
                     .putInt("dndPrevCalls", old.priorityCallSenders)
                     .putInt("dndPrevMsgs", old.priorityMessageSenders)
                     .putInt("dndPrevVisual", Build.VERSION.SDK_INT >= Build.VERSION_CODES.N ? old.suppressedVisualEffects : 0);
                }
                e.putBoolean("dndApplied", true).apply();
                int cats = 0;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    cats |= NotificationManager.Policy.PRIORITY_CATEGORY_ALARMS | NotificationManager.Policy.PRIORITY_CATEGORY_MEDIA;
                }
                boolean blockCalls = p.getBoolean("focusCalls", false);
                cats |= blockCalls ? NotificationManager.Policy.PRIORITY_CATEGORY_REPEAT_CALLERS
                    : NotificationManager.Policy.PRIORITY_CATEGORY_CALLS | NotificationManager.Policy.PRIORITY_CATEGORY_REPEAT_CALLERS;
                nm.setNotificationPolicy(new NotificationManager.Policy(cats, NotificationManager.Policy.PRIORITY_SENDERS_ANY, NotificationManager.Policy.PRIORITY_SENDERS_ANY));
                nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY);
            } else if (!want && applied) {
                restore(c, nm, p);
            }
        } catch (Exception ignored) {
            // access was taken away mid-session: nothing we can change; forget our part
            if (!want) p.edit().putBoolean("dndApplied", false).apply();
        }
    }

    private static void restore(Context c, NotificationManager nm, SharedPreferences p) {
        if (granted(c)) {
            if (p.getBoolean("dndHadPolicy", false)) {
                NotificationManager.Policy prev = Build.VERSION.SDK_INT >= Build.VERSION_CODES.N
                    ? new NotificationManager.Policy(p.getInt("dndPrevCats", 0), p.getInt("dndPrevCalls", 0), p.getInt("dndPrevMsgs", 0), p.getInt("dndPrevVisual", 0))
                    : new NotificationManager.Policy(p.getInt("dndPrevCats", 0), p.getInt("dndPrevCalls", 0), p.getInt("dndPrevMsgs", 0));
                nm.setNotificationPolicy(prev);
            }
            int f = p.getInt("dndPrevFilter", NotificationManager.INTERRUPTION_FILTER_ALL);
            nm.setInterruptionFilter(f == NotificationManager.INTERRUPTION_FILTER_UNKNOWN ? NotificationManager.INTERRUPTION_FILTER_ALL : f);
        }
        p.edit().putBoolean("dndApplied", false).apply();
    }
}
