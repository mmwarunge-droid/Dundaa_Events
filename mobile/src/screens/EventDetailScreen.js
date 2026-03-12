import { useEffect, useState } from "react";
import { Button, Image, ScrollView, Text, TextInput, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import RatingStars from "../components/RatingStars";
import api from "../api/client";
import { theme } from "../theme/theme";

export default function EventDetailScreen({ route }) {
  // Read event ID passed from the list screen.
  const { id } = route.params;
  const [event, setEvent] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const load = async () => {
    const res = await api.get(`/events/${id}`);
    setEvent(res.data);
  };

  useEffect(() => { load(); }, [id]);

  const submitRating = async () => {
    await api.post(`/events/${id}/rate`, { value: rating });
    load();
  };

  const submitComment = async () => {
    await api.post(`/events/${id}/comment`, { body: comment });
    setComment("");
    load();
  };

  if (!event) return <ScreenContainer><Text style={{ color: theme.colors.text }}>Loading...</Text></ScreenContainer>;

  return (
    <ScreenContainer>
      <ScrollView>
        {event.poster_url ? <Image source={{ uri: event.poster_url }} style={{ width: "100%", height: 220, borderRadius: 18, marginBottom: 14 }} /> : null}
        <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: "700" }}>{event.title}</Text>
        <Text style={{ color: theme.colors.muted, marginVertical: 8 }}>{event.description}</Text>
        <Text style={{ color: theme.colors.text }}>Average Rating: {event.average_rating}</Text>
        <Text style={{ color: theme.colors.text }}>Ranking Score: {event.ranking_score}</Text>

        <View style={{ marginTop: 16, gap: 12 }}>
          <RatingStars value={rating} onChange={setRating} />
          <Button title="Submit Rating" onPress={submitRating} />
          <TextInput placeholder="Leave a comment" placeholderTextColor="#999" value={comment} onChangeText={setComment} style={{ backgroundColor: theme.colors.panel, color: theme.colors.text, padding: 12, borderRadius: 12 }} />
          <Button title="Post Comment" onPress={submitComment} />
        </View>

        <View style={{ marginTop: 20, gap: 10 }}>
          {(event.comments || []).map((item) => (
            <View key={item.id} style={{ backgroundColor: theme.colors.panel, borderRadius: 14, padding: 12 }}>
              <Text style={{ color: theme.colors.text }}>{item.body}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
