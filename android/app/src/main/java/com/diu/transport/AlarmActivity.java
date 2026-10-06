package com.diu.transport;

import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

public class AlarmActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Ensure activity shows over lockscreen and wakes screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                    | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                    | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        }

        setContentView(R.layout.activity_alarm);

        String title = getIntent().getStringExtra("title");
        String message = getIntent().getStringExtra("message");

        TextView titleView = findViewById(R.id.alarm_title);
        TextView messageView = findViewById(R.id.alarm_message);

        if (title != null) titleView.setText(title);
        if (message != null) messageView.setText(message);

        Button btnDismiss = findViewById(R.id.btn_dismiss);
        btnDismiss.setOnClickListener(v -> {
            dismissAlarm();
        });

        Button btnSnooze = findViewById(R.id.btn_snooze);
        btnSnooze.setOnClickListener(v -> {
            snoozeAlarm();
        });
    }

    private void dismissAlarm() {
        Intent intent = new Intent(this, ReminderForegroundService.class);
        intent.setAction(ReminderForegroundService.ACTION_STOP);
        startService(intent);
        finish();
    }

    private void snoozeAlarm() {
        // Snooze logic: stop current alarm and schedule a new one in 5 minutes
        dismissAlarm();
        
        long snoozeTime = System.currentTimeMillis() + (5 * 60 * 1000);
        String title = getIntent().getStringExtra("title");
        String message = getIntent().getStringExtra("message");
        
        ReminderManager.scheduleReminder(this, snoozeTime, title != null ? title : "Snooze", message != null ? message : "Bus reminder");
    }

    @Override
    public void onBackPressed() {
        // Disable back button during alarm
    }
}
