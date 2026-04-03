import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius } from '@/constants/theme';

type Mode = 'login' | 'signup' | 'forgot';

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return Alert.alert('Error', 'Email is required');
    setLoading(true);
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        Alert.alert('Check your email', 'A password reset link has been sent.');
        setMode('login');
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: displayName } },
        });
        if (error) throw error;
        if (data.session) router.replace('/(tabs)');
        else Alert.alert('Account created!', 'Check your email to confirm, then sign in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoLetter}>A</Text>
          </View>
          <Text style={styles.logoText}>Afri<Text style={styles.logoAccent}>Tube</Text></Text>
        </View>

        <Text style={styles.title}>
          {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Join AfriTube' : 'Reset password'}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'login' ? 'Sign in to continue' : mode === 'signup' ? 'Create your account' : "We'll send you a reset link"}
        </Text>

        <View style={styles.form}>
          {mode === 'signup' && (
            <TextInput
              style={styles.input}
              placeholder="Display name"
              placeholderTextColor={colors.mutedForeground}
              value={displayName}
              onChangeText={setDisplayName}
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.mutedForeground}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {mode !== 'forgot' && (
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          )}

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.submitBtnText}>
              {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          {mode === 'login' ? (
            <>
              <TouchableOpacity onPress={() => setMode('forgot')}>
                <Text style={styles.link}>Forgot password?</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMode('signup')}>
                <Text style={styles.footerText}>Don't have an account? <Text style={styles.link}>Sign up</Text></Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => setMode('login')}>
              <Text style={styles.footerText}>Already have an account? <Text style={styles.link}>Sign in</Text></Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, padding: spacing.xl, justifyContent: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  logoIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoLetter: { color: colors.primaryForeground, fontSize: 20, fontWeight: 'bold' },
  logoText: { fontSize: 24, fontWeight: 'bold', color: colors.foreground },
  logoAccent: { color: colors.primary },
  title: { color: colors.foreground, fontSize: 26, fontWeight: 'bold', marginBottom: spacing.xs },
  subtitle: { color: colors.mutedForeground, fontSize: 14, marginBottom: spacing.xl },
  form: { gap: spacing.md },
  input: {
    backgroundColor: colors.secondary, borderRadius: radius.md,
    padding: spacing.md, color: colors.foreground, fontSize: 15,
    borderWidth: 1, borderColor: colors.border,
  },
  submitBtn: { backgroundColor: colors.primary, borderRadius: radius.full, padding: spacing.md, alignItems: 'center' },
  submitBtnText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 16 },
  footer: { marginTop: spacing.xl, gap: spacing.sm, alignItems: 'center' },
  footerText: { color: colors.mutedForeground, fontSize: 14 },
  link: { color: colors.primary, fontWeight: '600' },
});
