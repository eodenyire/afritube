import { useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius } from '@/constants/theme';
import VideoCard from '@/components/VideoCard';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    const term = `%${query.trim()}%`;
    const { data } = await supabase
      .from('videos')
      .select('*, profiles(display_name, avatar_url)')
      .eq('is_published', true)
      .or(`title.ilike.${term},description.ilike.${term},category.ilike.${term}`)
      .order('views', { ascending: false })
      .limit(20);
    setVideos(data ?? []);
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          style={styles.input}
          placeholder="Search videos, music, blogs..."
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setVideos([]); setSearched(false); }}>
            <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <Text style={styles.status}>Searching...</Text>
      ) : searched && videos.length === 0 ? (
        <Text style={styles.status}>No results for "{query}"</Text>
      ) : !searched ? (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={48} color={colors.muted} />
          <Text style={styles.emptyTitle}>Search AfriTube</Text>
          <Text style={styles.emptySubtitle}>Find videos, music, and blogs from African creators</Text>
        </View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <VideoCard
              id={item.id}
              title={item.title}
              channel={item.profiles?.display_name ?? 'Unknown'}
              views={item.views}
              duration={item.duration}
              thumbnailUrl={item.thumbnail_url}
              onPress={() => router.push(`/watch/${item.id}`)}
            />
          )}
          contentContainerStyle={{ padding: spacing.md }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    margin: spacing.md, backgroundColor: colors.secondary,
    borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  input: { flex: 1, color: colors.foreground, fontSize: 15 },
  status: { color: colors.mutedForeground, textAlign: 'center', marginTop: spacing.xl },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { color: colors.foreground, fontSize: 20, fontWeight: 'bold', marginTop: spacing.md },
  emptySubtitle: { color: colors.mutedForeground, textAlign: 'center', marginTop: spacing.sm },
});
