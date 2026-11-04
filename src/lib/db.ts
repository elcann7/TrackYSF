import type { SQLiteDatabase } from 'expo-sqlite';
import type { Macros } from './nutrition';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export interface FoodItem extends Macros {
  name: string;
  grams: number;
}

export interface Entry extends Macros {
  id: number;
  date: string;
  meal: MealType;
  name: string;
  items: FoodItem[];
  thumb: string | null;
  createdAt: number;
}

export interface WeightPoint {
  date: string;
  kg: number;
}

const SCHEMA_VERSION = 4;

export async function migrate(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current >= SCHEMA_VERSION) return;

  if (current < 1) await migrateV1(db);
  if (current < 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS my_foods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        brand TEXT,
        unit TEXT NOT NULL DEFAULT 'g',
        kcal REAL NOT NULL,
        protein REAL NOT NULL,
        carbs REAL NOT NULL,
        fat REAL NOT NULL,
        serving_label TEXT,
        serving_g REAL,
        created_at INTEGER NOT NULL
      );
    `);
  }
  if (current < 3) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        day_key TEXT NOT NULL,
        kind TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        finished_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS workout_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        ex_id TEXT NOT NULL,
        set_idx INTEGER NOT NULL,
        weight REAL NOT NULL,
        reps INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sets_ex ON workout_sets(ex_id);
    `);
  }
  if (current < 4) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS water (date TEXT PRIMARY KEY NOT NULL, ml INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS cardio (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        minutes INTEGER NOT NULL,
        kcal REAL NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_cardio_date ON cardio(date);
      CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        kcal REAL NOT NULL,
        protein REAL NOT NULL,
        carbs REAL NOT NULL,
        fat REAL NOT NULL,
        items TEXT NOT NULL DEFAULT '[]',
        thumb TEXT,
        created_at INTEGER NOT NULL
      );
    `);
  }
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

// ---------- water ----------
export async function getWater(db: SQLiteDatabase, date: string): Promise<number> {
  const r = await db.getFirstAsync<{ ml: number }>('SELECT ml FROM water WHERE date = ?', date);
  return r?.ml ?? 0;
}

export async function setWater(db: SQLiteDatabase, date: string, ml: number): Promise<void> {
  await db.runAsync(
    'INSERT INTO water (date, ml) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET ml = excluded.ml',
    date,
    Math.max(0, Math.round(ml)),
  );
}

// ---------- cardio ----------
export interface CardioEntry {
  id: number;
  date: string;
  type: string;
  minutes: number;
  kcal: number;
}

export async function cardioForDate(db: SQLiteDatabase, date: string): Promise<CardioEntry[]> {
  return db.getAllAsync<CardioEntry>('SELECT id, date, type, minutes, kcal FROM cardio WHERE date = ? ORDER BY created_at', date);
}

export async function addCardio(db: SQLiteDatabase, c: Omit<CardioEntry, 'id'>): Promise<void> {
  await db.runAsync(
    'INSERT INTO cardio (date, type, minutes, kcal, created_at) VALUES (?, ?, ?, ?, ?)',
    c.date,
    c.type,
    c.minutes,
    c.kcal,
    Date.now(),
  );
}

export async function deleteCardio(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM cardio WHERE id = ?', id);
}

// ---------- favorites (saved meals) ----------
export interface Favorite extends Macros {
  id: number;
  name: string;
  items: FoodItem[];
  thumb: string | null;
}

export async function allFavorites(db: SQLiteDatabase): Promise<Favorite[]> {
  const rows = await db.getAllAsync<Omit<Favorite, 'items'> & { items: string }>(
    'SELECT id, name, kcal, protein, carbs, fat, items, thumb FROM favorites ORDER BY created_at DESC',
  );
  return rows.map((r) => ({ ...r, items: safeParse<FoodItem[]>(r.items, []) }));
}

export async function isFavorite(db: SQLiteDatabase, name: string): Promise<number | null> {
  const r = await db.getFirstAsync<{ id: number }>('SELECT id FROM favorites WHERE lower(name) = lower(?)', name);
  return r?.id ?? null;
}

export async function addFavorite(db: SQLiteDatabase, e: Omit<Favorite, 'id'>): Promise<void> {
  await db.runAsync(
    'INSERT INTO favorites (name, kcal, protein, carbs, fat, items, thumb, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    e.name,
    e.kcal,
    e.protein,
    e.carbs,
    e.fat,
    JSON.stringify(e.items),
    e.thumb,
    Date.now(),
  );
}

export async function deleteFavorite(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM favorites WHERE id = ?', id);
}

/** Copy all entries of one meal from a date to another date. Returns how many were copied. */
export async function copyMeal(db: SQLiteDatabase, from: string, to: string, meal: MealType): Promise<number> {
  const src = (await entriesForDate(db, from)).filter((e) => e.meal === meal);
  for (const e of src) {
    await addEntry(db, { date: to, meal, name: e.name, kcal: e.kcal, protein: e.protein, carbs: e.carbs, fat: e.fat, items: e.items, thumb: e.thumb });
  }
  return src.length;
}

// ---------- backup ----------
const BACKUP_TABLES = ['kv', 'entries', 'weights', 'my_foods', 'workouts', 'workout_sets', 'water', 'cardio', 'favorites'] as const;

export async function exportAll(db: SQLiteDatabase): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = { app: 'TrackYSF', schema: SCHEMA_VERSION, exportedAt: new Date().toISOString() };
  for (const t of BACKUP_TABLES) out[t] = await db.getAllAsync(`SELECT * FROM ${t}`);
  return out;
}

/** Replaces all data with a backup produced by exportAll. Column names are validated against the live schema. */
export async function importAll(db: SQLiteDatabase, data: Record<string, unknown>): Promise<void> {
  if (data.app !== 'TrackYSF') throw new Error('not a TrackYSF backup');
  await db.withTransactionAsync(async () => {
    for (const t of BACKUP_TABLES) {
      const rows = data[t];
      if (!Array.isArray(rows)) continue;
      const cols = (await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${t})`)).map((c) => c.name);
      await db.runAsync(`DELETE FROM ${t}`);
      for (const row of rows as Record<string, unknown>[]) {
        const keys = Object.keys(row).filter((k) => cols.includes(k));
        if (keys.length === 0) continue;
        const values = keys.map((k) => row[k] as string | number | null);
        await db.runAsync(`INSERT INTO ${t} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, values);
      }
    }
  });
}

// ---------- workouts ----------
export interface LoggedSet {
  exId: string;
  setIdx: number;
  weight: number;
  reps: number;
}

export interface WorkoutSummary {
  id: number;
  date: string;
  kind: string;
  started_at: number;
  finished_at: number;
  sets: number;
  volume: number;
}

export async function saveWorkout(
  db: SQLiteDatabase,
  w: { date: string; dayKey: string; kind: string; startedAt: number; sets: LoggedSet[] },
): Promise<number> {
  let id = 0;
  await db.withTransactionAsync(async () => {
    const r = await db.runAsync(
      'INSERT INTO workouts (date, day_key, kind, started_at, finished_at) VALUES (?, ?, ?, ?, ?)',
      w.date,
      w.dayKey,
      w.kind,
      w.startedAt,
      Date.now(),
    );
    id = r.lastInsertRowId;
    for (const s of w.sets) {
      await db.runAsync(
        'INSERT INTO workout_sets (workout_id, ex_id, set_idx, weight, reps) VALUES (?, ?, ?, ?, ?)',
        id,
        s.exId,
        s.setIdx,
        s.weight,
        s.reps,
      );
    }
  });
  return id;
}

/** Sets from the most recent workout that contained this exercise. */
export async function lastSetsFor(db: SQLiteDatabase, exId: string): Promise<{ weight: number; reps: number }[]> {
  return db.getAllAsync<{ weight: number; reps: number }>(
    `SELECT weight, reps FROM workout_sets
     WHERE ex_id = ? AND workout_id = (SELECT MAX(workout_id) FROM workout_sets WHERE ex_id = ?)
     ORDER BY set_idx`,
    exId,
    exId,
  );
}

export async function recentWorkouts(db: SQLiteDatabase, limit = 20): Promise<WorkoutSummary[]> {
  return db.getAllAsync<WorkoutSummary>(
    `SELECT w.id, w.date, w.kind, w.started_at, w.finished_at,
            COUNT(s.id) AS sets, COALESCE(SUM(s.weight * s.reps), 0) AS volume
     FROM workouts w LEFT JOIN workout_sets s ON s.workout_id = w.id
     GROUP BY w.id ORDER BY w.started_at DESC LIMIT ?`,
    limit,
  );
}

export async function workoutDates(db: SQLiteDatabase, from: string, to: string): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ date: string }>('SELECT DISTINCT date FROM workouts WHERE date BETWEEN ? AND ?', from, to);
  return new Set(rows.map((r) => r.date));
}

async function migrateV1(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      meal TEXT NOT NULL,
      name TEXT NOT NULL,
      kcal REAL NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fat REAL NOT NULL,
      items TEXT NOT NULL DEFAULT '[]',
      thumb TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
    CREATE TABLE IF NOT EXISTS weights (date TEXT PRIMARY KEY NOT NULL, kg REAL NOT NULL);
  `);
}

// ---------- my foods (user-created, values per 100 g / ml) ----------
export interface MyFoodRow {
  id: number;
  name: string;
  brand: string | null;
  unit: 'g' | 'ml';
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_label: string | null;
  serving_g: number | null;
}

export async function allMyFoods(db: SQLiteDatabase): Promise<MyFoodRow[]> {
  return db.getAllAsync<MyFoodRow>('SELECT * FROM my_foods ORDER BY created_at DESC');
}

export async function addMyFood(db: SQLiteDatabase, f: Omit<MyFoodRow, 'id'>): Promise<number> {
  const r = await db.runAsync(
    `INSERT INTO my_foods (name, brand, unit, kcal, protein, carbs, fat, serving_label, serving_g, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    f.name,
    f.brand,
    f.unit,
    f.kcal,
    f.protein,
    f.carbs,
    f.fat,
    f.serving_label,
    f.serving_g,
    Date.now(),
  );
  return r.lastInsertRowId;
}

export async function deleteMyFood(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM my_foods WHERE id = ?', id);
}

// ---------- kv ----------
export async function kvGet<T>(db: SQLiteDatabase, key: string): Promise<T | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key);
  return row ? (JSON.parse(row.value) as T) : null;
}

export async function kvSet(db: SQLiteDatabase, key: string, value: unknown): Promise<void> {
  await db.runAsync(
    'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    JSON.stringify(value),
  );
}

// ---------- entries ----------
interface EntryRow {
  id: number;
  date: string;
  meal: MealType;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  items: string;
  thumb: string | null;
  created_at: number;
}

function toEntry(r: EntryRow): Entry {
  return {
    id: r.id,
    date: r.date,
    meal: r.meal,
    name: r.name,
    kcal: r.kcal,
    protein: r.protein,
    carbs: r.carbs,
    fat: r.fat,
    items: safeParse<FoodItem[]>(r.items, []),
    thumb: r.thumb,
    createdAt: r.created_at,
  };
}

function safeParse<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export async function entriesForDate(db: SQLiteDatabase, date: string): Promise<Entry[]> {
  const rows = await db.getAllAsync<EntryRow>(
    'SELECT * FROM entries WHERE date = ? ORDER BY created_at ASC',
    date,
  );
  return rows.map(toEntry);
}

export async function getEntry(db: SQLiteDatabase, id: number): Promise<Entry | null> {
  const r = await db.getFirstAsync<EntryRow>('SELECT * FROM entries WHERE id = ?', id);
  return r ? toEntry(r) : null;
}

export type NewEntry = Omit<Entry, 'id' | 'createdAt'>;

export async function addEntry(db: SQLiteDatabase, e: NewEntry): Promise<number> {
  const res = await db.runAsync(
    `INSERT INTO entries (date, meal, name, kcal, protein, carbs, fat, items, thumb, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    e.date,
    e.meal,
    e.name,
    e.kcal,
    e.protein,
    e.carbs,
    e.fat,
    JSON.stringify(e.items),
    e.thumb,
    Date.now(),
  );
  return res.lastInsertRowId;
}

export async function deleteEntry(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM entries WHERE id = ?', id);
}

export async function moveEntry(db: SQLiteDatabase, id: number, meal: MealType): Promise<void> {
  await db.runAsync('UPDATE entries SET meal = ? WHERE id = ?', meal, id);
}

/** Distinct recent foods (latest version of each name). */
export async function recentFoods(db: SQLiteDatabase, limit = 12): Promise<Entry[]> {
  const rows = await db.getAllAsync<EntryRow>(
    `SELECT e.* FROM entries e
     JOIN (SELECT lower(name) AS n, MAX(created_at) AS mx FROM entries GROUP BY lower(name)) l
       ON lower(e.name) = l.n AND e.created_at = l.mx
     ORDER BY e.created_at DESC LIMIT ?`,
    limit,
  );
  return rows.map(toEntry);
}

/** Dates in [from, to] that have at least one entry. */
export async function datesWithEntries(db: SQLiteDatabase, from: string, to: string): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ date: string }>(
    'SELECT DISTINCT date FROM entries WHERE date BETWEEN ? AND ?',
    from,
    to,
  );
  return new Set(rows.map((r) => r.date));
}

export async function dailyTotals(
  db: SQLiteDatabase,
  from: string,
  to: string,
): Promise<(Macros & { date: string })[]> {
  return db.getAllAsync<Macros & { date: string }>(
    `SELECT date, SUM(kcal) AS kcal, SUM(protein) AS protein, SUM(carbs) AS carbs, SUM(fat) AS fat
     FROM entries WHERE date BETWEEN ? AND ? GROUP BY date ORDER BY date`,
    from,
    to,
  );
}

// ---------- weights ----------
export async function setWeight(db: SQLiteDatabase, date: string, kg: number): Promise<void> {
  await db.runAsync(
    'INSERT INTO weights (date, kg) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET kg = excluded.kg',
    date,
    kg,
  );
}

export async function allWeights(db: SQLiteDatabase): Promise<WeightPoint[]> {
  return db.getAllAsync<WeightPoint>('SELECT date, kg FROM weights ORDER BY date ASC');
}

export async function deleteWeight(db: SQLiteDatabase, date: string): Promise<void> {
  await db.runAsync('DELETE FROM weights WHERE date = ?', date);
}

export async function eraseAll(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(
    'DELETE FROM entries; DELETE FROM weights; DELETE FROM kv; DELETE FROM my_foods; DELETE FROM workout_sets; DELETE FROM workouts; DELETE FROM water; DELETE FROM cardio; DELETE FROM favorites;',
  );
}
