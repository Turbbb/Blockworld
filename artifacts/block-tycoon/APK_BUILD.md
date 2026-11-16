# APK Build-Anleitung für Block World

## Voraussetzungen
- Java 17 (OpenJDK, **nicht** GraalVM — jlink-Kompatibilität)
- Android SDK mit API 34
- Node.js 20+ und pnpm

## Schritte
1. **Web-App bauen:**
   ```bash
   PORT=3000 BASE_PATH="/" pnpm run build
   ```
2. **Capacitor synchronisieren:**
   ```bash
   npx cap sync
   ```
3. **APK bauen:**
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
4. **APK finden:**
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

## Hinweis
In der Replit-Umgebung ist der Android-Build nicht möglich, da die vorinstallierte GraalVM kein `jlink` für das Android SDK unterstützt. Lokal mit einem Standard-OpenJDK 17 oder 21 funktioniert der Build einwandfrei.

## Capacitor-Konfiguration
- `appId`: `app.blockworld.game`
- `appName`: `Block World`
- `webDir`: `dist/public`
- `android.allowMixedContent`: `true` (für lokale API-Anfragen)
