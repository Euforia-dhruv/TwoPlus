import React, { useMemo } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/lib/auth";
import { useAsync } from "../../src/lib/useAsync";
import {
  getActiveWorkoutPlan,
  getAttendance,
  getMeasurements,
  getMemberships,
  getMyBookings,
  getOrg,
  getUpcomingClasses,
  bmiOf,
  formatMoney,
} from "../../src/lib/data";
import { clockTime, daysLeft, greeting, shortDate, streakFrom } from "../../src/lib/format";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Row,
  Screen,
  SectionHeader,
  Skeleton,
  Stat,
  T,
} from "../../src/components/ui";
import { color, radius, space } from "../../src/lib/theme";
import { tabBarSpace } from "./_layout";

/**
 * Home answers three questions before the member taps anything: is my
 * membership live, am I on a streak, and what am I training today.
 */
export default function HomeScreen() {
  const { member, unclaimed } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const state = useAsync(
    async () => {
      if (!member) return null;
      const [org, memberships, attendance, plan, classes, bookings, measurements] = await Promise.all([
        getOrg(member.organization_id),
        getMemberships(member.id),
        getAttendance(member.id, 90),
        getActiveWorkoutPlan(member.id),
        getUpcomingClasses(member.organization_id),
        getMyBookings(member.id),
        getMeasurements(member.id),
      ]);
      return { org, memberships, attendance, plan, classes, bookings, measurements };
    },
    [member?.id, member?.organization_id],
  );

  const view = useMemo(() => {
    const d = state.data;
    if (!d) return null;

    const active = d.memberships.find((m) => m.status === "active") ?? d.memberships[0] ?? null;
    const left = active ? daysLeft(active.end_date) : null;

    const monthKey = new Date().toISOString().slice(0, 7);
    const visitsThisMonth = d.attendance.filter((a) => a.check_in.slice(0, 7) === monthKey).length;

    const latest = d.measurements[0] ?? null;
    const previous = d.measurements[1] ?? null;
    const weightDelta =
      latest?.weight_kg != null && previous?.weight_kg != null
        ? Number(latest.weight_kg) - Number(previous.weight_kg)
        : null;

    const bookedIds = new Set(d.bookings.filter((b) => b.status === "booked").map((b) => b.class_id));
    const nextClass = d.classes[0] ?? null;

    return {
      active,
      left,
      streak: streakFrom(d.attendance.map((a) => a.check_in)),
      visitsThisMonth,
      latest,
      bmi: bmiOf(latest?.weight_kg ?? null, latest?.height_cm ?? null),
      weightDelta,
      nextClass,
      isBooked: nextClass ? bookedIds.has(nextClass.id) : false,
      exerciseCount: d.plan?.exercises.length ?? 0,
    };
  }, [state.data]);

  if (unclaimed) {
    return (
      <Screen>
        <View style={{ paddingTop: space.xxl }}>
          <T variant="caption" tone="faint">
            {greeting().toUpperCase()}
          </T>
          <T variant="h1" style={{ marginTop: space.xs }}>
            Almost there
          </T>
        </View>
        <EmptyState
          icon="link-outline"
          title="Your gym has not linked this email yet"
          body="You are signed in, but no member record matches this address. Ask the front desk to add this exact email to your profile, then pull down to refresh."
          action="Sign out"
          onAction={() => router.replace("/login")}
        />
      </Screen>
    );
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
        <T variant="caption" tone="faint">
          {greeting().toUpperCase()}
        </T>
        <T variant="h1" style={{ marginTop: space.xs }}>
          {member ? `${member.first_name}` : "Welcome"}
        </T>
        {state.data?.org ? (
          <T variant="small" tone="muted" style={{ marginTop: 2 }}>
            {state.data.org.name}
            {member?.member_code ? ` · ${member.member_code}` : ""}
          </T>
        ) : null}
      </View>

      {state.loading ? (
        <>
          <Skeleton height={104} />
          <Skeleton height={72} />
        </>
      ) : (
        <>
          {/* Membership: the one fact that gates everything else. */}
          <Card>
            <Row style={{ justifyContent: "space-between" }}>
              <T variant="caption" tone="faint">
                MEMBERSHIP
              </T>
              {view?.active ? (
                <Chip
                  label={view.active.status === "active" ? "Active" : view.active.status}
                  tone={view.active.status === "active" ? "success" : "warning"}
                />
              ) : (
                <Chip label="None" tone="danger" />
              )}
            </Row>

            {view?.active ? (
              <>
                <T variant="h2" style={{ marginTop: space.sm }}>
                  {view.active.plan_name ?? "Membership"}
                </T>
                <Row style={{ marginTop: space.md, justifyContent: "space-between" }}>
                  <View style={{ flex: 1 }}>
                    <T variant="caption" tone="faint">
                      RENEWS
                    </T>
                    <T variant="bodyStrong">{shortDate(view.active.end_date)}</T>
                  </View>
                  <View style={{ flex: 1 }}>
                    <T variant="caption" tone="faint">
                      PAID
                    </T>
                    <T variant="bodyStrong">
                      {view.active.price_minor != null
                        ? formatMoney(view.active.price_minor, state.data?.org?.currency ?? "INR")
                        : "—"}
                    </T>
                  </View>
                  <View style={{ flex: 1 }}>
                    <T variant="caption" tone="faint">
                      {view.left != null && view.left >= 0 ? "DAYS LEFT" : "EXPIRED"}
                    </T>
                    <T
                      variant="bodyStrong"
                      tone={view.left != null && view.left < 7 ? "warning" : "text"}
                    >
                      {view.left != null ? Math.max(0, view.left) : "—"}
                    </T>
                  </View>
                </Row>
              </>
            ) : (
              <T variant="small" tone="muted" style={{ marginTop: space.sm }}>
                No membership on file. See the front desk to start one.
              </T>
            )}
          </Card>

          <Card>
            <Row gap={space.lg}>
              <Stat label="Streak" value={String(view?.streak ?? 0)} unit="days" tone="accent" />
              <Stat label="This month" value={String(view?.visitsThisMonth ?? 0)} unit="visits" />
              <Stat
                label="Weight"
                value={view?.latest?.weight_kg != null ? String(Number(view.latest.weight_kg)) : "—"}
                unit={view?.latest?.weight_kg != null ? "kg" : undefined}
              />
            </Row>
            {view?.weightDelta != null && Math.abs(view.weightDelta) >= 0.1 ? (
              <Row gap={space.xs} style={{ marginTop: space.md }}>
                <Ionicons
                  name={view.weightDelta < 0 ? "trending-down" : "trending-up"}
                  size={14}
                  color={view.weightDelta < 0 ? color.success : color.warning}
                />
                <T variant="caption" tone={view.weightDelta < 0 ? "success" : "warning"}>
                  {Math.abs(view.weightDelta).toFixed(1)} kg since last check-in
                  {view.bmi ? ` · BMI ${view.bmi.toFixed(1)}` : ""}
                </T>
              </Row>
            ) : null}
          </Card>

          {/* Today's training. */}
          <SectionHeader
            title="Today"
            action={state.data?.plan ? "Open" : undefined}
            onAction={() => router.push("/workout")}
          />
          {state.data?.plan ? (
            <Card onPress={() => router.push("/workout")} accessibilityLabel="Open today's workout">
              <Row style={{ justifyContent: "space-between" }}>
                <View style={{ flex: 1, paddingRight: space.md }}>
                  <T variant="bodyStrong" numberOfLines={1}>
                    {state.data.plan.plan.name}
                  </T>
                  <T variant="small" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
                    {view?.exerciseCount ?? 0} exercises
                    {state.data.plan.plan.goal ? ` · ${state.data.plan.plan.goal}` : ""}
                  </T>
                </View>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radius.pill,
                    backgroundColor: color.accentSoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="barbell-outline" size={19} color={color.accentText} />
                </View>
              </Row>
              <Button
                label="Start workout"
                icon="play"
                onPress={() => router.push("/workout")}
                style={{ marginTop: space.lg }}
              />
            </Card>
          ) : (
            <EmptyState
              icon="barbell-outline"
              title="No plan assigned yet"
              body="Your coach has not assigned a workout plan. It will appear here as soon as they do."
            />
          )}

          {/* Next class. */}
          {view?.nextClass ? (
            <>
              <SectionHeader title="Next class" />
              <Card>
                <Row style={{ justifyContent: "space-between" }}>
                  <View style={{ flex: 1, paddingRight: space.md }}>
                    <T variant="bodyStrong" numberOfLines={1}>
                      {view.nextClass.name}
                    </T>
                    <T variant="small" tone="muted" style={{ marginTop: 2 }}>
                      {shortDate(view.nextClass.starts_at)} · {clockTime(view.nextClass.starts_at)}
                      {view.nextClass.duration_minutes ? ` · ${view.nextClass.duration_minutes} min` : ""}
                    </T>
                  </View>
                  {view.isBooked ? <Chip label="Booked" tone="success" /> : null}
                </Row>
              </Card>
            </>
          ) : null}
        </>
      )}

      {state.error ? (
        <Card>
          <Row gap={space.sm}>
            <Ionicons name="cloud-offline-outline" size={18} color={color.warning} />
            <T variant="small" tone="warning" style={{ flex: 1 }}>
              {state.error}
            </T>
          </Row>
          <Button
            label="Try again"
            variant="secondary"
            compact
            onPress={state.reload}
            style={{ marginTop: space.md }}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
