// src/core/prefs.ts
import { Preferences } from '@capacitor/preferences'
import type { Prefs } from '../types'

const PREFS_KEY = 'reader-prefs'

const defaults: Prefs = { fontSize: 18 }

export async function loadPrefs(): Promise<Prefs> {
  const { value } = await Preferences.get({ key: PREFS_KEY })
  if (!value) return { ...defaults }
  try {
    return { ...defaults, ...JSON.parse(value) }
  } catch {
    return { ...defaults }
  }
}

export async function savePrefs(prefs: Prefs): Promise<void> {
  await Preferences.set({ key: PREFS_KEY, value: JSON.stringify(prefs) })
}
