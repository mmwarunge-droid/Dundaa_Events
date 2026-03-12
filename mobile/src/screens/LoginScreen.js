import { useState } from "react";
import { Alert, Button, Text, TextInput, View } from "react-native";
import * as Location from "expo-location";
import ScreenContainer from "../components/ScreenContainer";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { theme } from "../theme/theme";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setToken } = useAuth();

  const login = async () => {
    try {
      // Request foreground location so the backend can personalize recommendations.
      const { status } = await Location.requestForegroundPermissionsAsync();
      let coords = {};
      if (status === "granted") {
        const pos = await Location.getCurrentPositionAsync({});
        coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      }
      const res = await api.post("/login", { email, password, ...coords });
      setToken(res.data.access_token);
      navigation.navigate("Events");
    } catch {
      Alert.alert("Login failed", "Check your credentials and backend connection.");
    }
  };

  return (
    <ScreenContainer>
      <View style={{ gap: 12 }}>
        <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: "700" }}>Login</Text>
        <TextInput placeholder="Email" placeholderTextColor="#999" value={email} onChangeText={setEmail} style={{ backgroundColor: theme.colors.panel, color: theme.colors.text, padding: 12, borderRadius: 12 }} />
        <TextInput placeholder="Password" placeholderTextColor="#999" secureTextEntry value={password} onChangeText={setPassword} style={{ backgroundColor: theme.colors.panel, color: theme.colors.text, padding: 12, borderRadius: 12 }} />
        <Button title="Login" onPress={login} />
        <Button title="Create account" onPress={() => navigation.navigate("Signup")} />
      </View>
    </ScreenContainer>
  );
}
