package com.anmoljha.ultradian;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.drawable.Icon;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import java.text.BreakIterator;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Reads a book aloud with the phone's own text-to-speech, even when Ultradian is in the
 * background or the screen is off, with a media notification (play/pause/stop) like a music app.
 * The web app hands over the text from the current position; this service speaks it sentence by
 * sentence and reports each word as it's spoken so the reader can highlight it.
 */
public class ReadAloudService extends Service implements TextToSpeech.OnInitListener, AudioManager.OnAudioFocusChangeListener {
    static final String CHANNEL = "read_aloud";
    static final int NOTIFICATION_ID = 7310;
    static final String ACTION_START = "com.anmoljha.ultradian.READ_START";
    static final String ACTION_PLAY = "com.anmoljha.ultradian.READ_PLAY";
    static final String ACTION_PAUSE = "com.anmoljha.ultradian.READ_PAUSE";
    static final String ACTION_STOP = "com.anmoljha.ultradian.READ_STOP";

    interface Listener {
        void onProgress(int offset, int start, int end);
        void onState(boolean playing, boolean ended, int offset);
    }

    static volatile Listener listener;
    static volatile ReadAloudService instance;
    // What to read (set by the plugin before starting)
    static String text = "";
    static String title = "Reading";
    static float rate = 1f;
    static String voiceName = null;
    static String lang = "en-US";
    static int from = 0;
    static volatile boolean playing = false;
    static volatile int offset = 0;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private TextToSpeech tts;
    private boolean ready = false;
    private final List<int[]> sentences = new ArrayList<>();
    private int index = 0;
    private MediaSession session;
    private AudioManager audio;
    private AudioFocusRequest focusRequest;

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "Read aloud", NotificationManager.IMPORTANCE_LOW);
            ch.setShowBadge(false);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
        }
        audio = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        session = new MediaSession(this, "UltradianReadAloud");
        session.setCallback(new MediaSession.Callback() {
            @Override public void onPlay() { play(); }
            @Override public void onPause() { pause(); }
            @Override public void onStop() { stopAll(); }
        });
        session.setActive(true);
        tts = new TextToSpeech(this, this);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        if (ACTION_PAUSE.equals(action)) { pause(); return START_NOT_STICKY; }
        if (ACTION_PLAY.equals(action)) { play(); return START_NOT_STICKY; }
        if (ACTION_STOP.equals(action)) { stopAll(); return START_NOT_STICKY; }
        // ACTION_START: new text from the reader
        split(from);
        index = 0;
        playing = true;
        goForeground();
        requestFocus();
        if (ready) speakCurrent();
        return START_NOT_STICKY;
    }

    @Override
    public void onInit(int status) {
        ready = status == TextToSpeech.SUCCESS;
        if (!ready) { playing = false; emitState(false); stopSelf(); return; }
        applyVoice();
        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override public void onStart(String id) { }
            @Override public void onDone(String id) {
                handler.post(() -> {
                    if (!playing || !String.valueOf(index).equals(id)) return;
                    index++;
                    if (index < sentences.size()) speakCurrent(); else finished();
                });
            }
            @Override public void onError(String id) { onDone(id); }
            @Override public void onRangeStart(String id, int start, int end, int frame) {
                try {
                    int base = sentences.get(Integer.parseInt(id))[0];
                    Listener l = listener;
                    if (l != null) l.onProgress(base, base + start, base + end);
                } catch (Exception ignored) { }
            }
        });
        if (playing) speakCurrent();
    }

    private void applyVoice() {
        if (tts == null || !ready) return;
        boolean set = false;
        if (voiceName != null) {
            try {
                for (Voice v : tts.getVoices()) if (v.getName().equals(voiceName)) { tts.setVoice(v); set = true; break; }
            } catch (Exception ignored) { }
        }
        if (!set) tts.setLanguage(Locale.forLanguageTag(lang == null ? "en-US" : lang));
        tts.setSpeechRate(rate);
    }

    /** Sentences from the starting offset; long ones are cut so the engine accepts them */
    private void split(int start) {
        sentences.clear();
        String t = text == null ? "" : text;
        if (t.isEmpty()) return;
        int max = Math.min(3500, TextToSpeech.getMaxSpeechInputLength() - 100);
        BreakIterator it = BreakIterator.getSentenceInstance(Locale.getDefault());
        it.setText(t);
        int s = Math.max(0, Math.min(start, t.length()));
        int e = it.following(Math.min(s, Math.max(0, t.length() - 1)));
        while (s < t.length()) {
            if (e == BreakIterator.DONE || e <= s) e = t.length();
            while (e - s > max) {
                int cut = t.lastIndexOf(' ', s + max);
                if (cut <= s) cut = s + max;
                sentences.add(new int[]{s, cut});
                s = cut;
            }
            if (t.substring(s, e).trim().length() > 0) sentences.add(new int[]{s, e});
            s = e;
            e = it.next();
        }
    }

    private void speakCurrent() {
        if (!ready || index >= sentences.size()) { if (index >= sentences.size()) finished(); return; }
        int[] r = sentences.get(index);
        offset = r[0];
        tts.setSpeechRate(rate);
        Bundle params = new Bundle();
        params.putInt(TextToSpeech.Engine.KEY_PARAM_STREAM, AudioManager.STREAM_MUSIC);
        tts.speak(text.substring(r[0], r[1]), TextToSpeech.QUEUE_FLUSH, params, String.valueOf(index));
        Listener l = listener;
        if (l != null) l.onProgress(r[0], r[0], r[0]);
        updateNotification();
    }

    void play() {
        if (sentences.isEmpty()) return;
        playing = true;
        requestFocus();
        goForeground();
        if (ready) speakCurrent();
        emitState(false);
    }

    void pause() {
        playing = false;
        if (tts != null) tts.stop();
        updateNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_DETACH);
        emitState(false);
    }

    void stopAll() {
        playing = false;
        if (tts != null) tts.stop();
        abandonFocus();
        emitState(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE); else stopForeground(true);
        stopSelf();
    }

    private void finished() {
        playing = false;
        abandonFocus();
        emitState(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE); else stopForeground(true);
        stopSelf();
    }

    void setRate(float r) {
        rate = r;
        if (tts != null) tts.setSpeechRate(r);
    }

    private void emitState(boolean ended) {
        Listener l = listener;
        if (l != null) l.onState(playing, ended, offset);
        if (session != null) {
            session.setPlaybackState(new PlaybackState.Builder()
                .setActions(PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_PLAY_PAUSE | PlaybackState.ACTION_STOP)
                .setState(playing ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED, 0, 1f).build());
        }
    }

    private void goForeground() {
        Notification n = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        else startForeground(NOTIFICATION_ID, n);
        emitState(false);
    }

    private void updateNotification() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIFICATION_ID, buildNotification());
    }

    private PendingIntent action(String a, int code) {
        Intent i = new Intent(this, ReadAloudService.class).setAction(a);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);
        return PendingIntent.getService(this, code, i, flags);
    }

    private Notification buildNotification() {
        String snippet = "";
        if (index < sentences.size()) {
            int[] r = sentences.get(index);
            snippet = text.substring(r[0], Math.min(r[1], r[0] + 120)).trim();
        }
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent content = open == null ? null : PendingIntent.getActivity(this, 7311, open, flags);
        Notification.Builder b = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ? new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
        Notification.Action toggle = playing
            ? new Notification.Action.Builder(Icon.createWithResource(this, android.R.drawable.ic_media_pause), "Pause", action(ACTION_PAUSE, 1)).build()
            : new Notification.Action.Builder(Icon.createWithResource(this, android.R.drawable.ic_media_play), "Play", action(ACTION_PLAY, 2)).build();
        Notification.Action stop = new Notification.Action.Builder(Icon.createWithResource(this, android.R.drawable.ic_menu_close_clear_cancel), "Stop", action(ACTION_STOP, 3)).build();
        int icon = getResources().getIdentifier("ic_stat_habit", "drawable", getPackageName());
        b.setSmallIcon(icon != 0 ? icon : android.R.drawable.ic_media_play)
            .setContentTitle(title)
            .setContentText(snippet.isEmpty() ? "Reading aloud" : snippet)
            .setSubText("Read aloud")
            .setOngoing(playing)
            .setShowWhen(false)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .addAction(toggle)
            .addAction(stop)
            .setStyle(new Notification.MediaStyle().setMediaSession(session.getSessionToken()).setShowActionsInCompactView(0, 1))
            .setDeleteIntent(action(ACTION_STOP, 4));
        if (content != null) b.setContentIntent(content);
        return b.build();
    }

    private void requestFocus() {
        if (audio == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (focusRequest == null) {
                focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
                    .setOnAudioFocusChangeListener(this).build();
            }
            audio.requestAudioFocus(focusRequest);
        } else {
            audio.requestAudioFocus(this, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
        }
    }

    private void abandonFocus() {
        if (audio == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) { if (focusRequest != null) audio.abandonAudioFocusRequest(focusRequest); }
        else audio.abandonAudioFocus(this);
    }

    @Override
    public void onAudioFocusChange(int change) {
        if (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) handler.post(this::pause);
    }

    /** Voices for the picker: name, language, offline or not */
    static List<Voice> voices() {
        ReadAloudService s = instance;
        if (s == null || s.tts == null || !s.ready) return null;
        try { return new ArrayList<>(s.tts.getVoices()); } catch (Exception e) { return new ArrayList<>(); }
    }

    @Override
    public void onDestroy() {
        playing = false;
        if (tts != null) { tts.stop(); tts.shutdown(); }
        if (session != null) session.release();
        abandonFocus();
        instance = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
