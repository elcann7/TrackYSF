import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeOutDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExerciseAnim } from '@/components/ExerciseAnim';
import { Button, Card, Icon, PressableScale, haptic } from '@/components/ui';
import { kvGet, lastSetsFor, saveWorkout, type LoggedSet } from '@/lib/db';
import { todayKey } from '@/lib/dates';
import { useApp } from '@/lib/store';
import { DAY_TITLES, EXERCISES, exerciseName, suggestNext, type PlannedExercise, type Program, type ProgramDay } from '@/lib/training';
import { colors, radius, space, type } from '@/theme';

interface SetState {
  weight: string;
  reps: string;
  done: boolean;
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function Workout() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { t, lang, bump } = useApp();
  const [day, setDay] = useState<ProgramDay | null>(null);
  const [last, setLast] = useState<Record<string, { weight: number; reps: number }[]>>({});
  const [sets, setSets] = useState<Record<string, SetState[]>>({});
  const [startedAt] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const savedRef = useRef(false);

  // load program day + last performance, prefill with progression suggestion
  useEffect(() => {
    (async () => {
      const program = await kvGet<Program>(db, 'program');
      const d = program?.days.find((x) => x.key === key) ?? null;
      setDay(d);
      if (!d) return;
      const lastMap: Record<string, { weight: number; reps: number }[]> = {};
      const init: Record<string, SetState[]> = {};
      for (const e of d.exercises) {
        const l = await lastSetsFor(db, e.id);
        lastMap[e.id] = l;
        const sug = suggestNext(e, l);
        init[e.id] = Array.from({ length: e.sets }, () => ({
          weight: sug ? String(sug.weight) : '',
          reps: sug ? String(sug.reps) : '',
          done: false,
        }));
      }
      setLast(lastMap);
      setSets(init);
    })();
  }, [db, key]);

  // 1 s clock for elapsed time and rest timer
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const restLeft = restEnd ? Math.max(0, Math.ceil((restEnd - now) / 1000)) : 0;
  useEffect(() => {
    if (restEnd && restLeft === 0) {
      haptic.success();
      setRestEnd(null);
    }
  }, [restEnd, restLeft]);

  const doneCount = useMemo(() => Object.values(sets).flat().filter((s) => s.done).length, [sets]);

  // swipe-to-dismiss is disabled for this screen; closing asks first when sets were logged
  const close = () => {
    if (savedRef.current || doneCount === 0) {
      router.back();
      return;
    }
    Alert.alert(t('discardQ'), '', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('leave'), style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const update = (exId: string, idx: number, patch: Partial<SetState>) =>
    setSets((prev) => ({ ...prev, [exId]: prev[exId].map((s, i) => (i === idx ? { ...s, ...patch } : s)) }));

  const toggle = (e: PlannedExercise, idx: number) => {
    const s = sets[e.id][idx];
    const done = !s.done;
    update(e.id, idx, { done });
    if (done) {
      haptic.tap();
      setRestEnd(Date.now() + e.restSec * 1000);
    }
  };

  const addSet = (exId: string) => {
    haptic.tap();
    setSets((prev) => {
      const list = prev[exId];
      const lastS = list[list.length - 1];
      return { ...prev, [exId]: [...list, { weight: lastS?.weight ?? '', reps: lastS?.reps ?? '', done: false }] };
    });
  };

  const finish = async () => {
    if (!day) return;
    const logged: LoggedSet[] = [];
    for (const e of day.exercises) {
      (sets[e.id] ?? []).forEach((s, i) => {
        const reps = parseInt(s.reps, 10);
        if (s.done && reps > 0) logged.push({ exId: e.id, setIdx: i, weight: parseFloat(s.weight.replace(',', '.')) || 0, reps });
      });
    }
    if (logged.length > 0) {
      await saveWorkout(db, { date: todayKey(), dayKey: day.key, kind: day.kind, startedAt, sets: logged });
      haptic.success();
      bump();
    }
    savedRef.current = true;
    router.back();
  };

  if (!day) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <PressableScale onPress={close} style={styles.iconBtn}>
          <Icon name="chevron.down" size={16} color={colors.text} weight="semibold" />
        </PressableScale>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>{DAY_TITLES[lang][day.kind]}</Text>
          <Text style={styles.elapsed}>{fmtTime(Math.floor((now - startedAt) / 1000))}</Text>
        </View>
        <PressableScale onPress={finish} style={styles.finishBtn}>
          <Text style={styles.finishText}>{t('finishWorkout')}</Text>
        </PressableScale>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: insets.bottom + 140 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {day.exercises.map((e, ei) => {
          const info = EXERCISES[e.id];
          const l = last[e.id];
          const sug = suggestNext(e, l);
          const unit = info?.timed ? (lang === 'az' ? 'san' : 's') : t('reps');
          return (
            <Animated.View key={e.id} entering={FadeInDown.delay(ei * 50).duration(350)}>
              <Card style={{ padding: 0 }}>
                <PressableScale
                  onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: e.id } })}
                  scaleTo={0.98}
                  style={styles.exHead}
                >
                  <ExerciseAnim id={e.id} style={styles.thumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exName}>{exerciseName(e.id, lang)}</Text>
                    <Text style={styles.meta}>
                      {e.sets} × {e.repMin}–{e.repMax} {unit} · {t('rest')} {fmtTime(e.restSec)}
                    </Text>
                    {l && l.length > 0 && (
                      <Text style={styles.meta} numberOfLines={1}>
                        {t('lastTime')}: {l.map((s) => `${s.weight}×${s.reps}`).join(', ')}
                      </Text>
                    )}
                    {sug && (
                      <Text style={styles.suggest}>
                        {t('tryNext')}: {sug.weight} kg × {sug.reps}
                      </Text>
                    )}
                  </View>
                  <Icon name="info.circle" size={18} color={colors.textFaint} />
                </PressableScale>

                <View style={styles.setHeadRow}>
                  <Text style={[styles.colLabel, { width: 28 }]}>#</Text>
                  <Text style={[styles.colLabel, { flex: 1 }]}>kg</Text>
                  <Text style={[styles.colLabel, { flex: 1 }]}>{unit}</Text>
                  <View style={{ width: 44 }} />
                </View>
                {(sets[e.id] ?? []).map((s, i) => (
                  <Animated.View key={i} layout={LinearTransition} style={[styles.setRow, s.done && styles.setRowDone]}>
                    <Text style={[styles.setIdx, { width: 28 }]}>{i + 1}</Text>
                    <TextInput
                      value={s.weight}
                      onChangeText={(v) => update(e.id, i, { weight: v })}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={colors.textFaint}
                      selectTextOnFocus
                      style={styles.input}
                    />
                    <TextInput
                      value={s.reps}
                      onChangeText={(v) => update(e.id, i, { reps: v })}
                      keyboardType="number-pad"
                      placeholder={String(e.repMin)}
                      placeholderTextColor={colors.textFaint}
                      selectTextOnFocus
                      style={styles.input}
                    />
                    <PressableScale onPress={() => toggle(e, i)} hapticOnPress={false} style={[styles.check, s.done && styles.checkDone]}>
                      <Icon name="checkmark" size={16} color={s.done ? colors.onAccent : colors.textFaint} weight="bold" />
                    </PressableScale>
                  </Animated.View>
                ))}
                <PressableScale onPress={() => addSet(e.id)} hapticOnPress={false} style={styles.addSet}>
                  <Icon name="plus" size={14} color={colors.textDim} weight="semibold" />
                  <Text style={styles.addSetText}>Set</Text>
                </PressableScale>
              </Card>
            </Animated.View>
          );
        })}
        <Text style={styles.meta}>{t('rirNote')}</Text>
        <Button title={t('finishWorkout')} icon="checkmark" onPress={finish} />
      </ScrollView>

      {restEnd && (
        <Animated.View entering={FadeInUp.duration(250)} exiting={FadeOutDown.duration(200)} style={[styles.restBar, { bottom: insets.bottom + space.md }]}>
          <Icon name="timer" size={18} color={colors.onAccent} />
          <Text style={styles.restText}>
            {t('rest')} {fmtTime(restLeft)}
          </Text>
          <PressableScale onPress={() => setRestEnd((r) => (r ? r + 30000 : r))} style={styles.restBtn}>
            <Text style={styles.restBtnText}>+30s</Text>
          </PressableScale>
          <PressableScale onPress={() => setRestEnd(null)} style={styles.restBtn}>
            <Icon name="forward.fill" size={14} color={colors.onAccent} />
          </PressableScale>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingBottom: space.sm, gap: space.md },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  elapsed: { color: colors.textDim, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  finishBtn: { paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  finishText: { color: colors.onAccent, fontSize: 14, fontWeight: '700' },
  exHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  thumb: { width: 64, height: 64, borderRadius: 14 },
  exName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  meta: { color: colors.textDim, fontSize: 12, marginTop: 2, lineHeight: 17 },
  suggest: { color: colors.accent, fontSize: 12, fontWeight: '700', marginTop: 3 },
  setHeadRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingBottom: 4 },
  colLabel: { color: colors.textFaint, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: 6 },
  setRowDone: { backgroundColor: 'rgba(127,181,154,0.08)' },
  setIdx: { color: colors.textDim, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  input: {
    flex: 1,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHigh,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  check: { width: 44, height: 40, borderRadius: radius.sm, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.success },
  addSet: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: space.md },
  addSetText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  restBar: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    gap: space.md,
  },
  restText: { flex: 1, color: colors.onAccent, fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  restBtn: { height: 36, minWidth: 44, paddingHorizontal: 10, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center' },
  restBtnText: { color: colors.onAccent, fontSize: 13, fontWeight: '800' },
});
