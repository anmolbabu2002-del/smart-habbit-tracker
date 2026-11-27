package com.anmoljha.ultradian;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.StrikethroughSpan;
import android.view.View;
import android.widget.RemoteViews;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Home-screen widget: your why on Noto's banner (orange / red when apps are locked / mint when
 * all done), the day's progress, and up to 3 habits. Tick habits are ticked right here; photo
 * habits open the app's camera. Ticks made here are kept in "widgetTicks" until the app next
 * opens and records them properly (streaks, celebration). Data comes from what the web app last
 * sent to Habit Lock ("widget": id, name, color, photo, done).
 */
public class NotoWidget extends AppWidgetProvider {
    static final String ACTION_TICK = "com.anmoljha.ultradian.WIDGET_TICK";

    @Override
    public void onUpdate(Context c, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) mgr.updateAppWidget(id, build(c, id));
        mgr.notifyAppWidgetViewDataChanged(ids, R.id.w_list);
    }

    @Override
    public void onReceive(Context c, Intent intent) {
        super.onReceive(c, intent);
        if (ACTION_TICK.equals(intent.getAction())) tick(c, intent.getStringExtra("id"));
    }

    /** Redraw every placed widget (no-op when none are on the home screen). */
    static void refreshAll(Context c) {
        try {
            AppWidgetManager mgr = AppWidgetManager.getInstance(c);
            int[] ids = mgr.getAppWidgetIds(new ComponentName(c, NotoWidget.class));
            if (ids == null || ids.length == 0) return;
            for (int id : ids) mgr.updateAppWidget(id, build(c, id));
            mgr.notifyAppWidgetViewDataChanged(ids, R.id.w_list);
        } catch (Exception ignored) {
            // the widget keeps its last picture
        }
    }

    // ── data ──

    static final class Habit {
        String id, name, color;
        String week = ""; // "1/3" for times-a-week habits
        boolean photo, done, req; // req: counts today (a weekly habit can be on the list without being due yet)
    }

    /** Today's habits as the app last sent them; done flags only count if they're from today */
    static List<Habit> habits(Context c) {
        SharedPreferences p = HabitLock.prefs(c);
        boolean fresh = HabitLock.today().equals(p.getString("day", ""));
        List<Habit> out = new ArrayList<>();
        try {
            JSONArray a = new JSONArray(p.getString("widget", "[]"));
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.getJSONObject(i);
                Habit h = new Habit();
                h.id = o.optString("id");
                h.name = o.optString("name");
                h.color = o.optString("color", "orange");
                h.photo = o.optBoolean("photo", false);
                h.done = fresh && o.optBoolean("done", false);
                h.req = o.optBoolean("req", true);
                h.week = o.optString("week", "");
                out.add(h);
            }
        } catch (Exception ignored) {
            // nothing saved yet
        }
        return out;
    }

    /** Tick a habit from the home screen (tick habits only; photo habits need the camera). */
    static void tick(Context c, String id) {
        if (id == null) return;
        SharedPreferences p = HabitLock.prefs(c);
        String today = HabitLock.today();
        if (!today.equals(p.getString("day", ""))) {
            // the app hasn't sent today's list yet: open it instead of guessing
            openApp(c);
            return;
        }
        try {
            JSONArray a = new JSONArray(p.getString("widget", "[]"));
            JSONArray pending = new JSONArray();
            boolean changed = false;
            int reqCount = 0;
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.getJSONObject(i);
                if (id.equals(o.optString("id")) && !o.optBoolean("done") && !o.optBoolean("photo")) {
                    o.put("done", true);
                    changed = true;
                }
                if (!o.optBoolean("done") && o.optBoolean("req", true)) pending.put(o.optString("name"));
                if (o.optBoolean("req", true)) reqCount++;
            }
            if (!changed) return;
            JSONArray ticks = new JSONArray(p.getString("widgetTicks", "[]"));
            JSONObject t = new JSONObject();
            t.put("id", id);
            t.put("day", today);
            t.put("at", System.currentTimeMillis());
            ticks.put(t);
            SharedPreferences.Editor e = p.edit()
                .putString("widget", a.toString())
                .putString("pending", pending.toString())
                .putString("widgetTicks", ticks.toString());
            if (pending.length() == 0 && reqCount > 0) e.putString("doneDay", today); // last one due: apps unlock now
            e.apply();
        } catch (Exception ignored) {
            return;
        }
        HabitLock.refresh(c); // lock, icon mood and every widget
    }

    /** Open habits first, then done ones, each in the app's order */
    static List<Habit> ordered(Context c) {
        List<Habit> all = habits(c), order = new ArrayList<>();
        for (Habit h : all) if (!h.done) order.add(h);
        for (Habit h : all) if (h.done) order.add(h);
        return order;
    }

    /** One row of the list (used by NotoWidgetService) */
    static RemoteViews row(Context c, Habit h) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.noto_widget_row);
        boolean d = h.done;
        if (d) {
            SpannableString s = new SpannableString(h.name);
            s.setSpan(new StrikethroughSpan(), 0, s.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
            v.setTextViewText(R.id.w_name, s);
            v.setTextColor(R.id.w_name, c.getResources().getColor(R.color.widget_done_ink));
        } else if (!h.week.isEmpty()) {
            // "Run  1/3" with the count in a lighter colour
            SpannableString s = new SpannableString(h.name + "  " + h.week);
            s.setSpan(new android.text.style.ForegroundColorSpan(c.getResources().getColor(R.color.widget_soft)), h.name.length(), s.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
            v.setTextViewText(R.id.w_name, s);
            v.setTextColor(R.id.w_name, c.getResources().getColor(R.color.widget_ink));
        } else {
            v.setTextViewText(R.id.w_name, h.name);
            v.setTextColor(R.id.w_name, c.getResources().getColor(R.color.widget_ink));
        }
        v.setInt(R.id.w_row, "setBackgroundResource", d ? R.drawable.widget_row_done : rowBg(h.color));
        v.setImageViewResource(R.id.w_btn, d ? R.drawable.widget_btn_done : h.photo ? camBtn(h.color) : tickBtn(h.color));
        // what a tap does: WidgetActionActivity reads these
        Intent fill = new Intent().putExtra("id", h.id).putExtra("action", d ? "open" : h.photo ? "prove" : "tick");
        v.setOnClickFillInIntent(R.id.w_item, fill);
        return v;
    }

    // ── drawing ──

    private static RemoteViews build(Context c, int widgetId) {
        SharedPreferences p = HabitLock.prefs(c);
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.noto_widget);
        List<Habit> all = habits(c);
        int total = 0, done = 0; // only habits due today count
        for (Habit h : all) if (h.req) { total++; if (h.done) done++; }
        boolean rest = total == 0 && !all.isEmpty();
        boolean allDone = total > 0 && (done == total || HabitLock.today().equals(p.getString("doneDay", "")));
        if (allDone) done = total;
        int left = total - done;
        boolean lockOn = p.getBoolean("enabled", false);
        int lockFrom = p.getInt("lockFrom", 16 * 60);
        boolean evening = HabitLock.minutesNow() >= lockFrom;
        boolean locked = lockOn && left > 0 && evening;
        String mood = allDone ? "done" : (left > 0 && evening) ? "risk" : "normal";

        // banner
        v.setImageViewResource(R.id.w_art, "done".equals(mood) ? R.drawable.widget_banner_done : "risk".equals(mood) ? R.drawable.widget_banner_risk : R.drawable.widget_banner_normal);
        v.setImageViewResource(R.id.w_noto, "done".equals(mood) ? R.drawable.widget_sticker_done : "risk".equals(mood) ? R.drawable.widget_sticker_risk : R.drawable.widget_sticker_normal);
        String why = p.getString("why", "").trim();
        v.setTextViewText(R.id.w_why, "“" + (why.isEmpty() ? "I’m not going to stay average." : why) + "”");
        String status;
        if (rest) status = "Rest day \u00B7 nothing due";
        else if (total == 0) status = "Add your first habit";
        else if (allDone) status = "All done! " + total + " of " + total;
        else if (locked) status = "Apps locked · " + left + " left";
        else if (lockOn) status = done + " of " + total + " done · locks at " + clock(lockFrom);
        else status = done + " of " + total + " done";
        v.setTextViewText(R.id.w_status, status);
        v.setTextColor(R.id.w_status, Color.parseColor("done".equals(mood) ? "#08936F" : "risk".equals(mood) ? "#C8102E" : "#E8542A"));
        v.setTextViewCompoundDrawables(R.id.w_status, locked ? R.drawable.widget_lock : 0, 0, 0, 0);
        v.setProgressBar(R.id.w_progress, Math.max(total, 1), done, false);
        v.setOnClickPendingIntent(R.id.w_banner, openIntent(c, null, 7310));

        // every habit, scrolling: rows come from NotoWidgetService; taps go to WidgetActionActivity
        Intent svc = new Intent(c, NotoWidgetService.class).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        svc.setData(Uri.parse("ultradian://widget/" + widgetId));
        v.setRemoteAdapter(R.id.w_list, svc);
        v.setEmptyView(R.id.w_list, R.id.w_empty);
        int mutable = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? PendingIntent.FLAG_MUTABLE : 0;
        Intent tap = new Intent(c, WidgetActionActivity.class);
        v.setPendingIntentTemplate(R.id.w_list, PendingIntent.getActivity(c, 7320, tap, PendingIntent.FLAG_UPDATE_CURRENT | mutable));
        v.setOnClickPendingIntent(R.id.w_empty, openIntent(c, null, 7311));
        return v;
    }

    private static int flags() {
        return PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);
    }

    /** Open the app; with a habit id it goes straight to that habit's camera. */
    static PendingIntent openIntent(Context c, String proveId, int code) {
        Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        if (open == null) open = new Intent(c, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        if (proveId != null) {
            open.putExtra(HabitLockPlugin.EXTRA_PROVE, proveId);
            open.setData(Uri.parse("ultradian://prove/" + Uri.encode(proveId)));
        }
        return PendingIntent.getActivity(c, code, open, flags());
    }

    static void openApp(Context c) {
        try { openIntent(c, null, 7312).send(); } catch (Exception ignored) { /* nothing to open */ }
    }

    private static int rowBg(String color) {
        switch (color) {
            case "mint": return R.drawable.widget_row_mint;
            case "blue": return R.drawable.widget_row_blue;
            case "purple": return R.drawable.widget_row_purple;
            case "yellow": return R.drawable.widget_row_yellow;
            case "red": return R.drawable.widget_row_red;
            default: return R.drawable.widget_row_orange;
        }
    }

    private static int tickBtn(String color) {
        switch (color) {
            case "mint": return R.drawable.widget_btn_mint;
            case "blue": return R.drawable.widget_btn_blue;
            case "purple": return R.drawable.widget_btn_purple;
            case "yellow": return R.drawable.widget_btn_yellow;
            case "red": return R.drawable.widget_btn_red;
            default: return R.drawable.widget_btn_orange;
        }
    }

    private static int camBtn(String color) {
        switch (color) {
            case "mint": return R.drawable.widget_cam_mint;
            case "blue": return R.drawable.widget_cam_blue;
            case "purple": return R.drawable.widget_cam_purple;
            case "yellow": return R.drawable.widget_cam_yellow;
            case "red": return R.drawable.widget_cam_red;
            default: return R.drawable.widget_cam_orange;
        }
    }

    private static String clock(int min) {
        int h = (min / 60) % 24, m = min % 60, h12 = h % 12 == 0 ? 12 : h % 12;
        String ap = h < 12 ? "AM" : "PM";
        return m == 0 ? h12 + " " + ap : h12 + ":" + (m < 10 ? "0" : "") + m + " " + ap;
    }
}
