package com.anmoljha.ultradian;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.provider.Settings;
import com.getcapacitor.JSArray;
import org.json.JSONArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The web app's handle on Habit Lock: tells Android which habits are open today, checks the
 * two accesses it needs (Usage access, Display over other apps), opens their settings pages,
 * and reports when the lock screen's "Prove it" button opened the app.
 */
@CapacitorPlugin(name = "UltradianHabitLock")
public class HabitLockPlugin extends Plugin {
    static final String EXTRA_OPEN = "com.anmoljha.ultradian.HABIT_LOCK_OPEN";
    static final String EXTRA_PROVE = "com.anmoljha.ultradian.PROVE_HABIT";

    @Override
    public void load() {
        HabitLock.refresh(getContext());
        if (getActivity() != null) checkIntent(getActivity().getIntent());
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        checkIntent(intent);
    }

    private void checkIntent(Intent intent) {
        if (intent == null) return;
        String prove = intent.getStringExtra(EXTRA_PROVE);
        if (prove != null) {
            // the widget's camera button: open that habit's photo check
            intent.removeExtra(EXTRA_PROVE);
            JSObject d = new JSObject();
            d.put("id", prove);
            notifyListeners("proveHabit", d, true);
        }
        if (!intent.getBooleanExtra(EXTRA_OPEN, false)) return;
        JSObject data = new JSObject();
        data.put("app", intent.getStringExtra("app"));
        intent.removeExtra(EXTRA_OPEN);
        notifyListeners("openHabits", data, true);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        Context c = getContext();
        JSObject r = new JSObject();
        r.put("usageAccess", HabitLock.hasUsageAccess(c));
        r.put("overlay", HabitLock.canDrawOverlays(c));
        r.put("locked", HabitLock.isLockActive(c));
        r.put("running", HabitLockService.running);
        call.resolve(r);
    }

    /** Saves today's state from the web app and starts or stops the lock to match. */
    @PluginMethod
    public void update(PluginCall call) {
        SharedPreferences.Editor e = HabitLock.prefs(getContext()).edit();
        e.putBoolean("enabled", call.getBoolean("enabled", false));
        e.putInt("lockFrom", call.getInt("lockFrom", 16 * 60));
        e.putInt("habitCount", call.getInt("habitCount", 0));
        String day = call.getString("today", HabitLock.today());
        e.putString("day", day);
        if (call.getBoolean("done", false)) e.putString("doneDay", day);
        else if (day.equals(HabitLock.prefs(getContext()).getString("doneDay", ""))) e.putString("doneDay", "");
        JSArray pending = call.getArray("pending", new JSArray());
        JSArray all = call.getArray("allHabits", new JSArray());
        JSArray blocked = call.getArray("blocked", new JSArray());
        e.putString("pending", pending.toString());
        e.putString("allHabits", all.toString());
        e.putString("blocked", blocked.toString());
        // focus sessions with "Lock social apps" on: locked until this time (epoch ms)
        e.putLong("focusUntil", call.getData().optLong("focusUntil", 0L));
        e.putString("focusLabel", call.getString("focusLabel", ""));
        e.putBoolean("focusStrict", call.getBoolean("focusStrict", false));
        e.putString("why", call.getString("why", ""));
        // the widget's habit list; ticks made on the widget and not yet taken stay ticked
        try {
            JSONArray w = call.getArray("widget", new JSArray());
            org.json.JSONArray ticks = new org.json.JSONArray(HabitLock.prefs(getContext()).getString("widgetTicks", "[]"));
            for (int i = 0; i < w.length(); i++) {
                org.json.JSONObject o = w.getJSONObject(i);
                for (int j = 0; j < ticks.length(); j++) {
                    org.json.JSONObject t = ticks.getJSONObject(j);
                    if (t.optString("id").equals(o.optString("id")) && t.optString("day").equals(day)) o.put("done", true);
                }
            }
            e.putString("widget", w.toString());
            // widget ticks the app hasn't taken yet still count (no flicker of the lock meanwhile)
            if (w.length() > 0 && ticks.length() > 0) {
                JSONArray left = new JSONArray();
                for (int i = 0; i < w.length(); i++) if (!w.getJSONObject(i).optBoolean("done")) left.put(w.getJSONObject(i).optString("name"));
                e.putString("pending", left.toString());
                if (left.length() == 0) e.putString("doneDay", day);
            }
        } catch (Exception ignored) {
            // keep the old list
        }
        e.apply();
        HabitLock.refresh(getContext());
        JSObject r = new JSObject();
        r.put("locked", HabitLock.isLockActive(getContext()));
        call.resolve(r);
    }

    /** Can this launcher add the widget for us, and is one on the home screen already? */
    @PluginMethod
    public void widgetStatus(PluginCall call) {
        Context c = getContext();
        android.appwidget.AppWidgetManager m = android.appwidget.AppWidgetManager.getInstance(c);
        JSObject r = new JSObject();
        boolean supported = false;
        int placed = 0;
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) supported = m.isRequestPinAppWidgetSupported();
            placed = m.getAppWidgetIds(new android.content.ComponentName(c, NotoWidget.class)).length;
        } catch (Exception ignored) {
            // unknown launcher: treat as unsupported
        }
        r.put("supported", supported);
        r.put("placed", placed > 0);
        call.resolve(r);
    }

    /** Ask the launcher to put the widget on the home screen (it shows its own "Add" dialog). */
    @PluginMethod
    public void pinWidget(PluginCall call) {
        Context c = getContext();
        boolean asked = false;
        try {
            android.appwidget.AppWidgetManager m = android.appwidget.AppWidgetManager.getInstance(c);
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O && m.isRequestPinAppWidgetSupported()) {
                asked = m.requestPinAppWidget(new android.content.ComponentName(c, NotoWidget.class), null, null);
            }
        } catch (Exception ignored) {
            // fall through: the app shows how to add it by hand
        }
        JSObject r = new JSObject();
        r.put("asked", asked);
        call.resolve(r);
    }

    /** Ticks made on the home-screen widget since the app last looked (then forgets them). */
    @PluginMethod
    public void takeWidgetTicks(PluginCall call) {
        SharedPreferences p = HabitLock.prefs(getContext());
        String raw = p.getString("widgetTicks", "[]");
        p.edit().putString("widgetTicks", "[]").apply();
        JSObject r = new JSObject();
        try { r.put("ticks", new JSArray(raw)); } catch (Exception ex) { r.put("ticks", new JSArray()); }
        call.resolve(r);
    }

    /** Screen time of the given apps: today, and the 7 days before (see UsageReport). */
    @PluginMethod
    public void usage(PluginCall call) {
        Context c = getContext();
        if (!HabitLock.hasUsageAccess(c)) {
            JSObject r = new JSObject();
            r.put("access", false);
            call.resolve(r);
            return;
        }
        JSArray arr = call.getArray("pkgs", new JSArray());
        java.util.List<String> pkgs = new java.util.ArrayList<>();
        for (int i = 0; i < arr.length(); i++) {
            try { pkgs.add(arr.getString(i)); } catch (Exception ignored) { /* skip */ }
        }
        new Thread(() -> {
            try {
                java.util.Map<String, UsageReport.App> data = UsageReport.read(c, pkgs);
                JSObject apps = new JSObject();
                for (java.util.Map.Entry<String, UsageReport.App> en : data.entrySet()) {
                    UsageReport.App a = en.getValue();
                    JSObject o = new JSObject();
                    o.put("today", a.today);
                    JSArray full = new JSArray(), same = new JSArray();
                    for (int i = 0; i < UsageReport.PAST; i++) { full.put(a.full[i]); same.put(a.same[i]); }
                    o.put("full", full);
                    o.put("same", same);
                    apps.put(en.getKey(), o);
                }
                JSObject r = new JSObject();
                r.put("access", true);
                r.put("apps", apps);
                call.resolve(r);
            } catch (Exception ex) {
                call.reject("Couldn't read screen time");
            }
        }).start();
    }

    @PluginMethod
    public void openUsageAccessSettings(PluginCall call) {
        Context c = getContext();
        Intent i = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        i.setData(Uri.parse("package:" + c.getPackageName()));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            c.startActivity(i);
        } catch (Exception ex) {
            // Some phones only open the general list
            Intent general = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try { c.startActivity(general); } catch (Exception ignored) { call.reject("Couldn't open Usage access settings"); return; }
        }
        call.resolve();
    }

    @PluginMethod
    public void openOverlaySettings(PluginCall call) {
        Context c = getContext();
        Intent i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + c.getPackageName()));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            c.startActivity(i);
        } catch (Exception ex) {
            call.reject("Couldn't open Display over other apps settings");
            return;
        }
        call.resolve();
    }
}
