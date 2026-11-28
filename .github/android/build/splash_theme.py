"""Launch screen like the big apps: Android's own splash (Android 12+, and the same look on older
phones through androidx core-splashscreen) showing the app icon on the app's light background.
MainActivity keeps it up until the web app has drawn its first screen, so there's no blank gap.

Usage: python3 splash_theme.py <android/app>
"""
import re
import sys
from pathlib import Path

app = Path(sys.argv[1])
styles = app / 'src/main/res/values/styles.xml'
xml = styles.read_text()
launch = '''<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="windowSplashScreenBackground">@color/splash_bg</item>
        <item name="windowSplashScreenAnimatedIcon">@mipmap/ic_launcher</item>
        <item name="windowSplashScreenAnimationDuration">200</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
    </style>'''
new, n = re.subn(r'<style name="AppTheme\.NoActionBarLaunch"[\s\S]*?</style>', launch, xml)
if n != 1:
    sys.exit('splash_theme: AppTheme.NoActionBarLaunch not found in styles.xml')
styles.write_text(new)

gradle = app / 'build.gradle'
g = gradle.read_text()
if 'core-splashscreen' not in g:
    g = g.replace('dependencies {', 'dependencies {\n    implementation "androidx.core:core-splashscreen:1.0.1"', 1)
    gradle.write_text(g)
print('splash_theme: launch screen set (icon on the app background)')
