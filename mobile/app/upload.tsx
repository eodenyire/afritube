import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { colors, spacing, radius } from '@/constants/theme';

type ContentType = 'video' | 'audio' | 'blog';

export default function UploadScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [contentType, setContentType] = useState<ContentType>('video');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <View style={styles.centered}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.mutedForeground} />
        <Text style={styles.gatedTitle}>Sign in to upload</Text>
        <Text style={styles.gatedSub}>Create an account to share your content with Africa.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/auth')}>
          <Text style={styles.primaryBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your media library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        contentType === 'video'
          ? ImagePicker.MediaTypeOptions.Videos
          : ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      Alert.alert('File selected', result.assets[0].uri.split('/').pop() ?? 'file');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return Alert.alert('Error', 'Title is required.');
    setLoading(true);
    try {
      const table =
        contentType === 'video' ? 'videos' :
        contentType === 'audio' ? 'audio_tracks' :
        'blog_posts';
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        user_id: user.id,
        is_published: false,
      };
      const { error } = await supabase.from(table).insert(payload);
      if (error) throw error;
      Alert.alert('Submitted!', 'Your content has been saved as a draft.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const TYPES: { key: ContentType; label: string; icon: string }[] = [
    { key: 'video', label: 'Video', icon: 'videocam-outline' },
    { key: 'audio', label: 'Audio', icon: 'musical-notes-outline' },
    { key: 'blog', label: 'Blog', icon: 'document-text-outline' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Type selector */}
      <View style={styles.typeRow}>
        {TYPES.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.typeBtn, contentType === t.key && styles.typeBtnActive]}
            onPress={() => setContentType(t.key)}
          >
            <Ionicons
              name={t.icon as any}
              size={18}
              color={contentType === t.key ? colors.primaryForeground : colors.mutedForeground}
            />
            <Text style={[styles.typeBtnText, contentType === t.key && styles.typeBtnTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* File picker */}
      {contentType !== 'blog' && (
        <TouchableOpacity style={styles.filePicker} onPress={pickMedia}>
          <Ionicons name="cloud-upload-outline" size={32} color={colors.primary} />
          <Text style={styles.filePickerText}>
            Tap to select {contentType === 'video' ? 'a video' : 'an audio file'}
          </Text>
          <Text style={styles.filePickerSub}>MP4, MOV, MP3, AAC supported</Text>
        </TouchableOpacity>
      )}

      {/* Form */}
      <View style={styles.form}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter title..."
          placeholderTextColor={colors.mutedForeground}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Describe your content..."
          placeholderTextColor={colors.mutedForeground}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Category</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Music, Comedy, Tech..."
          placeholderTextColor={colors.mutedForeground}
          value={category}
          onChangeText={setCategory}
        />

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitBtnText}>{loading ? 'Saving...' : 'Save as Draft'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl, backgroundColor: colors.background,
  },
  gatedTitle: { color: colors.foreground, fontSize: 22, fontWeight: 'bold', marginTop: spacing.md },
  gatedSub: { color: colors.mutedForeground, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.lg },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  primaryBtnText: { color: colors.primaryForeground, fontWeight: '600', fontSize: 16 },
  typeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm,
    backgroundColor: colors.secondary, borderRadius: radius.md,
  },
  typeBtnActive: { backgroundColor: colors.primary },
  typeBtnText: { color: colors.mutedForeground, fontWeight: '600', fontSize: 13 },
  typeBtnTextActive: { color: colors.primaryForeground },
  filePicker: {
    borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
    borderRadius: radius.lg, alignItems: 'center', padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  filePickerText: { color: colors.foreground, fontSize: 15, fontWeight: '600', marginTop: spacing.sm },
  filePickerSub: { color: colors.mutedForeground, fontSize: 12, marginTop: spacing.xs },
  form: { gap: spacing.sm },
  label: { color: colors.foreground, fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: colors.secondary, borderRadius: radius.md,
    padding: spacing.md, color: colors.foreground, fontSize: 15,
    borderWidth: 1, borderColor: colors.border,
  },
  textarea: { height: 100 },
  submitBtn: { backgroundColor: colors.primary, borderRadius: radius.full, padding: spacing.md, alignItems: 'center', marginTop: spacing.md },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 16 },
});
