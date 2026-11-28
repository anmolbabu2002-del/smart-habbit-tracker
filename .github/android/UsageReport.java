package com.anmoljha.ultradian;

import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Screen time of the locked apps, counted from the phone's own open/close events (not Android's
 * daily totals, which are often wrong on Xiaomi and others). Covers today and the 7 days before.
 * For each app: today so far, each past full day, and each past day up to the same clock time
 * (so 2 PM today is compared with 2 PM on earlier days). Nothing leaves the phone.
 */
final class UsageReport {
    private UsageReport() {}

    static final int PAST = 7;

    static final class App {
        long today;
        final long[] full = new long[PAST];  // [0] = yesterday
        final long[] same = new long[PAST];  // same days, midnight up to the current clock time
    }

    static Map<String, App> read(Context c, List<String> pkgs) {
        Map<String, App> out = new HashMap<>();
        for (String p : pkgs) out.put(p, new App());
        UsageStatsManager usm = (UsageStatsManager) c.getSystemService(Context.USAGE_STATS_SERVICE);
        if (usm == null) return out;

        long now = System.currentTimeMillis();
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, 0);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        // day starts, local time (handles daylight-saving days of 23 or 25 hours)
        long[] starts = new long[PAST + 2]; // starts[0] = today, starts[i] = i days ago, starts[PAST+1] unused end marker
        starts[0] = cal.getTimeInMillis();
        for (int i = 1; i <= PAST; i++) {
            cal.add(Calendar.DAY_OF_YEAR, -1);
            starts[i] = cal.getTimeInMillis();
        }
        long sinceMidnight = now - starts[0];
        long from = starts[PAST];

        // Counted like Digital Wellbeing: each activity of an app is open from "resumed" until
        // "paused"/"stopped"; the app is in use while any of its activities is open. The screen
        // turning off, the lock screen or a shutdown ends everything. An unmatched "closed" event
        // (an app that wasn't seen opening, e.g. a background update) counts nothing.
        Map<String, Long> pkgSince = new HashMap<>();        // app in use since
        Map<String, java.util.Set<String>> openActs = new HashMap<>();
        UsageEvents ev;
        try {
            ev = usm.queryEvents(from, now);
        } catch (Exception e) {
            return out;
        }
        UsageEvents.Event e = new UsageEvents.Event();
        while (ev != null && ev.hasNextEvent()) {
            ev.getNextEvent(e);
            int type = e.getEventType();
            long t = e.getTimeStamp();
            if (type == 16 || type == 17 || type == 26) { // screen off, lock screen, shutdown: nothing is in use
                for (Map.Entry<String, Long> o : pkgSince.entrySet()) add(out.get(o.getKey()), o.getValue(), t, starts, sinceMidnight, now);
                pkgSince.clear();
                openActs.clear();
                continue;
            }
            String pkg = e.getPackageName();
            App app = out.get(pkg);
            if (app == null) continue;
            String act = String.valueOf(e.getClassName());
            java.util.Set<String> acts = openActs.get(pkg);
            if (type == 1) { // resumed
                if (acts == null) { acts = new java.util.HashSet<>(); openActs.put(pkg, acts); }
                acts.add(act);
                if (!pkgSince.containsKey(pkg)) pkgSince.put(pkg, t);
            } else if (type == 2 || type == 23) { // paused, stopped
                if (acts == null || !acts.remove(act)) continue; // never seen opening: count nothing
                if (acts.isEmpty()) {
                    openActs.remove(pkg);
                    Long start = pkgSince.remove(pkg);
                    if (start != null) add(app, start, t, starts, sinceMidnight, now);
                }
            }
        }
        // still open right now (Ultradian is in front, so this is rare, but count it)
        for (Map.Entry<String, Long> open : pkgSince.entrySet()) {
            App app = out.get(open.getKey());
            if (app != null) add(app, open.getValue(), now, starts, sinceMidnight, now);
        }
        return out;
    }

    private static void add(App app, long a, long b, long[] starts, long sinceMidnight, long now) {
        if (app == null || b <= a) return;
        app.today += overlap(a, b, starts[0], now);
        for (int i = 1; i <= PAST; i++) {
            long dayStart = starts[i], dayEnd = starts[i - 1];
            app.full[i - 1] += overlap(a, b, dayStart, dayEnd);
            app.same[i - 1] += overlap(a, b, dayStart, Math.min(dayEnd, dayStart + sinceMidnight));
        }
    }

    private static long overlap(long a, long b, long from, long to) {
        long s = Math.max(a, from), e = Math.min(b, to);
        return e > s ? e - s : 0;
    }
}
