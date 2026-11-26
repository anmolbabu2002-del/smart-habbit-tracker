package com.anmoljha.ultradian;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.List;

/** The reader's bridge to ReadAloudService (background read-aloud with a media notification). */
@CapacitorPlugin(name = "UltradianReadAloud")
public class ReadAloudPlugin extends Plugin implements ReadAloudService.Listener {
    private TextToSpeech probe;   // only to list voices when the service isn't running
    private TextToSpeech previewer; // short voice samples in the picker
    private boolean previewReady = false;

    @Override
    public void load() {
        ReadAloudService.listener = this;
    }

    @Override
    public void onProgress(int offset, int start, int end) {
        JSObject d = new JSObject();
        d.put("offset", offset);
        d.put("start", start);
        d.put("end", end);
        notifyListeners("progress", d);
    }

    @Override
    public void onState(boolean playing, boolean ended, int offset) {
        JSObject d = new JSObject();
        d.put("playing", playing);
        d.put("ended", ended);
        d.put("offset", offset);
        notifyListeners("state", d);
    }

    @PluginMethod
    public void start(PluginCall call) {
        ReadAloudService.text = call.getString("text", "");
        ReadAloudService.title = call.getString("title", "Reading");
        ReadAloudService.rate = call.getFloat("rate", 1f);
        ReadAloudService.voiceName = call.getString("voice", null);
        ReadAloudService.lang = call.getString("lang", "en-US");
        ReadAloudService.from = call.getInt("from", 0);
        Context c = getContext();
        Intent i = new Intent(c, ReadAloudService.class).setAction(ReadAloudService.ACTION_START);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) c.startForegroundService(i); else c.startService(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Couldn't start reading: " + e.getMessage());
        }
    }

    private void send(String action, PluginCall call) {
        ReadAloudService s = ReadAloudService.instance;
        if (s != null) {
            if (ReadAloudService.ACTION_PAUSE.equals(action)) s.pause();
            else if (ReadAloudService.ACTION_PLAY.equals(action)) s.play();
            else s.stopAll();
        }
        call.resolve();
    }

    @PluginMethod public void pause(PluginCall call) { send(ReadAloudService.ACTION_PAUSE, call); }
    @PluginMethod public void resume(PluginCall call) { send(ReadAloudService.ACTION_PLAY, call); }
    @PluginMethod public void stop(PluginCall call) { send(ReadAloudService.ACTION_STOP, call); }

    @PluginMethod
    public void setRate(PluginCall call) {
        float r = call.getFloat("rate", 1f);
        ReadAloudService s = ReadAloudService.instance;
        if (s != null) s.setRate(r); else ReadAloudService.rate = r;
        call.resolve();
    }

    @PluginMethod
    public void getState(PluginCall call) {
        JSObject d = new JSObject();
        d.put("playing", ReadAloudService.playing);
        d.put("running", ReadAloudService.instance != null);
        d.put("offset", ReadAloudService.offset);
        d.put("title", ReadAloudService.title);
        call.resolve(d);
    }

    @PluginMethod
    public void getVoices(PluginCall call) {
        List<Voice> list = ReadAloudService.voices();
        if (list != null) { call.resolve(pack(list)); return; }
        // No service yet: start a short-lived engine just to read its voice list
        final TextToSpeech[] holder = new TextToSpeech[1];
        holder[0] = new TextToSpeech(getContext(), status -> {
            List<Voice> v = new ArrayList<>();
            try { if (status == TextToSpeech.SUCCESS) v.addAll(holder[0].getVoices()); } catch (Exception ignored) { }
            call.resolve(pack(v));
            holder[0].shutdown();
        });
        probe = holder[0];
    }

    /** Say a short sample in a voice (doesn't start the background reader) */
    @PluginMethod
    public void preview(PluginCall call) {
        final String name = call.getString("voice", null);
        final String sample = call.getString("text", "Hi! This is how I sound when I read your book.");
        final float rate = call.getFloat("rate", 1f);
        Runnable say = () -> {
            try {
                if (name != null) for (Voice v : previewer.getVoices()) if (v.getName().equals(name)) { previewer.setVoice(v); break; }
                previewer.setSpeechRate(rate);
                previewer.speak(sample, TextToSpeech.QUEUE_FLUSH, null, "preview");
            } catch (Exception ignored) { }
        };
        if (previewer != null && previewReady) { say.run(); call.resolve(); return; }
        previewer = new TextToSpeech(getContext(), status -> {
            previewReady = status == TextToSpeech.SUCCESS;
            if (previewReady) say.run();
        });
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        if (previewer != null) previewer.shutdown();
        super.handleOnDestroy();
    }

    private JSObject pack(List<Voice> voices) {
        JSArray arr = new JSArray();
        for (Voice v : voices) {
            if (v.getFeatures() != null && v.getFeatures().contains("notInstalled")) continue;
            JSObject o = new JSObject();
            o.put("name", v.getName());
            o.put("lang", v.getLocale().toLanguageTag());
            o.put("quality", v.getQuality());
            o.put("network", v.isNetworkConnectionRequired());
            arr.put(o);
        }
        JSObject r = new JSObject();
        r.put("voices", arr);
        return r;
    }
}
