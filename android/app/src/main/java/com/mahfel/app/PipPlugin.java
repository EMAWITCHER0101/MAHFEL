package com.mahfel.app;

import android.content.res.Configuration;
import android.os.Build;
import android.app.PictureInPictureParams;
import android.util.Rational;

import com.getcapacitor.Bridge;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.ActivityCallback;

@CapacitorPlugin(name = "PipPlugin")
public class PipPlugin extends Plugin {

    private MainActivity mainActivity;

    public void load() {
        mainActivity = (MainActivity) getActivity();
    }

    @PluginMethod
    public void enterPiP(PluginCall call) {
        if (mainActivity == null) {
            mainActivity = (MainActivity) getActivity();
        }
        if (mainActivity == null) {
            call.reject("Activity not available");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder();
            builder.setAspectRatio(new Rational(16, 9));
            mainActivity.enterPictureInPictureMode(builder.build());
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } else {
            call.reject("PiP not supported on this device");
        }
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", Build.VERSION.SDK_INT >= Build.VERSION_CODES.O);
        call.resolve(result);
    }
}
