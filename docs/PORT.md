# Porting Guide

This document summarizes practical options for porting One More in the Chamber beyond the browser build.

The current game is a Vite + React + Phaser 3 app. That makes wrapper-based ports the lowest-cost path: keep the web game mostly intact, package it inside a desktop or mobile native shell, then add platform-specific services where they matter.

## Steam / Desktop

### Recommended Path: Electron

Electron is the most practical first Steam path for this codebase. It packages the existing web app as a desktop application using Chromium and Node.

Recommended flow:

1. Build the Vite app with `npm run build`.
2. Load `dist/index.html` from an Electron main process.
3. Add packaging for Windows first, then macOS/Linux if needed.
4. Upload builds to Steam depots with the Steamworks SDK tools.
5. Add Steamworks API integration only where useful.

Pros:

- Minimal rewrite.
- Mature tooling and packaging ecosystem.
- Good fit for React + Phaser.
- Straightforward path to custom native bridges.

Cons:

- Larger install size.
- Steamworks features require a Node/native bridge.
- More desktop-app surface area to test: fullscreen, window focus, file paths, display scaling, input devices.

### Alternative: Tauri

Tauri uses the system WebView plus a Rust backend.

Pros:

- Smaller binaries than Electron.
- Strong native bridge model.
- Good fit if install size matters.

Cons:

- More DIY work for Steamworks integration.
- Platform WebViews can differ more than Electron's bundled Chromium.

### Alternative: NW.js

NW.js is another web-to-desktop runtime historically used for HTML5 games.

Pros:

- Simple mental model for web games.
- Some older Steamworks/Greenworks examples target NW.js.

Cons:

- Smaller modern ecosystem than Electron.
- Not the default choice unless a required plugin makes it easier.

### Alternative: Native Engine Port

A full port to Unity, Godot, GameMaker, or another engine is possible but expensive.

Pros:

- More conventional native game distribution.
- Better built-in support for platform-specific concerns.
- Steamworks integration is often more established in game engines.

Cons:

- Very high rewrite cost.
- Rebuilding the board, combat logic, UI, persistence, VFX, and content pipeline would be a major project.

For this game, a native engine rewrite is only worth considering if the web stack becomes a long-term blocker.

### Steamworks Requirements

Steam publishing is separate from the wrapper choice.

You need:

- A Steamworks partner account.
- A Steam app credit. Valve documents the Steam Direct fee as $100 USD per app, recoupable after the product reaches $1,000 adjusted gross revenue.
- Steamworks SDK tools for build/depot upload.
- Store page, pricing, assets, review submission, and release checklist.

Steamworks API integration is not required to ship, but it is recommended for expected Steam features:

- Overlay handling.
- Achievements.
- Leaderboards.
- Steam Cloud.
- Controller/Steam Input behavior.
- Steam Deck testing.

Useful references:

- Steamworks getting started: https://partner.steamgames.com/doc/gettingstarted
- Steam Direct fee: https://partner.steamgames.com/doc/gettingstarted/appfee
- Steamworks API overview: https://partner.steamgames.com/doc/sdk/api

## iOS / Android

### Recommended Path: Capacitor

Capacitor is the mobile equivalent of the Electron strategy: package the existing web app in native iOS and Android projects.

Recommended flow:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npm run build
npx cap add android
npx cap add ios
npx cap copy
npx cap open android
npx cap open ios
```

Use Android Studio for Android builds and Xcode for iOS builds.

Pros:

- Keeps the existing Phaser/React/Vite app.
- Officially designed for modern web apps in native mobile containers.
- Supports native plugins when the game needs platform APIs.
- Phaser has official Capacitor deployment guidance.

Cons:

- Still a WebView-based game.
- Needs mobile UX work.
- iOS builds require a Mac and Xcode.
- Store compliance work is real even if the code port is light.

Useful references:

- Capacitor docs: https://capacitorjs.com/docs
- Phaser Capacitor tutorial: https://phaser.io/tutorials/bring-your-phaser-game-to-ios-and-android-with-capacitor

### Alternative: Cordova

Cordova is the older web-to-mobile approach.

Pros:

- Large history of plugins and examples.

Cons:

- Not the best default for a new port.
- Capacitor is the more modern choice for this app.

### Alternative: Native Mobile Rewrite

Rewriting in Unity, Godot, or native iOS/Android would give more native control, but it is the highest-cost route.

This is not recommended unless mobile becomes the primary platform and the WebView approach cannot meet performance or UX requirements.

### Alternative: PWA

A progressive web app can be useful for web/mobile browser distribution, especially on Android.

It is not a full substitute for App Store and Google Play releases.

## Mobile Work Items

The current game is designed around a `640x360` landscape Phaser canvas with a React UI overlay. A mobile port should assume landscape orientation first.

Key changes:

- Lock or strongly prefer landscape orientation.
- Add safe-area support for notches, rounded corners, and home indicators.
- Audit all React screens for touch targets and small text.
- Replace hover-only interactions with tap/press behavior.
- Make keyword tooltips usable on touch devices.
- Ensure map nodes, merchant cards, campfire options, and combat buttons are comfortable on phones.
- Verify Phaser pointer input across WebView, iOS Safari behavior, and Android Chrome WebView behavior.
- Review audio unlock behavior. Mobile WebViews require user gestures before playback.
- Profile performance on mid-range Android devices, not just desktop or flagship phones.
- Test pause/resume, app backgrounding, and save reliability.
- Review canvas scaling and pixel-art rendering on high-DPI screens.

## Persistence

The browser build currently relies on IndexedDB for runs, scores, and combat snapshots, plus localStorage-backed meta progression.

For wrapped ports, IndexedDB may work inside Electron and mobile WebViews, but persistence should be treated as a risk area.

Recommended approach:

1. Keep the current persistence for the first prototype.
2. Add a save adapter boundary if one does not already exist cleanly enough.
3. For Electron, consider moving durable saves to app data using Node filesystem APIs.
4. For Capacitor, consider Capacitor Preferences or Filesystem for critical save data.
5. Add explicit backup/export tooling before launch if saves are important to players.

## Platform Features

### Steam

Good candidates:

- Achievements for wins, characters, bosses, wanted levels, rare events.
- Leaderboards for score and wanted level.
- Steam Cloud for save sync.
- Steam Input / controller mapping.
- Steam Deck verification pass.

### iOS / Android

Good candidates:

- Cloud saves only if account infrastructure is ready.
- Platform achievements are optional and can wait.
- Haptics for combat feedback if they improve feel.
- Store-specific privacy declarations and data collection review.

## Account / Store Costs

Current public platform costs to plan around:

- Steam: $100 USD Steam Direct fee per app, recoupable after $1,000 adjusted gross revenue.
- Apple Developer Program: $99 USD per membership year.
- Google Play / Android developer account: Google documentation references a $25 USD fee for creating a developer account.

Always verify these before committing launch plans, because store policies and regional requirements can change.

References:

- Apple Developer Program enrollment: https://developer.apple.com/help/account/membership/program-enrollment/
- Android developer verification overview: https://developer.android.com/developer-verification/assets/pdfs/introducing-the-android-developer-console.pdf

## Recommended Roadmap

1. Prototype Android with Capacitor.
2. Fix mobile layout, touch, safe area, audio unlock, and persistence issues.
3. Test on at least one low/mid Android device and one tablet-sized viewport.
4. Prototype Electron for Steam.
5. Decide whether shared wrapper abstractions are needed for saves, fullscreen, platform detection, and achievements.
6. Add Steamworks features after the base desktop build is stable.
7. Do iOS once Android mobile UX is proven, because iOS requires Xcode/macOS and has stricter store review expectations.

## Practical Recommendation

Use these defaults unless a specific blocker appears:

- Steam: Electron first.
- Android/iOS: Capacitor first.
- Do not rewrite the game engine unless wrappers fail for performance, UX, or platform policy reasons.
- Treat persistence and mobile UX as the main risks, not the act of packaging the app.
