import { useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Stokely() {
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [foodName, setFoodName] = useState("");
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const [reviews, setReviews] = useState([
    {
      id: 1,
      foodName: "Chicken Tenders",
      rating: 4,
      text: "Really solid today, crispy and fresh.",
    },
    {
      id: 2,
      foodName: "Pasta",
      rating: 3,
      text: "Pretty average today, but still filling.",
    },
    {
      id: 3,
      foodName: "Chocolate Chip Cookie",
      rating: 5,
      text: "Definitely worth grabbing one today.",
    },
  ]);

  function submitReview() {
    if (foodName.trim() === "") {
      Alert.alert("Missing Food Name", "Please enter the name of the food.");
      return;
    }

    if (rating === 0) {
      Alert.alert("Missing Rating", "Please choose a star rating.");
      return;
    }

    if (reviewText.trim() === "") {
      Alert.alert("Missing Review", "Please write a short review.");
      return;
    }

    const newReview = {
      id: Date.now(),
      foodName: foodName.trim(),
      rating,
      text: reviewText.trim(),
    };

    setReviews([newReview, ...reviews]);

    setFoodName("");
    setRating(0);
    setReviewText("");
    setShowReviewForm(false);
  }

  function displayStars(rating: number) {
    return "★".repeat(rating) + "☆".repeat(5 - rating);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          <Text style={styles.title}>Stokely</Text>

          <TouchableOpacity
            style={styles.postButton}
            onPress={() => setShowReviewForm(!showReviewForm)}
          >
            <Text style={styles.postButtonText}>Post a Review</Text>
          </TouchableOpacity>
        </View>

        {showReviewForm && (
          <View style={styles.reviewForm}>
            <Text style={styles.inputLabel}>Name of Food</Text>

            <TextInput
              style={styles.input}
              placeholder="Ex: Chicken Tenders"
              value={foodName}
              onChangeText={setFoodName}
            />

            <Text style={styles.inputLabel}>Rating</Text>

            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                >
                  <Text style={styles.starButton}>
                    {star <= rating ? "★" : "☆"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Your Review</Text>

            <TextInput
              style={[styles.input, styles.reviewInput]}
              placeholder="Tell other Vols your thoughts!"
              value={reviewText}
              onChangeText={setReviewText}
              multiline
            />

            <TouchableOpacity
              style={styles.submitButton}
              onPress={submitReview}
            >
              <Text style={styles.submitButtonText}>Submit Review</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.menuButton}>
          <Text style={styles.menuButtonText}>
            Today's Menu at Stokely
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>What other Vols are thinking..
            
        </Text>

        {reviews.map((review) => (
          <View style={styles.reviewCard} key={review.id}>
            <Text style={styles.foodName}>{review.foodName}</Text>

            <Text style={styles.stars}>
              {displayStars(review.rating)}
            </Text>

            <Text style={styles.reviewText}>{review.text}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => router.push("/")}
        >
          <Ionicons name="home-outline" size={24} color="#FF8200" />
          <Text style={styles.activeTabText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => router.push("/dining")}
        >
          <Ionicons name="restaurant-outline" size={24} color="#777" />
          <Text style={styles.tabText}>Dining</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => router.push("/community")}
        >
          <Ionicons name="chatbubbles-outline" size={24} color="#777" />
          <Text style={styles.tabText}>Community</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => router.push("/preferences")}
        >
          <Ionicons name="settings-outline" size={24} color="#777" />
          <Text style={styles.tabText}>Preferences</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },

  container: {
    padding: 20,
    paddingBottom: 120,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FF8200",
  },

  postButton: {
    backgroundColor: "#FF8200",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },

  postButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 13,
  },

  reviewForm: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
  },

  inputLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
    marginBottom: 6,
  },

  input: {
    backgroundColor: "#F7F7F7",
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    fontSize: 15,
  },

  starRow: {
    flexDirection: "row",
    marginBottom: 16,
  },

  starButton: {
    fontSize: 32,
    color: "#FF8200",
    marginRight: 5,
  },

  reviewInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },

  submitButton: {
    backgroundColor: "#FF8200",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  submitButtonText: {
    color: "white",
    fontWeight: "700",
  },

  menuButton: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },

  menuButtonText: {
    color: "#FF8200",
    fontWeight: "700",
    fontSize: 16,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
    marginBottom: 12,
  },

  reviewCard: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 14,
    marginBottom: 14,
  },

  foodName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
  },

  stars: {
    fontSize: 20,
    color: "#FF8200",
    marginVertical: 6,
  },

  reviewText: {
    fontSize: 15,
    color: "#444",
    lineHeight: 21,
  },

  tabBar: {
    flexDirection: "row",
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    paddingTop: 8,
    paddingBottom: 8,
  },

  tab: {
    flex: 1,
    alignItems: "center",
  },

  tabText: {
    fontSize: 11,
    color: "#777",
    marginTop: 3,
  },

  activeTabText: {
    fontSize: 11,
    color: "#FF8200",
    marginTop: 3,
  },
});