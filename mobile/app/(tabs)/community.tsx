import React, { useMemo } from "react";
import { Linking, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/lib/auth";
import { useAsync } from "../../src/lib/useAsync";
import { getAttendance, getNotifications, getOrg, getUpcomingClasses } from "../../src/lib/data";
import { clockTime, humanise, shortDate } from "../../src/lib/format";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Row,
  Screen,
  SectionHeader,
  Skeleton,
  T,
} from "../../src/components/ui";
import { color, radius, space } from "../../src/lib/theme";
import { tabBarSpace } from "./_layout";

/**
 * The gym noticeboard.
 *
 * Everything here is real and RLS-scoped to this member: notifications the gym
 * or a coach addressed to them, the gym's contact details, and what is on this
 * week. There is deliberately no member-to-member feed, because a gym's data
 * model should not expose one member's attendance to another without a
 * product decision behind it.
 */
export default function CommunityScreen() {
  const { member, session } = useAuth();
  const insets = useSafeAreaInsets();

  const state = useAsync(
    async () => {
      if (!member || !session?.user.id) return null;
      const [notifications, org, classes, attendance] = await Promise.all([
        getNotifications(session.user.id),
        getOrg(member.organization_id),
        getUpcomingClasses(member.organization_id),
        getAttendance(member.id, 30),
      ]);
      return { notifications, org, classes, attendance };
    },
    [member?.id, member?.organization_id, session?.user.id],
  );

  const { unread, recent } = useMemo(() => {
    const all = state.data?.notifications ?? [];
    return {
      unread: all.filter((n) => !n.read_at).length,
      recent: all.slice(0, 20),
    };
  }, [state.data]);

  return (
    <Screen
      refreshing={state.refreshing}
      onRefresh={() => {
        void state.refresh();
      }}
      contentStyle={{ paddingBottom: tabBarSpace(insets.bottom) }}
    >
      <View style={{ paddingTop: space.md }}>
        <T variant="h1">Community</T>
        <T variant="small" tone="muted" style={{ marginTop: 2 }}>
          {unread > 0 ? `${unread} new from your gym` : "Updates from your gym"}
        </T>
      </View>

      {state.loading ? (
        <Skeleton height={140} />
      ) : (
        <>
          {recent.length ? (
            recent.map((n) => (
              <Card key={n.id}>
                <Row style={{ justifyContent: "space-between" }}>
                  <Row gap={space.sm} style={{ flex: 1 }}>
                    {!n.read_at ? (
                      <View
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: radius.pill,
                          backgroundColor: color.accentBright,
                        }}
                      />
                    ) : null}
                    <T variant="bodyStrong" style={{ flex: 1 }}>
                      {n.title}
                    </T>
                  </Row>
                  <T variant="caption" tone="faint">
                    {shortDate(n.created_at)}
                  </T>
                </Row>
                {n.body ? (
                  <T variant="small" tone="muted" style={{ marginTop: space.sm }}>
                    {n.body}
                  </T>
                ) : null}
                {n.type ? (
                  <View style={{ marginTop: space.md }}>
                    <Chip label={humanise(n.type)} tone="surface" />
                  </View>
                ) : null}
              </Card>
            ))
          ) : (
            <EmptyState
              icon="megaphone-outline"
              title="Nothing from the gym yet"
              body="Announcements, plan updates and payment reminders will appear here."
            />
          )}

          {state.data?.org ? (
            <>
              <SectionHeader title="Your gym" />
              <Card>
                <T variant="bodyStrong">{state.data.org.name}</T>
                {state.data.org.address ? (
                  <T variant="small" tone="muted" style={{ marginTop: 4 }}>
                    {state.data.org.address}
                  </T>
                ) : null}
                {state.data.org.phone ? (
                  <Button
                    label={state.data.org.phone}
                    variant="secondary"
                    icon="call-outline"
                    compact
                    onPress={() => {
                      const tel = state.data?.org?.phone?.replace(/[^\d+]/g, "");
                      if (tel) void Linking.openURL(`tel:${tel}`);
                    }}
                    style={{ marginTop: space.md }}
                  />
                ) : null}
              </Card>
            </>
          ) : null}

          {state.data?.classes.length ? (
            <>
              <SectionHeader title="This week" />
              {state.data.classes.slice(0, 4).map((c) => (
                <Card key={c.id}>
                  <Row style={{ justifyContent: "space-between" }}>
                    <T variant="small" style={{ flex: 1, paddingRight: space.sm }}>
                      {c.name}
                    </T>
                    <T variant="caption" tone="faint">
                      {shortDate(c.starts_at)} · {clockTime(c.starts_at)}
                    </T>
                  </Row>
                </Card>
              ))}
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
        </Card>
      ) : null}
    </Screen>
  );
}
