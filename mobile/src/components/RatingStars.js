import { Pressable, Text, View } from "react-native";
import { theme } from "../theme/theme";

export default function RatingStars({ value, onChange }) {
  // Touch-friendly star picker for ratings.
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {[1,2,3,4,5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)}>
          <Text style={{ color: n <= value ? theme.colors.gold : theme.colors.text, fontSize: 28 }}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}
