/** MSAD — Mishra & Sheth Analysis Dashboard */

export const BRAND = {
  id: "MSAD",
  name: "Mishra & Sheth Analysis Dashboard",
  authors: "Aastik Mishra · Rahil Sheth",
  accent: "#45ded6",
  tagline:
    "Live market pulse, guided report cards, and tools that explain the numbers — built by Aastik Mishra and Rahil Sheth.",
  description:
    "Explore stocks and ETFs with live quotes, sector heatmaps, market news, and a sentiment-driven contour backdrop. Open any ticker for grades, fundamentals vs peers, interactive charts, news analysis, an options lab, and modeling calculators — educational only, never buy/sell advice.",
  siteUrl: "https://msad.app",
} as const;

export const MSAD_STORAGE = {
  accent: "msad-accent",
  theme: "msad-theme",
  sound: "msad-sound",
  onboarding: "msad-onboarding-done",
  learningPath: "msad-learning-path",
  watchlist: "msad-watchlist",
  chartPrefs: "msad-chart-prefs",
  savedScreens: "msad-saved-screens",
  screenerExclusions: "msad-screener-exclusions",
} as const;

export const MSAD_EVENTS = {
  marketPulse: "msad:market-pulse",
  watchlist: "msad-watchlist",
  expandMetric: "msad-expand-metric",
  closePanels: "msad-close-panels",
} as const;

export const MSAD_DOM = {
  exportRoot: "msad-export-root",
  storyExport: "msad-story-export",
} as const;
