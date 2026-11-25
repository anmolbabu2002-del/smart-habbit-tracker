package com.anmoljha.ultradian;

import android.graphics.Color;
import android.os.Build;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Makes Ultradian draw edge-to-edge behind transparent status and navigation bars,
 * like a native app, and tells the web page how big those bars are (in CSS px) so it
 * can pad around them. Because edge-to-edge turns off Android's automatic
 * "resize when the keyboard opens", the WebView's bottom margin follows the keyboard.
 */
@CapacitorPlugin(name = "UltradianSystemBars")
public class SystemBarsPlugin extends Plugin {

    private JSObject current = new JSObject();

    @Override
    public void load() {
        getActivity().runOnUiThread(() -> {
            Window window = getActivity().getWindow();
            WindowCompat.setDecorFitsSystemWindows(window, false);
            window.setStatusBarColor(Color.TRANSPARENT);
            window.setNavigationBarColor(Color.TRANSPARENT);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                window.setStatusBarContrastEnforced(false);
                window.setNavigationBarContrastEnforced(false);
            }

            WebView webView = getBridge().getWebView();
            // The phone's font-size setting would scale only the text (not icons or spacing),
            // overflowing the layout. Keep the app's own sizes, like native apps designed in dp.
            webView.getSettings().setTextZoom(100);
            ViewCompat.setOnApplyWindowInsetsListener(webView, (view, windowInsets) -> {
                Insets bars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
                );
                Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
                boolean keyboardOpen = ime.bottom > bars.bottom;

                // Shrink the WebView above the keyboard (what adjustResize used to do)
                if (view.getLayoutParams() instanceof ViewGroup.MarginLayoutParams) {
                    ViewGroup.MarginLayoutParams lp = (ViewGroup.MarginLayoutParams) view.getLayoutParams();
                    int wanted = keyboardOpen ? ime.bottom : 0;
                    if (lp.bottomMargin != wanted) {
                        lp.bottomMargin = wanted;
                        view.setLayoutParams(lp);
                    }
                }

                float density = view.getResources().getDisplayMetrics().density;
                JSObject next = new JSObject();
                next.put("top", Math.round(bars.top / density));
                next.put("right", Math.round(bars.right / density));
                next.put("bottom", keyboardOpen ? 0 : Math.round(bars.bottom / density));
                next.put("left", Math.round(bars.left / density));
                next.put("keyboard", keyboardOpen);
                current = next;
                notifyListeners("insetsChange", next);
                return windowInsets;
            });
            ViewCompat.requestApplyInsets(webView);
        });
    }

    @PluginMethod
    public void getInsets(PluginCall call) {
        call.resolve(current);
    }

    /** darkIcons: true for dark status/nav icons on a light background. */
    @PluginMethod
    public void setStyle(PluginCall call) {
        Boolean darkIcons = call.getBoolean("darkIcons", true);
        getActivity().runOnUiThread(() -> {
            Window window = getActivity().getWindow();
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
            controller.setAppearanceLightStatusBars(Boolean.TRUE.equals(darkIcons));
            controller.setAppearanceLightNavigationBars(Boolean.TRUE.equals(darkIcons));
            call.resolve();
        });
    }
}
