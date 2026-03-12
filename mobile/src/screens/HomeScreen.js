import { Button, Text, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import Logo from "../components/Logo";
import { theme } from "../theme/theme";

export default function HomeScreen({ navigation }) {
  // App entry screen for the mobile experience.
  return (
    <ScreenContainer>
      <View style={{ flex: 1, justifyContent: "center", gap: 20 }}>
        <Logo />
        <Text style={{ color: theme.colors.text, fontSize: 34, fontWeight: "700" }}>
          Discover events. Earn stars. Build influence.
        </Text>
        <Text style={{ color: theme.colors.muted, fontSize: 16 }}>
          Dundaa helps users find nearby events, engage through ratings and comments, and unlock influencer rewards.
        </Text>
        <Button title="Login" onPress={() => navigation.navigate("Login")} />
        <Button title="Sign Up" onPress={() => navigation.navigate("Signup")} />
      </View>
    </ScreenContainer>
  );
}
