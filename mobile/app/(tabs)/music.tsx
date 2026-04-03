import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { supabase } from '@/lib/supabase';
import { colors, spacing } from '@/constants/theme';
import AudioCard from '@/components/AudioCard';
import SectionHeader from '@/components/SectionHeader';

const formatViews = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

export default function MusicScreen() {
  const [tracks, setTracks] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTracks = async () => {
    const { data } = await supabase
      .from('audio_tracks')
      .select('*')
      .eq('is_published', true)
      .order('streams', { ascending: false });
    setTracks(data ?? []);
    setRefreshing(false);
  };

  useEffect(() => { fetchTracks(); }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={tracks}
        keyExtractor={item => item.id}
        numColumns={2}
        ListHeaderComponent={<SectionHeader title="Hot Tracks" subtitle="Afrobeats, Amapiano, Highlife and more" />}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <AudioCard
              id={item.id}
              title={item.title}
              artist={item.artist_name ?? 'Unknown'}
              coverUrl={item.cover_url}
              streams={formatViews(item.streams)}
              audioUrl={item.audio_url}
            />
          </View>
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTracks(); }} tintColor={colors.primary} />}
        ListEmptyComponent={<Text style={styles.empty}>No tracks yet. Be the first to upload!</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md },
  cardWrapper: { flex: 1, margin: spacing.xs },
  empty: { color: colors.mutedForeground, textAlign: 'center', marginTop: spacing.xxl },
});
