import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/Button';
import { OtpField } from '@/src/components/OtpField';
import { Screen } from '@/src/components/Screen';
import { useAuthStore } from '@/src/lib/stores/authStore';
import { useTheme } from '@/src/lib/theme/useTheme';

export default function OtpVerifyScreen() {
  const { palette, tokens } = useTheme();
  const { verificationId, phone } = useLocalSearchParams<{ verificationId: string; phone: string }>();
  const verifyOtp = useAuthStore((s) => s.verifyOtp);

  const [code, setCode] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onVerify() {
    setError(null);
    setLoading(true);
    try {
      await verifyOtp(String(verificationId ?? ''), code);
      router.replace('/(tabs)/chat');
    } catch (e: any) {
      setError(e?.message ?? 'OTP invalid');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={{ padding: tokens.space.lg }}>
      <View style={{ gap: tokens.space.lg }}>
        <View style={{ gap: tokens.space.sm }}>
          <Text style={[styles.title, { color: palette.text }]}>Masukkan OTP</Text>
          <Text style={[styles.subtitle, { color: palette.subtext }]}>
            Kode dikirim ke <Text style={{ color: palette.text, fontWeight: '700' }}>{phone}</Text>
          </Text>
        </View>

        <OtpField value={code} onChangeText={setCode} />
        {error ? <Text style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}

        <Button title={loading ? 'Memverifikasi…' : 'Verifikasi'} onPress={onVerify} disabled={loading || code.length < 6} />
        <Button title="Kembali" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 14, lineHeight: 20 },
  error: { fontSize: 12 },
});

