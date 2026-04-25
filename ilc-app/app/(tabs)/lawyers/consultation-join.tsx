import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/src/components/Button';
import { Screen } from '@/src/components/Screen';
import { useConsultation } from '@/src/features/marketplace/marketplaceQueries';
import { logEvent } from '@/src/lib/telemetry/analytics';
import { useTheme } from '@/src/lib/theme/useTheme';

export default function ConsultationJoinStubScreen() {
  const { palette, tokens } = useTheme();
  const { consultationId } = useLocalSearchParams<{ consultationId: string }>();
  const id = String(consultationId);
  const q = useConsultation(id);
  const c = q.data;

  const allowed = c?.status === 'confirmed' || c?.status === 'completed';

  if (!c) {
    return (
      <Screen style={{ paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.lg }}>
        <Text style={{ color: palette.subtext }}>{q.isLoading ? 'Memuat…' : 'Tidak ditemukan.'}</Text>
      </Screen>
    );
  }

  if (!allowed) {
    logEvent('consultation_join_blocked', { consultationId: c.id, status: c.status });
    return (
      <Screen style={{ paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.lg }}>
        <Text style={{ color: palette.text, fontWeight: '900' }}>Akses Ditolak</Text>
        <Text style={{ color: palette.subtext, marginTop: tokens.space.sm, lineHeight: 20 }}>
          Anda hanya dapat masuk sesi jika konsultasi sudah confirmed.
        </Text>
        <View style={{ height: tokens.space.lg }} />
        <Button title="Kembali" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.lg }}>
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: '900' }}>Sesi Konsultasi</Text>
      <Text style={{ color: palette.subtext, marginTop: tokens.space.sm }}>
        Sesi konsultasi siap dimulai (stub).
      </Text>
      <View style={{ height: tokens.space.lg }} />
      <Button title="Kembali ke Detail" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

