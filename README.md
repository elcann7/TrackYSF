# TrackYSF — Track Yourself

![iOS](https://img.shields.io/badge/iOS-supported-black) ![Android](https://img.shields.io/badge/Android-supported-3DDC84) ![Expo SDK 58](https://img.shields.io/badge/Expo-SDK%2058-000020)

Personal calorie & macro tracker for **iOS and Android**. Snap a meal, optionally add what's inside and how many grams, and Gemini estimates calories, protein, carbs and fat per component. Adjust grams, add to your diary in one tap.

## Features
- **Onboarding**: animated ruler sliders for age / height / weight, activity, goal, **target weight and timeframe**. The app checks whether the pace is realistic (fat loss ≤0.75 % bodyweight/week, lean gain ≤0.5 kg/week), warns when it isn't and offers a realistic timeframe. Daily kcal + macros follow from Mifflin-St Jeor and the chosen pace (with a safe calorie floor).
- **Today**: 7-day strip, calorie ring, macro bars, meals (breakfast / lunch / dinner / snack).
- **AI scan**: camera, photo library or plain text. Optional food name + ingredients/grams make the estimate more precise. Result is editable per item (grams rescale macros instantly).
- **Food search**: ~120 built-in common foods (incl. Azerbaijani dishes, AZ/EN names, diacritic-insensitive search) + online search in [Open Food Facts](https://world.openfoodfacts.org) for branded products. Pick grams or servings.
- **Quick add**: enter calories (and optional macros) directly.
- **My foods**: create your own foods/recipes (values per 100 g/ml or per serving).
- **Recent foods**: one-tap re-add.
- **Science-based energy model**: Mifflin-St Jeor (or Katch-McArdle with body-fat %), FAO/WHO lifestyle PAL kept separate from training (MET method), age groups (teen / adult / 40+ / 65+) change calorie floor, fat-loss and gain ceilings and protein; gain rate depends on training experience (Iraki 2019) and BMI. A "How it's calculated" screen shows every formula with your own numbers.
- **Adaptive TDEE**: after ~2 weeks of logging, real expenditure is measured from intake and the smoothed weight trend (energy balance) and can replace the formula.
- **Training programs**: generated from days/week, session length, experience, age and equipment (gym / dumbbells / bodyweight). Full body → Upper/Lower → U/L+PPL → PPL ×2, each muscle ~2×/week, compounds first, RIR 1–3, rest 2–3 min for compounds. 40+ exercises with animated start/end images ([free-exercise-db](https://github.com/yuhonas/free-exercise-db), public domain) and AZ/EN technique cues.
- **Workout logger**: sets/reps/kg, last session, double-progression suggestion, rest timer, history.
- **Personalized programs**: training goal (muscle / strength / fitness), up to 3 weak-point muscles (trained first, +1 set, extra exercise), knee / lower-back / shoulder friendly swaps, weekly sets per muscle preview. Every exercise has common beginner mistakes, breathing cues and a form-video link.
- **Barcode scanner** (Open Food Facts), **saved meals**, **copy a meal from yesterday**.
- **Water** (≈35 ml/kg target) and **extra activity / cardio** (Compendium METs, net kcal added to the day's budget).
- **Reminders** (meals, weigh-ins, workout days, water) and **JSON backup / restore**.
- **Progress**: weight log (0.1 kg ruler), smoothed chart, weekly trend with guidance, 7-day calorie bars and averages.
- **Settings**: AZ / EN interface, targets, profile, Gemini API key (stored in the iOS Keychain / Android Keystore), erase data.
- Everything is stored locally in SQLite. No server, no account.

## Install
- **Android**: download `TrackYSF.apk` from the latest [Release](../../releases) or from the *Build Android APK* workflow run, open it on the phone and allow "install unknown apps" once.
- **iOS**: download `TrackYSF.ipa` and install it with SideStore or AltStore (see *Build the IPA* below).

## Gemini API key (free, bring your own)
TrackYSF has no server and ships **no API key**. Each user adds their own free key:
1. Open [Google AI Studio → API keys](https://aistudio.google.com/apikey) and sign in with Google.
2. Create an API key.
3. In the app: **Settings → Gemini API key**, paste, **Test key**.

The key is stored only on the device (iOS Keychain / Android Keystore). Free-tier limits apply (check them in AI Studio). Everything except AI analysis works without a key.

## Stack
Expo SDK 58 (React Native 0.88, TypeScript), Expo Router with native tabs, Reanimated 4, expo-sqlite, expo-secure-store, react-native-svg.
AI: `gemini-3.1-flash-lite` with automatic fallback to `gemini-3.5-flash-lite` when the primary is overloaded. Structured JSON output.

## Develop (Windows, no Mac needed)
```bash
npm install
npx expo start          # iPhone: scan the QR with the camera; Android: scan it in the Expo Go app
npx tsc --noEmit        # typecheck
```
Put your key in `.env.local` (gitignored) for development:
```
EXPO_PUBLIC_GEMINI_API_KEY=your-key
```

## Build the IPA
GitHub Actions → **Build unsigned IPA** → *Run workflow* (or push a `v*` tag to attach it to a Release).
The IPA is unsigned; install with **SideStore** or **AltStore** using your Apple ID. With a free Apple ID the app must be refreshed every 7 days.
The release build does not contain your API key: enter it once in Settings.

## Build the Android APK
GitHub Actions → **Build Android APK** → *Run workflow* (or push a `v*` tag to attach it to a Release).
Download `TrackYSF.apk` from the run's artifacts, copy it to the phone and open it (allow "install unknown apps" once).
The APK is signed with the debug key, so it is for sideloading, not the Play Store. Each user enters their own Gemini key in Settings.
Icons: SF Symbols are iOS-only, so `src/lib/androidIcons.ts` maps every icon to a Material Symbol for Android; add an entry there when you use a new icon.

## Structure
```
src/app/            routes (Expo Router)
  (tabs)/           Today, Progress, Settings
  onboarding.tsx    first-run flow (also used as /profile for editing)
  add.tsx           photo / text → AI analysis → editable result
  entry/[id].tsx    entry details sheet
  weight.tsx        weight log sheet
src/components/     Ruler (animated picker + odometer digits), CalorieRing, UI kit
src/lib/            db (SQLite), gemini, nutrition math, i18n, app state
```
