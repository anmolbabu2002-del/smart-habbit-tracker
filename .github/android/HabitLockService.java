package com.anmoljha.ultradian;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Runs only while Habit Lock is on (from 4 PM until today's habits are done). About twice a
 * second it asks Android which app is in front (Usage access); if it's one of the blocked
 * apps, it covers it with a full-screen lock (Display over other apps). Nothing is stored
 * or sent: it only compares the app's package name with the blocked list.
 */
public class HabitLockService extends Service {
    static volatile boolean running = false;

    private static final String CHANNEL = "habit_lock";
    private static final int NOTIFICATION_ID = 7302;
    private static final long TICK_MS = 250;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private WindowManager windowManager;
    private View overlay;
    private String overlayPackage;
    private String foreground = "";
    private long lastQuery = 0;
    /** Each activity's last lifecycle event: "pkg/class" -> {event type, time} */
    private final Map<String, long[]> activities = new HashMap<>();
    /** When the lock screen's own buttons sent the user away (the app's "stopped" can come late) */
    private long sentAwayAt = 0;
    private long lastNotified = 0;

    private final Runnable tick = new Runnable() {
        @Override
        public void run() {
            step();
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        windowManager = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "Habit Lock", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Shown while social apps are locked until your habits are done");
            ch.setShowBadge(false);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification n = buildNotification();
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIFICATION_ID, n);
        }
        lastNotified = System.currentTimeMillis();
        if (!running) {
            running = true;
            lastQuery = 0;
            handler.post(tick);
        }
        return START_STICKY;
    }

    private void step() {
        FocusDnd.sync(this);
        if (!HabitLock.isLockActive(this)) {
            stopEverything();
            HabitLock.scheduleNext(this);
            return;
        }
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null && !pm.isInteractive()) {
            hideOverlay();
            handler.postDelayed(tick, 2000);
            return;
        }
        String fg = currentForeground();
        String target = HabitLock.shouldBlock(this, fg) ? fg
            : getPackageName().equals(fg) ? null : stillOpenBlocked();
        if (target != null) showOverlay(target);
        else hideOverlay();
        if (System.currentTimeMillis() - lastNotified > 60_000) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.notify(NOTIFICATION_ID, buildNotification());
            lastNotified = System.currentTimeMillis();
        }
        handler.postDelayed(tick, TICK_MS);
    }

    /**
     * The app in front, from usage events: always the last 10 minutes, taking the newest one by
     * time. Some phones (Xiaomi and others) write these events seconds late, and a late event must
     * still count (reading only "new since last time" missed them, so reopening a locked app from
     * recent apps or the home screen slipped through).
     */
    private String currentForeground() {
        UsageStatsManager usm = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
        if (usm == null) return foreground;
        long now = System.currentTimeMillis();
        UsageEvents events;
        long span = (lastQuery == 0 ? 60 : 10) * 60 * 1000L; // first look after (re)starting: the last hour
        try { events = usm.queryEvents(now - span, now + 1000); } catch (Exception ex) { return foreground; }
        UsageEvents.Event e = new UsageEvents.Event();
        long newest = -1;
        String pkg = null;
        while (events != null && events.hasNextEvent()) {
            events.getNextEvent(e);
            int type = e.getEventType();
            if (type == 1 && e.getTimeStamp() >= newest) { // ACTIVITY_RESUMED / MOVE_TO_FOREGROUND
                newest = e.getTimeStamp();
                pkg = e.getPackageName();
            }
            if (type == 1 || type == 2 || type == 23) { // resumed, paused, stopped
                String key = e.getPackageName() + "/" + e.getClassName();
                long[] last = activities.get(key);
                if (last == null || e.getTimeStamp() >= last[1]) activities.put(key, new long[] { type, e.getTimeStamp() });
            } else if (type == 26 || type == 27) { // phone shut down / started: nothing is open any more
                activities.clear();
            }
        }
        // forget activities that closed long ago
        for (Iterator<long[]> it = activities.values().iterator(); it.hasNext();) {
            long[] v = it.next();
            if (v[0] == 23 && now - v[1] > span) it.remove();
        }
        if (pkg != null) foreground = pkg;
        lastQuery = now;
        return foreground;
    }

    /**
     * A blocked app that never really left the screen. Half a swipe to the home screen and back
     * makes the phone log "home screen opened", but the app itself never gets "stopped" (Android
     * logs that only once you've truly left). So an app counts as open until it is stopped.
     */
    private String stillOpenBlocked() {
        Set<String> blocked = HabitLock.blocked(this);
        String best = null;
        long bestTime = -1;
        for (Map.Entry<String, long[]> en : activities.entrySet()) {
            long[] v = en.getValue();
            // before Android 10 there is no "stopped", so "paused" means it left
            boolean open = v[0] == 1 || (v[0] == 2 && Build.VERSION.SDK_INT >= 29);
            if (!open || v[1] < sentAwayAt) continue;
            String p = en.getKey().substring(0, en.getKey().indexOf('/'));
            if (!blocked.contains(p) || !HabitLock.shouldBlock(this, p)) continue;
            if (v[1] > bestTime) { bestTime = v[1]; best = p; }
        }
        return best;
    }

    private String appName(String pkg) {
        try {
            PackageManager pm = getPackageManager();
            ApplicationInfo info = pm.getApplicationInfo(pkg, 0);
            return String.valueOf(pm.getApplicationLabel(info));
        } catch (Exception e) {
            if (pkg.contains("instagram")) return "Instagram";
            if (pkg.contains("youtube")) return "YouTube";
            if (pkg.contains("facebook")) return "Facebook";
            if (pkg.contains("snapchat")) return "Snapchat";
            if (pkg.contains("musically") || pkg.contains("trill")) return "TikTok";
            return "This app";
        }
    }

    private int dp(float v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics());
    }

    private void showOverlay(String pkg) {
        if (!HabitLock.canDrawOverlays(this) || windowManager == null) return;
        if (overlay != null && pkg.equals(overlayPackage)) return;
        hideOverlay();
        String name = appName(pkg);
        List<String> pending = HabitLock.pending(this);
        boolean focus = HabitLock.focusActive(this);
        int orange = Color.parseColor("#FF8C42");

        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setPadding(dp(28), dp(28), dp(28), dp(28));
        box.setBackgroundColor(Color.parseColor("#F20B0F17"));
        box.setClickable(true); // swallow touches meant for the app underneath

        // A drawn lock in a round orange badge (no emoji)
        ImageView icon = new ImageView(this);
        icon.setImageResource(android.R.drawable.ic_lock_lock);
        icon.setColorFilter(Color.WHITE);
        icon.setPadding(dp(18), dp(18), dp(18), dp(18));
        GradientDrawable badge = new GradientDrawable();
        badge.setShape(GradientDrawable.OVAL);
        badge.setColor(orange);
        icon.setBackground(badge);
        LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams(dp(84), dp(84));
        iconParams.gravity = Gravity.CENTER_HORIZONTAL;
        box.addView(icon, iconParams);

        boolean strict = focus && HabitLock.focusStrict(this);
        TextView title = new TextView(this);
        title.setText(strict ? "Focus mode is on" : name + " is locked");
        title.setTextColor(Color.WHITE);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 24);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, dp(12), 0, dp(8));
        box.addView(title);

        // the user's own line ("Your why"), in a soft orange box
        String why = HabitLock.prefs(this).getString("why", "").trim();
        if (!why.isEmpty()) {
            TextView quote = new TextView(this);
            quote.setText("\u201C" + why + "\u201D");
            quote.setTextColor(Color.WHITE);
            quote.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
            quote.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD_ITALIC));
            quote.setGravity(Gravity.CENTER);
            quote.setLineSpacing(0, 1.2f);
            quote.setPadding(dp(16), dp(12), dp(16), dp(12));
            GradientDrawable qbg = new GradientDrawable();
            qbg.setColor(Color.argb(46, 255, 140, 66));
            qbg.setCornerRadius(dp(16));
            quote.setBackground(qbg);
            LinearLayout.LayoutParams qp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            qp.bottomMargin = dp(16);
            box.addView(quote, qp);
        }

        StringBuilder sb = new StringBuilder();
        if (focus) {
            long left = Math.max(1, (HabitLock.focusUntil(this) - System.currentTimeMillis() + 59999) / 60000);
            String label = HabitLock.focusLabel(this);
            sb.append(strict ? "Your phone is locked for deep work" : "You're in a focus session");
            if (!label.isEmpty()) sb.append(":\n").append(label);
            sb.append("\n\n").append(left).append(left == 1 ? " minute" : " minutes").append(" to go. You've got this.");
            if (strict) sb.append("\nCalls still work.");
        } else {
            sb.append("Finish today's habits first:\n");
            int shown = 0;
            for (String h : pending) {
                if (shown++ == 5) { sb.append("\n+ ").append(pending.size() - 5).append(" more"); break; }
                sb.append("\n").append(h);
            }
        }
        TextView body = new TextView(this);
        body.setText(sb.toString());
        body.setTextColor(Color.parseColor("#D0D5DD"));
        body.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        body.setGravity(Gravity.CENTER);
        body.setLineSpacing(0, 1.25f);
        body.setPadding(0, 0, 0, dp(24));
        box.addView(body);

        Button prove = new Button(this);
        prove.setText(focus ? "Back to focus" : "Do it in Ultradian");
        prove.setAllCaps(false);
        prove.setTextColor(Color.WHITE);
        prove.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        GradientDrawable button = new GradientDrawable();
        button.setColor(orange);
        button.setCornerRadius(dp(16));
        prove.setBackground(button);
        prove.setOnClickListener(v -> {
            sentAwayAt = System.currentTimeMillis();
            Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
            if (open != null) {
                open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                open.putExtra(HabitLockPlugin.EXTRA_OPEN, true);
                open.putExtra("app", name);
                startActivity(open);
            }
            hideOverlay();
        });
        LinearLayout.LayoutParams wide = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(54));
        box.addView(prove, wide);

        Button home = new Button(this);
        home.setText("Go to home screen");
        home.setAllCaps(false);
        home.setTextColor(Color.parseColor("#D0D5DD"));
        home.setBackgroundColor(Color.TRANSPARENT);
        home.setOnClickListener(v -> {
            sentAwayAt = System.currentTimeMillis();
            Intent h = new Intent(Intent.ACTION_MAIN);
            h.addCategory(Intent.CATEGORY_HOME);
            h.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(h);
            hideOverlay();
        });
        LinearLayout.LayoutParams homeParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(50));
        homeParams.topMargin = dp(8);
        if (!strict) box.addView(home, homeParams); // in strict focus the home screen is locked too

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                type,
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.CENTER;
        try {
            windowManager.addView(box, lp);
            overlay = box;
            overlayPackage = pkg;
        } catch (Exception ignored) {
            overlay = null;
            overlayPackage = null;
        }
    }

    private void hideOverlay() {
        if (overlay != null && windowManager != null) {
            try {
                windowManager.removeView(overlay);
            } catch (Exception ignored) {
                // already gone
            }
        }
        overlay = null;
        overlayPackage = null;
    }

    private Notification buildNotification() {
        List<String> pending = HabitLock.pending(this);
        boolean focus = HabitLock.focusActive(this);
        String text = focus
                ? "Focus session: social apps unlock when the timer ends"
                : pending.isEmpty()
                ? "Social apps unlock when today's habits are done"
                : pending.size() + (pending.size() == 1 ? " habit" : " habits") + " left: " + joinShort(pending);
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent pi = open == null ? null : PendingIntent.getActivity(this, 7303, open, flags);
        Notification.Builder b = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(this, CHANNEL)
                : new Notification.Builder(this);
        b.setContentTitle(focus ? "Focus mode is on" : "Habit Lock is on")
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text + "\nInstagram, YouTube, Facebook, Snapchat and TikTok stay locked until then."))
                .setOngoing(true)
                .setShowWhen(false);
        int icon = getResources().getIdentifier("ic_stat_habit", "drawable", getPackageName());
        b.setSmallIcon(icon != 0 ? icon : android.R.drawable.ic_lock_lock);
        if (pi != null) b.setContentIntent(pi);
        return b.build();
    }

    private static String joinShort(List<String> items) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < items.size() && i < 3; i++) {
            if (i > 0) sb.append(", ");
            sb.append(items.get(i));
        }
        if (items.size() > 3) sb.append(" and ").append(items.size() - 3).append(" more");
        return sb.toString();
    }

    private void stopEverything() {
        handler.removeCallbacks(tick);
        hideOverlay();
        running = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE);
        else stopForeground(true);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(tick);
        hideOverlay();
        running = false;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
