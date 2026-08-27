# Gym Timer

> Historical product and implementation brief. Some route sketches and MVP notes below describe the original plan; [README.md](README.md) is the authoritative guide to the current application.

A local-first mobile workout planning and execution application built with **TypeScript**, **React Native**, and **Expo SDK 54**.

The application allows a user to create structured workout plans, define exercises and sets, record target weights and repetitions, and automatically run rest timers after each completed set.

## Product concept

A workout is represented as an ordered plan.

Example:

- **Leg Day**
  - **Squats**
    - Set 1: 40 kg × 8 reps
    - Rest: 60 seconds
    - Set 2: 50 kg × 8 reps
    - Rest: 60 seconds
    - Set 3: 50 kg × 8 reps
    - Rest: 60 seconds
    - Set 4: 60 kg × 8 reps
    - Rest: 60 seconds
    - Set 5: 60 kg × 8 reps
  - **Deadlifts**
    - Set 1: 40 kg × 8 reps
    - Rest: 90 seconds
    - Additional sets configured by the user

During a workout, the application shows the current exercise and set. When the user finishes the set, they tap **Complete Set**. The application records the result, starts the configured rest countdown, and then advances to the next set.

---

## Primary goals

1. Let users create, edit, duplicate, reorder, and delete workout plans.
2. Let users add exercises to each plan.
3. Let users define individual sets with target weight, repetitions, and rest time.
4. Guide users through a workout one set at a time.
5. Start a reliable countdown after a set is completed.
6. Preserve the active workout if the app is minimized or reopened.
7. Record completed workouts and set results locally.
8. Provide clear progress indicators, sounds, vibration, and completion feedback.
9. Support both Android and iPhone from one codebase.
10. Keep the first version simple, fast, and usable without an account.

---

## MVP scope

### Workout plan management

The user can:

- View all saved workout plans.
- Create a new workout plan.
- Rename a workout plan.
- Duplicate a workout plan.
- Delete a workout plan after confirmation.
- Reorder workout plans.
- Add an optional description.
- See the exercise count, total set count, and estimated duration.

### Exercise management

Within a workout plan, the user can:

- Add an exercise.
- Edit the exercise name.
- Add optional notes.
- Reorder exercises.
- Duplicate an exercise.
- Delete an exercise.
- Configure a default rest duration.
- Add, edit, duplicate, reorder, and delete sets.

### Set configuration

Each set should support:

- Target weight in kilograms.
- Target repetitions.
- Rest duration in seconds.
- Optional note.
- Warm-up or working-set classification.
- Completion status during a workout.

Internally, repeated schemes should be stored as individual sets.

For example:

```text
50 kg × 8 reps × 2 sets
```

should be expanded into two separate set records so that each set can be completed, skipped, edited, and logged independently.

### Workout execution

The workout screen must show:

- Workout name.
- Current exercise.
- Current set number.
- Total sets for the exercise.
- Target weight.
- Target repetitions.
- Exercise notes.
- Overall workout progress.
- Current exercise progress.
- A large **Complete Set** button.
- A smaller **Skip Set** action.
- A **Pause Workout** action.
- An **End Workout** action with confirmation.

When the user taps **Complete Set**:

1. Record the set as completed.
2. Store the actual weight and repetitions.
3. If another set remains, start the configured rest timer.
4. When the timer reaches zero, notify the user.
5. Advance to the next set.
6. If no sets remain, complete the workout session.

The user should be allowed to adjust the actual weight and repetitions before confirming a set.

### Rest timer

The rest screen must show:

- A large countdown.
- The exercise that was completed.
- The next exercise and set.
- Add 15 seconds.
- Subtract 15 seconds.
- Skip rest.
- Pause and resume.
- Sound and vibration controls.

The timer must not rely on decrementing a counter once per second as the source of truth.

Use an absolute end timestamp:

```ts
const restEndsAt = Date.now() + restDurationSeconds * 1000;
```

Calculate the remaining time from the current clock:

```ts
const remainingSeconds = Math.max(
  0,
  Math.ceil((restEndsAt - Date.now()) / 1000)
);
```

This prevents timer drift and allows the timer to recover correctly after:

- The app is minimized.
- The screen is locked.
- The app is temporarily suspended.
- The user returns after the timer has already finished.

Use local notifications for rest completion where supported.

### Workout history

The user can:

- View completed workout sessions.
- See the completion date and duration.
- See exercises and completed sets.
- See target versus actual weight and repetitions.
- Delete a history entry.
- Repeat a previous workout using its original plan.

### Settings

Include:

- Default rest duration.
- Sound enabled or disabled.
- Vibration enabled or disabled.
- Keep screen awake during active workouts.
- Weight unit fixed to kilograms for the initial version.
- Confirmation before ending an active workout.
- Theme preference: system, light, or dark.

---

## Out of scope for the first version

Do not implement these until the MVP is stable:

- User accounts.
- Cloud synchronisation.
- Social features.
- Public workout sharing.
- Coaching subscriptions.
- Wearable integration.
- Apple Watch or Wear OS applications.
- Calorie estimation.
- Artificial-intelligence workout generation.
- Camera-based repetition counting.
- Complex analytics.
- Payments or advertisements.

Design the code so that cloud synchronisation can be added later, but do not add a backend to the MVP.

---

## Technology stack

Use the following stack:

```text
Language:            TypeScript
Framework:           React Native
Platform tooling:    Expo SDK 54
Navigation:          Expo Router
State management:    Zustand
Persistence:         AsyncStorage
Notifications:       expo-notifications
Haptics:             expo-haptics
Audio:               Expo-compatible audio package
Screen awake:        expo-keep-awake
Validation:          Zod
Testing:             Jest and React Native Testing Library
Package manager:     npm
IDE:                 Visual Studio Code
```

Install Expo-compatible packages with:

```powershell
npx expo install <package-name>
```

Do not install arbitrary latest versions of React Native or Expo packages with plain `npm install` when Expo provides the package.

Use plain `npm install` for framework-independent packages such as Zustand or Zod.

---

## Suggested installation commands

Run these from the project root:

```powershell
npx expo install expo-router expo-notifications expo-haptics expo-keep-awake
npx expo install @react-native-async-storage/async-storage
npm install zustand zod
```

Before installing an audio package, check which package is supported by Expo SDK 54 and install it using `npx expo install`.

After dependency changes, run:

```powershell
npx expo-doctor@latest
```

---

## Application routes

Use Expo Router with this route structure:

```text
app/
├── _layout.tsx
├── index.tsx
├── plans/
│   ├── index.tsx
│   ├── new.tsx
│   └── [planId]/
│       ├── index.tsx
│       ├── edit.tsx
│       └── exercise/
│           ├── new.tsx
│           └── [exerciseId].tsx
├── workout/
│   └── [sessionId].tsx
├── history/
│   ├── index.tsx
│   └── [sessionId].tsx
└── settings.tsx
```

Recommended bottom navigation:

```text
Plans | History | Settings
```

The active workout should use a dedicated full-screen route rather than appear inside the bottom tabs.

---

## Suggested source structure

```text
src/
├── components/
│   ├── buttons/
│   ├── cards/
│   ├── forms/
│   ├── timer/
│   └── workout/
├── constants/
├── hooks/
├── models/
├── services/
│   ├── notifications.ts
│   ├── persistence.ts
│   └── timer.ts
├── store/
│   ├── plansStore.ts
│   ├── sessionStore.ts
│   └── settingsStore.ts
├── theme/
├── utils/
└── validation/
```

If the generated Expo template already uses `src/app`, keep all routes inside `src/app` and place the remaining source folders beside it.

---

## Data model

Use stable string identifiers. Generate identifiers with a maintained UUID package or another Expo-compatible identifier strategy.

### Workout plan

```ts
export interface WorkoutPlan {
  id: string;
  name: string;
  description?: string;
  exercises: Exercise[];
  createdAt: string;
  updatedAt: string;
}
```

### Exercise

```ts
export interface Exercise {
  id: string;
  name: string;
  notes?: string;
  defaultRestSeconds: number;
  sets: WorkoutSet[];
  order: number;
}
```

### Workout set

```ts
export type SetType = 'warmup' | 'working';

export interface WorkoutSet {
  id: string;
  order: number;
  type: SetType;
  targetWeightKg: number;
  targetReps: number;
  restSeconds: number;
  notes?: string;
}
```

### Workout session

```ts
export type SessionStatus =
  | 'active'
  | 'resting'
  | 'paused'
  | 'completed'
  | 'cancelled';

export interface WorkoutSession {
  id: string;
  planId: string;
  planSnapshot: WorkoutPlan;
  status: SessionStatus;
  currentExerciseIndex: number;
  currentSetIndex: number;
  results: SetResult[];
  startedAt: string;
  completedAt?: string;
  pausedAt?: string;
  totalPausedMilliseconds: number;
  restEndsAt?: number;
}
```

Store a plan snapshot inside the session so that editing a plan later does not change past workout history.

### Set result

```ts
export type SetResultStatus = 'completed' | 'skipped';

export interface SetResult {
  id: string;
  exerciseId: string;
  setId: string;
  status: SetResultStatus;
  targetWeightKg: number;
  targetReps: number;
  actualWeightKg?: number;
  actualReps?: number;
  completedAt: string;
}
```

### Application settings

```ts
export interface AppSettings {
  defaultRestSeconds: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  keepAwakeDuringWorkout: boolean;
  confirmBeforeEndingWorkout: boolean;
  theme: 'system' | 'light' | 'dark';
}
```

---

## State management

Use separate Zustand stores.

### Plans store

Responsibilities:

- Load and save workout plans.
- Create, update, duplicate, reorder, and delete plans.
- Create, update, duplicate, reorder, and delete exercises.
- Create, update, duplicate, reorder, and delete sets.
- Validate all saved data.

### Session store

Responsibilities:

- Start a workout from a plan snapshot.
- Track the current exercise and set.
- Complete or skip a set.
- Start and finish rest periods.
- Pause and resume a workout.
- Recover an active session after app restart.
- Complete or cancel the session.
- Save completed sessions to history.

### Settings store

Responsibilities:

- Load settings.
- Update settings.
- Apply default values.
- Persist settings.

Do not put all application data into one large store.

---

## Workout state machine

Implement the active workout as an explicit state machine.

```text
IDLE
  ↓ start workout
ACTIVE_SET
  ↓ complete set
RESTING
  ↓ timer finished or skip rest
ACTIVE_SET
  ↓ final set completed
COMPLETED
```

Additional transitions:

```text
ACTIVE_SET → PAUSED
RESTING → PAUSED
PAUSED → previous active state
ACTIVE_SET → CANCELLED
RESTING → CANCELLED
PAUSED → CANCELLED
```

The UI must derive from the session state rather than manually navigating based on disconnected component variables.

### Completion logic

After a set is completed:

1. Save its result.
2. Determine whether another set exists in the same exercise.
3. If not, determine whether another exercise exists.
4. If another set or exercise exists:
   - Start rest if the completed set has `restSeconds > 0`.
   - Otherwise advance immediately.
5. If nothing remains:
   - Mark the session completed.
   - Save it to history.
   - Show a workout summary.

---

## Persistence

Persist these keys locally:

```text
gymTimer.plans.v1
gymTimer.activeSession.v1
gymTimer.history.v1
gymTimer.settings.v1
```

Requirements:

- Load persisted data during application startup.
- Show a loading screen until hydration completes.
- Save after every meaningful mutation.
- Validate stored data before using it.
- Fall back to safe defaults if data is malformed.
- Do not silently discard valid user data.
- Add a schema version so migrations can be introduced later.

For the MVP, AsyncStorage is acceptable. Keep persistence behind a service abstraction so it can later be replaced by SQLite or cloud storage.

---

## Background and lifecycle behaviour

Use React Native `AppState` to detect when the application enters the background or foreground.

When entering the background:

- Persist the active session.
- Keep `restEndsAt` as an absolute timestamp.
- Schedule a local notification for rest completion.
- Do not rely on continuous JavaScript execution.

When returning to the foreground:

- Reload or revalidate the active session.
- Recalculate the remaining time from `restEndsAt`.
- Cancel obsolete notifications.
- If the rest period has expired, show zero and allow automatic or user-confirmed advancement.

If the app is completely closed during a workout, reopening it should offer:

```text
Resume workout
Discard workout
```

---

## Notification behaviour

Request notification permission only when the feature is first needed or from Settings.

During rest:

- Schedule one local notification for the rest end time.
- Cancel and reschedule it if time is added or removed.
- Cancel it if the user skips rest.
- Cancel it if the workout is ended.
- Do not create duplicate notifications.

Suggested notification:

```text
Title: Rest complete
Body: Start your next set of Squats.
```

The application must continue to function if notification permission is denied.

---

## User interface requirements

### General design

- Mobile-first layout.
- Large touch targets.
- High contrast.
- Minimal visual clutter.
- One primary action per screen.
- Clear typography.
- Metric units only.
- Support system light and dark themes.
- Avoid tiny controls during an active workout.

### Plan card

Show:

- Plan name.
- Number of exercises.
- Number of sets.
- Estimated duration.
- Start button.
- Overflow menu for edit, duplicate, and delete.

### Active set screen

Prioritise:

1. Exercise name.
2. Set progress.
3. Target weight and repetitions.
4. Complete Set button.
5. Workout progress.

Suggested visual hierarchy:

```text
Leg Day
Squats
Set 2 of 5

50 kg
8 reps

[ Complete Set ]

Overall progress: 2 of 12 sets
```

### Rest screen

The countdown should be the dominant element:

```text
REST

00:58

Next:
Squats
50 kg × 8 reps

[-15 s]   [Skip Rest]   [+15 s]
```

### Accessibility

- Provide accessibility labels for buttons.
- Do not rely on colour alone to show status.
- Use sufficiently large text.
- Support screen readers.
- Respect reduced-motion settings where practical.
- Keep touch targets at least approximately 44 × 44 points.

---

## Validation rules

Use Zod or equivalent validation.

Recommended rules:

- Workout name: required, 1–60 characters.
- Exercise name: required, 1–60 characters.
- Weight: 0–1000 kg.
- Repetitions: 1–1000.
- Rest duration: 0–3600 seconds.
- A plan must contain at least one exercise before starting.
- An exercise must contain at least one set before starting.
- Prevent duplicate ordering values after reordering.
- Reject `NaN`, negative values, and infinite values.

Display validation errors near the affected field.

---

## Error handling

The application should:

- Show a recoverable message if local data cannot be loaded.
- Avoid crashing because of one malformed record.
- Confirm destructive actions.
- Preserve the current session if a non-fatal error occurs.
- Log development errors clearly.
- Avoid displaying raw JavaScript exceptions to users.

Add an error boundary around the main application.

---

## Testing requirements

### Unit tests

Test:

- Timer remaining-time calculations.
- Set completion logic.
- Movement to the next set.
- Movement to the next exercise.
- Final workout completion.
- Pause and resume calculations.
- Adding and subtracting rest time.
- Plan validation.
- Persistence migrations.

### Component tests

Test:

- Plan creation form.
- Exercise and set editing.
- Active set display.
- Rest timer controls.
- Resume-workout prompt.
- Workout summary.

### Manual tests

Verify on a physical Android phone:

- Start a workout.
- Complete a set.
- Lock the screen during rest.
- Return after the timer ends.
- Minimize and reopen the application.
- Force-close and reopen the application.
- Deny notification permission.
- Rotate the device.
- Change system theme.
- Complete an entire workout.
- Edit a plan without changing historical sessions.

Later, repeat critical tests on an iPhone.

---

## Acceptance criteria

The MVP is complete when all of the following work:

1. A user can create a plan called `Leg Day`.
2. The user can add `Squats` and `Deadlifts`.
3. The user can configure at least five squat sets with different weights.
4. The user can configure a separate rest duration for every set.
5. The plan remains available after restarting the app.
6. The user can start the plan.
7. The app clearly shows the current exercise, set, weight, and repetitions.
8. Tapping **Complete Set** records the set and starts the correct rest timer.
9. The rest timer remains accurate after minimizing or locking the phone.
10. The user can add or subtract 15 seconds.
11. The user can skip rest.
12. The app advances correctly through all sets and exercises.
13. The user can pause, resume, or end the workout.
14. An interrupted workout can be resumed after reopening the application.
15. A completed workout appears in history.
16. Historical data retains the original plan values.
17. Sound and vibration settings are respected.
18. The project passes TypeScript checks and Expo Doctor.
19. The app runs in Expo Go compatible with SDK 54.
20. There are no blocking runtime errors during the complete workflow.

---

## Development phases

Codex should implement the application incrementally.

### Phase 1: Project foundation

- Inspect the existing Expo SDK 54 project.
- Preserve compatible package versions.
- Configure Expo Router.
- Create theme constants.
- Add model definitions.
- Add validation schemas.
- Add Zustand stores.
- Add persistence service.
- Add seed data for one example `Leg Day` plan.

### Phase 2: Plan editor

- Plans list.
- New plan screen.
- Edit plan screen.
- Exercise editor.
- Set editor.
- Reordering.
- Duplicate and delete actions.
- Validation.

### Phase 3: Workout execution

- Start session.
- Active-set screen.
- Complete and skip set.
- Correct next-set calculation.
- Overall progress.
- Pause and resume.
- End-workout confirmation.

### Phase 4: Rest timer

- Absolute timestamp timer.
- Add and subtract time.
- Skip rest.
- App lifecycle recovery.
- Notifications.
- Haptics and audio.
- Screen-awake behaviour.

### Phase 5: History and settings

- Completed-session history.
- Session details.
- Repeat workout.
- Settings persistence.
- Theme support.
- Workout summary.

### Phase 6: Testing and refinement

- Unit tests.
- Component tests.
- Accessibility review.
- Empty states.
- Error states.
- Android physical-device testing.
- Expo Doctor and TypeScript fixes.

Codex should complete and verify each phase before starting the next phase.

---

## Coding standards

- Use TypeScript strict mode.
- Avoid `any`.
- Prefer small, focused components.
- Keep business logic outside screen components.
- Use pure functions for workout progression and timer calculations.
- Do not duplicate model definitions.
- Do not store derived values when they can be calculated.
- Use immutable state updates.
- Add comments only where logic is not self-explanatory.
- Use descriptive names.
- Keep files reasonably small.
- Run formatting and linting before completion.
- Do not upgrade Expo SDK without explicit approval.
- Do not replace Expo-compatible dependency versions arbitrarily.
- Do not add a backend.
- Do not introduce a component library unless it provides clear value.

---

## Commands

Start development:

```powershell
npm install
npx expo start
```

Start with a cleared cache:

```powershell
npx expo start --clear
```

Check Expo compatibility:

```powershell
npx expo-doctor@latest
```

Run TypeScript checking:

```powershell
npx tsc --noEmit
```

Run tests:

```powershell
npm test
```

Stop the development server:

```text
Ctrl + C
```

---

## Instructions for Codex

1. Read this entire README before changing the project.
2. Inspect the existing files and installed dependency versions.
3. Keep the project on Expo SDK 54.
4. Propose a concise implementation plan.
5. Implement one development phase at a time.
6. Reuse the existing Expo project rather than recreating it.
7. Use `npx expo install` for Expo and React Native dependencies.
8. Do not modify generated native Android or iOS folders unless absolutely required.
9. Preserve user data during refactoring.
10. Run the relevant checks after each phase.
11. Report:
    - Files created.
    - Files changed.
    - Commands run.
    - Tests performed.
    - Known limitations.
12. Do not mark a phase complete unless its acceptance criteria are verified.

The first task should be:

```text
Implement Phase 1 only. Inspect the existing Expo SDK 54 project, create the data models, validation schemas, persistence layer, Zustand stores, theme foundation, and one editable seed workout plan named Leg Day. Do not implement the active workout screen yet. Run Expo Doctor and TypeScript checks when complete.
```
