// Design Studio: compares every registered design language using the real
// stylesheet, not mockups. Each preview is an iframe so a style can be rendered
// without touching the workspace theme; the live sheet is copied into it, and
// real components are portalled inside, so what you see is what ships.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/icons";
import { Avatar, Badge, Button, Input, Stats, Title } from "@/components/kit";
import { STYLE_TOKENS } from "@/lib/styles";
import {
  THEME_GROUPS,
  THEME_STYLES,
  themeSpec,
  type ThemeMode,
  type ThemeStyle,
} from "@/lib/theme";

const SIZES = [
  { id: "desktop", label: "Desktop", width: 1180 },
  { id: "tablet", label: "Tablet", width: 820 },
  { id: "phone", label: "Phone", width: 400 },
] as const;

type SizeId = (typeof SIZES)[number]["id"];

// Copies the app's own stylesheet and font links into the frame, so a preview
// can never drift from the running theme. Cross-origin sheets throw on cssRules
// (Google Fonts); their <link> clones carry those rules instead.
function hydrateFrame(frame: HTMLIFrameElement, style: ThemeStyle, mode: ThemeMode) {
  const doc = frame.contentDocument;
  if (!doc) return false;

  for (const node of Array.from(document.head.querySelectorAll('link[rel="stylesheet"]'))) {
    doc.head.appendChild(node.cloneNode(true));
  }
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const css = Array.from(sheet.cssRules)
        .map((rule) => rule.cssText)
        .join("\n");
      const el = doc.createElement("style");
      el.textContent = css;
      doc.head.appendChild(el);
    } catch {
      // Cross-origin sheet: already handled by the link clone above.
    }
  }

  const root = doc.documentElement;
  root.dataset.theme = "sage";
  root.dataset.mode = mode;
  root.dataset.style = style;
  root.dataset.layout = themeSpec(style).layout;
  root.dataset.image = "false";

  // Token-backed styles declare their palette in data; the older shells declare
  // it in their own CSS blocks and are picked up by data-style alone.
  const record = STYLE_TOKENS[style];
  const tokens = { ...(record?.base ?? {}), ...(record?.[mode] ?? {}) };
  for (const [name, value] of Object.entries(tokens)) {
    root.style.setProperty(name, value);
  }
  return true;
}

// The sample is built from the shipped primitives, so every preview exercises
// the same components the dashboard uses.
function Sample() {
  return (
    <div className="studio-sample">
      <div className="page-heading">
        <div>
          <p className="eyebrow">TwoPlus · Bandra</p>
          <h1>Members</h1>
          <p>A little more personal. Every member, in one place.</p>
        </div>
        <div className="heading-actions">
          <button className="btn secondary">Export</button>
          <button className="btn">
            <Icon name="plus" size={15} />
            Add member
          </button>
        </div>
      </div>

      <Stats
        items={[
          ["Members", "1,284", "+18 this month"],
          ["Active", "1,102", "86% retention"],
          ["Expiring", "37", "Next 7 days"],
          ["Collected", "₹4.8L", "+12% vs last"],
        ]}
      />

      <section className="panel">
        <div className="panel-heading">
          <div>
            <Title>Directory</Title>
            <p className="muted">Search, filter and open a member record.</p>
          </div>
          <Badge>Active</Badge>
        </div>

        <div className="table-toolbar">
          <div className="search-field">
            <Icon name="search" size={15} />
            <Input placeholder="Search members" />
          </div>
          <div className="filter-group">
            <select className="input" defaultValue="all">
              <option value="all">All plans</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Renews</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <span className="studio-name">
                  <Avatar name="Aarav Mehta" small />
                  Aarav Mehta
                </span>
              </td>
              <td>Strength · Monthly</td>
              <td>
                <Badge>Active</Badge>
              </td>
              <td>12 Nov</td>
            </tr>
            <tr>
              <td>
                <span className="studio-name">
                  <Avatar name="Isha Rao" small />
                  Isha Rao
                </span>
              </td>
              <td>PT · Quarterly</td>
              <td>
                <Badge>Expiring soon</Badge>
              </td>
              <td>02 Nov</td>
            </tr>
            <tr>
              <td>
                <span className="studio-name">
                  <Avatar name="Dev Shah" small />
                  Dev Shah
                </span>
              </td>
              <td>Cardio · Monthly</td>
              <td>
                <Badge>Overdue</Badge>
              </td>
              <td>28 Oct</td>
            </tr>
          </tbody>
        </table>
      </section>

      <div className="form-row">
        <label>
          Full name
          <Input defaultValue="Aarav Mehta" />
        </label>
        <label>
          Phone
          <Input defaultValue="+91 98200 00000" />
        </label>
      </div>

      <div className="studio-sample-actions">
        <Button>Save member</Button>
        <Button secondary>Cancel</Button>
      </div>
    </div>
  );
}

function Preview({
  style,
  mode,
  width,
  label,
}: {
  style: ThemeStyle;
  mode: ThemeMode;
  width: number;
  label: string;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [doc, setDoc] = useState<Document | null>(null);

  // Remount the frame whenever the style or mode changes: a fresh document is
  // cheaper and safer than unpicking the previous style's overrides.
  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    const ready = () => {
      if (hydrateFrame(frame, style, mode)) setDoc(frame.contentDocument);
    };
    ready();
    frame.addEventListener("load", ready);
    return () => frame.removeEventListener("load", ready);
  }, [style, mode]);

  return (
    <figure className="studio-frame">
      <figcaption>
        <strong>{label}</strong>
        <span>{themeSpec(style).name}</span>
      </figcaption>
      <div className="studio-viewport" style={{ maxWidth: width }}>
        <iframe
          ref={ref}
          title={`${themeSpec(style).name} preview`}
          className="studio-iframe"
          style={{ height: width <= 500 ? 620 : 760 }}
        />
        {doc && createPortal(<Sample />, doc.body)}
      </div>
    </figure>
  );
}

export function DesignStudio({
  current,
  mode,
  isOwner,
  onApply,
  onMode,
}: {
  current: ThemeStyle;
  mode: ThemeMode;
  isOwner: boolean;
  onApply: (style: ThemeStyle) => void;
  onMode: (mode: ThemeMode) => void;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string>("All");
  const [focus, setFocus] = useState<ThemeStyle>(current);
  const [compare, setCompare] = useState(false);
  const [size, setSize] = useState<SizeId>("desktop");

  const width = SIZES.find((s) => s.id === size)?.width ?? 1180;
  const spec = themeSpec(focus);

  const needle = query.trim().toLowerCase();
  const visible = THEME_STYLES.filter((style) => {
    if (group !== "All" && style.group !== group) return false;
    if (!needle) return true;
    return `${style.name} ${style.hint} ${style.group} ${style.layout}`
      .toLowerCase()
      .includes(needle);
  });

  return (
    <div className="studio">
      <section className="panel studio-bar">
        <div className="panel-heading">
          <div>
            <Title>Design Studio</Title>
            <p className="muted">
              {THEME_STYLES.length} design languages, rendered with the real
              components. Previews run the live stylesheet in an isolated frame,
              so what you see is what ships.
            </p>
          </div>
          <Badge>{THEME_GROUPS.length} families</Badge>
        </div>

        <div className="studio-controls">
          <div className="search-field">
            <Icon name="search" size={15} />
            <Input
              placeholder="Search styles, materials, layouts"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search design styles"
            />
          </div>

          <div className="studio-chips" role="group" aria-label="Filter by family">
            {["All", ...THEME_GROUPS].map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={group === name}
                className={`studio-chip ${group === name ? "selected" : ""}`}
                onClick={() => setGroup(name)}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="studio-chips" role="group" aria-label="Preview width">
            {SIZES.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={size === option.id}
                className={`studio-chip ${size === option.id ? "selected" : ""}`}
                onClick={() => setSize(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="studio-chips" role="group" aria-label="Preview mode">
            {(["light", "dark"] as ThemeMode[]).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={mode === option}
                className={`studio-chip ${mode === option ? "selected" : ""}`}
                onClick={() => onMode(option)}
              >
                {option === "dark" ? "Dark" : "Light"}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <Title>Gallery</Title>
            <p className="muted">
              {visible.length} of {THEME_STYLES.length} · pick one to preview it
              live.
            </p>
          </div>
          <button
            type="button"
            className={`studio-chip ${compare ? "selected" : ""}`}
            aria-pressed={compare}
            onClick={() => setCompare((on) => !on)}
          >
            Compare with current
          </button>
        </div>

        <div className="studio-grid">
          {visible.map((style) => {
            const accent = style.accent[mode === "dark" ? 0 : 1];
            const canvas = style.canvas[mode === "dark" ? 0 : 1];
            return (
              <button
                key={style.id}
                type="button"
                className={`studio-tile ${focus === style.id ? "selected" : ""}`}
                aria-pressed={focus === style.id}
                onClick={() => setFocus(style.id)}
                style={
                  {
                    "--sw-accent": accent,
                    "--sw-canvas": canvas,
                  } as React.CSSProperties
                }
              >
                <span className="studio-tile-art" aria-hidden="true">
                  <span />
                </span>
                <strong>{style.name}</strong>
                <small>{style.hint}</small>
                <span className="studio-tile-meta">
                  {style.group} · {style.layout}
                  {style.id === current ? " · in use" : ""}
                </span>
              </button>
            );
          })}
        </div>

        {!visible.length && (
          <div className="empty">
            No style matches “{query}”. Clear the search or pick another family.
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <Title>{spec.name}</Title>
            <p className="muted">
              {spec.hint} · {spec.layout} shell · {spec.group}
            </p>
          </div>
          <div className="studio-actions">
            <Button
              type="button"
              disabled={!isOwner || current === focus}
              title={
                isOwner
                  ? undefined
                  : "Only the workspace owner can change the appearance"
              }
              onClick={() => onApply(focus)}
            >
              {current === focus ? "Applied" : "Apply to workspace"}
            </Button>
          </div>
        </div>

        <div className={`studio-previews ${compare ? "is-split" : ""}`}>
          <Preview
            style={focus}
            mode={mode}
            width={compare ? Math.round(width / 2) : width}
            label="Preview"
          />
          {compare && (
            <Preview
              style={current}
              mode={mode}
              width={Math.round(width / 2)}
              label="Current"
            />
          )}
        </div>

        <div className="studio-facts">
          <div>
            <span>Typography</span>
            <strong style={{ fontFamily: STYLE_TOKENS[focus]?.base?.["--font-sans"] }}>
              {spec.name}
            </strong>
          </div>
          <div>
            <span>Accent</span>
            <strong className="studio-dot-row">
              <i style={{ background: spec.accent[0] }} />
              <i style={{ background: spec.accent[1] }} />
              {spec.accent[mode === "dark" ? 0 : 1]}
            </strong>
          </div>
          <div>
            <span>Canvas</span>
            <strong className="studio-dot-row">
              <i style={{ background: spec.canvas[0] }} />
              <i style={{ background: spec.canvas[1] }} />
              {spec.canvas[mode === "dark" ? 0 : 1]}
            </strong>
          </div>
          <div>
            <span>Shell</span>
            <strong>{spec.layout}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
