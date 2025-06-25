package com.askpiko.app

import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule


@ReactModule(name = "KeyEventInterceptModule")
class KeyEventInterceptModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "KeyEventInterceptModule"
    }

    @ReactMethod
    fun setKeyInterception(enabled: Boolean) {
        Log.d("KeyEventInterceptModule", "setKeyInterception called with: $enabled")

        val activity = currentActivity
        Log.d("KeyEventInterceptModule", "Current activity: $activity")

        if (activity is MainActivity) {
            activity.setKeyInterception(enabled)
            Log.d("KeyEventInterceptModule", "Key interception set to: $enabled")
        } else {
            Log.e("KeyEventInterceptModule", "Current activity is not MainActivity: ${activity?.javaClass?.simpleName}")
        }
    }
}