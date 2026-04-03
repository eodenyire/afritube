import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { colors, spacing, radius } from '@/constants/theme';

interface VideoCardProps {
  id: string;
  title: string;
  channel: string;
  views: number | string;
  duration?: number | null;
  thumbnailUrl?: string | null;
  onPress: () => void;
}

const formatDuration = (s?: number | null) => {
  if (!s) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
};

const formatViews = (n: number | string) => {
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

export default function VideoCard({ id, title, channel, views, duration, thumbnailUrl, onPress }: VideoCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.thumbnail}>
        <Image
          source={thumbnailUrl ? { uri: thumbnailUrl } : require('@/assets/placeholder.png')}
          style={styles.thumbnailImg}
          contentFit="cover"
        />
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(duration)}</Text>
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.meta}>{channel} · {formatViews(views)} views</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  thumbnail: { borderRadius: radius.md, overflow: 'hidden', aspectRatio: 16 / 9, backgroundColor: colors.secondary },
  thumbnailImg: { width: '100%', height: '100%' },
  durationBadge: { position: 'absolute', bottom: spacing.xs, right: spacing.xs, backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: radius.sm, paddingHorizontal: spacing.xs, paddingVertical: 2 },
  durationText: { color: colors.white, fontSize: 11, fontWeight: '600' },
  info: { paddingTop: spacing.xs },
  title: { color: colors.foreground, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  meta: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
});
