import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { CategoryIcon } from "@/components/common/CategoryIcon";
import { defaultTheme } from "@/constants/themes";
import type { CategoryDTO } from "@/types/models";

interface CategoryLearningDialogProps {
  categories: CategoryDTO[];
  onClose: () => void;
  onSelect: (categoryId: string) => void;
  open: boolean;
  selectedCategoryId?: string;
}

export function CategoryLearningDialog({ categories, onClose, onSelect, open, selectedCategoryId }: CategoryLearningDialogProps) {
  return (
    <Modal animationType="slide" transparent visible={open} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <AnimatedPressable onPress={onClose} style={styles.pressArea} />
        <View style={styles.sheet}>
          <Text style={styles.title}>选择分类</Text>
          <Text style={styles.hint}>选择后本次预览会立即更新，后续可接入本地学习规则。</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
            {categories.map((item) => {
              const active = selectedCategoryId === item.id;

              return (
                <AnimatedPressable
                  key={item.id}
                  onPress={() => onSelect(item.id)}
                  style={[styles.row, active && styles.rowActive]}
                >
                  <View style={styles.left}>
                    <CategoryIcon color={item.color} name={item.icon} size={16} />
                    <Text style={[styles.rowText, active && styles.rowTextActive]}>{item.name}</Text>
                  </View>
                  {active ? <Check color="#FFFFFF" size={17} strokeWidth={3} /> : null}
                </AnimatedPressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(41, 70, 91, 0.28)",
    flex: 1,
    justifyContent: "flex-end"
  },
  pressArea: {
    flex: 1
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    maxHeight: "62%",
    paddingBottom: 18,
    paddingHorizontal: 18,
    paddingTop: 16
  },
  title: {
    color: defaultTheme.text,
    fontSize: 18,
    fontWeight: "900"
  },
  hint: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginBottom: 12,
    marginTop: 4
  },
  list: {
    maxHeight: 380
  },
  row: {
    alignItems: "center",
    backgroundColor: "#F7FCFF",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    minHeight: 48,
    paddingHorizontal: 12
  },
  rowActive: {
    backgroundColor: defaultTheme.primary
  },
  left: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  rowText: {
    color: defaultTheme.text,
    fontSize: 14,
    fontWeight: "900"
  },
  rowTextActive: {
    color: "#FFFFFF"
  }
});
