import { useState } from "react";
import { Alert, Button, Text, TextInput, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { theme } from "../theme/theme";

export default function SignupScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { setToken } = useAuth();

  const signup = async () => {
    try {
      const res = await api.post("/signup", { email, username, password });
      setToken(res.data.access_token);
      navigation.navigate("Events");
    } catch {
      Alert.alert("Signup failed", "Please try again.");
    }
  };

  return (
    <ScreenContainer>
      <View style={{ gap: 12 }}>
        <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: "700" }}>Sign Up</Text>
        <TextInput placeholder="Email" placeholderTextColor="#999" value={email} onChangeText={setEmail} style={{ backgroundColor: theme.colors.panel, color: theme.colors.text, padding: 12, borderRadius: 12 }} />
        <TextInput placeholder="Username" placeholderTextColor="#999" value={username} onChangeText={setUsername} style={{ backgroundColor: theme.colors.panel, color: theme.colors.text, padding: 12, borderRadius: 12 }} />
        <TextInput placeholder="Password" placeholderTextColor="#999" secureTextEntry value={password} onChangeText={setPassword} style={{ backgroundColor: theme.colors.panel, color: theme.colors.text, padding: 12, borderRadius: 12 }} />
        <Button title="Create account" onPress={signup} />
      </View>
    </ScreenContainer>
  );
}
