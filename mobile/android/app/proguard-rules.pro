-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }
-keep class io.flutter.embedding.** { *; }
-dontwarn io.flutter.embedding.**
-keep class androidx.lifecycle.** { *; }
-keep class com.baseflow.geolocator.** { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
