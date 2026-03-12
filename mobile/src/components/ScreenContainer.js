import { SafeAreaView, StyleSheet } from "react-native";
import { theme } from "../theme/theme";

export default function ScreenContainer({ children }) {
  // Standard screen wrapper to ensure spacing and background consistency.
  return <SafeAreaView style={styles.container}>{children}</SafeAreaView>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    padding: 16,
  },
});
