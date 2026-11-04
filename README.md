# TrackYSF — Track Yourself

Personal iOS calorie & macro tracker. Snap a meal, optionally add what's inside and how many grams, and Gemini estimates calories, protein, carbs and fat per component. Adjust grams, add to your diary in one tap.

## Features (v1)
- **Onboarding**: animated ruler sliders for age / height / weight, activity, goal → daily kcal + macro targets (Mifflin-St Jeor).
- **Today**: 7-day strip, calorie ring, macro bars, meals (breakfast / lunch / dinner / snack).
- **Add food**: camera, photo library or plain text. Optional food name + ingredients/grams make the estimate more precise. Result is editable per item (grams rescale macros instantly).
- **Recent foods**: one-tap re-add.
- **Progress**: weight log (0.1 kg ruler), smoothed chart, weekly trend with guidance, 7-day calorie bars and averages.
- **Settings**: AZ / EN interface, targets, profile, Gemini API key (stored in the iOS Keychain), erase data.
- Everything is stored locally in SQLite. No server, no account.

## Stack
Expo SDK 58 (React Native 0.88, TypeScript), Expo Router with native tabs, Reanimated 4, expo-sqlite, expo-secure-store, react-native-svg.
AI: `gemini-3.1-flash-lite` with automatic fallback to `gemini-3.5-flash-lite` when the primary is overloaded. Structured JSON output.

## Develop (Windows, no Mac needed)
```bash
npm install
npx expo start          # scan the QR code with the iPhone camera → opens in Expo Go
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
