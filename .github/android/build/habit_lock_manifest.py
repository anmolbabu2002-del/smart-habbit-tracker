"""Adds what Habit Lock and background read-aloud need to the generated AndroidManifest.xml (run by the Android workflow).

- PACKAGE_USAGE_STATS: "Usage access" (which app is in front, checked only while the lock is on)
- SYSTEM_ALERT_WINDOW: "Display over other apps" (the lock screen over a blocked app)
- FOREGROUND_SERVICE(_SPECIAL_USE): the lock runs as a visible background service
- the service, its restart receiver, and package visibility for the blocked apps' names
"""
import re
import sys

path = sys.argv[1]
xml = open(path, encoding='utf-8').read()

if 'xmlns:tools=' not in xml:
    xml = xml.replace('<manifest ', '<manifest xmlns:tools="http://schemas.android.com/tools" ', 1)

permissions = '''
    <uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" tools:ignore="ProtectedPermissions" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.ACCESS_NOTIFICATION_POLICY" />
    <queries>
        <package android:name="com.instagram.android" />
        <package android:name="com.instagram.lite" />
        <package android:name="com.google.android.youtube" />
        <package android:name="com.facebook.katana" />
        <package android:name="com.facebook.lite" />
        <package android:name="com.snapchat.android" />
        <package android:name="com.zhiliaoapp.musically" />
        <package android:name="com.ss.android.ugc.trill" />
        <package android:name="com.zhiliaoapp.musically.go" />
    </queries>
'''
components = '''
        <service
            android:name="com.anmoljha.ultradian.HabitLockService"
            android:exported="false"
            android:foregroundServiceType="specialUse">
            <property
                android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
                android:value="Blocks the user's chosen social media apps until their daily habits are done" />
        </service>
        <service
            android:name="com.anmoljha.ultradian.NotoWidgetService"
            android:exported="false"
            android:permission="android.permission.BIND_REMOTEVIEWS" />
        <activity
            android:name="com.anmoljha.ultradian.WidgetActionActivity"
            android:excludeFromRecents="true"
            android:exported="false"
            android:noHistory="true"
            android:taskAffinity=""
            android:theme="@android:style/Theme.Translucent.NoTitleBar" />
        <receiver
            android:name="com.anmoljha.ultradian.NotoWidget"
            android:label="@string/widget_name"
            android:exported="false">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/noto_widget_info" />
        </receiver>
        <receiver
            android:name="com.anmoljha.ultradian.HabitLockReceiver"
            android:exported="false">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
            </intent-filter>
        </receiver>
'''
# Noto's moods on the home screen (AppIcon.java): the launcher entry moves from MainActivity
# to three aliases of it, one enabled at a time.
aliases = ''.join(f'''
        <activity-alias
            android:name="com.anmoljha.ultradian.{name}"
            android:targetActivity=".MainActivity"
            android:enabled="{'true' if name == 'IconNormal' else 'false'}"
            android:exported="true"
            android:label="@string/app_name"
            android:icon="@mipmap/{icon}"
            android:roundIcon="@mipmap/{icon}_round">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity-alias>''' for name, icon in [('IconNormal', 'ic_launcher'), ('IconDone', 'ic_launcher_done'), ('IconRisk', 'ic_launcher_risk')])
if 'IconNormal' not in xml:
    launcher = re.compile(r'\s*<intent-filter>\s*<action android:name="android.intent.action.MAIN"\s*/>\s*<category android:name="android.intent.category.LAUNCHER"\s*/>\s*</intent-filter>')
    xml, n = launcher.subn('', xml, count=1)
    if n != 1:
        sys.exit('MainActivity launcher intent-filter not found')
    xml = re.sub(r'(</activity>)', r'\1' + aliases.replace('\\', '\\\\'), xml, count=1)

if 'HabitLockService' not in xml:
    xml = re.sub(r'(\s*)</application>', components + r'\1</application>', xml, count=1)
    xml = re.sub(r'(\s*)</manifest>', permissions + r'\1</manifest>', xml, count=1)
open(path, 'w', encoding='utf-8').write(xml)
print('Habit Lock entries added')
