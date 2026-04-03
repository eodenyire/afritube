import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { colors, spacing, radius } from '@/constants/theme';

export default function DashboardScreen() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  if (!user) {
    return (
      <View style={styles.centered}>
        <Ionicons name="person-circle-outline" size={64} color={colors.mutedForeground} />
        <Text style={styles.signInTitle}>Sign in to AfriTube</Text>
        <Text style={styles.signInSub}>Upload content, track your stats, and grow your audience.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/auth')}>
          <Text style={styles.primaryBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const subProgress = Math.min((profile?.subscriber_count ?? 0) / 100 * 100, 100);
  const hoursProgress = Math.min((profile?.watch_hours ?? 0) / 1000 * 100, 100);

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.display_name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? 'U'}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.displayName}>{profile?.display_name ?? 'Creator'}</Text>
          <Text style={styles.email}>{user.email}</Text>
          {profile?.is_monetized && (
            <View style={styles.monetizedBadge}>
              <Text style={styles.monetizedText}>+ MONETIZED</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={signOut}>
          <Ionicons name="log-out-outline" size={24} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        {[
          { label: 'Subscribers', value: profile?.subscriber_count ?? 0 },
          { label: 'Watch Hours', value: Math.round(profile?.watch_hours ?? 0) },
        ].map(stat => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={styles.statValue}>{stat.value.toLocaleString()}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Monetization Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Monetization Progress</Text>
        <View style={styles.progressItem}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Subscribers</Text>
            <Text style={styles.progressValue}>{profile?.subscriber_count ?? 0} / 100</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${subProgress}%` }]} />
          </View>
        </View>
        <View style={styles.progressItem}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Watch Hours</Text>
            <Text style={styles.progressValue}>{Math.round(profile?.watch_hours ?? 0)} / 1,000</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${hoursProgress}%` }]} />
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/upload')}>
          <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
          <Text style={styles.actionBtnText}>Upload Content</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
  signInTitle: { color: colors.foreground, fontSize: 22, fontWeight: 'bold', marginTop: spacing.md },
  signInSub: { color: colors.mutedForeground, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.lg },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  primaryBtnText: { color: colors.primaryForeground, fontWeight: '600', fontSize: 16 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primaryForeground, fontSize: 22, fontWeight: 'bold' },
  profileInfo: { flex: 1 },
  displayName: { color: colors.foreground, fontSize: 18, fontWeight: 'bold' },
  email: { color: colors.mutedForeground, fontSize: 13 },
  monetizedBadge: { backgroundColor: colors.primary + '33', borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2, alignSelf: 'flex-start', marginTop: spacing.xs },
  monetizedText: { color: colors.primary, fontSize: 10, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', padding: spacing.md, gap: spacing.md },
  statCard: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
  statValue: { color: colors.foreground, fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: colors.mutedForeground, fontSize: 12, marginTop: spacing.xs },
  section: { padding: spacing.md },
  sectionTitle: { color: colors.foreground, fontSize: 16, fontWeight: '700', marginBottom: spacing.md },
  progressItem: { marginBottom: spacing.md },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  progressLabel: { color: colors.mutedForeground, fontSize: 13 },
  progressValue: { color: colors.foreground, fontSize: 13, fontWeight: '600' },
  progressBar: { height: 6, backgroundColor: colors.secondary, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md },
  actionBtnText: { flex: 1, color: colors.foreground, fontSize: 15, fontWeight: '500' },
});
