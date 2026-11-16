---
name: Block World APK Build
description: Capacitor Android setup and environment constraints.
---

## Setup

Capacitor is initialized with `appId: app.blockworld.game`, `appName: "Block World"`, `webDir: "dist/public"`. The `android/` directory exists with a full Gradle project.

## Build command

```bash
PORT=3000 BASE_PATH="/" pnpm run build
npx cap sync
cd android && ./gradlew assembleDebug
```

## Environment constraint

The APK cannot be built in Replit because the container's GraalVM Java 19 has a `jlink` incompatibility with the Android SDK (`core-for-system-modules.jar`). The error manifests as:

```
Execution failed for JdkImageTransform: .../core-for-system-modules.jar
Error while executing process .../jlink with arguments {...}
```

**Workaround:** Build locally with a standard OpenJDK 17 or 21 (not GraalVM). The `APK_BUILD.md` in the project root documents this.

## Gradle config

- Gradle wrapper: 8.2.1
- Android Gradle Plugin: 8.2.1
- `compileSdkVersion`: 34
- `minSdkVersion`: 22
- `targetSdkVersion`: 34
