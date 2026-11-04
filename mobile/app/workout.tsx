import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../src/lib/auth";
import { useAsync } from "../src/lib/useAsync";
import {
  finishSession,
  getActiveWorkoutPlan,
  getSets,
  startSession,
  logSet,
  type Exercise,
} from "../src/lib/data";
import { Button, Card, Chip, EmptyState, Row, Skeleton, T } from "../src/components/ui";
import { color, radius, space, type } from "../src/lib/theme";
import { ui } from "../src/components/ui";

/**
 * The live workout.
 *
 * State lives here for the length of one session: the row is created on open
 * (idempotent for the day), every set is written as it is logged so a phone
 * dying mid-session loses at most the set in progress, and finishing stamps the
 * duration.
 */
export default function WorkoutScreen() {
  const { member } = useAuth();
  const router = useRouter();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [openExercise, setOpenExercise] = useState<string | null>(null);
  const [reps, setReps] = useState("10");
  const [weight, setWeight] = useState("20");
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [logged, setLogged] = useState<{ exercise_name: string; set_number: number; reps: number | null; weight_kg: number | null }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const bootstrapped = useRef(false);

  const plan = useAsync(
    async () => {
      if (!member) return null;
      return getActiveWorkoutPlan(member.id);
    },
    [member?.id],
  );

  // Create or resume today's session once the plan is known.
  useEffect(() => {
    if (bootstrapped.current || !member || plan.loading) return;
    bootstrapped.current = true;
    void (async () => {
      try {
        const row = await startSession({
          memberId: member.id,
          organizationId: member.organization_id,
          planId: plan.data?.plan.id ?? null,
        });
        setSessionId(row.id);
        setStartedAt(row.completed_at ? Date.now() : Date.now());
        const sets = await getSets(row.id);
        setLogged(
          sets.map((s) => ({
            exercise_name: s.exercise_name,
            set_number: s.set_number,
            reps: s.reps,
            weight_kg: s.weight_kg,
          })),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start the session.");
      }
    })();
  }, [member, plan.loading, plan.data]);

  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  const exercises: Exercise[] = plan.data?.exercises ?? [];

  /** Sets already logged for the open exercise, so the next number is obvious. */
  const setsFor = useMemo(
    () => (name: string) => logged.filter((s) => s.exercise_name === name).length,
    [logged],
  );

  async function log(ex: Exercise) {
    if (!sessionId) return;
    const r = Number(reps);
    const w = Number(weight);
    if (!Number.isFinite(r) || r <= 0) {
      setError("Enter how many reps you did.");
      return;
    }
    if (!Number.isFinite(w) || w < 0) {
      setError("Enter the weight you used, or 0 for bodyweight.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const setNumber = setsFor(ex.exercise_name) + 1;
      await logSet({
        sessionId,
        exerciseId: ex.id,
        exerciseName: ex.exercise_name,
        setNumber,
        reps: Math.round(r),
        weightKg: w,
      });
      setLogged((prev) => [
        ...prev,
        { exercise_name: ex.exercise_name, set_number: setNumber, reps: Math.round(r), weight_kg: w },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that set.");
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    if (!sessionId) return;
    setFinishing(true);
    try {
      await finishSession(sessionId, Math.max(1, Math.round(elapsed / 60)));
      router.back();
    } catch (e) {
      Alert.alert("Could not finish", e instanceof Error ? e.message : "Try again in a moment.");
    } finally {
      setFinishing(false);
    }
  }

  function confirmClose() {
    if (logged.length === 0) {
      router.back();
      return;
    }
    Alert.alert("Leave the workout?", "Your logged sets are saved. You can finish the session later today.", [
      { text: "Stay", style: "cancel" },
      { text: "Leave", style: "destructive", onPress: () => router.back() },
    ]);
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }} edges={["top", "bottom"]}>
      <View style={{ padding: space.xl, gap: space.lg, flex: 1 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <Pressable onPress={confirmClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close workout">
            <Ionicons name="close" size={24} color={color.textMuted} />
          </Pressable>
          <View style={{ alignItems: "center" }}>
            <T variant="caption" tone="faint">
              ELAPSED
            </T>
            <T variant="h2" style={{ fontVariant: ["tabular-nums"] }}>
              {mm}:{ss}
            </T>
          </View>
          <View style={{ width: 24 }} />
        </Row>

        <View style={{ flex: 1, gap: space.md }}>
          <View>
            <T variant="h1" numberOfLines={1}>
              {plan.data?.plan.name ?? "Workout"}
            </T>
            <T variant="small" tone="muted" style={{ marginTop: 2 }}>
              {logged.length} {logged.length === 1 ? "set" : "sets"} logged
            </T>
          </View>

          {plan.loading ? (
            <Skeleton height={200} />
          ) : exercises.length === 0 ? (
            <EmptyState
              icon="barbell-outline"
              title="Nothing to log"
              body="Your coach has not assigned a plan yet, so there are no exercises to work through."
            />
          ) : (
            <View style={{ gap: space.sm }}>
              {exercises.map((ex) => {
                const open = openExercise === ex.id;
                const done = setsFor(ex.exercise_name);
                return (
                  <Card key={ex.id}>
                    <Pressable
                      onPress={() => setOpenExercise(open ? null : ex.id)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: open }}
                    >
                      <Row style={{ justifyContent: "space-between" }}>
                        <View style={{ flex: 1, paddingRight: space.sm }}>
                          <T variant="bodyStrong" numberOfLines={1}>
                            {ex.exercise_name}
                          </T>
                          <T variant="caption" tone="faint" style={{ marginTop: 2 }}>
                            {[ex.sets ? `${ex.sets} sets` : null, ex.reps ? `${ex.reps} reps` : null]
                              .filter(Boolean)
                              .join(" · ") || "No target set"}
                          </T>
                        </View>
                        {done > 0 ? <Chip label={`${done} done`} tone="success" /> : null}
                        <Ionicons
                          name={open ? "chevron-up" : "chevron-down"}
                          size={17}
                          color={color.textFaint}
                          style={{ marginLeft: space.sm }}
                        />
                      </Row>
                    </Pressable>

                    {open ? (
                      <View style={{ marginTop: space.md, gap: space.md }}>
                        {ex.instructions ? (
                          <T variant="small" tone="muted">
                            {ex.instructions}
                          </T>
                        ) : null}
                        <Row gap={space.sm}>
                          <View style={{ flex: 1, gap: 4 }}>
                            <T variant="caption" tone="faint">
                              REPS
                            </T>
                            <TextInput
                              value={reps}
                              onChangeText={setReps}
                              keyboardType="number-pad"
                              selectTextOnFocus
                              style={s.num}
                              accessibilityLabel="Repetitions"
                            />
                          </View>
                          <View style={{ flex: 1, gap: 4 }}>
                            <T variant="caption" tone="faint">
                              WEIGHT (KG)
                            </T>
                            <TextInput
                              value={weight}
                              onChangeText={setWeight}
                              keyboardType="decimal-pad"
                              selectTextOnFocus
                              style={s.num}
                              accessibilityLabel="Weight in kilograms"
                            />
                          </View>
                        </Row>
                        <Button
                          label={`Log set ${setsFor(ex.exercise_name) + 1}`}
                          icon="add"
                          compact
                          loading={saving}
                          onPress={() => void log(ex)}
                        />
                      </View>
                    ) : null}
                  </Card>
                );
              })}
            </View>
          )}
        </View>

        {error ? (
          <T variant="small" tone="danger" numberOfLines={2}>
            {error}
          </T>
        ) : null}

        <Button
          label="Finish workout"
          icon="checkmark"
          loading={finishing}
          disabled={!sessionId}
          onPress={() => void finish()}
        />
      </View>
    </SafeAreaView>
  );
}

const s = {
  num: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
    paddingHorizontal: space.md,
    color: color.text,
    ...type.bodyStrong,
    fontFamily: ui.family.semi,
  },
} as const;
