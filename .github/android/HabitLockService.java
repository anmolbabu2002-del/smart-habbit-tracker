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
import android.widget.LinearLayout;
import android.widget.TextView;
import java.util.List;
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
    private static final long TICK_MS = 600;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private WindowManager windowManager;
    private View overlay;
    private String overlayPackage;
    private String foreground = "";
    private long lastQuery = 0;
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
        Set<String> blocked = HabitLock.blocked(this);
        if (fg != null && blocked.contains(fg)) showOverlay(fg);
        else hideOverlay();
        if (System.currentTimeMillis() - lastNotified > 60_000) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.notify(NOTIFICATION_ID, buildNotification());
            lastNotified = System.currentTimeMillis();
        }
        handler.postDelayed(tick, TICK_MS);
    }

    /** The app most recently brought to the front, from Android's usage events. */
    private String currentForeground() {
        UsageStatsManager usm = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
        if (usm == null) return foreground;
        long now = System.currentTimeMillis();
        long from = lastQuery == 0 ? now - 60 * 60 * 1000L : lastQuery - 2000;
        UsageEvents events = usm.queryEvents(from, now);
        UsageEvents.Event e = new UsageEvents.Event();
        while (events != null && events.hasNextEvent()) {
            events.getNextEvent(e);
            if (e.getEventType() == 1) foreground = e.getPackageName(); // ACTIVITY_RESUMED / MOVE_TO_FOREGROUND
        }
        lastQuery = now;
        return foreground;
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

        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setPadding(dp(28), dp(28), dp(28), dp(28));
        box.setBackgroundColor(Color.parseColor("#F20B0F17"));
        box.setClickable(true); // swallow touches meant for the app underneath

        TextView icon = new TextView(this);
        icon.setText("🔒");
        icon.setTextSize(TypedValue.COMPLEX_UNIT_SP, 56);
        icon.setGravity(Gravity.CENTER);
        box.addView(icon);

        TextView title = new TextView(this);
        title.setText(name + " is locked");
        title.setTextColor(Color.WHITE);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 24);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, dp(12), 0, dp(8));
        box.addView(title);

        StringBuilder sb = new StringBuilder("Finish today's habits first:\n");
        int shown = 0;
        for (String h : pending) {
            if (shown++ == 5) { sb.append("\n+ ").append(pending.size() - 5).append(" more"); break; }
            sb.append("\n").append(h);
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
        prove.setText("📷  Prove it in Ultradian");
        prove.setAllCaps(false);
        prove.setTextColor(Color.WHITE);
        prove.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        GradientDrawable green = new GradientDrawable();
        green.setColor(Color.parseColor("#10B981"));
        green.setCornerRadius(dp(16));
        prove.setBackground(green);
        prove.setOnClickListener(v -> {
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
            Intent h = new Intent(Intent.ACTION_MAIN);
            h.addCategory(Intent.CATEGORY_HOME);
            h.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(h);
            hideOverlay();
        });
        LinearLayout.LayoutParams homeParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(50));
        homeParams.topMargin = dp(8);
        box.addView(home, homeParams);

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
        String text = pending.isEmpty()
                ? "Social apps unlock when today's habits are done"
                : pending.size() + (pending.size() == 1 ? " habit" : " habits") + " left: " + joinShort(pending);
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent pi = open == null ? null : PendingIntent.getActivity(this, 7303, open, flags);
        Notification.Builder b = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(this, CHANNEL)
                : new Notification.Builder(this);
        b.setContentTitle("🔒 Habit Lock is on")
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
