import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '@/constants/theme';

export default function UploadScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Ionicons name="cloud-upload-outline" size={64} color={colors.mutedForeground} />
      <Text style={styles.title}>Upload Content</Text>
      <Text style={styles.subtitle}>Upload videos, audio tracks, and blog posts from the web dashboard.</Text>
      <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
        <Text style={styles.btnText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  title: { color: colors.foreground, fontSize: 22, fontWeight: 'bold', marginTop: spacing.md },
  subtitle: { color: colors.mutedForeground, fontSize: 14, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
  btn: { backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  btnText: { color: colors.primaryForeground, fontWeight: '600', fontSize: 16 },
});
