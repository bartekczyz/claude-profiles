export const presetColors = [
  '#7C3AED',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#8B5CF6',
  '#6366F1',
] as const

export type PresetColor = (typeof presetColors)[number]

export function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}
