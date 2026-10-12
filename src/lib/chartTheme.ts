import { useTheme } from '@/context/ThemeContext';
import type { Dimension360, RatingDimension, RespondentGroup } from '@/types';

/**
 * Validated categorical palette (fixed order, never cycled) with light/dark steps,
 * plus surfaces/ink for axes and grid. Colour follows the entity, not its rank.
 */
const CATEGORICAL = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
};

/** Sequential blue ramp (light → dark) for heatmaps. */
export const SEQUENTIAL = ['#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7', '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281', '#0d366b'];

/** Status colours — reserved, always paired with icon/label. */
export const STATUS_COLORS = { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' };

export function useChartTheme() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return {
    dark,
    series: dark ? CATEGORICAL.dark : CATEGORICAL.light,
    surface: dark ? '#1a1a19' : '#fcfcfb',
    grid: dark ? '#2e2e2c' : '#e7e6e2',
    axis: dark ? '#c3c2b7' : '#52514e',
    text: dark ? '#f0efec' : '#0b0b0b',
    muted: dark ? '#8d8c84' : '#77766f',
    neutral: dark ? '#383835' : '#f0efec',
  };
}

export const tooltipStyle = (t: ReturnType<typeof useChartTheme>) => ({
  contentStyle: {
    background: t.surface,
    border: `1px solid ${t.grid}`,
    borderRadius: 8,
    color: t.text,
    fontSize: 12,
    boxShadow: '0 4px 16px rgba(0,0,0,.12)',
  },
  labelStyle: { color: t.text, fontWeight: 600 },
  itemStyle: { color: t.text },
  cursor: { fill: t.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
});

export const DIMENSION_LABELS: Record<RatingDimension, string> = {
  content: 'Content',
  trainer: 'Trainer',
  logistics: 'Logistics',
  relevance: 'Relevance',
  overall: 'Overall',
};

export const DIMENSION_360_LABELS: Record<Dimension360, string> = {
  contentQuality: 'Content quality',
  delivery: 'Delivery',
  logistics: 'Logistics',
  roiImpact: 'ROI / impact',
  communication: 'Communication',
  responsiveness: 'Responsiveness',
};

/** Fixed slot per stakeholder group so a group keeps its colour across every chart. */
export const GROUP_SLOT: Record<RespondentGroup, number> = {
  Participants: 0,
  Trainers: 1,
  'Managers/Sponsors': 2,
  'Internal staff': 6,
  Vendors: 4,
};
