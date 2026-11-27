package com.anmoljha.ultradian;

import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;
import java.util.ArrayList;
import java.util.List;

/** Supplies the widget's scrolling list: every habit on today's list, open ones first. */
public class NotoWidgetService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new Factory(getApplicationContext());
    }

    static final class Factory implements RemoteViewsFactory {
        private final Context c;
        private List<NotoWidget.Habit> items = new ArrayList<>();

        Factory(Context c) { this.c = c; }

        @Override public void onCreate() { items = NotoWidget.ordered(c); }
        @Override public void onDataSetChanged() { items = NotoWidget.ordered(c); }
        @Override public void onDestroy() { items = new ArrayList<>(); }
        @Override public int getCount() { return items.size(); }
        @Override public RemoteViews getViewAt(int i) { return i < items.size() ? NotoWidget.row(c, items.get(i)) : null; }
        @Override public RemoteViews getLoadingView() { return null; }
        @Override public int getViewTypeCount() { return 1; }
        @Override public long getItemId(int i) { return i < items.size() ? items.get(i).id.hashCode() : i; }
        @Override public boolean hasStableIds() { return true; }
    }
}
