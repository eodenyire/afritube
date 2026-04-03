import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, FlatList, RefreshControl, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius } from '@/constants/theme';
import VideoCard from '@/components/VideoCard';
import AudioCard from '@/components/AudioCard';
import SectionHeader from '@/components/SectionHeader';

const CATEGORIES = ['Trending', 'Music', 'Comedy', 'Tech', 'Food', 'Travel', 'Education', 'Sports'];

const formatViews = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

export default function HomeScreen() {
  const router = useRouter();
  const [videos, setVideos] = useState<any[]>([]);
  const [audios, setAudios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Trending');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    const [vRes, aRes] = await Promise.all([
      supabase.from('videos').select('*, profiles(display_name, avatar_url, is_monetized)')
        .eq('is_published', true).order('views', { ascending: false }).limit(12),
      supabase.from('audio_tracks').select('*')
        .eq('is_published', true).order('streams', { ascending: false }).limit(8),
    ]);
    setVideos(vRes.data ?? []);
    setAudios(aRes.data ?? []);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredVideos = activeCategory === 'Trending'
    ? videos
    : videos.filter(v => v.category?.toLowerCase() === activeCategory.toLowerCase());

  const handleSearch = () => {
    if (searchQuery.trim()) router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
    >
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search videos, music, blogs..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Hero Banner */}
      <View style={styles.hero}>
        <Text style={styles.heroSubtitle}>Africa's #1 Content Platform</Text>
        <Text style={styles.heroTitle}>Watch. Listen.{'\n'}<Text style={styles.heroAccent}>Create.</Text></Text>
        <View style={styles.heroButtons}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => {}}>
            <Ionicons name="play" size={16} color={colors.primaryForeground} />
            <Text style={styles.primaryBtnText}>Start Watching</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/upload')}>
            <Ionicons name="cloud-upload-outline" size={16} color={colors.foreground} />
            <Text style={styles.secondaryBtnText}>Upload</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Videos Section */}
      <View style={styles.section}>
        <SectionHeader
          title="Trending Videos"
          onSeeAll={() => router.push('/search?type=videos')}
        />
        {/* Category Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pills}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.pill, activeCategory === cat && styles.pillActive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.pillText, activeCategory === cat && styles.pillTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filteredVideos.length === 0 ? (
          <Text style={styles.emptyText}>No videos in "{activeCategory}" yet.</Text>
        ) : (
          <FlatList
            data={filteredVideos}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <VideoCard
                id={item.id}
                title={item.title}
                channel={item.profiles?.display_name ?? 'Unknown'}
                views={formatViews(item.views)}
                duration={item.duration}
                thumbnailUrl={item.thumbnail_url}
                onPress={() => router.push(`/watch/${item.id}`)}
              />
            )}
            scrollEnabled={false}
          />
        )}
      </View>

      {/* Music Section */}
      <View style={styles.section}>
        <SectionHeader title="Hot Tracks" onSeeAll={() => router.push('/search?type=music')} />
        <FlatList
          data={audios}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <AudioCard
              id={item.id}
              title={item.title}
              artist={item.artist_name ?? 'Unknown'}
              coverUrl={item.cover_url}
              streams={formatViews(item.streams)}
              audioUrl={item.audio_url}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: spacing.md }}
        />
      </View>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchContainer: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.secondary, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  searchInput: { flex: 1, color: colors.foreground, fontSize: 14 },
  hero: { padding: spacing.md, paddingTop: spacing.lg },
  heroSubtitle: { color: colors.primary, fontSize: 12, fontWeight: '600', marginBottom: spacing.xs },
  heroTitle: { color: colors.foreground, fontSize: 32, fontWeight: 'bold', lineHeight: 40 },
  heroAccent: { color: colors.primary },
  heroButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  primaryBtnText: { color: colors.primaryForeground, fontWeight: '600' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.full,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  secondaryBtnText: { color: colors.foreground },
  section: { marginTop: spacing.lg },
  pills: { paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  pill: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full, marginRight: spacing.sm,
    backgroundColor: colors.secondary,
  },
  pillActive: { backgroundColor: colors.primary },
  pillText: { color: colors.mutedForeground, fontSize: 13, fontWeight: '500' },
  pillTextActive: { color: colors.primaryForeground },
  emptyText: { color: colors.mutedForeground, textAlign: 'center', padding: spacing.lg },
});
