package com.mahfel.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * دریافت اکشن‌های پنجره PiP (دکمه پخش/توقف داخل پنجره شناور ویدیو).
 * دستور فقط به سرویس ارسال می‌شود؛ سرویس هم پخش نیتیو را کنترل می‌کند
 * و هم رویداد mahfel-media-command را به وب می‌فرستد (بدون ارسال دوباره).
 */
public class MediaCommandReceiver extends BroadcastReceiver {

    public static final String EXTRA_CMD = "cmd";

    @Override
    public void onReceive(Context context, Intent intent) {
        String cmd = intent != null ? intent.getStringExtra(EXTRA_CMD) : null;
        if (cmd == null) return;
        PlaybackService.onExternalCommand(context, cmd);
    }
}
