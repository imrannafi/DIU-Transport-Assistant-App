package com.diu.transport;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.SystemClock;
import android.os.Vibrator;
import android.os.VibrationEffect;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class ReminderForegroundService extends Service {

    private static final String TRACKING_CHANNEL_ID = "reminder_tracking_v4";
    private static final String ALARM_CHANNEL_ID = "reminder_alarm_v4";
    private static final int NOTIFICATION_ID = 1001;
    public static final String ACTION_START = "ACTION_START";
    public static final String ACTION_STOP = "ACTION_STOP";
    public static final String ACTION_ALARM = "ACTION_ALARM";

    private static Ringtone ringtone;
    private static Vibrator vibrator;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_START.equals(action)) {
                String title = intent.getStringExtra("title");
                String message = intent.getStringExtra("message");
                long departureTime = intent.getLongExtra("departureTime", 0);
                
                if (title != null) saveState(title, message, departureTime);
                
                if (title == null) {
                    restoreAndRestart();
                } else {
                    showForegroundNotification(title, message, departureTime, false);
                }
            } else if (ACTION_ALARM.equals(action)) {
                String title = intent.getStringExtra("title");
                String message = intent.getStringExtra("message");
                
                // Force stop previous tracking foreground state
                stopForeground(true);
                showForegroundNotification(title, message, 0, true);
                
                // START ACTIVE ALARM (Sound + Vibration)
                startAlarmFeedback();
            } else if (ACTION_STOP.equals(action)) {
                stopAlarmFeedback();
                clearState();
                stopForeground(true);
                stopSelf();
            }
        } else {
            restoreAndRestart();
        }
        return START_STICKY;
    }

    private void startAlarmFeedback() {
        stopAlarmFeedback(); // Reset if already running
        
        Context context = getApplicationContext();
        
        // 1. Play Alarm Sound
        try {
            Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alarmUri == null) alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            ringtone = RingtoneManager.getRingtone(context, alarmUri);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                ringtone.setLooping(true);
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build();
                ringtone.setAudioAttributes(audioAttributes);
            }
            ringtone.play();
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 2. Trigger Continuous Vibration
        try {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            long[] pattern = {0, 1000, 500, 1000, 500};
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 1));
            } else {
                vibrator.vibrate(pattern, 1);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void stopAlarmFeedback() {
        if (ringtone != null && ringtone.isPlaying()) {
            ringtone.stop();
        }
        if (vibrator != null) {
            vibrator.cancel();
        }
    }

    private void saveState(String title, String message, long time) {
        getSharedPreferences("ReminderPrefs", MODE_PRIVATE).edit()
            .putString("last_title", title)
            .putString("last_message", message)
            .putLong("last_departureTime", time)
            .putBoolean("is_active", true)
            .apply();
    }

    private void clearState() {
        getSharedPreferences("ReminderPrefs", MODE_PRIVATE).edit()
            .putBoolean("is_active", false)
            .apply();
    }

    private void restoreAndRestart() {
        SharedPreferences prefs = getSharedPreferences("ReminderPrefs", MODE_PRIVATE);
        if (prefs.getBoolean("is_active", false)) {
            String title = prefs.getString("last_title", "Bus Reminder");
            String message = prefs.getString("last_message", "Tracking...");
            long time = prefs.getLong("last_departureTime", 0);
            showForegroundNotification(title, message, time, false);
        } else {
            stopSelf();
        }
    }

    private void showForegroundNotification(String title, String message, long departureTime, boolean isAlarm) {
        createNotificationChannels();

        // Open app intent (for normal tapping)
        Intent mainIntent = new Intent(this, MainActivity.class);
        mainIntent.setAction(Intent.ACTION_MAIN);
        mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        mainIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openAppPendingIntent = PendingIntent.getActivity(this, 100, mainIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Full-screen alarm popup intent
        Intent alarmIntent = new Intent(this, AlarmActivity.class);
        alarmIntent.putExtra("title", title);
        alarmIntent.putExtra("message", message);
        alarmIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(this, 102, alarmIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Dismiss intent
        Intent dismissIntent = new Intent(this, DismissReceiver.class);
        PendingIntent dismissPendingIntent = PendingIntent.getBroadcast(this, 101, dismissIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, isAlarm ? ALARM_CHANNEL_ID : TRACKING_CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(isAlarm ? "🚨 URGENT: " + title : "⏳ TRACKING: " + title)
                .setContentText(isAlarm ? "Your bus is departing! Hurry up." : "Alert set for " + message)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(isAlarm ? "YOUR BUS IS LEAVING NOW! PLEASE HURRY.\n" + message : "The alarm will ring exactly at the reminder time.\n" + message))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(isAlarm ? NotificationCompat.CATEGORY_ALARM : NotificationCompat.CATEGORY_EVENT)
                .setOngoing(true)
                .setAutoCancel(false)
                .setContentIntent(openAppPendingIntent)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setLocalOnly(true)
                .addAction(R.mipmap.ic_launcher, "Dismiss", dismissPendingIntent);

        if (isAlarm) {
            builder.setFullScreenIntent(fullScreenPendingIntent, true);
        } else if (departureTime > 0) {
            builder.setUsesChronometer(true);
            builder.setChronometerCountDown(true);
            builder.setWhen(departureTime);
        }

        Notification notification = builder.build();
        if (isAlarm) {
            notification.flags |= Notification.FLAG_INSISTENT;
        }

        startForeground(NOTIFICATION_ID, notification);
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                // Channel 1: Silent Tracking
                NotificationChannel trackingChannel = new NotificationChannel(
                        TRACKING_CHANNEL_ID,
                        "Bus Tracking Status",
                        NotificationManager.IMPORTANCE_LOW
                );
                trackingChannel.setDescription("Live countdown for bus departure");
                trackingChannel.setShowBadge(false);
                manager.createNotificationChannel(trackingChannel);

                // Channel 2: Loud High-Priority Alarm
                NotificationChannel alarmChannel = new NotificationChannel(
                        ALARM_CHANNEL_ID,
                        "Critical Bus Alarms",
                        NotificationManager.IMPORTANCE_HIGH
                );
                alarmChannel.setDescription("Loud alerts when your bus is leaving");
                alarmChannel.enableLights(true);
                alarmChannel.enableVibration(true);
                alarmChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                alarmChannel.setBypassDnd(true);
                
                Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (soundUri == null) soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .build();
                alarmChannel.setSound(soundUri, audioAttributes);
                
                manager.createNotificationChannel(alarmChannel);
            }
        }
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        Intent restartIntent = new Intent(getApplicationContext(), ServiceRestartReceiver.class);
        PendingIntent restartPendingIntent = PendingIntent.getBroadcast(
            this, 1002, restartIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        
        AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (alarmManager != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    SystemClock.elapsedRealtime() + 500,
                    restartPendingIntent
                );
            } else {
                alarmManager.setExact(
                    AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    SystemClock.elapsedRealtime() + 500,
                    restartPendingIntent
                );
            }
        }
        super.onTaskRemoved(rootIntent);
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
