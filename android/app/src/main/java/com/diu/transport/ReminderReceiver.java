package com.diu.transport;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;

public class ReminderReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        // Wake the screen for at least 10 seconds
        PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            PowerManager.WakeLock wakeLock = powerManager.newWakeLock(
                    PowerManager.FULL_WAKE_LOCK |
                    PowerManager.ACQUIRE_CAUSES_WAKEUP |
                    PowerManager.ON_AFTER_RELEASE, "DIUTransport:ReminderWakeLock");
            wakeLock.acquire(10000);
        }

        String title = intent.getStringExtra("title");
        String message = intent.getStringExtra("message");

        // Trigger the alarm state in the Foreground Service
        Intent serviceIntent = new Intent(context, ReminderForegroundService.class);
        serviceIntent.setAction(ReminderForegroundService.ACTION_ALARM);
        serviceIntent.putExtra("title", title);
        serviceIntent.putExtra("message", message);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
    }
}
