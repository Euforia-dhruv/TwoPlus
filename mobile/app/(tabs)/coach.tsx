import React from "react";
import { Linking, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/lib/auth";
import { useAsync } from "../../src/lib/useAsync";
import {
  getActiveDietPlan,
  getActiveWorkoutPlan,
  getMeasurements,
  getTrainer,
  bmiOf,
} from "../../src/lib/data";
import { humanise, initials, shortDate } from "../../src/lib/format";
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
 * Coach: the humans and the plan behind them.
 *
 * The trainer record is only visible to a member of the same organization, and
 * contact is a `tel:`/`mailto:` handoff rather than in-app messaging, which
 * would need a server this project does not have.
 */
export default function CoachScreen() {
  const { member } = useAuth();
  const insets = useSafeAreaInsets();

  const state = useAsync(
    async () => {
      if (!member) return null;
      const [trainer, plan, diet, measurements] = await Promise.all([
        getTrainer(member.trainer_id),
        getActiveWorkoutPlan(member.id),
        getActiveDietPlan(member.id),
        getMeasurements(member.id),
      ]);
      return { trainer, plan, diet, measurements };
    },
    [member?.id, member?.trainer_id],
  );

  const latest = state.data?.measurements[0] ?? null;

  return (
    <Screen
      refreshing={state.refreshing}
      onRefresh={() => {
        void state.refresh();
      }}
      contentStyle={{ paddingBottom: tabBarSpace(insets.bottom) }}
    >
      <View style={{ paddingTop: space.md }}>
        <T variant="h1">Coach</T>
        <T variant="small" tone="muted" style={{ marginTop: 2 }}>
          Who is looking after your training, and what they have set.
        </T>
      </View>

      {state.loading ? (
        <Skeleton height={160} />
      ) : state.data?.trainer ? (
        <>
          <Card>
            <Row gap={space.md}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: radius.pill,
                  backgroundColor: color.accentSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <T variant="h3" tone="accent">
                  {initials(state.data.trainer.name.split(" ")[0] ?? null, state.data.trainer.name.split(" ")[1] ?? null)}
                </T>
              </View>
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{state.data.trainer.name}</T>
                <T variant="small" tone="muted" style={{ marginTop: 2 }}>
                  {humanise(state.data.trainer.job_role)}
                </T>
              </View>
            </Row>
            <Row gap={space.sm} style={{ marginTop: space.lg }}>
              {state.data.trainer.phone ? (
                <Button
                  label="Call"
                  icon="call-outline"
                  variant="secondary"
                  compact
                  onPress={() => {
                    const tel = state.data?.trainer?.phone?.replace(/[^\d+]/g, "");
                    if (tel) void Linking.openURL(`tel:${tel}`);
                  }}
                  style={{ flex: 1 }}
                />
              ) : null}
              {state.data.trainer.email ? (
                <Button
                  label="Email"
                  icon="mail-outline"
                  variant="secondary"
                  compact
                  onPress={() => {
                    const mail = state.data?.trainer?.email;
                    if (mail) void Linking.openURL(`mailto:${mail}`);
                  }}
                  style={{ flex: 1 }}
                />
              ) : null}
            </Row>
          </Card>

          <SectionHeader title="What they set up" />
          <Card>
            <Row gap={space.md}>
              <Ionicons name="barbell-outline" size={20} color={color.accentText} />
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong" numberOfLines={1}>
                  {state.data.plan?.plan.name ?? "No workout plan"}
                </T>
                <T variant="small" tone="muted" numberOfLines={1}>
                  {state.data.plan
                    ? `${state.data.plan.exercises.length} exercises${state.data.plan.plan.goal ? ` · ${state.data.plan.plan.goal}` : ""}`
                    : "Ask your coach for a plan"}
                </T>
              </View>
            </Row>
          </Card>
          <Card>
            <Row gap={space.md}>
              <Ionicons name="nutrition-outline" size={20} color={color.accentText} />
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong" numberOfLines={1}>
                  {state.data.diet?.plan.name ?? "No diet plan"}
                </T>
                <T variant="small" tone="muted" numberOfLines={1}>
                  {state.data.diet
                    ? `${state.data.diet.meals.length} meals${state.data.diet.plan.target_calories ? ` · ${state.data.diet.plan.target_calories} kcal` : ""}`
                    : "Ask your coach for a plan"}
                </T>
              </View>
            </Row>
          </Card>

          {latest ? (
            <>
              <SectionHeader title="Latest measurements" />
              <Card>
                <Row style={{ justifyContent: "space-between", marginBottom: space.md }}>
                  <T variant="small" tone="muted">
                    {shortDate(latest.measured_on)}
                  </T>
                  {bmiOf(latest.weight_kg, latest.height_cm) ? (
                    <Chip label={`BMI ${bmiOf(latest.weight_kg, latest.height_cm)!.toFixed(1)}`} tone="surface" />
                  ) : null}
                </Row>
                <Row gap={space.lg}>
                  <Stat
                    label="Weight"
                    value={latest.weight_kg != null ? String(Number(latest.weight_kg)) : "—"}
                    unit={latest.weight_kg != null ? "kg" : undefined}
                  />
                  <Stat
                    label="Body fat"
                    value={latest.body_fat_pct != null ? String(Number(latest.body_fat_pct)) : "—"}
                    unit={latest.body_fat_pct != null ? "%" : undefined}
                  />
                  <Stat
                    label="Waist"
                    value={latest.waist_cm != null ? String(Number(latest.waist_cm)) : "—"}
                    unit={latest.waist_cm != null ? "cm" : undefined}
                  />
                </Row>
              </Card>
            </>
          ) : (
            <EmptyState
              icon="body-outline"
              title="No measurements yet"
              body="Your coach records measurements at check-ins. They will show up here as trend data."
            />
          )}
        </>
      ) : (
        <EmptyState
          icon="person-outline"
          title="No coach assigned"
          body="Your gym has not assigned a trainer to your profile yet. Ask the front desk and it will appear here."
        />
      )}
    </Screen>
  );
}
