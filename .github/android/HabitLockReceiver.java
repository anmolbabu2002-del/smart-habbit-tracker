package com.anmoljha.ultradian;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Wakes Habit Lock at 4 PM, every 15 minutes while it's on, after a restart and after an app update. */
public class HabitLockReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        HabitLock.refresh(context);
    }
}
