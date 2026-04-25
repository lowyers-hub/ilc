import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/src/components/Button';
import { Screen } from '@/src/components/Screen';
import { useTheme } from '@/src/lib/theme/useTheme';

export default function UpgradeModal() {
  const { palette, tokens } = useTheme();
  const { feature, reason } = useLocalSearchParams<{ feature?: string; reason?: string }>();

  const copy = getPaywallCopy({
    feature: (feature as any) ?? 'document_analysis',
    reason: (reason as any) ?? 'blocked',
  });

  return (
    <Screen style={{ padding: tokens.space.lg, justifyContent: 'center' }}>
      <View style={{ gap: tokens.space.md }}>
        <Text style={{ color: palette.text, fontSize: 22, fontWeight: '900' }}>Upgrade ke Premium</Text>
        <Text style={{ color: palette.subtext, lineHeight: 20 }}>{copy.why}</Text>
        <View style={{ padding: tokens.space.md, borderWidth: 1, borderColor: palette.divider, borderRadius: tokens.radius.md, backgroundColor: palette.surface }}>
          <Text style={{ color: palette.text, fontWeight: '800' }}>Yang Anda dapatkan</Text>
          {copy.benefits.map((b, idx) => (
            <Text key={idx} style={{ color: palette.subtext, marginTop: 6, lineHeight: 20 }}>
              • {b}
            </Text>
          ))}
        </View>
        <Text style={{ color: palette.subtext, lineHeight: 20 }}>
          Billing/subscription masih ditunda. Ini paywall cerdas (stub) untuk siap dihubungkan ke pembayaran nanti.
        </Text>
        <Button title="Tutup" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

function getPaywallCopy(args: { feature: string; reason: string }) {
  if (args.feature === 'document_analysis') {
    return {
      why:
        args.reason === 'limit_reached'
          ? 'Anda telah mencapai batas analisis risiko dokumen hari ini.'
          : 'Fitur analisis risiko dokumen dibatasi untuk akun gratis.',
      benefits: ['Analisis risiko dokumen tanpa batas', 'Deteksi risiko lanjutan (premium)', 'Prioritas pemrosesan'],
    };
  }

  if (args.feature === 'draft') {
    return {
      why:
        args.reason === 'limit_reached'
          ? 'Anda telah mencapai batas pembuatan draft kontrak hari ini.'
          : 'Pembuatan draft kontrak dibatasi untuk akun gratis.',
      benefits: ['Draft kontrak tanpa batas', 'Template premium', 'Revisi & finalize lebih fleksibel'],
    };
  }

  // voice
  return {
    why: 'Voice input tersedia untuk premium.',
    benefits: ['Konsultasi via suara', 'Transkripsi cepat', 'Workflow konsultasi lebih efisien'],
  };
}
