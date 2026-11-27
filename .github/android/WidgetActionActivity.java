package com.anmoljha.ultradian;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

/**
 * Invisible: handles a tap on a habit in the widget's list, then closes at once.
 * tick → ticks it right there (NotoWidget.tick); prove → opens that habit's camera in the app;
 * open → opens the app. (A list item can only have one kind of tap, so it comes here first.)
 */
public class WidgetActionActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Intent in = getIntent();
        String id = in == null ? null : in.getStringExtra("id");
        String action = in == null ? null : in.getStringExtra("action");
        try {
            if ("tick".equals(action)) {
                NotoWidget.tick(getApplicationContext(), id);
            } else {
                NotoWidget.openIntent(this, "prove".equals(action) ? id : null, 7313).send();
            }
        } catch (Exception ignored) {
            // nothing to do
        }
        finish();
        overridePendingTransition(0, 0);
    }
}
