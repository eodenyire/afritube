import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius } from '@/constants/theme';

interface AudioCardProps {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string | null;
  streams: string;
  audioUrl?: string;
}

// Module-level singleton so only one audio track plays at a time across all AudioCard instances
let activeCard: { sound: Audio.Sound; stop: () => void } | null = null;

export default function AudioCard({ id, title, artist, coverUrl, streams, audioUrl }: AudioCardProps) {
  const [playing, setPlaying] = useState(false);
  const [streamCount, setStreamCount] = useState(streams);
  const soundRef = useRef<Audio.Sound | null>(null);
  const countedRef = useRef(false);

  const togglePlay = async () => {
    if (!audioUrl) return;
    if (playing) {
      // Clear activeCard before awaiting to avoid race conditions from rapid taps
      if (activeCard?.sound === soundRef.current) activeCard = null;
      await soundRef.current?.pauseAsync();
      setPlaying(false);
      return;
    }
    // Capture prevCard before any awaits to avoid race conditions
    const prevCard = activeCard;
    if (prevCard && prevCard.sound !== soundRef.current) {
      await prevCard.sound.pauseAsync();
      prevCard.stop();
      // Only clear activeCard if it hasn't been updated by another card in the meantime
      if (activeCard === prevCard) activeCard = null;
    }
    if (!soundRef.current) {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          if (status.didJustFinish) {
            if (activeCard?.sound === soundRef.current) activeCard = null;
            setPlaying(false);
          }
          // Count stream after 30s
          if (!countedRef.current && status.positionMillis >= 30000) {
            countedRef.current = true;
            supabase.rpc('increment_streams', { track_id: id }).then(() => {
              setStreamCount(prev => {
                const n = parseFloat(prev.replace(/[KM]/g, '')) *
                  (prev.includes('M') ? 1_000_000 : prev.includes('K') ? 1_000 : 1) + 1;
                if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
                if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
                return n.toString();
              });
            });
          }
        }
      );
      soundRef.current = sound;
    }
    // Register as active card before starting playback
    activeCard = { sound: soundRef.current, stop: () => setPlaying(false) };
    await soundRef.current.playAsync();
    setPlaying(true);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={togglePlay} activeOpacity={0.8}>
      <View style={styles.cover}>
        <Image
          source={coverUrl ? { uri: coverUrl } : { uri: 'https://placehold.co/280x280/1a1410/8a7a6a?text=AfriTube' }}
          style={styles.coverImg}
          contentFit="cover"
        />
        <View style={styles.playOverlay}>
          <Ionicons name={playing ? 'pause' : 'play'} size={24} color={colors.white} />
        </View>
      </View>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <Text style={styles.artist} numberOfLines={1}>{artist}</Text>
      <Text style={styles.streams}>{streamCount} streams</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { width: 140, marginRight: spacing.md },
  cover: { width: 140, height: 140, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.secondary, marginBottom: spacing.xs },
  coverImg: { width: '100%', height: '100%' },
  playOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.foreground, fontSize: 13, fontWeight: '600' },
  artist: { color: colors.mutedForeground, fontSize: 12 },
  streams: { color: colors.mutedForeground, fontSize: 11, marginTop: 2 },
});
