import { Text, View } from "react-native";
import { theme } from "../theme/theme";

export default function Logo() {
  // Simple native logo approximation until a final asset is added.
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, borderWidth: 2, borderColor: theme.colors.gold, backgroundColor: "#0C0C0C" }} />
      <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: "700" }}>Dundaa</Text>
    </View>
  );
}
