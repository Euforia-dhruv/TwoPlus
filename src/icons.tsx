import type React from "react"
export type IconName =
  | "activity" | "apple" | "arrow" | "bell" | "building" | "calendar"
  | "chart" | "check" | "checkin" | "clipboard" | "close" | "dashboard"
  | "dumbbell" | "gift" | "grid" | "headset" | "megaphone" | "members"
  | "menu" | "message" | "mobile" | "package" | "plus" | "receipt"
  | "search" | "settings" | "shield" | "shop" | "sparkles" | "ticket"
  | "userPlus" | "wallet"

const iconPaths: Record<IconName, React.ReactNode> = {
  activity: <path d="M3 12h4l2.3-7 4.1 14 2.2-7H21" />,
  apple: (
    <>
      <path d="M12 8c-2-4-7-2-7 3 0 5 3 10 6 10 1 0 1-1 2-1s1 1 2 1c3 0 6-5 6-9 0-3-2-5-5-5-2 0-3 1-4 1Z" />
      <path d="M12 7c0-2 1-4 4-5" />
    </>
  ),
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  building: (
    <>
      <path d="M3 21h18M5 21V5l7-3 7 3v16M9 9h1m4 0h1m-6 4h1m4 0h1m-5 8v-4h4v4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="m7 14 4-4 4 3 6-7" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  checkin: (
    <>
      <path d="M15 3h5v18h-5M10 17l5-5-5-5M15 12H3" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4.5h6a1.5 1.5 0 0 0-3-1 1.5 1.5 0 0 0-3 1ZM9 11h6m-6 4h6" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  dumbbell: (
    <>
      <path d="M6.5 6.5v11m11-11v11M3 9v6m18-6v6M6.5 12h11M3 10h3.5m11 0H21M3 14h3.5m11 0H21" />
    </>
  ),
  gift: (
    <>
      <rect x="3" y="9" width="18" height="12" rx="2" />
      <path d="M12 9v12M3 13h18M12 9H7.5a2.5 2.5 0 1 1 2.5-2.5V9Zm0 0h4.5a2.5 2.5 0 1 0-2.5-2.5V9Z" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </>
  ),
  headset: (
    <>
      <path d="M3 13v-2a9 9 0 0 1 18 0v2" />
      <path d="M3 13h4v6H5a2 2 0 0 1-2-2v-4Zm18 0h-4v6h2a2 2 0 0 0 2-2v-4Zm-4 7a6 6 0 0 1-5 2" />
    </>
  ),
  megaphone: (
    <>
      <path d="m3 11 18-5v12L3 13v-2Zm0 2-1 5h5l2-4m9-6v8" />
    </>
  ),
  members: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  message: (
    <>
      <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-4.8a9 9 0 0 1-.9-4.2A8.5 8.5 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8v.5Z" />
      <path d="M8 12h8m-8-4h5" />
    </>
  ),
  mobile: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  package: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Zm-9 5v9l9 5 9-5V8m-9 5v9m-4-17 9 5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  receipt: (
    <>
      <path d="M4 3v18l2.5-1.5L9 21l3-1.5 3 1.5 2.5-1.5L20 21V3l-2.5 1.5L15 3l-3 1.5L9 3 6.5 4.5 4 3Z" />
      <path d="M8 9h8m-8 4h8" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  shop: (
    <>
      <path d="M3 9 5 3h14l2 6" />
      <path d="M5 13v8h14v-8M9 21v-6h6v6" />
      <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Zm7 12 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" />
    </>
  ),
  ticket: (
    <>
      <path d="M3 8a2 2 0 0 0 0 4 2 2 0 0 1 0 4v3h18v-3a2 2 0 0 1 0-4 2 2 0 0 0 0-4V5H3v3Z" />
      <path d="M13 5v2m0 3v2m0 3v2" />
    </>
  ),
  userPlus: (
    <>
      <path d="M15 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6m-3-3h6" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="5" width="18" height="15" rx="2" />
      <path d="M16 12h5M3 9h18" />
    </>
  ),
}

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconPaths[name]}
    </svg>
  )
}
