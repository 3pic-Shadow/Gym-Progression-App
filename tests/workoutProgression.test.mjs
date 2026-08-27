import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adjustRestPeriod,
  getCurrentExercise,
  getCurrentSet,
  getUpcomingSets,
  getWorkoutProgress,
  insertTemporarySets,
  finishRestPeriod,
  pauseWorkoutSession,
  recordCurrentSet,
  resumeWorkoutSession,
  startRestPeriod,
  undoLastRecordedSet,
} from '../src/services/workoutProgression.ts';
import { formatCountdown, getRemainingSeconds } from '../src/services/timer.ts';

const completedAt = '2026-07-30T10:01:00.000Z';

function makeSession() {
  return {
    id: 'session-1',
    planId: 'plan-1',
    planSnapshot: {
      id: 'plan-1',
      name: 'Test plan',
      exercises: [
        {
          id: 'exercise-1',
          name: 'Squats',
          defaultRestSeconds: 60,
          order: 0,
          sets: [
            {
              id: 'set-1',
              order: 0,
              type: 'working',
              targetWeightKg: 50,
              targetReps: 8,
              restSeconds: 60,
            },
            {
              id: 'set-2',
              order: 1,
              type: 'working',
              targetWeightKg: 60,
              targetReps: 6,
              restSeconds: 90,
            },
          ],
        },
        {
          id: 'exercise-2',
          name: 'Deadlifts',
          defaultRestSeconds: 90,
          order: 1,
          sets: [
            {
              id: 'set-3',
              order: 0,
              type: 'working',
              targetWeightKg: 80,
              targetReps: 5,
              restSeconds: 120,
            },
          ],
        },
      ],
      createdAt: '2026-07-30T09:00:00.000Z',
      updatedAt: '2026-07-30T09:00:00.000Z',
    },
    status: 'active',
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    results: [],
    startedAt: '2026-07-30T10:00:00.000Z',
    totalPausedMilliseconds: 0,
  };
}

test('records actual values and advances to the next set', () => {
  const next = recordCurrentSet(
    makeSession(),
    { status: 'completed', actualWeightKg: 52.5, actualReps: 8 },
    'result-1',
    completedAt
  );

  assert.equal(next.status, 'active');
  assert.equal(next.currentExerciseIndex, 0);
  assert.equal(next.currentSetIndex, 1);
  assert.deepEqual(next.results[0], {
    id: 'result-1',
    exerciseId: 'exercise-1',
    setId: 'set-1',
    status: 'completed',
    targetWeightKg: 50,
    targetReps: 8,
    actualWeightKg: 52.5,
    actualReps: 8,
    completedAt,
  });
});

test('advances from the final set of one exercise to the next exercise', () => {
  const session = {
    ...makeSession(),
    currentSetIndex: 1,
    results: [
      {
        id: 'result-1',
        exerciseId: 'exercise-1',
        setId: 'set-1',
        status: 'completed',
        targetWeightKg: 50,
        targetReps: 8,
        actualWeightKg: 50,
        actualReps: 8,
        completedAt,
      },
    ],
  };
  const next = recordCurrentSet(
    session,
    { status: 'completed', actualWeightKg: 60, actualReps: 6 },
    'result-2',
    completedAt
  );

  assert.equal(next.currentExerciseIndex, 1);
  assert.equal(next.currentSetIndex, 0);
  assert.equal(getCurrentExercise(next).id, 'exercise-2');
  assert.equal(getCurrentSet(next).id, 'set-3');
});

test('records skipped sets without actual values', () => {
  const next = recordCurrentSet(
    makeSession(),
    { status: 'skipped' },
    'result-1',
    completedAt
  );

  assert.equal(next.results[0].status, 'skipped');
  assert.equal(next.results[0].actualWeightKg, undefined);
  assert.equal(next.results[0].actualReps, undefined);
});

test('stores a personal record marker on a completed set', () => {
  const next = recordCurrentSet(
    makeSession(),
    {
      status: 'completed',
      actualWeightKg: 55,
      actualReps: 8,
      isPersonalRecord: true,
    },
    'result-1',
    completedAt
  );

  assert.equal(next.results[0].isPersonalRecord, true);
});

test('returns the next sets across exercise boundaries', () => {
  const session = { ...makeSession(), currentSetIndex: 1 };
  const upcoming = getUpcomingSets(session, 3);

  assert.deepEqual(
    upcoming.map(({ exercise, workoutSet }) => [exercise.name, workoutSet.id]),
    [
      ['Squats', 'set-2'],
      ['Deadlifts', 'set-3'],
    ]
  );
});

test('marks the session completed after its final set', () => {
  const session = {
    ...makeSession(),
    currentExerciseIndex: 1,
    currentSetIndex: 0,
    results: [
      {
        id: 'result-1',
        exerciseId: 'exercise-1',
        setId: 'set-1',
        status: 'completed',
        targetWeightKg: 50,
        targetReps: 8,
        actualWeightKg: 50,
        actualReps: 8,
        completedAt,
      },
      {
        id: 'result-2',
        exerciseId: 'exercise-1',
        setId: 'set-2',
        status: 'skipped',
        targetWeightKg: 60,
        targetReps: 6,
        completedAt,
      },
    ],
  };
  const completed = recordCurrentSet(
    session,
    { status: 'completed', actualWeightKg: 80, actualReps: 5 },
    'result-3',
    completedAt
  );

  assert.equal(completed.status, 'completed');
  assert.equal(completed.completedAt, completedAt);
  assert.equal(completed.results.length, 3);
  assert.deepEqual(getWorkoutProgress(completed), {
    completedSets: 3,
    totalSets: 3,
    exerciseCompletedSets: 1,
    exerciseTotalSets: 1,
  });
});

test('rejects recording a set that already has a result', () => {
  const session = {
    ...makeSession(),
    results: [
      {
        id: 'result-1',
        exerciseId: 'exercise-1',
        setId: 'set-1',
        status: 'completed',
        targetWeightKg: 50,
        targetReps: 8,
        actualWeightKg: 50,
        actualReps: 8,
        completedAt,
      },
    ],
  };

  assert.throws(
    () =>
      recordCurrentSet(
        session,
        { status: 'completed', actualWeightKg: 50, actualReps: 8 },
        'result-2',
        completedAt
      ),
    /already been recorded/
  );
});

test('starts rest from an absolute timestamp and resumes the next set', () => {
  const advanced = recordCurrentSet(
    makeSession(),
    { status: 'completed', actualWeightKg: 50, actualReps: 8 },
    'result-1',
    completedAt
  );
  const resting = startRestPeriod(advanced, 60, 1_000_000);

  assert.equal(resting.status, 'resting');
  assert.equal(resting.restEndsAt, 1_060_000);

  const resumed = finishRestPeriod(resting);
  assert.equal(resumed.status, 'active');
  assert.equal(resumed.restEndsAt, undefined);
  assert.equal(resumed.currentSetIndex, 1);
});

test('runs added sets immediately after the current rest and then resumes the plan', () => {
  const advanced = recordCurrentSet(
    makeSession(),
    { status: 'completed', actualWeightKg: 50, actualReps: 8 },
    'result-1',
    completedAt
  );
  const session = startRestPeriod(advanced, 60, 1_000_000);
  const next = insertTemporarySets(session, {
    sourceExerciseId: 'exercise-1',
    count: 2,
    defaultRestSeconds: 60,
    temporaryExerciseId: 'temporary-exercise-1',
    temporarySetIds: ['temporary-set-1', 'temporary-set-2'],
    continuationExerciseId: 'continuation-exercise-1',
    targetWeightKg: 60,
    targetReps: 6,
    restSeconds: 90,
  });

  assert.equal(next.status, 'resting');
  assert.equal(next.currentExerciseIndex, 1);
  assert.equal(next.currentSetIndex, 0);
  assert.equal(next.planSnapshot.exercises.length, 4);
  assert.equal(session.planSnapshot.exercises.length, 2);
  assert.deepEqual(next.planSnapshot.exercises[0], {
    id: 'exercise-1',
    name: 'Squats',
    defaultRestSeconds: 60,
    order: 0,
    sets: [
      {
        id: 'set-1',
        order: 0,
        type: 'working',
        targetWeightKg: 50,
        targetReps: 8,
        restSeconds: 60,
      },
    ],
  });
  assert.deepEqual(next.planSnapshot.exercises[1], {
    id: 'temporary-exercise-1',
    name: 'Squats',
    notes: undefined,
    defaultRestSeconds: 60,
    order: 1,
    sets: [
      {
        id: 'temporary-set-1',
        order: 0,
        type: 'working',
        targetWeightKg: 60,
        targetReps: 6,
        restSeconds: 90,
        notes: undefined,
      },
      {
        id: 'temporary-set-2',
        order: 1,
        type: 'working',
        targetWeightKg: 60,
        targetReps: 6,
        restSeconds: 90,
        notes: undefined,
      },
    ],
  });

  const active = finishRestPeriod(next);
  assert.equal(getCurrentExercise(active).id, 'temporary-exercise-1');
  assert.equal(getCurrentSet(active).id, 'temporary-set-1');

  const afterFirstAddedSet = recordCurrentSet(
    active,
    { status: 'completed', actualWeightKg: 60, actualReps: 6 },
    'result-2',
    completedAt
  );
  assert.equal(getCurrentSet(afterFirstAddedSet).id, 'temporary-set-2');

  const resumedPlan = recordCurrentSet(
    afterFirstAddedSet,
    { status: 'completed', actualWeightKg: 60, actualReps: 6 },
    'result-3',
    completedAt
  );
  assert.equal(getCurrentExercise(resumedPlan).id, 'continuation-exercise-1');
  assert.equal(getCurrentSet(resumedPlan).id, 'set-2');
});

test('inserts an added set before the next exercise at an exercise boundary', () => {
  const session = {
    ...makeSession(),
    currentSetIndex: 1,
    results: [
      {
        id: 'result-1',
        exerciseId: 'exercise-1',
        setId: 'set-1',
        status: 'completed',
        targetWeightKg: 50,
        targetReps: 8,
        actualWeightKg: 50,
        actualReps: 8,
        completedAt,
      },
    ],
  };
  const advanced = recordCurrentSet(
    session,
    { status: 'completed', actualWeightKg: 60, actualReps: 6 },
    'result-2',
    completedAt
  );
  const resting = startRestPeriod(advanced, 90, 1_000_000);
  const next = insertTemporarySets(
    resting,
    {
      sourceExerciseId: 'exercise-1',
      count: 1,
      defaultRestSeconds: 60,
      temporaryExerciseId: 'temporary-exercise-1',
      temporarySetIds: ['temporary-set-1'],
      continuationExerciseId: 'unused-continuation-exercise',
      targetWeightKg: 60,
      targetReps: 6,
      restSeconds: 90,
    }
  );

  assert.equal(next.planSnapshot.exercises.length, 3);
  assert.equal(next.currentExerciseIndex, 1);
  assert.equal(getCurrentExercise(finishRestPeriod(next)).name, 'Squats');
  assert.equal(next.planSnapshot.exercises[2].id, 'exercise-2');
});

test('inserts a named custom exercise as the next set', () => {
  const advanced = recordCurrentSet(
    makeSession(),
    { status: 'completed', actualWeightKg: 50, actualReps: 8 },
    'result-1',
    completedAt
  );
  const next = insertTemporarySets(
    startRestPeriod(advanced, 60, 1_000_000),
    {
      exerciseName: '  Pull-ups  ',
      count: 1,
      defaultRestSeconds: 75,
      temporaryExerciseId: 'temporary-exercise-1',
      temporarySetIds: ['temporary-set-1'],
      continuationExerciseId: 'continuation-exercise-1',
      targetWeightKg: 0,
      targetReps: 8,
      restSeconds: 75,
    }
  );
  const exercise = next.planSnapshot.exercises[1];

  assert.equal(exercise.name, 'Pull-ups');
  assert.equal(exercise.defaultRestSeconds, 75);
  assert.deepEqual(exercise.sets[0], {
    id: 'temporary-set-1',
    order: 0,
    type: 'working',
    targetWeightKg: 0,
    targetReps: 8,
    restSeconds: 75,
    notes: undefined,
  });
});

test('rejects temporary sets outside a rest period', () => {
  assert.throws(
    () =>
      insertTemporarySets(makeSession(), {
        sourceExerciseId: 'exercise-1',
        count: 1,
        defaultRestSeconds: 60,
        temporaryExerciseId: 'temporary-exercise-1',
        temporarySetIds: ['temporary-set-1'],
        continuationExerciseId: 'continuation-exercise-1',
        targetWeightKg: 60,
        targetReps: 6,
        restSeconds: 90,
      }),
    /only be added during a rest period/
  );
});

test('inserts sets while rest is paused and preserves the remaining rest', () => {
  const advanced = recordCurrentSet(
    makeSession(),
    { status: 'completed', actualWeightKg: 50, actualReps: 8 },
    'result-1',
    completedAt
  );
  const resting = startRestPeriod(advanced, 60, 1_000_000);
  const paused = pauseWorkoutSession(resting, '1970-01-01T00:16:50.000Z');
  const inserted = insertTemporarySets(paused, {
    sourceExerciseId: 'exercise-1',
    count: 1,
    defaultRestSeconds: 60,
    temporaryExerciseId: 'temporary-exercise-1',
    temporarySetIds: ['temporary-set-1'],
    continuationExerciseId: 'continuation-exercise-1',
    targetWeightKg: 60,
    targetReps: 6,
    restSeconds: 90,
  });

  assert.equal(inserted.status, 'paused');
  assert.equal(inserted.pausedRestMilliseconds, 50_000);
  const resumed = resumeWorkoutSession(inserted, '1970-01-01T00:18:20.000Z');
  assert.equal(resumed.status, 'resting');
  assert.equal(resumed.restEndsAt, 1_150_000);
  assert.equal(getCurrentExercise(resumed).id, 'temporary-exercise-1');
});

test('undoes the previous set during rest', () => {
  const advanced = recordCurrentSet(
    makeSession(),
    { status: 'completed', actualWeightKg: 52.5, actualReps: 8 },
    'result-1',
    completedAt
  );
  const resting = startRestPeriod(advanced, 60, 1_000_000);
  const undone = undoLastRecordedSet(resting);

  assert.equal(undone.status, 'active');
  assert.equal(undone.currentExerciseIndex, 0);
  assert.equal(undone.currentSetIndex, 0);
  assert.equal(undone.results.length, 0);
  assert.equal(undone.restEndsAt, undefined);
});

test('does not start rest after the final set or for a zero duration', () => {
  const active = makeSession();
  assert.equal(startRestPeriod(active, 0, 1_000_000), active);

  const finalSession = {
    ...makeSession(),
    currentExerciseIndex: 1,
    currentSetIndex: 0,
    results: [
      {
        id: 'result-1',
        exerciseId: 'exercise-1',
        setId: 'set-1',
        status: 'completed',
        targetWeightKg: 50,
        targetReps: 8,
        actualWeightKg: 50,
        actualReps: 8,
        completedAt,
      },
      {
        id: 'result-2',
        exerciseId: 'exercise-1',
        setId: 'set-2',
        status: 'completed',
        targetWeightKg: 60,
        targetReps: 6,
        actualWeightKg: 60,
        actualReps: 6,
        completedAt,
      },
    ],
  };
  const completed = recordCurrentSet(
    finalSession,
    { status: 'completed', actualWeightKg: 80, actualReps: 5 },
    'result-3',
    completedAt
  );

  assert.equal(startRestPeriod(completed, 120, 1_000_000), completed);
});

test('derives countdown values from the current clock without drift', () => {
  assert.equal(getRemainingSeconds(61_000, 0), 61);
  assert.equal(getRemainingSeconds(61_000, 500), 61);
  assert.equal(getRemainingSeconds(61_000, 1_001), 60);
  assert.equal(getRemainingSeconds(61_000, 61_500), 0);
  assert.equal(formatCountdown(61), '01:01');
  assert.equal(formatCountdown(0), '00:00');
});

test('adds and subtracts rest time from the absolute deadline', () => {
  const resting = {
    ...makeSession(),
    status: 'resting',
    restEndsAt: 1_060_000,
  };

  const extended = adjustRestPeriod(resting, 15, 1_000_000);
  assert.equal(extended.status, 'resting');
  assert.equal(extended.restEndsAt, 1_075_000);

  const shortened = adjustRestPeriod(extended, -15, 1_000_000);
  assert.equal(shortened.status, 'resting');
  assert.equal(shortened.restEndsAt, 1_060_000);
});

test('subtracting past zero finishes rest immediately', () => {
  const resting = {
    ...makeSession(),
    status: 'resting',
    restEndsAt: 1_010_000,
  };

  const adjusted = adjustRestPeriod(resting, -15, 1_000_000);
  assert.equal(adjusted.status, 'active');
  assert.equal(adjusted.restEndsAt, undefined);
});

test('pausing and resuming rest preserves the remaining duration', () => {
  const resting = {
    ...makeSession(),
    status: 'resting',
    restEndsAt: 1_060_000,
  };
  const paused = pauseWorkoutSession(resting, '1970-01-01T00:16:50.000Z');

  assert.equal(paused.status, 'paused');
  assert.equal(paused.pausedFromStatus, 'resting');
  assert.equal(paused.pausedRestMilliseconds, 50_000);
  assert.equal(paused.restEndsAt, undefined);

  const resumed = resumeWorkoutSession(paused, '1970-01-01T00:18:20.000Z');
  assert.equal(resumed.status, 'resting');
  assert.equal(resumed.restEndsAt, 1_150_000);
  assert.equal(resumed.totalPausedMilliseconds, 90_000);
  assert.equal(resumed.pausedRestMilliseconds, undefined);
});

test('pausing an active set resumes the active set', () => {
  const paused = pauseWorkoutSession(makeSession(), '1970-01-01T00:16:40.000Z');
  const resumed = resumeWorkoutSession(paused, '1970-01-01T00:16:45.000Z');

  assert.equal(resumed.status, 'active');
  assert.equal(resumed.restEndsAt, undefined);
  assert.equal(resumed.totalPausedMilliseconds, 5_000);
});
