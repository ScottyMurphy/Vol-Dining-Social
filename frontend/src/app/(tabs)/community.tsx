import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URL } from "../../lib/config";
import { useAuth } from "../../context/AuthContext";
import { fetchCurrentDishes } from "../../lib/dishRatings";
import { COLORS, RADIUS, SPACING, TYPE } from "../../lib/theme";

const ORANGE = COLORS.orange;
const MAX_POST_LENGTH = 280;
const MAX_REPLY_LENGTH = 200;

// Optional dish rating on a post
type DishReview = { name: string; rating: "up" | "down" };

type Post = {
  id: number;
  text: string;
  createdAt: string;
  score: number;
  myVote: number; // 1 = upvoted, -1 = downvoted, 0 = no vote
  isMine: boolean;
  image: string | null; // photo id, or null if no photo
  tag: TagId | null;
  poll: Poll | null;
  dish: DishReview | null;
  replyCount: number;
};

type Poll = {
  options: { id: number; text: string; votes: number }[];
  totalVotes: number;
  myChoice: number | null; // the option id this user picked
};

type Reply = Omit<Post, "replyCount" | "tag" | "poll" | "dish"> & { isOP: boolean };

// Dining hall tags (same ids the crowd meter and service reviews use)
const TAGS = [
  { id: "rocky-top", label: "Rocky Top", emoji: "🏔️" },
  { id: "stokely", label: "Stokely", emoji: "🍳" },
  { id: "southern-kitchen", label: "Southern Kitchen", emoji: "🍗" },
  { id: "general", label: "General", emoji: "💬" },
] as const;
type TagId = (typeof TAGS)[number]["id"];
const findTag = (id: TagId | null) => TAGS.find((t) => t.id === id);
const isHallTag = (id: TagId | null) => id !== null && id !== "general";

const MAX_POLL_OPTIONS = 4;
const MAX_POLL_OPTION_LENGTH = 50;

type Thing = { type: "post" | "reply"; id: number };

// Alert.alert does nothing in a web browser, so use the browser's own pop-up there.
function notify(title: string, message?: string) {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

// "5m", "3h", "2d"
function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const imageUrl = (id: string) => `${API_URL}/api/community/images/${id}`;

// Small helper so every request sends the login token.
function useApi() {
  const { token, signOut } = useAuth();

  return useCallback(
    async (
      path: string,
      options: { method?: string; body?: unknown; rawText?: string } = {}
    ) => {
      const res = await fetch(`${API_URL}/api${path}`, {
        method: options.method ?? "GET",
        headers: {
          "Content-Type": options.rawText !== undefined ? "text/plain" : "application/json",
          Authorization: `Bearer ${token}`,
        },
        body:
          options.rawText !== undefined
            ? options.rawText
            : options.body === undefined
              ? undefined
              : JSON.stringify(options.body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        await signOut(); // token expired, send them back to login
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong");
      }
      return data;
    },
    [token, signOut]
  );
}

// ---------- Up / down vote buttons ----------
function VoteButtons({
  score,
  myVote,
  onVote,
}: {
  score: number;
  myVote: number;
  onVote: (value: number) => void;
}) {
  return (
    <View style={styles.voteColumn}>
      <TouchableOpacity
        accessibilityLabel="Upvote"
        hitSlop={8}
        onPress={() => onVote(myVote === 1 ? 0 : 1)}
      >
        <Ionicons name="chevron-up" size={26} color={myVote === 1 ? COLORS.orangeText : COLORS.faint} />
      </TouchableOpacity>
      <Text style={[styles.score, myVote !== 0 && { color: COLORS.orangeText }]}>{score}</Text>
      <TouchableOpacity
        accessibilityLabel="Downvote"
        hitSlop={8}
        onPress={() => onVote(myVote === -1 ? 0 : -1)}
      >
        <Ionicons name="chevron-down" size={26} color={myVote === -1 ? COLORS.orangeText : COLORS.faint} />
      </TouchableOpacity>
    </View>
  );
}

// ---------- Little tag label on a post ----------
function TagPill({ tag, onPress }: { tag: TagId | null; onPress?: () => void }) {
  const info = findTag(tag);
  if (!info) return null;
  return (
    <TouchableOpacity disabled={!onPress} onPress={onPress} style={styles.tagPill}>
      <Text style={styles.tagPillText}>{info.label}</Text>
    </TouchableOpacity>
  );
}

// ---------- "Liked the BBQ turkey panini" badge on a post ----------
function DishBadge({ dish }: { dish: DishReview | null }) {
  if (!dish) return null;
  const liked = dish.rating === "up";
  return (
    <View style={[styles.dishBadge, liked ? styles.dishBadgeUp : styles.dishBadgeDown]}>
      <Ionicons
        name={liked ? "thumbs-up-outline" : "thumbs-down-outline"}
        size={14}
        color={liked ? COLORS.success : COLORS.textSecondary}
      />
      <Text style={[styles.dishBadgeText, { color: liked ? COLORS.success : COLORS.textSecondary }]}>
        {liked ? "Liked" : "Not a fan of"} the {dish.name}
      </Text>
    </View>
  );
}

// ---------- Poll: tap an option to vote, then see the results ----------
function PollView({ poll, onChoose }: { poll: Poll; onChoose: (optionId: number) => void }) {
  const voted = poll.myChoice !== null;

  return (
    <View style={styles.poll}>
      {poll.options.map((option) => {
        const percent = poll.totalVotes ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
        const isMine = poll.myChoice === option.id;

        return (
          <TouchableOpacity
            key={option.id}
            style={[styles.pollOption, isMine && styles.pollOptionMine]}
            onPress={() => onChoose(option.id)}
            accessibilityLabel={`Vote for ${option.text}`}
          >
            {/* Orange bar that fills up to the percentage */}
            {voted && (
              <View
                style={[
                  styles.pollBar,
                  { width: `${percent}%` },
                  isMine && styles.pollBarMine,
                ]}
              />
            )}
            <Text style={[styles.pollOptionText, isMine && styles.pollOptionTextMine]}>
              {isMine ? "✓ " : ""}
              {option.text}
            </Text>
            {voted && <Text style={styles.pollPercent}>{percent}%</Text>}
          </TouchableOpacity>
        );
      })}
      <Text style={styles.pollFooter}>
        {poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"}
        {voted ? " · tap another option to change" : " · tap to vote"}
      </Text>
    </View>
  );
}

// ---------- The main Community tab ----------
export default function Community() {
  const api = useApi();
  const [posts, setPosts] = useState<Post[]>([]);
  const [sort, setSort] = useState<"new" | "hot">("new");
  const [tagFilter, setTagFilter] = useState<TagId | null>(null); // null = All
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [openPostId, setOpenPostId] = useState<number | null>(null);

  const loadPosts = useCallback(async () => {
    try {
      const tagPart = tagFilter ? `&tag=${tagFilter}` : "";
      setPosts(await api(`/community/posts?sort=${sort}${tagPart}`));
    } catch (err) {
      notify("Couldn't load posts", (err as Error).message);
    }
  }, [api, sort, tagFilter]);

  const votePoll = async (post: Post, optionId: number) => {
    try {
      const poll = await api(`/community/posts/${post.id}/poll`, {
        method: "POST",
        body: { optionId },
      });
      setPosts((current) => current.map((p) => (p.id === post.id ? { ...p, poll } : p)));
    } catch (err) {
      notify("Couldn't vote", (err as Error).message);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadPosts().finally(() => setLoading(false));
  }, [loadPosts]);

  const refresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  // Update the screen right away, then tell the server.
  const votePost = async (post: Post, value: number) => {
    const update = (score: number, myVote: number) =>
      setPosts((current) =>
        current.map((p) => (p.id === post.id ? { ...p, score, myVote } : p))
      );
    update(post.score - post.myVote + value, value);
    try {
      const result = await api("/community/vote", {
        method: "POST",
        body: { type: "post", id: post.id, value },
      });
      update(result.score, result.myVote);
    } catch (err) {
      update(post.score, post.myVote); // undo
      notify("Vote failed", (err as Error).message);
    }
  };

  const removePost = (postId: number) =>
    setPosts((current) => current.filter((p) => p.id !== postId));

  const showPostMenu = (post: Post) =>
    showOptions({ type: "post", id: post.id }, post.isMine, api, () => removePost(post.id));

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <View style={styles.inner}>
          <Text style={TYPE.screenTitle}>Community</Text>
          <Text style={styles.subtitle}>See what other Vols are saying.</Text>

          {/* New / Hot switch */}
          <View style={styles.sortRow}>
            {(["new", "hot"] as const).map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.sortChip, sort === option && styles.sortChipActive]}
                onPress={() => setSort(option)}
              >
                <Text style={[styles.sortText, sort === option && styles.sortTextActive]}>
                  {option === "new" ? "New" : "Hot"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Dining hall filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterRow}
            contentContainerStyle={{ paddingRight: 24 }}
          >
            {[{ id: null, label: "All" }, ...TAGS].map((tag) => {
              const active = tagFilter === tag.id;
              return (
                <TouchableOpacity
                  key={tag.label}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setTagFilter(tag.id)}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>
                    {tag.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* The feed */}
          {loading ? (
            <ActivityIndicator color={ORANGE} style={{ marginTop: 30 }} />
          ) : posts.length === 0 ? (
            <Text style={styles.empty}>
              {tagFilter
                ? `No ${findTag(tagFilter)?.label} posts yet.`
                : "No posts yet. Tap New Post to be the first!"}
            </Text>
          ) : (
            posts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => setOpenPostId(post.id)}
              >
                <View style={styles.cardBody}>
                  <TagPill tag={post.tag} onPress={() => setTagFilter(post.tag)} />
                  {!!post.text && <Text style={styles.postText}>{post.text}</Text>}
                  <DishBadge dish={post.dish} />
                  {post.poll && (
                    <PollView poll={post.poll} onChoose={(id) => votePoll(post, id)} />
                  )}
                  {post.image && (
                    <Image
                      source={{ uri: imageUrl(post.image) }}
                      style={[styles.postImage, !post.text && { marginTop: 0 }]}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.metaRow}>
                    <Text style={styles.meta}>{timeAgo(post.createdAt)}</Text>
                    <Ionicons name="chatbubble-outline" size={14} color="#888" />
                    <Text style={styles.meta}>{post.replyCount}</Text>
                    {post.isMine && <Text style={styles.youTag}>You</Text>}
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity hitSlop={10} onPress={() => showPostMenu(post)}>
                      <Ionicons name="ellipsis-horizontal" size={18} color="#888" />
                    </TouchableOpacity>
                  </View>
                </View>
                <VoteButtons
                  score={post.score}
                  myVote={post.myVote}
                  onVote={(value) => votePost(post, value)}
                />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating "New Post" button */}
      <TouchableOpacity
        style={styles.fab}
        accessibilityRole="button"
        onPress={() => setComposerOpen(true)}
      >
        <Ionicons name="add" size={22} color={COLORS.text} />
        <Text style={styles.fabText}>New post</Text>
      </TouchableOpacity>

      {composerOpen && (
        <NewPostModal
          onClose={() => setComposerOpen(false)}
          onPosted={(post) => {
            setPosts((current) => [post, ...current]);
            setComposerOpen(false);
          }}
        />
      )}

      {openPostId !== null && (
        <PostThread
          postId={openPostId}
          onClose={() => {
            setOpenPostId(null);
            loadPosts(); // pick up new reply counts / votes
          }}
          onRemoved={() => {
            removePost(openPostId);
            setOpenPostId(null);
          }}
        />
      )}
    </View>
  );
}

// ---------- Pop-up for writing a new post (with optional photo) ----------
function NewPostModal({
  onClose,
  onPosted,
}: {
  onClose: () => void;
  onPosted: (post: Post) => void;
}) {
  const api = useApi();
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<{ uri: string; base64: string } | null>(null);
  const [tag, setTag] = useState<TagId | null>(null);
  const [pollOptions, setPollOptions] = useState<string[] | null>(null); // null = no poll
  const [posting, setPosting] = useState(false);

  // Optional dish rating. Only shown once the user taps "Add a dish rating".
  const [dishOpen, setDishOpen] = useState(false);
  const [dishes, setDishes] = useState<string[] | null>(null); // null = loading
  const [dishesError, setDishesError] = useState("");
  const [dishName, setDishName] = useState<string | null>(null);
  const [dishRating, setDishRating] = useState<"up" | "down" | null>(null);

  const closeDish = () => {
    setDishOpen(false);
    setDishName(null);
    setDishRating(null);
  };

  // Load today's dishes for the tagged hall when the dish picker is open.
  useEffect(() => {
    if (!dishOpen || !tag || !isHallTag(tag)) return;
    let cancelled = false;
    setDishes(null);
    setDishesError("");
    setDishName(null);
    fetchCurrentDishes(tag)
      .then((list) => {
        if (!cancelled) setDishes(list);
      })
      .catch(() => {
        if (!cancelled) {
          setDishes([]);
          setDishesError("Today's menu isn't available for this hall yet.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [dishOpen, tag]);

  const filledOptions = (pollOptions ?? []).filter((o) => o.trim());
  const pollReady = pollOptions === null || (text.trim().length > 0 && filledOptions.length >= 2);
  const dishReady = !dishOpen || (dishName !== null && dishRating !== null);
  const canPost = (text.trim().length > 0 || photo !== null) && pollReady && dishReady && !posting;

  const setOption = (index: number, value: string) =>
    setPollOptions((options) => options!.map((o, i) => (i === index ? value : o)));

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.5, // shrinks the file so it uploads faster
      base64: true,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    // On the web the photo comes back as a "data:" link instead of base64.
    const base64 = asset.base64 ?? (asset.uri.startsWith("data:") ? asset.uri : null);
    if (!base64) {
      notify("Couldn't use that photo", "Try a different one.");
      return;
    }
    setPhoto({ uri: asset.uri, base64 });
  };

  const submit = async () => {
    setPosting(true);
    try {
      let image: string | undefined;
      if (photo) {
        const uploaded = await api("/community/images", {
          method: "POST",
          rawText: photo.base64,
        });
        image = uploaded.image;
      }
      const newPost = await api("/community/posts", {
        method: "POST",
        body: {
          text,
          image,
          tag,
          pollOptions: pollOptions ? filledOptions : undefined,
          dish:
            dishOpen && dishName && dishRating ? { name: dishName, rating: dishRating } : undefined,
        },
      });
      onPosted(newPost);
    } catch (err) {
      notify("Couldn't post", (err as Error).message);
      setPosting(false);
    }
  };

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.composeHeader}>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.composeTitle}>New post</Text>
          <TouchableOpacity
            style={[styles.postButton, !canPost && styles.disabled]}
            disabled={!canPost}
            onPress={submit}
          >
            <Text style={styles.postButtonText}>{posting ? "Posting..." : "Post"}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.composeBody} keyboardShouldPersistTaps="handled">
          {/* Pick a dining hall tag (optional) */}
          <Text style={styles.composeLabel}>Tag a dining hall (optional)</Text>
          <View style={styles.tagPicker}>
            {TAGS.map((t) => {
              const active = tag === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => {
                    const next = active ? null : t.id;
                    setTag(next);
                    if (!isHallTag(next)) closeDish(); // dish ratings need a dining hall
                  }}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            style={[styles.composeInput, pollOptions && { minHeight: 60 }]}
            placeholder={pollOptions ? "Ask your question..." : "What's happening on campus?"}
            placeholderTextColor="#999"
            multiline
            autoFocus
            maxLength={MAX_POST_LENGTH}
            value={text}
            onChangeText={setText}
          />

          {/* Poll options */}
          {pollOptions && (
            <View style={styles.pollEditor}>
              {pollOptions.map((option, index) => (
                <View key={index} style={styles.pollEditRow}>
                  <TextInput
                    style={styles.pollEditInput}
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor="#999"
                    maxLength={MAX_POLL_OPTION_LENGTH}
                    value={option}
                    onChangeText={(value) => setOption(index, value)}
                  />
                  {pollOptions.length > 2 && (
                    <TouchableOpacity
                      hitSlop={8}
                      accessibilityLabel="Remove option"
                      onPress={() => setPollOptions(pollOptions.filter((_, i) => i !== index))}
                    >
                      <Ionicons name="close-circle" size={22} color="#BBB" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <View style={styles.pollEditFooter}>
                {pollOptions.length < MAX_POLL_OPTIONS ? (
                  <TouchableOpacity onPress={() => setPollOptions([...pollOptions, ""])}>
                    <Text style={styles.pollEditLink}>+ Add option</Text>
                  </TouchableOpacity>
                ) : (
                  <View />
                )}
                <TouchableOpacity onPress={() => setPollOptions(null)}>
                  <Text style={styles.pollRemoveLink}>Remove poll</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Optional dish rating */}
          {!dishOpen ? (
            <View style={styles.dishAddWrap}>
              <TouchableOpacity
                style={[styles.dishAddButton, !isHallTag(tag) && styles.disabled]}
                disabled={!isHallTag(tag)}
                onPress={() => setDishOpen(true)}
                accessibilityRole="button"
              >
                <Ionicons name="thumbs-up-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.dishAddText}>Add a dish rating (optional)</Text>
              </TouchableOpacity>
              {!isHallTag(tag) && (
                <Text style={styles.dishHint}>
                  Tag Rocky Top, Stokely or Southern Kitchen to rate a dish.
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.dishCard}>
              <View style={styles.dishCardHeader}>
                <Text style={TYPE.label}>RATE A DISH</Text>
                <TouchableOpacity onPress={closeDish} hitSlop={10}>
                  <Text style={styles.dishRemove}>Remove</Text>
                </TouchableOpacity>
              </View>

              {dishes === null ? (
                <ActivityIndicator color={ORANGE} style={{ marginVertical: 8 }} />
              ) : dishes.length === 0 ? (
                <>
                  <Text style={styles.dishHint}>
                    {dishesError || "No dishes listed for this meal right now."} Type the dish
                    name instead.
                  </Text>
                  <TextInput
                    style={styles.pollEditInput}
                    placeholder="e.g. BBQ turkey panini"
                    placeholderTextColor="#999"
                    maxLength={80}
                    value={dishName ?? ""}
                    onChangeText={(value) => setDishName(value.trim() ? value : null)}
                    accessibilityLabel="Dish name"
                  />
                </>
              ) : (
                <ScrollView style={styles.dishList} nestedScrollEnabled>
                  <View style={styles.tagPicker}>
                    {dishes.map((dish) => {
                      const active = dishName === dish;
                      return (
                        <TouchableOpacity
                          key={dish}
                          style={[styles.filterChip, active && styles.filterChipActive]}
                          onPress={() => setDishName(active ? null : dish)}
                          accessibilityState={{ selected: active }}
                        >
                          <Text style={[styles.filterText, active && styles.filterTextActive]}>
                            {dish}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              )}

              <View style={styles.thumbRow}>
                <TouchableOpacity
                  style={[styles.thumbButton, dishRating === "up" && styles.thumbUpOn]}
                  onPress={() => setDishRating("up")}
                  accessibilityState={{ selected: dishRating === "up" }}
                >
                  <Ionicons
                    name="thumbs-up-outline"
                    size={18}
                    color={dishRating === "up" ? COLORS.success : COLORS.text}
                  />
                  <Text style={[styles.thumbText, dishRating === "up" && { color: COLORS.success }]}>
                    Liked it
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.thumbButton, dishRating === "down" && styles.thumbDownOn]}
                  onPress={() => setDishRating("down")}
                  accessibilityState={{ selected: dishRating === "down" }}
                >
                  <Ionicons name="thumbs-down-outline" size={18} color={COLORS.text} />
                  <Text style={styles.thumbText}>Not for me</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {photo && (
            <View>
              <Image source={{ uri: photo.uri }} style={styles.composePhoto} resizeMode="cover" />
              <TouchableOpacity
                style={styles.removePhoto}
                accessibilityLabel="Remove photo"
                onPress={() => setPhoto(null)}
              >
                <Ionicons name="close" size={18} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <View style={styles.composeToolbar}>
          <View style={styles.toolbarButtons}>
            <TouchableOpacity style={styles.photoButton} onPress={pickPhoto}>
              <Ionicons name="image-outline" size={22} color={COLORS.orangeText} />
              <Text style={styles.photoButtonText}>{photo ? "Change photo" : "Photo"}</Text>
            </TouchableOpacity>
            {!pollOptions && (
              <TouchableOpacity style={styles.photoButton} onPress={() => setPollOptions(["", ""])}>
                <Ionicons name="stats-chart-outline" size={20} color={COLORS.orangeText} />
                <Text style={styles.photoButtonText}>Poll</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.counter}>
            {text.length}/{MAX_POST_LENGTH}
          </Text>
        </View>
        <Text style={styles.anonNote}>
          {pollOptions && !pollReady
            ? "Polls need a question and at least 2 options."
            : !dishReady
              ? "Pick a dish and a thumbs up or down, or remove the dish rating."
              : "Your post is anonymous."}
        </Text>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- "..." menu: Report, or Delete if it's yours ----------
function showOptions(
  thing: Thing,
  isMine: boolean,
  api: ReturnType<typeof useApi>,
  onRemoved: () => void
) {
  const report = (reason: string) =>
    api("/community/report", { method: "POST", body: { ...thing, reason } })
      .then(() => {
        onRemoved(); // hide it for this user right away
        notify("Reported", "Thanks, we'll take a look.");
      })
      .catch((err) => notify("Couldn't report", err.message));

  const askReason = () =>
    Alert.alert("Why are you reporting this?", undefined, [
      { text: "Spam", onPress: () => report("spam") },
      { text: "Bullying or harassment", onPress: () => report("harassment") },
      { text: "Inappropriate", onPress: () => report("inappropriate") },
      { text: "Cancel", style: "cancel" },
    ]);

  const remove = () =>
    Alert.alert("Delete this post?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          api(`/community/posts/${thing.id}`, { method: "DELETE" })
            .then(onRemoved)
            .catch((err) => notify("Couldn't delete", err.message)),
      },
    ]);

  // In a web browser, use simple yes/no pop-ups instead.
  if (Platform.OS === "web") {
    if (isMine && thing.type === "post") {
      if (window.confirm("Delete this post? This can't be undone.")) {
        api(`/community/posts/${thing.id}`, { method: "DELETE" })
          .then(onRemoved)
          .catch((err) => notify("Couldn't delete", err.message));
      }
    } else if (!isMine && window.confirm(`Report this ${thing.type} as inappropriate?`)) {
      report("inappropriate");
    }
    return;
  }

  const buttons = [];
  if (isMine && thing.type === "post") {
    buttons.push({ text: "Delete", style: "destructive" as const, onPress: remove });
  }
  if (!isMine) {
    buttons.push({ text: "Report", style: "destructive" as const, onPress: askReason });
  }
  if (buttons.length === 0) return;
  buttons.push({ text: "Cancel", style: "cancel" as const, onPress: () => {} });
  Alert.alert("Options", undefined, buttons);
}

// ---------- Pop-up screen showing one post and its replies ----------
function PostThread({
  postId,
  onClose,
  onRemoved,
}: {
  postId: number;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const api = useApi();
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api(`/community/posts/${postId}`);
      setPost(data.post);
      setReplies(data.replies);
    } catch (err) {
      notify("Couldn't open post", (err as Error).message);
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, postId]);

  useEffect(() => {
    load();
  }, [load]);

  const vote = async (thing: Thing, current: { score: number; myVote: number }, value: number) => {
    const apply = (score: number, myVote: number) => {
      if (thing.type === "post") {
        setPost((p) => (p ? { ...p, score, myVote } : p));
      } else {
        setReplies((list) => list.map((r) => (r.id === thing.id ? { ...r, score, myVote } : r)));
      }
    };
    apply(current.score - current.myVote + value, value);
    try {
      const result = await api("/community/vote", { method: "POST", body: { ...thing, value } });
      apply(result.score, result.myVote);
    } catch (err) {
      apply(current.score, current.myVote);
      notify("Vote failed", (err as Error).message);
    }
  };

  const votePoll = async (optionId: number) => {
    try {
      const poll = await api(`/community/posts/${postId}/poll`, {
        method: "POST",
        body: { optionId },
      });
      setPost((p) => (p ? { ...p, poll } : p));
    } catch (err) {
      notify("Couldn't vote", (err as Error).message);
    }
  };

  const sendReply = async () => {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await api(`/community/posts/${postId}/replies`, { method: "POST", body: { text: draft } });
      setDraft("");
      await load();
    } catch (err) {
      notify("Couldn't reply", (err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.threadHeader}>
          <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.backRow}>
            <Ionicons name="arrow-back" size={20} color={COLORS.orangeText} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        {!post ? (
          <ActivityIndicator color={ORANGE} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={styles.threadContent} keyboardShouldPersistTaps="handled">
            <View style={styles.card}>
              <View style={styles.cardBody}>
                <TagPill tag={post.tag} />
                {!!post.text && <Text style={[styles.postText, { fontSize: 18 }]}>{post.text}</Text>}
                <DishBadge dish={post.dish} />
                {post.poll && <PollView poll={post.poll} onChoose={votePoll} />}
                {post.image && (
                  <Image
                    source={{ uri: imageUrl(post.image) }}
                    style={[styles.threadImage, !post.text && { marginTop: 0 }]}
                    resizeMode="contain"
                  />
                )}
                <View style={styles.metaRow}>
                  <Text style={styles.meta}>{timeAgo(post.createdAt)}</Text>
                  {post.isMine && <Text style={styles.youTag}>You</Text>}
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity
                    hitSlop={10}
                    onPress={() => showOptions({ type: "post", id: post.id }, post.isMine, api, onRemoved)}
                  >
                    <Ionicons name="ellipsis-horizontal" size={18} color="#888" />
                  </TouchableOpacity>
                </View>
              </View>
              <VoteButtons
                score={post.score}
                myVote={post.myVote}
                onVote={(value) => vote({ type: "post", id: post.id }, post, value)}
              />
            </View>

            <Text style={styles.repliesTitle}>
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </Text>

            {replies.map((reply) => (
              <View key={reply.id} style={[styles.card, styles.replyCard]}>
                <View style={styles.cardBody}>
                  <View style={[styles.metaRow, { marginTop: 0 }]}>
                    <Text style={styles.replyName}>Anonymous</Text>
                    {reply.isOP && <Text style={styles.opTag}>OP</Text>}
                    {reply.isMine && <Text style={styles.youTag}>You</Text>}
                    <Text style={styles.meta}>{timeAgo(reply.createdAt)}</Text>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity
                      hitSlop={10}
                      onPress={() =>
                        showOptions({ type: "reply", id: reply.id }, reply.isMine, api, () =>
                          setReplies((list) => list.filter((r) => r.id !== reply.id))
                        )
                      }
                    >
                      <Ionicons name="ellipsis-horizontal" size={16} color="#888" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.replyText}>{reply.text}</Text>
                </View>
                <VoteButtons
                  score={reply.score}
                  myVote={reply.myVote}
                  onVote={(value) => vote({ type: "reply", id: reply.id }, reply, value)}
                />
              </View>
            ))}
          </ScrollView>
        )}

        {/* Reply box at the bottom */}
        <View style={styles.replyBar}>
          <TextInput
            style={styles.replyInput}
            placeholder="Reply anonymously"
            placeholderTextColor="#999"
            maxLength={MAX_REPLY_LENGTH}
            multiline
            value={draft}
            onChangeText={setDraft}
          />
          <TouchableOpacity
            onPress={sendReply}
            disabled={!draft.trim() || sending}
            style={[styles.sendButton, (!draft.trim() || sending) && styles.disabled]}
          >
            <Ionicons name="send" size={18} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 100, // room for the New Post button
  },
  inner: {
    paddingHorizontal: SPACING.screen,
    paddingTop: SPACING.topInset,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    color: COLORS.muted,
  },

  // New / Hot
  sortRow: {
    flexDirection: "row",
    alignSelf: "flex-start",
    padding: 3,
    gap: 3,
    marginTop: 18,
    marginBottom: 12,
    backgroundColor: "#ECEBE7",
    borderRadius: RADIUS.md,
  },
  sortChip: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 9,
  },
  sortChipActive: {
    backgroundColor: COLORS.card,
  },
  sortText: {
    fontWeight: "500",
    color: COLORS.muted,
  },
  sortTextActive: {
    fontWeight: "700",
    color: COLORS.text,
  },
  // Dining hall filter + tag chips
  filterRow: {
    marginBottom: 10,
    marginRight: -SPACING.screen,
  },
  filterChip: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    marginRight: 8,
    marginBottom: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.orangeTint,
    borderColor: COLORS.orangeBorder,
  },
  filterText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "600",
  },
  filterTextActive: {
    color: COLORS.orangeText,
  },
  tagPill: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.orangeTint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  tagPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.orangeText,
  },

  // Dish rating badge on posts
  dishBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 8,
  },
  dishBadgeUp: {
    backgroundColor: COLORS.successTint,
  },
  dishBadgeDown: {
    backgroundColor: COLORS.chip,
  },
  dishBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
  },

  // Dish picker in the New Post pop-up
  dishAddWrap: {
    marginTop: 12,
    gap: 6,
  },
  dishAddButton: {
    minHeight: 50,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.inputBorder,
    borderRadius: RADIUS.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dishAddText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  dishHint: {
    fontSize: 13,
    color: COLORS.muted,
  },
  dishCard: {
    marginTop: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 10,
  },
  dishCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dishRemove: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.muted,
  },
  dishList: {
    maxHeight: 180,
  },
  thumbRow: {
    flexDirection: "row",
    gap: 8,
  },
  thumbButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  thumbUpOn: {
    backgroundColor: COLORS.successTint,
    borderColor: COLORS.successBorder,
  },
  thumbDownOn: {
    backgroundColor: COLORS.chip,
    borderColor: COLORS.faint,
  },
  thumbText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },

  // Polls
  poll: {
    marginTop: 10,
  },
  pollOption: {
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E2E2E2",
    marginBottom: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  pollOptionMine: {
    borderColor: ORANGE,
  },
  pollBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#F1F1F1",
  },
  pollBarMine: {
    backgroundColor: "#FFE2C4",
  },
  pollOptionText: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    fontWeight: "600",
  },
  pollOptionTextMine: {
    color: COLORS.orangeText,
  },
  pollPercent: {
    fontSize: 14,
    fontWeight: "700",
    color: "#555",
    marginLeft: 8,
  },
  pollFooter: {
    fontSize: 12,
    color: "#999",
  },

  // Poll editor in the New Post pop-up
  composeLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
    marginBottom: 8,
  },
  tagPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  pollEditor: {
    marginTop: 8,
  },
  pollEditRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  pollEditInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#E2E2E2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#222",
    backgroundColor: "white",
    marginRight: 8,
  },
  pollEditFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    marginRight: 30,
  },
  pollEditLink: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.orangeText,
  },
  pollRemoveLink: {
    fontSize: 15,
    color: "#999",
  },
  toolbarButtons: {
    flexDirection: "row",
    gap: 20,
  },

  empty: {
    textAlign: "center",
    color: "#888",
    marginTop: 30,
  },

  // Post cards
  card: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardBody: {
    flex: 1,
    marginRight: 10,
  },
  postText: {
    fontSize: 16,
    color: "#222",
    lineHeight: 22,
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginTop: 10,
    backgroundColor: "#EEE",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  meta: {
    fontSize: 13,
    color: "#888",
  },
  youTag: {
    fontSize: 11,
    fontWeight: "700",
    color: "#555",
    backgroundColor: "#EEE",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: "hidden",
  },
  opTag: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.text,
    backgroundColor: ORANGE,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: "hidden",
  },
  voteColumn: {
    alignItems: "center",
    justifyContent: "center",
    width: 36,
  },
  score: {
    fontSize: 16,
    fontWeight: "700",
    color: "#444",
  },

  // Floating New Post button
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ORANGE,
    paddingHorizontal: 20,
    borderRadius: 26,
    shadowColor: ORANGE,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  fabText: {
    marginLeft: 6,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
  },

  // New post pop-up
  composeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 20 : 40,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    backgroundColor: "white",
  },
  cancelText: {
    fontSize: 16,
    color: COLORS.orangeText,
    fontWeight: "600",
  },
  composeTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#222",
  },
  postButton: {
    backgroundColor: ORANGE,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postButtonText: {
    color: COLORS.text,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.4,
  },
  composeBody: {
    padding: 20,
  },
  composeInput: {
    minHeight: 120,
    fontSize: 18,
    color: "#222",
    textAlignVertical: "top",
  },
  composePhoto: {
    width: "100%",
    height: 240,
    borderRadius: 12,
    marginTop: 12,
  },
  removePhoto: {
    position: "absolute",
    top: 20,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  composeToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    backgroundColor: "white",
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  photoButtonText: {
    marginLeft: 6,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.orangeText,
  },
  counter: {
    fontSize: 12,
    color: "#999",
  },
  anonNote: {
    textAlign: "center",
    fontSize: 12,
    color: "#999",
    backgroundColor: "white",
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
  },

  // Thread pop-up
  threadHeader: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 20 : 40,
    paddingBottom: 8,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 6,
  },
  backText: {
    marginLeft: 6,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.orangeText,
  },
  threadContent: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 30,
  },
  threadImage: {
    width: "100%",
    height: 300,
    borderRadius: 10,
    marginTop: 10,
    backgroundColor: "#EEE",
  },
  repliesTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#555",
    marginTop: 12,
    marginBottom: 10,
  },
  replyCard: {
    marginLeft: 16,
  },
  replyName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#444",
  },
  replyText: {
    fontSize: 15,
    color: "#222",
    marginTop: 6,
    lineHeight: 21,
  },
  replyBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
  replyInput: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: "#F2F2F2",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 9,
    fontSize: 15,
    color: "#222",
  },
  sendButton: {
    marginLeft: 8,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
  },
});
