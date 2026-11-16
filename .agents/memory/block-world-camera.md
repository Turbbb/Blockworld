---
name: Block World Third-Person Camera
description: Why a third-person camera attempt failed and what a future approach needs.
---

## Failed attempt

A third-person camera was built with a V-key toggle (`cameraMode` state) and a `ThirdPersonCamera` component that computed offset from `playerPosRef`. The component was removed after architect review because `playerPosRef` was populated from `camera.position` in `SceneBridge`, creating a self-referential chase loop: the camera offset from its own already-offset position, causing drift/unstable movement.

## Future approach

To implement third-person correctly, introduce a **separate player anchor ref** (e.g. `playerAnchorRef`) that tracks the player’s true position independently of the camera. `PlayerController` would update this anchor. `ThirdPersonCamera` would then derive its position from `anchor + yaw offset`, never from the camera itself.
