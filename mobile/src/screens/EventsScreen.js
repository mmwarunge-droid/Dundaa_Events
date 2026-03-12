import { useEffect, useState } from "react";
import { Button, ScrollView, Text, TextInput, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import EventCard from "../components/EventCard";
import api from "../api/client";
import { theme } from "../theme/theme";

export default function EventsScreen({ navigation }) {
  // Searchable event list for mobile users.
  const [events, setEvents] = useState([]);
  const [query, setQuery] = useState("");

  const fetchEvents = async () => {
    const res = await api.get("/events", { params: { query } });
    setEvents(res.data);
  };

  useEffect(() => { fetchEvents(); }, [query]);

  return (
    <ScreenContainer>
      <View style={{ gap: 12, marginBottom: 12 }}>
        <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: "700" }}>Events</Text>
        <TextInput placeholder="Search events" placeholderTextColor="#999" value={query} onChangeText={setQuery} style={{ backgroundColor: theme.colors.panel, color: theme.colors.text, padding: 12, borderRadius: 12 }} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button title="Profile" onPress={() => navigation.navigate("Profile")} />
          <Button title="Dashboard" onPress={() => navigation.navigate("Dashboard")} />
        </View>
      </View>
      <ScrollView>
        {events.map((event) => <EventCard key={event.id} event={event} onPress={() => navigation.navigate("EventDetail", { id: event.id })} />)}
      </ScrollView>
    </ScreenContainer>
  );
}
