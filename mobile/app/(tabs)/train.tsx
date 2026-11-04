import React, { useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/lib/auth";
import { useAsync } from "../../src/lib/useAsync";
import {
  bookClass,
  cancelBooking,
  getActiveDietPlan,
  getActiveWorkoutPlan,
  getClassSeats,
  getMyBookings,
  getRecentSessions,
  getUpcomingClasses,
} from "../../src/lib/data";
import { clockTime, humanise, shortDate } from "../../src/lib/format";
import {
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  Row,
  Screen,
  SectionHeader,
  Skeleton,
  T,
} from "../../src/components/ui";
import { color, radius, space } from "../../src/lib/theme";
import { tabBarSpace } from "./_layout";

type Pane = "plan" | "history" | "classes" | "diet";

const PANES: { key: Pane; label: string }[] = [
  { key: "plan", label: "Plan" },
  { key: "history", label: "History" },
  { key: "classes", label: "Classes" },
  { key: "diet", label: "Diet" },
];

/**
 * Train holds everything the coach has assigned plus the member's own record.
 * Four panes rather than four tabs: they are all "training", and a segmented
 * control keeps the bottom bar at five destinations.
 */
export default function TrainScreen() {
  const { member } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pane, setPane] = useState<Pane>("plan");
  const [busyClass, setBusyClass] = useState<string | null>(null);

  const state = useAsync(
    async () => {
      if (!member) return null;
      const [plan, diet, sessions, classes, bookings, seats] = await Promise.all([
        getActiveWorkoutPlan(member.id),
        getActiveDietPlan(member.id),
        getRecentSessions(member.id, 40),
        getUpcomingClasses(member.organization_id),
        getMyBookings(member.id),
        getClassSeats(),
      ]);
      return { plan, diet, sessions, classes, bookings, seats };
    },
    [member?.id, member?.organization_id],
  );

  const bookedIds = useMemo(
    () => new Set((state.data?.bookings ?? []).filter((b) => b.status === "booked").map((b) => b.class_id)),
    [state.data],
  );

  /** Days in the plan, in the order the coach wrote them. */
  const days = useMemo(() => {
    const list = state.data?.plan?.exercises ?? [];
    const map = new Map<string, typeof list>();
    for (const ex of list) {
      const key = ex.day_label ?? "Every day";
      const bucket = map.get(key);
      if (bucket) bucket.push(ex);
      else map.set(key, [ex]);
    }
    return [...map.entries()];
  }, [state.data]);

  async function toggleClass(classId: string) {
    const booked = bookedIds.has(classId);
    setBusyClass(classId);
    try {
      if (booked) await cancelBooking(classId);
      else await bookClass(classId);
      await state.refresh();
    } catch (e) {
      Alert.alert(
        booked ? "Could not cancel" : "Could not book",
        e instanceof Error ? e.message : "Try again in a moment.",
      );
    } finally {
      setBusyClass(null);
    }
  }

  return (
    <Screen
      refreshing={state.refreshing}
      onRefresh={() => {
        void state.refresh();
      }}
      contentStyle={{ paddingBottom: tabBarSpace(insets.bottom) }}
    >
      <View style={{ paddingTop: space.md }}>
        <T variant="h1">Train</T>
        <T variant="small" tone="muted" style={{ marginTop: 2 }}>
          Everything your coach has set, and everything you have done.
        </T>
      </View>

      <Row gap={space.xs} style={{ flexWrap: "wrap" }}>
        {PANES.map((p) => {
          const on = pane === p.key;
          return (
            <Pressable
              key={p.key}
              onPress={() => setPane(p.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={{
                paddingHorizontal: space.lg,
                minHeight: 38,
                justifyContent: "center",
                borderRadius: radius.pill,
                backgroundColor: on ? color.accentSoft : color.surfaceRaised,
                borderWidth: 1,
                borderColor: on ? "rgba(196,72,95,0.4)" : "transparent",
              }}
            >
              <T variant="smallStrong" tone={on ? "accent" : "muted"}>
                {p.label}
              </T>
            </Pressable>
          );
        })}
      </Row>

      {state.loading ? (
        <Skeleton height={180} />
      ) : pane === "plan" ? (
        state.data?.plan ? (
          <>
            <Card>
              <T variant="h2">{state.data.plan.plan.name}</T>
              {state.data.plan.plan.goal ? (
                <Chip label={humanise(state.data.plan.plan.goal)} tone="accent" />
              ) : null}
              {state.data.plan.plan.description ? (
                <T variant="small" tone="muted" style={{ marginTop: space.sm }}>
                  {state.data.plan.plan.description}
                </T>
              ) : null}
              <Button
                label="Start workout"
                icon="play"
                onPress={() => router.push("/workout")}
                style={{ marginTop: space.lg }}
              />
            </Card>

            {days.map(([day, exercises]) => (
              <View key={day} style={{ gap: space.sm }}>
                <SectionHeader title={day} />
                {exercises.map((ex) => (
                  <Card key={ex.id}>
                    <Row style={{ justifyContent: "space-between" }}>
                      <T variant="bodyStrong" style={{ flex: 1, paddingRight: space.sm }}>
                        {ex.exercise_name}
                      </T>
                      <T variant="small" tone="muted">
                        {[ex.sets ? `${ex.sets} sets` : null, ex.reps ? `${ex.reps} reps` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </T>
                    </Row>
                    {ex.rest_seconds ? (
                      <T variant="caption" tone="faint" style={{ marginTop: 4 }}>
                        Rest {ex.rest_seconds}s
                      </T>
                    ) : null}
                    {ex.instructions ? (
                      <T variant="small" tone="muted" style={{ marginTop: space.sm }}>
                        {ex.instructions}
                      </T>
                    ) : null}
                  </Card>
                ))}
              </View>
            ))}
          </>
        ) : (
          <EmptyState
            icon="barbell-outline"
            title="No plan yet"
            body="Your coach has not assigned a workout plan. Pull down to check again."
          />
        )
      ) : pane === "history" ? (
        state.data?.sessions.length ? (
          state.data.sessions.map((s) => (
            <Card key={s.id}>
              <Row style={{ justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <T variant="bodyStrong">{shortDate(s.performed_on)}</T>
                  <T variant="small" tone="muted" style={{ marginTop: 2 }}>
                    {[
                      s.duration_minutes ? `${s.duration_minutes} min` : null,
                      s.completed_at ? "completed" : "in progress",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </T>
                </View>
                {s.completed_at ? (
                  <Chip label="Done" tone="success" icon="checkmark" />
                ) : (
                  <Chip label="Open" tone="warning" />
                )}
              </Row>
              {s.note ? (
                <T variant="small" tone="muted" style={{ marginTop: space.sm }}>
                  {s.note}
                </T>
              ) : null}
            </Card>
          ))
        ) : (
          <EmptyState
            icon="time-outline"
            title="No sessions yet"
            body="Your first logged workout will show up here with its duration and notes."
          />
        )
      ) : pane === "classes" ? (
        state.data?.classes.length ? (
          state.data.classes.map((c) => {
            const booked = bookedIds.has(c.id);
            const taken = state.data?.seats.get(c.id) ?? 0;
            const full = c.capacity != null && taken >= c.capacity && !booked;
            return (
              <Card key={c.id}>
                <Row style={{ justifyContent: "space-between" }}>
                  <View style={{ flex: 1, paddingRight: space.sm }}>
                    <T variant="bodyStrong">{c.name}</T>
                    <T variant="small" tone="muted" style={{ marginTop: 2 }}>
                      {shortDate(c.starts_at)} · {clockTime(c.starts_at)}
                      {c.duration_minutes ? ` · ${c.duration_minutes} min` : ""}
                    </T>
                    {c.capacity != null ? (
                      <T variant="caption" tone="faint" style={{ marginTop: 4 }}>
                        {taken} of {c.capacity} booked
                      </T>
                    ) : null}
                  </View>
                  {booked ? <Chip label="Booked" tone="success" /> : null}
                </Row>
                <Button
                  label={booked ? "Cancel booking" : full ? "Class full" : "Book a spot"}
                  variant={booked ? "secondary" : "primary"}
                  compact
                  disabled={full}
                  loading={busyClass === c.id}
                  onPress={() => toggleClass(c.id)}
                  style={{ marginTop: space.md }}
                />
              </Card>
            );
          })
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="No upcoming classes"
            body="When your gym schedules a class it will appear here, and you can book it in one tap."
          />
        )
      ) : state.data?.diet ? (
        <>
          <Card>
            <Row style={{ justifyContent: "space-between" }}>
              <T variant="h2" style={{ flex: 1 }}>
                {state.data.diet.plan.name}
              </T>
              <Ionicons name="nutrition-outline" size={20} color={color.accentText} />
            </Row>
            {state.data.diet.plan.description ? (
              <T variant="small" tone="muted" style={{ marginTop: space.sm }}>
                {state.data.diet.plan.description}
              </T>
            ) : null}
            {state.data.diet.plan.target_calories ? (
              <Row gap={space.lg} style={{ marginTop: space.lg }}>
                {[
                  { label: "KCAL", v: state.data.diet.plan.target_calories },
                  { label: "PROTEIN", v: state.data.diet.plan.target_protein_g },
                  { label: "CARBS", v: state.data.diet.plan.target_carbs_g },
                  { label: "FAT", v: state.data.diet.plan.target_fat_g },
                ]
                  .filter((x) => x.v)
                  .map((x) => (
                    <View key={x.label} style={{ flex: 1 }}>
                      <T variant="caption" tone="faint">
                        {x.label}
                      </T>
                      <T variant="bodyStrong">{x.v}g</T>
                    </View>
                  ))}
              </Row>
            ) : null}
          </Card>

          {state.data.diet.meals.map((meal) => (
            <Card key={meal.id}>
              <Row style={{ justifyContent: "space-between" }}>
                <T variant="bodyStrong">{meal.name}</T>
                {meal.timing ? <Chip label={humanise(meal.timing)} tone="surface" /> : null}
              </Row>
              <View style={{ marginTop: space.md, gap: space.sm }}>
                {meal.diet_meal_items.map((item, i) => (
                  <View key={item.id}>
                    {i > 0 ? <Divider /> : null}
                    <Row style={{ justifyContent: "space-between", paddingTop: i > 0 ? space.sm : 0 }}>
                      <T variant="small" style={{ flex: 1, paddingRight: space.sm }}>
                        {item.food_item}
                      </T>
                      {item.portion ? (
                        <T variant="small" tone="muted">
                          {item.portion}
                        </T>
                      ) : null}
                    </Row>
                  </View>
                ))}
              </View>
              {meal.coach_notes ? (
                <T variant="caption" tone="faint" style={{ marginTop: space.md }}>
                  {meal.coach_notes}
                </T>
              ) : null}
            </Card>
          ))}
        </>
      ) : (
        <EmptyState
          icon="nutrition-outline"
          title="No diet plan yet"
          body="A nutrition plan from your coach will show up here with goals and meals."
        />
      )}

      {state.error ? (
        <Card>
          <T variant="small" tone="warning">
            {state.error}
          </T>
          <Button label="Try again" variant="secondary" compact onPress={state.reload} style={{ marginTop: space.md }} />
        </Card>
      ) : null}
    </Screen>
  );
}
