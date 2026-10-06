# חתימות ואימות

## APK שחרור 1.0.0

- מזהה האפליקציה: `com.chainreaction.game`.
- תעודה: `CN=Chain Reaction Release, O=3dFx40`.
- מפתח: RSA 3072, חתימת APK Signature Scheme v2.
- SHA-256 של התעודה:

```text
0f95c723c961fce86a177a27a4537121141c3d35c093bbfea01ee95e7c1cb599
```

התעודה הציבורית: [android-release.pem](signing/android-release.pem). המפתח הפרטי והסיסמאות אינם במאגר. קובץ ה־APK וקובץ ה־SHA-256 שלו נמצאים ב־[Releases](https://github.com/3dFx40/chain-reaction/releases).

```sh
apksigner verify --verbose --print-certs chain-reaction-1.0.0.apk
sha256sum -c chain-reaction-1.0.0.apk.sha256
```

ב־PowerShell אפשר לחשב את סכום הביקורת באמצעות `Get-FileHash -Algorithm SHA256 chain-reaction-1.0.0.apk` ולהשוות לקובץ המצורף. טביעת התעודה מזהה את מפתח החתימה; סכום הביקורת של ה־APK מזהה את קובץ הגרסה המסוים.

## חתימת המקור

ה־commit ותג הגרסה `v1.0.0` נחתמים במפתח SSH מסוג Ed25519. המפתח הציבורי: [git-signing.pub](signing/git-signing.pub).

אחרי שכפול המאגר:

```sh
git config gpg.ssh.allowedSignersFile docs/signing/allowed_signers
git verify-commit HEAD
git verify-tag v1.0.0
```

רשימת המאמתים קושרת את החתימה לזהות Git של `3dFx40`. תווית Verified של GitHub דורשת בנוסף רישום של המפתח הציבורי בחשבון; אימות מקומי פועל באמצעות הקבצים במאגר גם ללא התווית.
