import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getExerciseProgressSummaries,
  getExerciseSessionHistory,
  getExerciseWeeklyVolumes,
  getSessionExerciseVolumes,
  getSessionVolume,
  getWeeklyVolumes,
} from '../src/utils/progressionAnalytics.ts';

function makeSession(id, completedAt, sets) {
  return {
    id,
    planId: 'plan-1',
    planSnapshot: {
      id: 'plan-1',
      name: 'Leg Day',
      exercises: [
        {
          id: 'squats',
          name: 'Squats',
          defaultRestSeconds: 60,
          order: 0,
          sets: sets.map((set, order) => ({
            id: set.id,
            order,
            type: 'working',
            targetWeightKg: set.weight,
            targetReps: set.reps,
            restSeconds: 60,
          })),
        },
      ],
      createdAt: completedAt,
      updatedAt: completedAt,
    },
    status: 'completed',
    currentExerciseIndex: 0,
    currentSetIndex: sets.length - 1,
    results: sets.map((set) => ({
      id: `result-${set.id}`,
      exerciseId: 'squats',
      setId: set.id,
      status: 'completed',
      targetWeightKg: set.weight,
      targetReps: set.reps,
      actualWeightKg: set.weight,
      actualReps: set.reps,
      isPersonalRecord: set.pr,
      completedAt,
    })),
    startedAt: completedAt,
    completedAt,
    totalPausedMilliseconds: 0,
  };
}

const history = [
  makeSession('session-2', '2026-07-29T12:00:00.000Z', [
    { id: 'set-3', weight: 60, reps: 8, pr: true },
  ]),
  makeSession('session-1', '2026-07-22T12:00:00.000Z', [
    { id: 'set-1', weight: 50, reps: 8 },
    { id: 'set-2', weight: 55, reps: 6 },
  ]),
];

test('calculates session and weekly training volume', () => {
  assert.equal(getSessionVolume(history[1]), 730);
  assert.deepEqual(
    getWeeklyVolumes(history, 2, '2026-07-30T12:00:00.000Z').map((week) => week.volumeKg),
    [730, 480]
  );
});

test('summarizes exercise progression and saved personal records', () => {
  const [summary] = getExerciseProgressSummaries(history);

  assert.equal(summary.name, 'Squats');
  assert.equal(summary.sessions, 2);
  assert.equal(summary.best.weightKg, 60);
  assert.equal(summary.latest.weightKg, 60);
  assert.equal(summary.savedPersonalRecords.length, 1);
});

test('groups exercise sets into workout sessions', () => {
  const sessions = getExerciseSessionHistory(history, 'squats');

  assert.equal(sessions.length, 2);
  assert.equal(sessions[0].volumeKg, 480);
  assert.equal(sessions[1].sets.length, 2);
});

test('keeps volume separated by exercise', () => {
  const mixedSession = structuredClone(history[1]);
  mixedSession.planSnapshot.exercises.push({
    id: 'crunches',
    name: 'Ab Crunches',
    defaultRestSeconds: 30,
    order: 1,
    sets: [
      {
        id: 'crunch-set-1',
        order: 0,
        type: 'working',
        targetWeightKg: 20,
        targetReps: 20,
        restSeconds: 30,
      },
    ],
  });
  mixedSession.results.push({
    id: 'result-crunch-set-1',
    exerciseId: 'crunches',
    setId: 'crunch-set-1',
    status: 'completed',
    targetWeightKg: 20,
    targetReps: 20,
    actualWeightKg: 20,
    actualReps: 20,
    completedAt: mixedSession.completedAt,
  });

  assert.deepEqual(
    getSessionExerciseVolumes(mixedSession).map((exercise) => [exercise.name, exercise.volumeKg]),
    [
      ['Ab Crunches', 400],
      ['Squats', 730],
    ]
  );
  assert.deepEqual(
    getExerciseWeeklyVolumes([mixedSession], 'Ab Crunches', 2, '2026-07-30T12:00:00.000Z').map(
      (week) => week.volumeKg
    ),
    [400, 0]
  );
});
