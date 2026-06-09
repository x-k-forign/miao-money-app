import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

interface BankLogoProps {
  bank: "abc" | "cmb";
}

export function BankLogo({ bank }: BankLogoProps) {
  if (bank === "abc") {
    return (
      <View style={styles.logoBox}>
        <Svg height={38} width={38} viewBox="0 0 38 38">
          <Circle cx={19} cy={19} fill="#FFFFFF" r={17} stroke="#43A88E" strokeWidth={3} />
          <Path d="M19 7 L19 31" stroke="#43A88E" strokeLinecap="round" strokeWidth={4} />
          <Path d="M10 14 H28" stroke="#43A88E" strokeLinecap="round" strokeWidth={3} />
          <Path d="M11 22 H27" stroke="#43A88E" strokeLinecap="round" strokeWidth={3} />
          <Path d="M13 8 C8 14 8 25 14 31" fill="none" stroke="#43A88E" strokeLinecap="round" strokeWidth={3} />
          <Path d="M25 8 C30 14 30 25 24 31" fill="none" stroke="#43A88E" strokeLinecap="round" strokeWidth={3} />
        </Svg>
      </View>
    );
  }

  return (
    <View style={[styles.logoBox, styles.cmbBox]}>
      <Svg height={38} width={38} viewBox="0 0 38 38">
        <Rect fill="#B0003B" height={38} rx={8} width={38} />
        <Circle cx={19} cy={17} fill="#FFFFFF" r={12} />
        <Path d="M19 7 L29 27 H9 Z" fill="#B0003B" />
        <Path d="M13 24 H25" stroke="#FFFFFF" strokeLinecap="round" strokeWidth={3} />
      </Svg>
      <Text style={styles.cmbText}>招商</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logoBox: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  cmbBox: {
    backgroundColor: "#B0003B",
    overflow: "hidden"
  },
  cmbText: {
    bottom: 3,
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "900",
    position: "absolute"
  }
});
