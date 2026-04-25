import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/Button';
import { Screen } from '@/src/components/Screen';
import { TextField } from '@/src/components/TextField';
import { useAuthStore } from '@/src/lib/stores/authStore';
import { useTheme } from '@/src/lib/theme/useTheme';

export default function PhoneEntryScreen() {
  const { palette, tokens } = useTheme();
  const startOtp = useAuthStore((s) => s.startOtp);

  const [phone, setPhone] = React.useState('+62');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSend() {
    setError(null);
    setLoading(true);
    try {
      const res = await startOtp(phone.trim());
      router.push({ pathname: '/(auth)/otp', params: { verificationId: res.verificationId, phone: phone.trim() } });
    } catch (e: any) {
      setError(e?.message ?? 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={{ padding: tokens.space.lg }}>
      <View style={{ gap: tokens.space.lg }}>
        <View style={{ gap: tokens.space.sm }}>
          <Text style={[styles.brand, { color: palette.text }]}>ILC</Text>
          <Text style={[styles.title, { color: palette.text }]}>Masuk dengan nomor HP</Text>
          <Text style={[styles.subtitle, { color: palette.subtext }]}>
            Kami akan mengirim kode OTP untuk verifikasi.
          </Text>
        </View>

        <TextField
          label="Nomor HP (E.164)"
          value={phone}
          onChangeText={setPhone}
          autoCapitalize="none"
          keyboardType="phone-pad"
          placeholder="+628123456789"
          error={error ?? undefined}
        />

        <Button title={loading ? 'Mengirim…' : 'Kirim OTP'} onPress={onSend} disabled={loading || !phone.trim()} />

        <Text style={[styles.footnote, { color: palette.subtext }]}>
          Demo mode: gunakan OTP <Text style={{ color: palette.text, fontWeight: '700' }}>123456</Text> (jika mock
          data aktif).
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 14, lineHeight: 20 },
  footnote: { marginTop: 8, fontSize: 12, lineHeight: 18 },
});

