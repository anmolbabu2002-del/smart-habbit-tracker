package com.anmoljha.ultradian;

import android.os.Bundle;
import android.os.SystemClock;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    /** The web app has drawn its first screen (set by HabitLockPlugin.appReady) */
    static volatile boolean webReady = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // the app icon shows the instant it's tapped, and stays until the first screen is drawn
        // (never longer than 2.5 s)
        SplashScreen splash = SplashScreen.installSplashScreen(this);
        final long t0 = SystemClock.uptimeMillis();
        splash.setKeepOnScreenCondition(() -> !webReady && SystemClock.uptimeMillis() - t0 < 2500);
        registerPlugin(SystemBarsPlugin.class);
        registerPlugin(HabitLockPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onResume() {
        super.onResume();
        AppIcon.appVisible = true;
    }

    @Override
    public void onStop() {
        super.onStop();
        // the app is off screen: now it's safe to change Noto's mood on the home screen
        AppIcon.appVisible = false;
        AppIcon.sync(getApplicationContext());
    }
}
