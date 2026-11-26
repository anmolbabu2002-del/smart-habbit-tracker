package com.anmoljha.ultradian;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.provider.Settings;
import com.getcapacitor.JSArray;
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
        if (intent == null || !intent.getBooleanExtra(EXTRA_OPEN, false)) return;
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
        e.apply();
        HabitLock.refresh(getContext());
        JSObject r = new JSObject();
        r.put("locked", HabitLock.isLockActive(getContext()));
        call.resolve(r);
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
