import type { ThemeName } from "@/types/models";

export interface AppTheme {
  name: ThemeName;
  label: string;
  background: string;
  card: string;
  primary: string;
  primarySoft: string;
  text: string;
  muted: string;
  accent: string;
  pink: string;
  mint: string;
  yellow: string;
}

export const themes: Record<ThemeName, AppTheme> = {
  lightBlue: {
    name: "lightBlue",
    label: "浅蓝",
    background: "#F5FBFF",
    card: "#FFFFFF",
    primary: "#72C8F3",
    primarySoft: "#DFF3FF",
    text: "#29465B",
    muted: "#7A93A6",
    accent: "#FFB8D2",
    pink: "#FFB8D2",
    mint: "#BDEDD8",
    yellow: "#FFE8A9"
  },
  sakuraPink: {
    name: "sakuraPink",
    label: "樱花粉",
    background: "#FFF6FA",
    card: "#FFFFFF",
    primary: "#FF9FC6",
    primarySoft: "#FFE4EF",
    text: "#5A3345",
    muted: "#9D7185",
    accent: "#8ED8FF",
    pink: "#FFB8D2",
    mint: "#BDEDD8",
    yellow: "#FFE8A9"
  },
  mintGreen: {
    name: "mintGreen",
    label: "薄荷绿",
    background: "#F2FFF9",
    card: "#FFFFFF",
    primary: "#6DD7B5",
    primarySoft: "#DDF8EE",
    text: "#284B43",
    muted: "#719489",
    accent: "#9ECFFF",
    pink: "#FFB8D2",
    mint: "#BDEDD8",
    yellow: "#FFE8A9"
  },
  creamYellow: {
    name: "creamYellow",
    label: "奶油黄",
    background: "#FFFBEF",
    card: "#FFFFFF",
    primary: "#F4C95D",
    primarySoft: "#FFF0BC",
    text: "#51452B",
    muted: "#8D7B52",
    accent: "#89D6FF",
    pink: "#FFB8D2",
    mint: "#BDEDD8",
    yellow: "#FFE8A9"
  },
  nightBlue: {
    name: "nightBlue",
    label: "夜间蓝",
    background: "#101D2E",
    card: "#172A42",
    primary: "#77C7FF",
    primarySoft: "#243C58",
    text: "#EAF6FF",
    muted: "#9CB6C9",
    accent: "#FFB8D2",
    pink: "#FFB8D2",
    mint: "#BDEDD8",
    yellow: "#FFE8A9"
  }
};

export const defaultTheme = themes.lightBlue;
