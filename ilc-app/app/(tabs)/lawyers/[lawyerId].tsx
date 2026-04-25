import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/src/components/Button';
import { Chip } from '@/src/components/Chip';
import { Screen } from '@/src/components/Screen';
import { useLawyer } from '@/src/features/marketplace/marketplaceQueries';
import { logEvent } from '@/src/lib/telemetry/analytics';
import { useTheme } from '@/src/lib/theme/useTheme';

export default function LawyerDetailScreen() {
  const { palette, tokens } = useTheme();
  const { lawyerId, source } = useLocalSearchParams<{ lawyerId: string; source?: string }>();
  const id = String(lawyerId);
  const lawyer = useLawyer(id);

  const l = lawyer.data;

  return (
    <Screen style={{ paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.lg }}>
      <Text style={{ color: palette.text, fontSize: 20, fontWeight: '900' }}>{l?.name ?? 'Lawyer'}</Text>
      {l ? (
        <View style={{ marginTop: tokens.space.sm, gap: tokens.space.sm }}>
          <View style={{ flexDirection: 'row', gap: tokens.space.sm, alignItems: 'center' }}>
            <Chip label={l.verified ? 'Verified' : 'Unverified'} tone={l.verified ? 'accent' : 'neutral'} />
            <Chip label={l.available ? 'Available' : 'Offline'} tone={l.available ? 'accent' : 'neutral'} />
          </View>
          <Text style={{ color: palette.subtext }}>
            Spesialisasi: <Text style={{ color: palette.text }}>{l.specialization.join(', ')}</Text>
          </Text>
          <Text style={{ color: palette.subtext }}>
            Pengalaman: <Text style={{ color: palette.text }}>{l.experienceYears} tahun</Text>
          </Text>
          <Text style={{ color: palette.subtext }}>
            Rating: <Text style={{ color: palette.text }}>{l.rating.toFixed(1)}</Text>
          </Text>
          <Text style={{ color: palette.subtext }}>
            Harga/sesi: <Text style={{ color: palette.text }}>Rp {l.pricePerSession.toLocaleString('id-ID')}</Text>
          </Text>
        </View>
      ) : (
        <Text style={{ color: palette.subtext, marginTop: tokens.space.md }}>{lawyer.isLoading ? 'Memuat…' : 'Tidak ditemukan.'}</Text>
      )}

      <View style={{ height: tokens.space.xl }} />
      <Button
        title={l?.available ? 'Booking Konsultasi' : 'Tidak tersedia'}
        disabled={!l || !l.available}
        onPress={() => {
          if (!l) return;
          logEvent('consultation_started', { lawyerId: l.id, source: String(source ?? 'lawyer_detail') });
          router.push({ pathname: '/(tabs)/lawyers/book', params: { lawyerId: l.id, lawyerName: l.name, source: String(source ?? 'lawyer_detail') } });
        }}
      />
      <View style={{ height: tokens.space.sm }} />
      <Button title="Riwayat Konsultasi" variant="secondary" onPress={() => router.push('/(tabs)/lawyers/history')} />
    </Screen>
  );
}

