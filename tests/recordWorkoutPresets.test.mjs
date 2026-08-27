import assert from 'node:assert/strict';
import test from 'node:test';

import { getRecordedWorkoutExerciseOptions } from '../src/data/recordWorkoutPresets.ts';

const plans = [
  {
    name: 'Leg Day',
    exercises: [{ name: 'Squats' }, { name: 'Deadlifts' }],
  },
  {
    name: 'Arms Day',
    exercises: [{ name: 'Bicep Curls' }, { name: 'Tricep Pushdowns' }],
  },
];

test('configured recorder exercises override matching plan exercises', () => {
  const configuredDays = [
    { id: 'legs', name: 'Leg Day', exercises: ['Squats', 'Leg Press'] },
  ];

  assert.deepEqual(
    getRecordedWorkoutExerciseOptions('Leg Day', configuredDays, plans),
    ['Squats', 'Leg Press']
  );
});

test('an ad-hoc day can fall back to exercises from a matching plan', () => {
  assert.deepEqual(
    getRecordedWorkoutExerciseOptions('Arms Day', [], plans),
    ['Bicep Curls', 'Tricep Pushdowns']
  );
});
