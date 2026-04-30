export const EMOTION_MAP = {
  DREADING: {
    strip:     "#c23934",
    pillBg:    "#FFF0EC",
    pillText:  "#D14626",
    label:     "Dreading",
    emoji:     "😮‍💨",
    chartColor:"#EF4444",   // vivid red
  },
  ANXIOUS: {
    strip:     "#886a00",
    pillBg:    "#FFF8E8",
    pillText:  "#B07A10",
    label:     "Anxious",
    emoji:     "😟",
    chartColor:"#F59E0B",   // vivid amber
  },
  NEUTRAL: {
    strip:     "#c4cbc2",
    pillBg:    "#F3F2F0",
    pillText:  "#7A756E",
    label:     "Neutral",
    emoji:     "😐",
    chartColor:"#94A3B8",   // slate gray — clearly distinct
  },
  WILLING: {
    strip:     "#2b6b5e",
    pillBg:    "#EEF9F7",
    pillText:  "#0E8A7D",
    label:     "Willing",
    emoji:     "🙂",
    chartColor:"#14B8A6",   // vivid teal — clearly different from green
  },
  EXCITED: {
    strip:     "#59d10b",
    pillBg:    "#EEFAF1",
    pillText:  "#1A9444",
    label:     "Excited",
    emoji:     "🤩",
    chartColor:"#22C55E",   // vivid green
  },
} as const;

export type EmotionKey = keyof typeof EMOTION_MAP;

export function getEmotion(key: string) {
  return EMOTION_MAP[key as EmotionKey] ?? EMOTION_MAP.NEUTRAL;
}
