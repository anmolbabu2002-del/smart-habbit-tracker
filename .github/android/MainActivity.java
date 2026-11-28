package com.anmoljha.ultradian;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
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
