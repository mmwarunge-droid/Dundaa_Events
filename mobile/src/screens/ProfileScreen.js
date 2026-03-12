import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { theme } from "../theme/theme";

export default function ProfileScreen() {
  // UI-only placeholder until wired to /profile endpoint.
  const [form, setForm] = useState({ username: "", profile_picture: "", gender: "", location_name: "" });

  return (
    <ScreenContainer>
      <View style={{ gap: 12 }}>
        <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: "700" }}>Profile</Text>
        <TextInput placeholder="Username" placeholderTextColor="#999" value={form.username} onChangeText={(v) => setForm({ ...form, username: v })} style={{ backgroundColor: theme.colors.panel, color: theme.colors.text, padding: 12, borderRadius: 12 }} />
        <TextInput placeholder="Profile picture URL" placeholderTextColor="#999" value={form.profile_picture} onChangeText={(v) => setForm({ ...form, profile_picture: v })} style={{ backgroundColor: theme.colors.panel, color: theme.colors.text, padding: 12, borderRadius: 12 }} />
        <TextInput placeholder="Gender" placeholderTextColor="#999" value={form.gender} onChangeText={(v) => setForm({ ...form, gender: v })} style={{ backgroundColor: theme.colors.panel, color: theme.colors.text, padding: 12, borderRadius: 12 }} />
        <TextInput placeholder="Location" placeholderTextColor="#999" value={form.location_name} onChangeText={(v) => setForm({ ...form, location_name: v })} style={{ backgroundColor: theme.colors.panel, color: theme.colors.text, padding: 12, borderRadius: 12 }} />
        <Button title="Save" onPress={() => {}} />
      </View>
    </ScreenContainer>
  );
}
