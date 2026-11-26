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

        Map<String, Long> openSince = new HashMap<>();
        Map<String, Boolean> seen = new HashMap<>();
        UsageEvents ev;
        try {
            ev = usm.queryEvents(from, now);
        } catch (Exception e) {
            return out;
        }
        UsageEvents.Event e = new UsageEvents.Event();
        while (ev != null && ev.hasNextEvent()) {
            ev.getNextEvent(e);
            String pkg = e.getPackageName();
            App app = out.get(pkg);
            if (app == null) continue;
            int type = e.getEventType();
            long t = e.getTimeStamp();
            if (type == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                if (!openSince.containsKey(pkg)) openSince.put(pkg, t);
                seen.put(pkg, true);
            } else if (type == UsageEvents.Event.MOVE_TO_BACKGROUND) {
                Long start = openSince.remove(pkg);
                // already open when the window began
                if (start == null && !seen.containsKey(pkg)) start = from;
                seen.put(pkg, true);
                if (start != null) add(app, start, t, starts, sinceMidnight, now);
            }
        }
        // still open right now (Ultradian is in front, so this is rare, but count it)
        for (Map.Entry<String, Long> open : openSince.entrySet()) {
            App app = out.get(open.getKey());
            if (app != null) add(app, open.getValue(), now, starts, sinceMidnight, now);
        }
        return out;
    }

    private static void add(App app, long a, long b, long[] starts, long sinceMidnight, long now) {
        if (b <= a) return;
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
