import { StyleSheet, View } from "react-native";
import {
  Baby,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  Dumbbell,
  Film,
  Gift,
  HeartPulse,
  Home,
  MoreHorizontal,
  Package,
  Palette,
  PawPrint,
  Plane,
  RefreshCcw,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Ticket,
  TrendingUp,
  Utensils,
  Wallet,
  Wrench,
  type LucideIcon
} from "lucide-react-native";

const iconMap: Record<string, LucideIcon> = {
  baby: Baby,
  bag: ShoppingBag,
  book: BookOpen,
  briefcase: Briefcase,
  bus: Bus,
  car: Car,
  dumbbell: Dumbbell,
  film: Film,
  gift: Gift,
  heart: HeartPulse,
  home: Home,
  more: MoreHorizontal,
  package: Package,
  palette: Palette,
  paw: PawPrint,
  plane: Plane,
  refresh: RefreshCcw,
  sparkles: Sparkles,
  ticket: Ticket,
  trending: TrendingUp,
  utensils: Utensils,
  wallet: Wallet,
  phone: Smartphone,
  wrench: Wrench
};

interface CategoryIconProps {
  color: string;
  name: string;
  size?: number;
}

export function CategoryIcon({ color, name, size = 18 }: CategoryIconProps) {
  const Icon = iconMap[name] ?? Sparkles;

  return (
    <View style={[styles.bubble, { backgroundColor: `${color}35` }]}>
      <Icon color={color} size={size} strokeWidth={2.5} />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignItems: "center",
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    width: 40
  }
});
