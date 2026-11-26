package com.anmoljha.ultradian;

import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;

/**
 * Noto's mood on the home screen. Three launcher entries (activity-aliases in the manifest)
 * share MainActivity; exactly one is enabled at a time:
 *   normal: the usual smile
 *   done:   every habit done today
 *   risk:   past the lock time (4 PM by default) with habits still open: crying
 * The switch only happens while the app is not on screen, so it never closes the app mid-use.
 */
final class AppIcon {
    private AppIcon() {}

    static final String[] MOODS = {"normal", "done", "risk"};
    private static final String[] ALIASES = {"IconNormal", "IconDone", "IconRisk"};

    /** True while MainActivity is on screen (set by MainActivity). */
    static volatile boolean appVisible = false;

    static String moodNow(Context c) {
        SharedPreferences p = HabitLock.prefs(c);
        if (p.getInt("habitCount", 0) <= 0) return "normal";
        if (HabitLock.today().equals(p.getString("doneDay", ""))) return "done";
        if (HabitLock.minutesNow() >= p.getInt("lockFrom", 16 * 60)) return "risk";
        return "normal";
    }

    /** Point the launcher at the alias for the current mood, unless the app is open. */
    static void sync(Context c) {
        if (appVisible) return;
        String mood = moodNow(c);
        PackageManager pm = c.getPackageManager();
        String pkg = c.getPackageName();
        try {
            int want = 0;
            for (int i = 0; i < MOODS.length; i++) if (MOODS[i].equals(mood)) want = i;
            ComponentName target = new ComponentName(pkg, pkg + "." + ALIASES[want]);
            if (!isEnabled(pm, target, want == 0)) {
                // enable the new one first so the app never disappears from the launcher
                pm.setComponentEnabledSetting(target, PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
            }
            for (int i = 0; i < ALIASES.length; i++) {
                if (i == want) continue;
                ComponentName other = new ComponentName(pkg, pkg + "." + ALIASES[i]);
                if (isEnabled(pm, other, i == 0)) {
                    pm.setComponentEnabledSetting(other, PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
                }
            }
        } catch (Exception ignored) {
            // a launcher or OEM that refuses: keep whatever icon is showing
        }
    }

    private static boolean isEnabled(PackageManager pm, ComponentName cn, boolean enabledInManifest) {
        int s = pm.getComponentEnabledSetting(cn);
        if (s == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT) return enabledInManifest;
        return s == PackageManager.COMPONENT_ENABLED_STATE_ENABLED;
    }
}
