import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/src/components/Button';
import { Chip } from '@/src/components/Chip';
import { Screen } from '@/src/components/Screen';
import { useConsultation } from '@/src/features/marketplace/marketplaceQueries';
import { logEvent } from '@/src/lib/telemetry/analytics';
import { useTheme } from '@/src/lib/theme/useTheme';

export default function ConsultationDetailScreen() {
  const { palette, tokens } = useTheme();
  const { consultationId } = useLocalSearchParams<{ consultationId: string }>();
  const id = String(consultationId);

  const q = useConsultation(id);
  const c = q.data;

  React.useEffect(() => {
    if (c) logEvent('consultation_opened', { consultationId: c.id, status: c.status });
  }, [c?.id, c?.status]);

  if (!c) {
    return (
      <Screen style={{ paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.lg }}>
        <Text style={{ color: palette.subtext }}>{q.isLoading ? 'Memuat…' : 'Tidak ditemukan.'}</Text>
      </Screen>
    );
  }

  const allowed = c.status === 'confirmed' || c.status === 'completed';
  const blockedPayment = c.status === 'pending_payment' || c.status === 'paid';

  return (
    <Screen style={{ paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.lg }}>
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: '900' }}>Sesi Konsultasi</Text>

      <View style={{ height: tokens.space.md }} />
      <View style={{ gap: tokens.space.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: palette.text, fontWeight: '800' }}>{c.lawyerName ?? c.lawyerId}</Text>
          <Chip label={c.status} tone={allowed ? 'accent' : c.status === 'cancelled' ? 'danger' : 'neutral'} />
        </View>
        <Text style={{ color: palette.subtext }}>
          Jadwal: <Text style={{ color: palette.text }}>{new Date(c.scheduledAt).toLocaleString()}</Text>
        </Text>
        <Text style={{ color: palette.subtext }}>
          Topik: <Text style={{ color: palette.text }}>{c.topic ?? '-'}</Text>
        </Text>
      </View>

      <View style={{ height: tokens.space.lg }} />
      <Text style={{ color: palette.subtext, fontSize: 12, fontWeight: '800' }}>PERSIAPAN</Text>
      <View style={{ height: tokens.space.sm }} />
      <View style={{ gap: 6 }}>
        <Text style={{ color: palette.text }}>• siapkan dokumen</Text>
        <Text style={{ color: palette.text }}>• tulis kronologi</Text>
        <Text style={{ color: palette.text }}>• catat pertanyaan utama</Text>
      </View>

      <View style={{ height: tokens.space.xl }} />

      {c.status === 'cancelled' ? (
        <View style={{ gap: tokens.space.sm }}>
          <Text style={{ color: palette.subtext, lineHeight: 20 }}>Konsultasi dibatalkan.</Text>
          <Button title="Kembali" variant="secondary" onPress={() => router.back()} />
        </View>
      ) : null}

      {blockedPayment ? (
        <View style={{ gap: tokens.space.sm }}>
          <Text style={{ color: palette.subtext, lineHeight: 20 }}>
            Pembayaran belum valid. Selesaikan pembayaran untuk mengakses sesi konsultasi.
          </Text>
          <Button
            title="Cek Status Pembayaran"
            onPress={() => {
              logEvent('consultation_join_blocked', { consultationId: c.id, status: c.status });
              router.push({
                pathname: '/(tabs)/lawyers/payment-status',
                params: { paymentId: c.paymentId ?? '', consultationId: c.id },
              });
            }}
            disabled={!c.paymentId}
          />
        </View>
      ) : null}

      {allowed ? (
        <View style={{ gap: tokens.space.sm }}>
          <Button
            title="Join Session"
            onPress={() => {
              logEvent('consultation_join_attempted', { consultationId: c.id });
              router.push({
                pathname: '/(tabs)/lawyers/consultation-join',
                params: { consultationId: c.id },
              });
            }}
          />
          <Text style={{ color: palette.subtext, fontSize: 12, lineHeight: 16 }}>
            Sesi konsultasi siap dimulai (stub). Nanti akan diganti dengan link video/chat.
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}

