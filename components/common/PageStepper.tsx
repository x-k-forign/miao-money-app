import { StyleSheet, Text, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { defaultTheme } from "@/constants/themes";

interface PageStepperProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

export function PageStepper({ page, pageSize, total, onChange }: PageStepperProps) {
  if (total <= pageSize) {
    return null;
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * pageSize + 1;
  const end = Math.min(total, start + pageSize - 1);

  return (
    <View style={styles.container}>
      <AnimatedPressable
        accessibilityLabel="上一页"
        disabled={currentPage <= 0}
        onPress={() => onChange(Math.max(0, currentPage - 1))}
        style={[styles.arrowButton, currentPage <= 0 && styles.disabledButton]}
      >
        <ChevronLeft color={currentPage <= 0 ? defaultTheme.muted : defaultTheme.primary} size={18} />
      </AnimatedPressable>

      <View style={styles.meta}>
        <Text style={styles.pageText}>
          第 {currentPage + 1} / {pageCount} 页
        </Text>
        <Text style={styles.rangeText}>
          {start}-{end} / {total}
        </Text>
      </View>

      <AnimatedPressable
        accessibilityLabel="下一页"
        disabled={currentPage >= pageCount - 1}
        onPress={() => onChange(Math.min(pageCount - 1, currentPage + 1))}
        style={[styles.arrowButton, currentPage >= pageCount - 1 && styles.disabledButton]}
      >
        <ChevronRight color={currentPage >= pageCount - 1 ? defaultTheme.muted : defaultTheme.primary} size={18} />
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: defaultTheme.primarySoft,
    borderRadius: 8,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 12,
    padding: 8
  },
  arrowButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  disabledButton: {
    opacity: 0.5
  },
  meta: {
    alignItems: "center",
    flex: 1,
    gap: 2
  },
  pageText: {
    color: defaultTheme.text,
    fontSize: 13,
    fontWeight: "900"
  },
  rangeText: {
    color: defaultTheme.muted,
    fontSize: 11,
    fontWeight: "800"
  }
});
