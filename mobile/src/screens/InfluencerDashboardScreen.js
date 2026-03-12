import { useEffect, useState } from "react";
import { Button, Text, TextInput, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import api from "../api/client";
import { theme } from "../theme/theme";

export default function InfluencerDashboardScreen() {
  // Minimal dashboard for stars and manual decay refresh.
  const [stars, setStars] = useState(null);
  const [cashoutAmount, setCashoutAmount] = useState("1000");

  const load = async () => {
    const res = await api.get("/stars");
    setStars(res.data);
  };

  useEffect(() => { load(); }, []);

  return (
    <ScreenContainer>
      <View style={{ gap: 12 }}>
        <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: "700" }}>Influencer Dashboard</Text>
        <Text style={{ color: theme.colors.text }}>Tier: {stars?.tier || "none"}</Text>
        <Text style={{ color: theme.colors.text }}>Active 5-Star Equivalent: {stars?.active_five_star_equivalent || 0}</Text>
        <TextInput placeholder="Cashout amount" placeholderTextColor="#999" value={cashoutAmount} onChangeText={setCashoutAmount} style={{ backgroundColor: theme.colors.panel, color: theme.colors.text, padding: 12, borderRadius: 12 }} />
        <Button title="Run Star Decay" onPress={async () => { await api.post("/stars/decay"); load(); }} />
      </View>
    </ScreenContainer>
  );
}
