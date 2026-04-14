import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius } from '@/constants/theme';

export default function CreatorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from('profiles').select('*').eq('user_id', id).single()
      .then(({ data }) => setProfile(data));
  }, [id]);

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile.display_name?.[0]?.toUpperCase() ?? 'C'}
          </Text>
        </View>
        <Text style={styles.name}>{profile.display_name ?? 'Creator'}</Text>
        {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        <Text style={styles.subs}>{profile.subscriber_count ?? 0} subscribers</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  loading: { color: colors.mutedForeground },
  header: { alignItems: 'center', padding: spacing.xl },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  avatarText: { color: colors.primaryForeground, fontSize: 32, fontWeight: 'bold' },
  name: { color: colors.foreground, fontSize: 22, fontWeight: 'bold' },
  bio: { color: colors.mutedForeground, fontSize: 14, textAlign: 'center', marginTop: spacing.sm },
  subs: { color: colors.mutedForeground, fontSize: 13, marginTop: spacing.xs },
});
