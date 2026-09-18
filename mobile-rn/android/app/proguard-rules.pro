# React Native / Hermes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.yoga.** { *; }
-keep class com.swmansion.** { *; }

# Keep native methods
-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactProp <methods>;
    @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>;
}

# React Native Firebase
-keep class io.invertase.** { *; }
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
-dontwarn io.invertase.**

# Google Sign-In / Play Services
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# Apple authentication (Android stub)
-keep class com.RNAppleAuthentication.** { *; }

# WebView
-keep class com.reactnativecommunity.webview.** { *; }

# Vector icons / sound / geolocation
-keep class com.oblador.vectoricons.** { *; }
-keep class com.zmxv.RNSound.** { *; }
-keep class com.agontuk.RNFusedLocation.** { *; }

# OkHttp / Gson used by Firebase & networking
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses

# Keep line numbers for crash stacks
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
