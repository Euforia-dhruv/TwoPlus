import React, { useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/lib/auth";
import { useAsync } from "../../src/lib/useAsync";
import {
  getAttendance,
  getMeasurements,
  getMemberships,
  getPayments,
  getOrg,
  bmiOf,
  formatMoney,
} from "../../src/lib/data";
import { humanise, initials, shortDate, streakFrom } from "../../src/lib/format";
import {
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  Row,
  Screen,
  Skeleton,
  Stat,
  T,
} from "../../src/components/ui";
import { color, radius, space } from "../../src/lib/theme";
import { tabBarSpace } from "./_layout";

type Pane = "membership" | "payments" | "visits" | "body";

const PANES: { key: Pane; label: string }[] = [
  { key: "membership", label: "Membership" },
  { key: "payments", label: "Payments" },
  { key: "visits", label: "Visits" },
  { key: "body", label: "Body" },
];

/**
 * Profile is the member's own record, read-only by design: the gym owns this
 * data, and letting a member edit their own membership status or attendance
 * would make the audit trail worthless. Contact changes go through the desk.
 */
export default function ProfileScreen() {
  const { member, session, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [pane, setPane] = useState<Pane>("membership");

  const state = useAsync(
    async () => {
      if (!member) return null;
      const [org, memberships, payments, attendance, measurements] = await Promise.all([
        getOrg(member.organization_id),
        getMemberships(member.id),
        getPayments(member.id),
        getAttendance(member.id, 120),
        getMeasurements(member.id),
      ]);
      return { org, memberships, payments, attendance, measurements };
    },
    [member?.id, member?.organization_id],
  );

  const spend = useMemo(
    () =>
      (state.data?.payments ?? [])
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + p.amount_minor, 0),
    [state.data],
  );

  function confirmSignOut() {
    Alert.alert("Sign out?", "You will need your password to sign back in.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ]);
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
        <Row gap={space.md}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radius.pill,
              backgroundColor: color.accentSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <T variant="h2" tone="accent">
              {initials(member?.first_name ?? null, member?.last_name ?? null)}
            </T>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T variant="h2" numberOfLines={1}>
              {member ? `${member.first_name} ${member.last_name ?? ""}`.trim() : "Member"}
            </T>
            <T variant="small" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
              {member?.email ?? session?.user.email ?? ""}
            </T>
          </View>
        </Row>
        <Row gap={space.sm} style={{ marginTop: space.md, flexWrap: "wrap" }}>
          {member?.member_code ? <Chip label={member.member_code} tone="surface" icon="pricetag-outline" /> : null}
          {member ? <Chip label={humanise(member.status)} tone={member.status === "active" ? "success" : "warning"} /> : null}
          {state.data?.org ? <Chip label={state.data.org.name} tone="accent" /> : null}
        </Row>
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
        <Skeleton height={200} />
      ) : pane === "membership" ? (
        state.data?.memberships.length ? (
          state.data.memberships.map((m) => (
            <Card key={m.id}>
              <Row style={{ justifyContent: "space-between" }}>
                <T variant="bodyStrong" numberOfLines={1} style={{ flex: 1, paddingRight: space.sm }}>
                  {m.plan_name ?? "Membership"}
                </T>
                <Chip label={humanise(m.status)} tone={m.status === "active" ? "success" : "surface"} />
              </Row>
              <Row style={{ justifyContent: "space-between", marginTop: space.md }}>
                <View>
                  <T variant="caption" tone="faint">
                    STARTED
                  </T>
                  <T variant="small">{shortDate(m.start_date)}</T>
                </View>
                <View>
                  <T variant="caption" tone="faint">
                    ENDS
                  </T>
                  <T variant="small">{shortDate(m.end_date)}</T>
                </View>
                <View>
                  <T variant="caption" tone="faint">
                    PRICE
                  </T>
                  <T variant="small">
                    {m.price_minor != null ? formatMoney(m.price_minor, state.data?.org?.currency ?? "INR") : "—"}
                  </T>
                </View>
              </Row>
            </Card>
          ))
        ) : (
          <EmptyState
            icon="card-outline"
            title="No membership on file"
            body="Once the desk starts a membership it will appear here with its dates and price."
          />
        )
      ) : pane === "payments" ? (
        state.data?.payments.length ? (
          <>
            <Card>
              <Row gap={space.lg}>
                <Stat
                  label="Total paid"
                  value={formatMoney(spend, state.data?.org?.currency ?? "INR")}
                  tone="accent"
                />
                <Stat label="Receipts" value={String(state.data.payments.length)} />
              </Row>
            </Card>
            {state.data.payments.map((p, i) => (
              <View key={p.id}>
                {i > 0 ? <Divider /> : null}
                <Row style={{ justifyContent: "space-between", paddingVertical: space.sm }}>
                  <View style={{ flex: 1, paddingRight: space.sm }}>
                    <T variant="small">{p.description ?? humanise(p.method)}</T>
                    <T variant="caption" tone="faint" style={{ marginTop: 2 }}>
                      {shortDate(p.paid_on)} · {humanise(p.method)}
                    </T>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <T variant="bodyStrong">{formatMoney(p.amount_minor, p.currency ?? "INR")}</T>
                    <Chip
                      label={humanise(p.status)}
                      tone={p.status === "paid" ? "success" : p.status === "pending" ? "warning" : "surface"}
                    />
                  </View>
                </Row>
              </View>
            ))}
          </>
        ) : (
          <EmptyState
            icon="receipt-outline"
            title="No payments yet"
            body="Every fee the desk records against your membership will show up here as a receipt."
          />
        )
      ) : pane === "visits" ? (
        state.data?.attendance.length ? (
          <>
            <Card>
              <Row gap={space.lg}>
                <Stat label="Streak" value={String(streakFrom(state.data.attendance.map((a) => a.check_in)))} unit="days" tone="accent" />
                <Stat label="Logged" value={String(state.data.attendance.length)} unit="visits" />
              </Row>
            </Card>
            {state.data.attendance.slice(0, 30).map((a) => (
              <Card key={a.id}>
                <Row style={{ justifyContent: "space-between" }}>
                  <View>
                    <T variant="small">{shortDate(a.check_in)}</T>
                    <T variant="caption" tone="faint" style={{ marginTop: 2 }}>
                      {humanise(a.method)}
                    </T>
                  </View>
                  <T variant="caption" tone="muted">
                    {a.check_out ? "Checked out" : "In gym"}
                  </T>
                </Row>
              </Card>
            ))}
          </>
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="No visits recorded"
            body="Check in at the desk and your visits will build up here."
          />
        )
      ) : state.data?.measurements.length ? (
        <>
          <Card>
            <Row gap={space.lg}>
              <Stat
                label="Weight"
                value={
                  state.data.measurements[0].weight_kg != null
                    ? String(Number(state.data.measurements[0].weight_kg))
                    : "—"
                }
                unit="kg"
              />
              <Stat
                label="BMI"
                value={
                  bmiOf(state.data.measurements[0].weight_kg, state.data.measurements[0].height_cm)?.toFixed(1) ?? "—"
                }
              />
              <Stat
                label="Body fat"
                value={
                  state.data.measurements[0].body_fat_pct != null
                    ? String(Number(state.data.measurements[0].body_fat_pct))
                    : "—"
                }
                unit="%"
              />
            </Row>
          </Card>
          {state.data.measurements.map((m) => (
            <Card key={m.id}>
              <Row style={{ justifyContent: "space-between" }}>
                <T variant="small">{shortDate(m.measured_on)}</T>
                <T variant="caption" tone="faint">
                  {[
                    m.weight_kg != null ? `${Number(m.weight_kg)} kg` : null,
                    m.waist_cm != null ? `waist ${Number(m.waist_cm)}` : null,
                    m.body_fat_pct != null ? `${Number(m.body_fat_pct)}% fat` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </T>
              </Row>
              {m.notes ? (
                <T variant="caption" tone="muted" style={{ marginTop: space.sm }}>
                  {m.notes}
                </T>
              ) : null}
            </Card>
          ))}
        </>
      ) : (
        <EmptyState
          icon="body-outline"
          title="No measurements yet"
          body="Weight, body fat and measurements recorded at check-in appear here."
        />
      )}

      <View style={{ marginTop: space.md }}>
        <Button label="Sign out" variant="secondary" icon="log-out-outline" onPress={confirmSignOut} />
        <T variant="caption" tone="faint" align="center" style={{ marginTop: space.md }}>
          Ask your gym to correct any detail on this page.
        </T>
      </View>
    </Screen>
  );
}
