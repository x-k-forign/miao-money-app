import { Image, StyleSheet, Text, View } from "react-native";
import { Sparkles } from "lucide-react-native";
import { defaultTheme } from "@/constants/themes";

const stickerImage = require("../../assets/images/miao-stickers.png");

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  compact?: boolean;
}

export function PageHeader({ title, subtitle, compact = false }: PageHeaderProps) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View style={styles.textBlock}>
        <View style={styles.kicker}>
          <Sparkles color={defaultTheme.primary} size={14} />
          <Text style={styles.kickerText}>miao daily</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Image source={stickerImage} style={styles.sticker} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
    marginBottom: 16
  },
  compact: {
    marginBottom: 10
  },
  textBlock: {
    flex: 1,
    gap: 5
  },
  kicker: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  kickerText: {
    color: defaultTheme.primary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0
  },
  title: {
    color: defaultTheme.text,
    fontSize: 26,
    fontWeight: "900"
  },
  subtitle: {
    color: defaultTheme.muted,
    fontSize: 13,
    lineHeight: 19
  },
  sticker: {
    borderRadius: 8,
    height: 72,
    width: 72
  }
});
