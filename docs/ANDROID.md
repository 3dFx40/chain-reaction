# בנייה של Android

אפליקציית Java אורזת את המשחק המקומי בתוך Android WebView. `WebViewAssetLoader` מגיש קבצים תחת מקור HTTPS מקומי. אין שרת מרוחק, גשר JavaScript או הרשאת אינטרנט.

## דרישות

- JDK 17 ומעלה; גרסת ההפצה נבנתה עם JDK 21.
- Android SDK Platform 35 ו־Build Tools 35.0.0.
- Gradle 8.11.1 באמצעות ה־wrapper שבמאגר.

צרו `android/local.properties` עם `sdk.dir=/absolute/path/to/Android/Sdk`, או הגדירו `ANDROID_HOME`. הקובץ המקומי מוחרג מ־Git.

```sh
cd android
./gradlew assembleDebug lintDebug
```

ב־Windows השתמשו ב־`gradlew.bat`. קבצי המשחק והגופנים מסונכרנים אוטומטית לתיקיית assets. APK בדיקה מופיע ב־`android/app/build/outputs/apk/debug/`.

## גרסת שחרור

לחתימה משלכם, הריצו מתיקיית הפרויקט:

```sh
node scripts/init-signing.mjs
keytool -genkeypair -keystore .signing/release.jks -storepass:file .signing/password.txt -keypass:file .signing/password.txt -alias chain-release -keyalg RSA -keysize 3072 -validity 10000 -dname "CN=Chain Reaction Release"
cd android
./gradlew assembleRelease lintRelease
```

הסקריפט יוצר סיסמה אקראית ותצורה מקומית ומסרב להחליף תצורה קיימת. `.signing/` מוחרגת מ־Git. גבו את המפתח והסיסמה לצורך עדכונים. מפתח חדש אינו יכול לעדכן התקנה שנחתמה במפתח ההפצה המקורי.

ללא תצורת חתימה, `assembleRelease` יוצר APK **לא חתום**. GitHub Actions בודק בנייה זו בלבד; קובץ ההורדה ב־Releases נחתם בנפרד במפתח השחרור המקורי.

## אימות והתקנה

```sh
apksigner verify --verbose --print-certs android/app/build/outputs/apk/release/app-release.apk
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb shell am start -n com.chainreaction.game/.MainActivity
```

השוו את טביעת SHA-256 של התעודה ל־[SIGNING.md](SIGNING.md), ובדקו את קובץ ה־SHA-256 המצורף לגרסה. Release אינו מאפשר WebView debugging; גירסת debug מאפשרת Chrome DevTools.

## מקורות

- [בנייה משורת הפקודה](https://developer.android.com/build/building-cmdline)
- [אימות APK עם apksigner](https://developer.android.com/tools/apksigner)
- [תוכן מקומי עם WebViewAssetLoader](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content)
