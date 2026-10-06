package com.diu.transport;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class DismissReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Intent stopIntent = new Intent(context, ReminderForegroundService.class);
        stopIntent.setAction(ReminderForegroundService.ACTION_STOP);
        context.startService(stopIntent);
        
        // Also ensure AlarmManager and preferences are cleared
        ReminderManager.cancelReminder(context, 0); 
    }
}
