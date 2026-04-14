import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { colors, spacing, radius } from '@/constants/theme';
import VideoCard from '@/components/VideoCard';

const formatViews = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

export default function CreatorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [creator, setCreator] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('profiles').select('*').eq('user_id', id).single(),
      supabase
        .from('videos')
        .select('*, profiles(display_name, avatar_url)')
        .eq('user_id', id)
        .eq('is_published', true)
        .order('views', { ascending: false })
        .limit(20),
    ]).then(([pRes, vRes]) => {
      setCreator(pRes.data);
      setVideos(vRes.data ?? []);
      setLoading(false);
    });
  }, [id]);

  const handleSubscribe = async () => {
    if (!user) {
      router.push('/auth');
      return;
    }
    setSubscribed(prev => !prev);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!creator) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Creator not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {creator.display_name?.[0]?.toUpperCase() ?? 'C'}
          </Text>
        </View>
        <Text style={styles.displayName}>{creator.display_name ?? 'Creator'}</Text>
        {creator.bio && <Text style={styles.bio}>{creator.bio}</Text>}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{(creator.subscriber_count ?? 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Subscribers</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{videos.length}</Text>
            <Text style={styles.statLabel}>Videos</Text>
          </View>
        </View>

        {user?.id !== id && (
          <TouchableOpacity
            style={[styles.subscribeBtn, subscribed && styles.subscribedBtn]}
            onPress={handleSubscribe}
          >
            <Text style={[styles.subscribeBtnText, subscribed && styles.subscribedBtnText]}>
              {subscribed ? 'Subscribed' : 'Subscribe'}
            </Text>
          </TouchableOpacity>
        )}

        {creator.is_monetized && (
          <View style={styles.badge}>
            <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
            <Text style={styles.badgeText}>Monetized Creator</Text>
          </View>
        )}
      </View>

      {/* Videos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Videos</Text>
        {videos.length === 0 ? (
          <Text style={styles.empty}>No videos published yet.</Text>
        ) : (
          <FlatList
            data={videos}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <VideoCard
                id={item.id}
                title={item.title}
                channel={creator.display_name ?? 'Creator'}
                views={formatViews(item.views ?? 0)}
                duration={item.duration}
                thumbnailUrl={item.thumbnail_url}
                onPress={() => router.push(`/watch/${item.id}`)}
              />
            )}
            scrollEnabled={false}
          />
        )}
      </View>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  loadingText: { color: colors.mutedForeground },
  header: { alignItems: 'center', padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  avatarText: { color: colors.primaryForeground, fontSize: 32, fontWeight: 'bold' },
  displayName: { color: colors.foreground, fontSize: 22, fontWeight: 'bold' },
  bio: { color: colors.mutedForeground, fontSize: 14, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.lg },
  stat: { alignItems: 'center' },
  statValue: { color: colors.foreground, fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  subscribeBtn: { marginTop: spacing.lg, backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  subscribedBtn: { backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border },
  subscribeBtnText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 15 },
  subscribedBtnText: { color: colors.foreground },
  badge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  badgeText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  section: { padding: spacing.md },
  sectionTitle: { color: colors.foreground, fontSize: 16, fontWeight: '700', marginBottom: spacing.md },
  empty: { color: colors.mutedForeground, textAlign: 'center', marginTop: spacing.lg },
});
