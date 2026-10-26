export function createThemes() {
  return {
    // GymOS distinctive palette - avoids warm cream #F4F1EA, terracotta #D97757, near-black with acid-green
    // Avoids SaaS-card kit defaults: no identical rounded cards, no soft grey shadows
    background: '#0a0a0f',
    backgroundSubtle: '#12121a',
    foreground: '#e8e8f0',
    muted: '#6b6b80',
    card: '#1a1a24',
    border: '#2a2a3a',
    sidebar: '#16161f',
    accent: '#ff2d95',        // Distinctive magenta - not terracotta, not acid-green
    accentSoft: 'rgba(255, 45, 149, 0.15)',
    borderAccent: 'rgba(255, 45, 149, 0.5)',
    success: '#22c55e',
    warning: '#f59e0b',
    destructive: '#ef4444',
    info: '#3b82f6',
    // Sidebar/nav variants
    sidebarHover: '#1e1e2a',
    rowHover: 'rgba(255, 45, 149, 0.08)',
    // Status colors
    statusGood: '#16a34a',
    statusWarning: '#eab308',
    statusError: '#f87171',
    // Neutral shades
    shade1: '#1f1f2f',
    shade2: '#272737',
    shade3: '#3f3f56',
  }
}