package com.anmoljha.ultradian;

import android.app.AlarmManager;
import android.app.AppOpsManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Process;
import android.provider.Settings;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.json.JSONArray;

/**
 * Habit Lock: from 4 PM until today's habits are done, chosen social-media apps are covered
 * by a lock screen. This class holds the shared state (written by the web app through
 * HabitLockPlugin) and decides when the lock is on; HabitLockService does the blocking.
 */
final class HabitLock {
    static final String PREFS = "ultradian_habit_lock";
    private static final int ALARM_REQUEST = 7301;

    private HabitLock() {}

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    static int minutesNow() {
        Calendar cal = Calendar.getInstance();
        return cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE);
    }

    /** Locked = a focus session is running, or the habit lock applies right now. */
    static boolean isLockActive(Context c) {
        return focusActive(c) || habitLockActive(c);
    }

    /** End of the running focus session that locks apps (epoch ms), 0 if none. */
    static long focusUntil(Context c) {
        return prefs(c).getLong("focusUntil", 0L);
    }

    static boolean focusActive(Context c) {
        return focusUntil(c) > System.currentTimeMillis();
    }

    static String focusLabel(Context c) {
        return prefs(c).getString("focusLabel", "");
    }

    /** Strict focus: every app is covered except Ultradian and calling/emergency apps. */
    static boolean focusStrict(Context c) {
        return prefs(c).getBoolean("focusStrict", false);
    }

    static final Set<String> ALWAYS_ALLOWED = new HashSet<>(java.util.Arrays.asList(
        "com.android.dialer", "com.google.android.dialer", "com.samsung.android.dialer", "com.android.phone",
        "com.android.server.telecom", "com.android.incallui", "com.samsung.android.incallui", "com.android.emergency",
        "com.google.android.apps.safetyhub", "com.android.systemui", "com.android.contacts", "com.google.android.contacts",
        "com.samsung.android.app.contacts", "com.android.packageinstaller", "com.google.android.packageinstaller",
        "com.android.permissioncontroller", "com.google.android.permissioncontroller"));

    /** Should this app (now in front) be covered by the lock screen? */
    static boolean shouldBlock(Context c, String pkg) {
        if (pkg == null || pkg.equals(c.getPackageName())) return false;
        if (focusActive(c) && focusStrict(c)) return !ALWAYS_ALLOWED.contains(pkg);
        return blocked(c).contains(pkg);
    }

    /** Habit lock = switched on, has habits, past the lock time, and today's habits aren't all done. */
    static boolean habitLockActive(Context c) {
        SharedPreferences p = prefs(c);
        if (!p.getBoolean("enabled", false)) return false;
        if (p.getInt("habitCount", 0) <= 0) return false;
        if (minutesNow() < p.getInt("lockFrom", 16 * 60)) return false;
        return !today().equals(p.getString("doneDay", ""));
    }

    static Set<String> blocked(Context c) {
        return new HashSet<>(list(prefs(c).getString("blocked", "[]")));
    }

    /** Habits still open today. If the app hasn't been opened today, every habit is open. */
    static List<String> pending(Context c) {
        SharedPreferences p = prefs(c);
        if (today().equals(p.getString("day", ""))) return list(p.getString("pending", "[]"));
        return list(p.getString("allHabits", "[]"));
    }

    static List<String> list(String json) {
        List<String> out = new ArrayList<>();
        try {
            JSONArray a = new JSONArray(json);
            for (int i = 0; i < a.length(); i++) out.add(a.getString(i));
        } catch (Exception ignored) {
            // empty
        }
        return out;
    }

    static boolean hasUsageAccess(Context c) {
        try {
            AppOpsManager ops = (AppOpsManager) c.getSystemService(Context.APP_OPS_SERVICE);
            int mode;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                mode = ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), c.getPackageName());
            } else {
                mode = ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), c.getPackageName());
            }
            return mode == AppOpsManager.MODE_ALLOWED;
        } catch (Exception e) {
            return false;
        }
    }

    static boolean canDrawOverlays(Context c) {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(c);
    }

    /** Start or stop the blocking service to match the current state, then plan the next check. */
    static void refresh(Context c) {
        boolean active = isLockActive(c);
        if (active && hasUsageAccess(c) && canDrawOverlays(c)) {
            Intent i = new Intent(c, HabitLockService.class);
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) c.startForegroundService(i);
                else c.startService(i);
            } catch (Exception ignored) {
                // Android refused a background start; the next alarm tries again
            }
        } else if (!active) {
            c.stopService(new Intent(c, HabitLockService.class));
        }
        scheduleNext(c);
    }

    /**
     * Wake up at the next moment that matters: the lock time today or tomorrow, or every
     * 15 minutes while the lock is on (restarts the service if the phone killed it).
     */
    static void scheduleNext(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Intent i = new Intent(c, HabitLockReceiver.class).setAction("com.anmoljha.ultradian.HABIT_LOCK_CHECK");
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent pi = PendingIntent.getBroadcast(c, ALARM_REQUEST, i, flags);
        SharedPreferences p = prefs(c);
        boolean focus = focusActive(c);
        if (!p.getBoolean("enabled", false) && !focus) {
            am.cancel(pi);
            return;
        }
        long at;
        if (focus) {
            // wake right after the session ends (or in 15 minutes, whichever is first)
            at = Math.min(focusUntil(c) + 1500L, System.currentTimeMillis() + 15 * 60 * 1000L);
        } else if (habitLockActive(c)) {
            at = System.currentTimeMillis() + 15 * 60 * 1000L;
        } else {
            Calendar cal = Calendar.getInstance();
            int lockFrom = p.getInt("lockFrom", 16 * 60);
            cal.set(Calendar.HOUR_OF_DAY, lockFrom / 60);
            cal.set(Calendar.MINUTE, lockFrom % 60);
            cal.set(Calendar.SECOND, 5);
            cal.set(Calendar.MILLISECOND, 0);
            if (cal.getTimeInMillis() <= System.currentTimeMillis()) cal.add(Calendar.DAY_OF_YEAR, 1);
            at = cal.getTimeInMillis();
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, at, pi);
            }
        } catch (Exception ignored) {
            // no alarm: the app re-plans next time it opens
        }
    }
}
