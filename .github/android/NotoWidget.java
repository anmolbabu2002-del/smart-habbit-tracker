package com.anmoljha.ultradian;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.view.View;
import android.widget.RemoteViews;
import java.util.List;

/**
 * Home-screen widget: today at a glance. Noto in the same mood as the app icon, what's left,
 * the lock, and the user's why. Reads what the web app last saved for Habit Lock; refreshed on
 * every change in the app, at the lock time and just after midnight (HabitLock.refresh).
 */
public class NotoWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context c, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) mgr.updateAppWidget(id, build(c));
    }

    /** Redraw every placed widget (no-op when none are on the home screen). */
    static void refreshAll(Context c) {
        try {
            AppWidgetManager mgr = AppWidgetManager.getInstance(c);
            int[] ids = mgr.getAppWidgetIds(new ComponentName(c, NotoWidget.class));
            if (ids == null || ids.length == 0) return;
            RemoteViews v = build(c);
            for (int id : ids) mgr.updateAppWidget(id, v);
        } catch (Exception ignored) {
            // the widget simply keeps its last picture
        }
    }

    private static RemoteViews build(Context c) {
        SharedPreferences p = HabitLock.prefs(c);
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.noto_widget);
        int total = p.getInt("habitCount", 0);
        boolean doneToday = HabitLock.today().equals(p.getString("doneDay", ""));
        List<String> left = doneToday ? new java.util.ArrayList<>() : HabitLock.pending(c);
        int leftN = Math.min(left.size(), total);
        int done = Math.max(0, total - leftN);
        boolean lockOn = p.getBoolean("enabled", false);
        int lockFrom = p.getInt("lockFrom", 16 * 60);
        boolean afterLock = HabitLock.minutesNow() >= lockFrom;
        String mood = AppIcon.moodNow(c);

        String title, line;
        if (total <= 0) {
            title = "No habits yet";
            line = "Tap to add your first one";
        } else if (doneToday || leftN == 0) {
            title = "All done for today!";
            line = lockOn ? "Your apps are unlocked" : "You kept your word today";
        } else {
            title = leftN + (leftN == 1 ? " habit to go" : " habits to go");
            if (lockOn && afterLock) line = "Your 5 apps are locked";
            else if (lockOn) line = "Apps lock at " + clock(lockFrom);
            else if (afterLock) line = "Still time before midnight";
            else line = "You've got this";
        }
        v.setTextViewText(R.id.w_title, title);
        v.setTextViewText(R.id.w_line, line);
        v.setTextViewText(R.id.w_count, total > 0 ? done + "/" + total : "");
        v.setProgressBar(R.id.w_progress, Math.max(total, 1), done, false);
        v.setTextViewText(R.id.w_left, leftN > 0 ? "Left: " + names(left) : "");
        v.setViewVisibility(R.id.w_left, leftN > 0 ? View.VISIBLE : View.GONE);
        String why = p.getString("why", "").trim();
        v.setTextViewText(R.id.w_why, why.isEmpty() ? "" : "“" + why + "”");
        v.setImageViewResource(R.id.w_noto,
            "done".equals(mood) ? R.drawable.widget_noto_done
            : "risk".equals(mood) ? R.drawable.widget_noto_risk
            : R.drawable.widget_noto_normal);

        Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        if (open != null) {
            open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);
            v.setOnClickPendingIntent(android.R.id.background, PendingIntent.getActivity(c, 7310, open, flags));
        }
        return v;
    }

    private static String names(List<String> l) {
        if (l.size() == 1) return l.get(0);
        if (l.size() == 2) return l.get(0) + " and " + l.get(1);
        return l.get(0) + ", " + l.get(1) + " and " + (l.size() - 2) + " more";
    }

    private static String clock(int min) {
        int h = (min / 60) % 24, m = min % 60, h12 = h % 12 == 0 ? 12 : h % 12;
        String ap = h < 12 ? "AM" : "PM";
        return m == 0 ? h12 + " " + ap : h12 + ":" + (m < 10 ? "0" : "") + m + " " + ap;
    }
}
