# Gym Timer

Gym Timer is a local-first workout planner, set tracker, rest timer, and exercise-progress app built with React Native and Expo SDK 54.

It supports both structured workout plans and spontaneous workouts recorded one set at a time. All workout data is stored on the device and can be exported as a JSON backup.

## Features

- Create, edit, duplicate, reorder, and delete workout plans, exercises, and sets.
- Run planned workouts with target and actual weight/repetition tracking.
- Show or hide the previous session's performance during a workout.
- Record an unplanned workout without creating a fixed plan first.
- Choose a configured workout day or enter a one-off custom day.
- Customize recorder days and exercise shortcuts from Settings.
- Use countdown rest timers for planned workouts and count-up rest timers while recording.
- Pause, resume, recover, and discard active workouts.
- Track personal records and volume separately for every exercise.
- Review weekly exercise volume, workout history, and detailed set results.
- Configure sound, vibration, notifications, keep-awake behavior, and visual themes.
- Export and import plans, history, settings, and recorder configuration as JSON.

## Technology

- Expo SDK 54 / React Native 0.81 / React 19.1
- Expo Router
- TypeScript in strict mode
- Zustand
- AsyncStorage
- Zod
- Expo Notifications, Audio, Haptics, and Keep Awake
- Node's built-in test runner

## Requirements

- Node.js 20.19 or newer
- npm
- Expo Go with SDK 54 support, or an Android/iOS development environment

## Getting started

```powershell
npm install
npx expo start --go
```

Scan the QR code with Expo Go while the phone and development computer are on the same network. Press `E` in Expo's terminal UI to display the QR code again.

On Windows systems that block PowerShell wrapper scripts, use:

```powershell
npm.cmd install
npx.cmd expo start --go
```

For restrictive networks, Expo's tunnel mode is also available:

```powershell
npx expo start --go --tunnel
```

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm start` | Start the Expo development server |
| `npm run android` | Start Expo and open Android |
| `npm run ios` | Start Expo and open iOS |
| `npm run web` | Start the web app |
| `npm run typecheck` | Run the TypeScript compiler without emitting files |
| `npm run lint` | Run Expo's ESLint configuration |
| `npm test` | Run the unit test suite |
| `npx expo export --platform android` | Verify a production Android bundle |

## App workflow

### Planned workout

1. Open **Plans** and create or edit a plan.
2. Add exercises and individual warm-up or working sets.
3. Start the plan from **Home**.
4. Record actual weight and repetitions for each set.
5. Use the countdown rest timer before continuing.

### Record workout

1. Select **Record workout** on **Home**.
2. Choose a configured day or enter a custom day name.
3. Select an exercise, enter weight and repetitions, and record the set.
4. Let the count-up rest timer run until ready, then record the next set.
5. Finish the workout to save it to history and exercise progress.

Recorder shortcuts can be managed under **Settings → Workout recorder**. Removing a shortcut does not alter existing workout history.

## Data and backups

Plans, active sessions, completed history, and settings are validated and stored locally with AsyncStorage. The app does not require an account or backend.

Use **Settings → Advanced settings** to export or import a JSON backup. Keep exported backups somewhere outside the device if the history is important.

## Project structure

```text
app/                 Expo Router screens
src/components/      App-specific UI and forms
src/data/            Seed plans and recorder defaults
src/hooks/           Hydration and timer hooks
src/models/          TypeScript data models
src/services/        Persistence, notifications, feedback, and workout logic
src/store/           Zustand stores
src/utils/           Analytics, summaries, routes, and helpers
src/validation/      Zod schemas
tests/               Unit tests
different themes/    Original visual-design references
```

The original implementation brief is retained in [README_DEVELOPMENT.md](README_DEVELOPMENT.md). The checked-in [Expo SDK reference](Expo%20SDK%20reference.md) documents the exact Expo version targeted by this repository.

## Current limitations

- Weight is recorded in kilograms.
- Data is local unless manually exported.
- There are no accounts, cloud synchronization, social features, or wearable integrations.

## Verification

Before committing changes, run:

```powershell
npm run typecheck
npm run lint
npm test
```
