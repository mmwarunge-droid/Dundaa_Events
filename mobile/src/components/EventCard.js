import { Image, Pressable, Text, View } from "react-native";
import { theme } from "../theme/theme";

export default function EventCard({ event, onPress }) {
  // Mobile event preview used in the scroll list.
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: theme.colors.panel, borderRadius: 18, padding: 14, marginBottom: 14 }}>
      {event.poster_url ? <Image source={{ uri: event.poster_url }} style={{ width: "100%", height: 170, borderRadius: 14, marginBottom: 12 }} /> : null}
      <Text style={{ color: theme.colors.gold, marginBottom: 6 }}>{event.location_name || "Event"}</Text>
      <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "700" }}>{event.title}</Text>
      <Text style={{ color: theme.colors.muted }}>{event.description?.slice(0, 100)}...</Text>
    </Pressable>
  );
}
