import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { color, gutter, HIT, motion, radius, space, type } from "../lib/theme";

/**
 * Shared primitives. Every screen composes these rather than styling raw
 * Text/View, which is what keeps spacing and type consistent across tabs.
 *
 * Type is applied here and nowhere else: one `fontFamily` per weight, never
 * `fontWeight` alongside it, because Android resolves that pair inconsistently.
 */

const family = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semi: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

const weightFamily: Record<string, string> = {
  "400": family.regular,
  "500": family.medium,
  "600": family.semi,
  "650": family.semi,
  "700": family.bold,
};

export type Variant = keyof typeof type;

export function T({
  variant = "body",
  tone = "text",
  style,
  children,
  numberOfLines,
  align,
}: {
  variant?: Variant;
  tone?: "text" | "muted" | "faint" | "accent" | "success" | "danger" | "warning";
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
  numberOfLines?: number;
  align?: "left" | "center" | "right";
}) {
  const base = type[variant];
  const toneColor =
    tone === "text"
      ? color.text
      : tone === "muted"
        ? color.textMuted
        : tone === "faint"
          ? color.textFaint
          : tone === "accent"
            ? color.accentText
            : tone === "success"
              ? color.success
              : tone === "danger"
                ? color.danger
                : color.warning;

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        base,
        { fontFamily: weightFamily[String(base.fontWeight)] ?? family.regular, color: toneColor },
        align ? { textAlign: align } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const inner = <View style={[s.card, style]}>{children}</View>;
  if (!onPress) return inner;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: color.line }}
      style={({ pressed }) => (pressed ? { opacity: 0.82 } : null)}
    >
      {inner}
    </Pressable>
  );
}

export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  contentStyle,
  edges = ["top"],
}: {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: ("top" | "bottom")[];
}) {
  const body = (
    <View style={[{ padding: gutter, gap: space.lg }, contentStyle]}>{children}</View>
  );
  return (
    <SafeAreaView style={s.screen} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: space.huge }}
          showsVerticalScrollIndicator={false}
          refreshControl={undefined}
          {...(onRefresh
            ? {
                refreshControl: (
                  <RefreshIndicator refreshing={!!refreshing} onRefresh={onRefresh} />
                ),
              }
            : {})}
        >
          {body}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{body}</View>
      )}
    </SafeAreaView>
  );
}

function RefreshIndicator({
  refreshing,
  onRefresh,
}: {
  refreshing: boolean;
  onRefresh: () => void;
}) {
  // Imported lazily to keep the primitives file free of a hard RefreshControl
  // dependency for screens that never refresh.
  const { RefreshControl } = require("react-native") as typeof import("react-native");
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={color.textMuted}
      colors={[color.accent]}
      progressBackgroundColor={color.surfaceRaised}
    />
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  loading,
  disabled,
  icon,
  style,
  compact,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const inert = disabled || loading;
  const bg =
    variant === "primary"
      ? color.accent
      : variant === "secondary"
        ? color.surfaceRaised
        : variant === "danger"
          ? color.dangerSoft
          : "transparent";
  const fg =
    variant === "primary"
      ? "#FFF6F7"
      : variant === "danger"
        ? color.danger
        : color.text;

  return (
    <Pressable
      onPress={inert ? undefined : onPress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inert, busy: !!loading }}
      android_ripple={{ color: color.lineStrong }}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: bg,
          minHeight: compact ? HIT - 4 : 52,
          opacity: inert ? 0.5 : pressed ? 0.85 : 1,
          borderWidth: variant === "secondary" || variant === "ghost" ? 1 : 0,
          borderColor: variant === "ghost" ? "transparent" : color.line,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={17} color={fg} style={{ marginRight: space.sm }} /> : null}
          <Text
            style={{
              ...type.bodyStrong,
              fontFamily: family.semi,
              color: fg,
            }}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  error,
  style,
  ...props
}: TextInputProps & {
  label: string;
  hint?: string;
  error?: string | null;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ gap: space.sm }, style]}>
      <T variant="smallStrong" tone="muted">
        {label}
      </T>
      <TextInput
        placeholderTextColor={color.textFaint}
        selectionColor={color.accentBright}
        style={[
          s.input,
          error ? { borderColor: color.danger } : null,
        ]}
        {...props}
      />
      {error ? (
        <T variant="small" tone="danger">
          {error}
        </T>
      ) : hint ? (
        <T variant="small" tone="faint">
          {hint}
        </T>
      ) : null}
    </View>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={s.sectionHeader}>
      <T variant="h3">{title}</T>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={12} accessibilityRole="button">
          <T variant="smallStrong" tone="accent">
            {action}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Chip({
  label,
  tone = "surface",
  icon,
}: {
  label: string;
  tone?: "surface" | "accent" | "success" | "warning" | "danger" | "info";
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const map = {
    surface: { bg: color.surfaceRaised, fg: color.textMuted },
    accent: { bg: color.accentSoft, fg: color.accentText },
    success: { bg: color.successSoft, fg: color.success },
    warning: { bg: color.warningSoft, fg: color.warning },
    danger: { bg: color.dangerSoft, fg: color.danger },
    info: { bg: color.infoSoft, fg: color.info },
  }[tone];

  return (
    <View style={[s.chip, { backgroundColor: map.bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={map.fg} style={{ marginRight: 5 }} /> : null}
      <Text style={{ ...type.caption, fontFamily: family.semi, color: map.fg }}>{label}</Text>
    </View>
  );
}

export function Stat({
  label,
  value,
  unit,
  tone = "text",
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: "text" | "accent" | "success" | "warning";
}) {
  return (
    <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
      <T variant="caption" tone="faint" numberOfLines={1}>
        {label.toUpperCase()}
      </T>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
        <T variant="h2" tone={tone} numberOfLines={1}>
          {value}
        </T>
        {unit ? (
          <T variant="caption" tone="faint">
            {unit}
          </T>
        ) : null}
      </View>
    </View>
  );
}

export function EmptyState({
  icon = "sparkles-outline",
  title,
  body,
  action,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Ionicons name={icon} size={22} color={color.textFaint} />
      </View>
      <T variant="bodyStrong" align="center">
        {title}
      </T>
      <T variant="small" tone="muted" align="center" style={{ maxWidth: 300 }}>
        {body}
      </T>
      {action && onAction ? (
        <Button label={action} onPress={onAction} variant="secondary" compact style={{ marginTop: space.sm }} />
      ) : null}
    </View>
  );
}

export function Skeleton({ height = 16, width = "100%" as const, style }: { height?: number; width?: number | `${number}%`; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        { height, width, borderRadius: radius.sm, backgroundColor: color.surfaceRaised },
        style,
      ]}
    />
  );
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: color.line }} />;
}

export function Row({
  children,
  style,
  gap = space.sm,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap, minWidth: 0 }, style]}>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
    padding: space.lg,
    gap: space.xs,
  },
  screen: { flex: 1, backgroundColor: color.canvas },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
  },
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
    paddingHorizontal: space.lg,
    color: color.text,
    ...type.body,
    fontFamily: family.regular,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.sm,
    minHeight: 24,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 4,
  },
  empty: {
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.xxl,
    paddingHorizontal: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.line,
    borderStyle: "dashed",
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.xs,
  },
});

export const ui = { family, motion, styles: s };
