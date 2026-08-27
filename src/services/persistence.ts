import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

import { STORAGE_SCHEMA_VERSION } from '@/src/constants/storage';

interface StorageEnvelope<T> {
  schemaVersion: typeof STORAGE_SCHEMA_VERSION;
  data: T;
}

export type LoadResult<T> =
  | { status: 'loaded'; data: T }
  | { status: 'empty' }
  | { status: 'invalid'; error: string }
  | { status: 'error'; error: string };

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown storage error';
}

export async function loadValidated<T>(key: string, schema: z.ZodType<T>): Promise<LoadResult<T>> {
  let rawValue: string | null;

  try {
    rawValue = await AsyncStorage.getItem(key);
  } catch (error) {
    return { status: 'error', error: getErrorMessage(error) };
  }

  if (rawValue === null) {
    return { status: 'empty' };
  }

  try {
    const envelopeSchema = z.object({
      schemaVersion: z.literal(STORAGE_SCHEMA_VERSION),
      data: schema,
    });
    const result = envelopeSchema.safeParse(JSON.parse(rawValue));

    if (!result.success) {
      return { status: 'invalid', error: z.prettifyError(result.error) };
    }

    return { status: 'loaded', data: result.data.data };
  } catch (error) {
    return { status: 'invalid', error: getErrorMessage(error) };
  }
}

export async function saveValidated<T>(key: string, value: T, schema: z.ZodType<T>) {
  const validatedValue = schema.parse(value);
  const envelope: StorageEnvelope<T> = {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    data: validatedValue,
  };

  await AsyncStorage.setItem(key, JSON.stringify(envelope));
}

export async function removeStoredValue(key: string) {
  await AsyncStorage.removeItem(key);
}
