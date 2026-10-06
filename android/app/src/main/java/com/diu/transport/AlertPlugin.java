package com.diu.transport;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Alert")
public class AlertPlugin extends Plugin {

    @PluginMethod
    public void schedule(PluginCall call) {
        String title = call.getString("title");
        String message = call.getString("message");
        Long time = call.getLong("time"); // In milliseconds
        
        if (time == null) {
            call.reject("Time is required");
            return;
        }

        Context context = getContext();
        
        // 1. Schedule the reliable background alarm
        ReminderManager.scheduleReminder(context, time, title, message);
        
        // 2. Start Foreground Service for persistent countdown
        Intent serviceIntent = new Intent(context, ReminderForegroundService.class);
        serviceIntent.setAction(ReminderForegroundService.ACTION_START);
        serviceIntent.putExtra("title", title);
        serviceIntent.putExtra("message", message);
        serviceIntent.putExtra("departureTime", time);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
        
        call.resolve();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        Long time = call.getLong("time");
        Context context = getContext();
        if (time != null) {
            ReminderManager.cancelReminder(context, time);
        }
        
        Intent serviceIntent = new Intent(context, ReminderForegroundService.class);
        serviceIntent.setAction(ReminderForegroundService.ACTION_STOP);
        context.startService(serviceIntent);

        call.resolve();
    }
}
