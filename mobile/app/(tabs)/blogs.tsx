import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius } from '@/constants/theme';
import SectionHeader from '@/components/SectionHeader';

export default function BlogsScreen() {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBlogs = async () => {
    const { data } = await supabase
      .from('blog_posts')
      .select('*, profiles(display_name, avatar_url)')
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    setBlogs(data ?? []);
    setRefreshing(false);
  };

  useEffect(() => { fetchBlogs(); }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={blogs}
        keyExtractor={item => item.id}
        ListHeaderComponent={<SectionHeader title="Featured Stories" subtitle="Voices and stories from the continent" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            {item.cover_url && (
              <Image source={{ uri: item.cover_url }} style={styles.cover} contentFit="cover" />
            )}
            <View style={styles.cardBody}>
              {item.category && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.category}</Text>
                </View>
              )}
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
              {item.excerpt && <Text style={styles.excerpt} numberOfLines={2}>{item.excerpt}</Text>}
              <View style={styles.meta}>
                <Text style={styles.author}>{item.profiles?.display_name ?? 'Unknown'}</Text>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.metaText}>{item.likes ?? 0} likes</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBlogs(); }} tintColor={colors.primary} />}
        ListEmptyComponent={<Text style={styles.empty}>No stories yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, marginBottom: spacing.md, overflow: 'hidden' },
  cover: { width: '100%', height: 180 },
  cardBody: { padding: spacing.md },
  badge: { backgroundColor: colors.primary + '33', borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: spacing.xs },
  badgeText: { color: colors.primary, fontSize: 11, fontWeight: '600' },
  title: { color: colors.foreground, fontSize: 16, fontWeight: '700', marginBottom: spacing.xs },
  excerpt: { color: colors.mutedForeground, fontSize: 13, lineHeight: 18, marginBottom: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  author: { color: colors.mutedForeground, fontSize: 12, fontWeight: '500' },
  dot: { color: colors.mutedForeground },
  metaText: { color: colors.mutedForeground, fontSize: 12 },
  empty: { color: colors.mutedForeground, textAlign: 'center', marginTop: spacing.xxl },
});
