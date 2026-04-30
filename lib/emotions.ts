export const EMOTION_MAP = {
  DREADING: {
    strip:     "#c23934",
    pillBg:    "#FFF0EC",
    pillText:  "#D14626",
    label:     "Dreading",
    emoji:     "😮‍💨",
    chartColor:"#c23934",
  },
  ANXIOUS: {
    strip:     "#886a00",
    pillBg:    "#FFF8E8",
    pillText:  "#B07A10",
    label:     "Anxious",
    emoji:     "😟",
    chartColor:"#886a00",
  },
  NEUTRAL: {
    strip:     "#c4cbc2",
    pillBg:    "#F3F2F0",
    pillText:  "#7A756E",
    label:     "Neutral",
    emoji:     "😐",
    chartColor:"#9CA3AF",
  },
  WILLING: {
    strip:     "#2b6b5e",
    pillBg:    "#EEF9F7",
    pillText:  "#0E8A7D",
    label:     "Willing",
    emoji:     "🙂",
    chartColor:"#2b6b5e",
  },
  EXCITED: {
    strip:     "#59d10b",
    pillBg:    "#EEFAF1",
    pillText:  "#1A9444",
    label:     "Excited",
    emoji:     "🤩",
    chartColor:"#59d10b",
  },
} as const;

export type EmotionKey = keyof typeof EMOTION_MAP;

export function getEmotion(key: string) {
  return EMOTION_MAP[key as EmotionKey] ?? EMOTION_MAP.NEUTRAL;
}
