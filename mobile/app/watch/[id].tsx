import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius } from '@/constants/theme';

const { width } = Dimensions.get('window');

export default function WatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [video, setVideo] = useState<any>(null);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from('videos').select('*, profiles(display_name, avatar_url, subscriber_count)')
      .eq('id', id).single().then(({ data }) => setVideo(data));
    // Increment view count
    supabase.rpc('increment_views', { video_id: id }).catch(() => {});
  }, [id]);

  const player = useVideoPlayer(video?.video_url ?? null, p => {
    p.loop = false;
  });

  if (!video) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Video Player */}
      <VideoView
        player={player}
        style={styles.player}
        allowsFullscreen
        allowsPictureInPicture
      />

      <View style={styles.info}>
        <Text style={styles.title}>{video.title}</Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>{video.views?.toLocaleString()} views</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.metaText}>{video.category}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setLiked(!liked)}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? colors.coral : colors.mutedForeground} />
            <Text style={styles.actionText}>Like</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="share-social-outline" size={22} color={colors.mutedForeground} />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="bookmark-outline" size={22} color={colors.mutedForeground} />
            <Text style={styles.actionText}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Creator */}
        <TouchableOpacity
          style={styles.creator}
          onPress={() => router.push(`/creator/${video.user_id}`)}
        >
          <View style={styles.creatorAvatar}>
            <Text style={styles.creatorAvatarText}>
              {video.profiles?.display_name?.[0]?.toUpperCase() ?? 'C'}
            </Text>
          </View>
          <View style={styles.creatorInfo}>
            <Text style={styles.creatorName}>{video.profiles?.display_name ?? 'Creator'}</Text>
            <Text style={styles.creatorSubs}>{video.profiles?.subscriber_count ?? 0} subscribers</Text>
          </View>
          <TouchableOpacity style={styles.subscribeBtn}>
            <Text style={styles.subscribeBtnText}>Subscribe</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Description */}
        {video.description && (
          <View style={styles.description}>
            <Text style={styles.descriptionText}>{video.description}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  loadingText: { color: colors.mutedForeground },
  player: { width, height: width * 9 / 16, backgroundColor: '#000' },
  info: { padding: spacing.md },
  title: { color: colors.foreground, fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  metaText: { color: colors.mutedForeground, fontSize: 13 },
  dot: { color: colors.mutedForeground },
  actions: { flexDirection: 'row', gap: spacing.xl, marginBottom: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  actionBtn: { alignItems: 'center', gap: spacing.xs },
  actionText: { color: colors.mutedForeground, fontSize: 12 },
  creator: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  creatorAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  creatorAvatarText: { color: colors.primaryForeground, fontWeight: 'bold', fontSize: 18 },
  creatorInfo: { flex: 1 },
  creatorName: { color: colors.foreground, fontWeight: '600' },
  creatorSubs: { color: colors.mutedForeground, fontSize: 12 },
  subscribeBtn: { backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  subscribeBtnText: { color: colors.primaryForeground, fontWeight: '600', fontSize: 13 },
  description: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md },
  descriptionText: { color: colors.mutedForeground, fontSize: 14, lineHeight: 20 },
});
