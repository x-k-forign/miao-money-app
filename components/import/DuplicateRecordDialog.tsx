import { Modal, StyleSheet, Text, View } from "react-native";
import { AlertTriangle, Check, X } from "lucide-react-native";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { defaultTheme } from "@/constants/themes";

interface DuplicateRecordDialogProps {
  onConfirmDuplicate: () => void;
  onImportAnyway: () => void;
  open: boolean;
  reason?: string;
}

export function DuplicateRecordDialog({ onConfirmDuplicate, onImportAnyway, open, reason }: DuplicateRecordDialogProps) {
  return (
    <Modal animationType="fade" transparent visible={open} onRequestClose={onConfirmDuplicate}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={styles.iconBox}>
            <AlertTriangle color={defaultTheme.pink} size={26} />
          </View>
          <Text style={styles.title}>疑似重复账单</Text>
          <Text style={styles.body}>{reason ?? "这笔账单可能已经存在，请确认是否仍然导入。"}</Text>
          <View style={styles.actions}>
            <AnimatedPressable onPress={onConfirmDuplicate} style={styles.ghostButton}>
              <X color={defaultTheme.muted} size={17} />
              <Text style={styles.ghostText}>确认重复</Text>
            </AnimatedPressable>
            <AnimatedPressable onPress={onImportAnyway} style={styles.primaryButton}>
              <Check color="#FFFFFF" size={17} />
              <Text style={styles.primaryText}>不是重复</Text>
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(41, 70, 91, 0.32)",
    flex: 1,
    justifyContent: "center",
    padding: 20
  },
  dialog: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    gap: 12,
    maxWidth: 360,
    padding: 18,
    width: "100%"
  },
  iconBox: {
    alignItems: "center",
    backgroundColor: "#FFE4EF",
    borderRadius: 8,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  title: {
    color: defaultTheme.text,
    fontSize: 18,
    fontWeight: "900"
  },
  body: {
    color: defaultTheme.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center"
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    width: "100%"
  },
  ghostButton: {
    alignItems: "center",
    backgroundColor: "#F7FCFF",
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 46
  },
  ghostText: {
    color: defaultTheme.muted,
    fontSize: 14,
    fontWeight: "900"
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: defaultTheme.primary,
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 46
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900"
  }
});
