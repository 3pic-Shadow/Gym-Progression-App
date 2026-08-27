import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatSessionDuration,
  getSessionSummary,
} from '../src/utils/sessionSummary.ts';

const session = {
  id: 'session-1',
  planId: 'plan-1',
  planSnapshot: {
    id: 'plan-1',
    name: 'Leg Day',
    exercises: [],
    createdAt: '2026-07-30T10:00:00.000Z',
    updatedAt: '2026-07-30T10:00:00.000Z',
  },
  status: 'completed',
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  results: [
    { status: 'completed' },
    { status: 'completed' },
    { status: 'skipped' },
  ],
  startedAt: '2026-07-30T10:00:00.000Z',
  completedAt: '2026-07-30T10:45:00.000Z',
  totalPausedMilliseconds: 5 * 60 * 1000,
};

test('summarizes completed workouts and excludes paused time', () => {
  assert.deepEqual(getSessionSummary(session), {
    completedSets: 2,
    skippedSets: 1,
    durationMilliseconds: 40 * 60 * 1000,
    totalVolumeKg: 0,
    exerciseVolumes: [],
    personalRecords: 0,
  });
});

test('formats session durations for minutes and hours', () => {
  assert.equal(formatSessionDuration(40 * 60 * 1000), '40 min');
  assert.equal(formatSessionDuration(90 * 60 * 1000), '1 hr 30 min');
});
