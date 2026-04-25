import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/src/components/Button';
import { Screen } from '@/src/components/Screen';

export default function UpgradeModal() {
  const { feature, reason } = useLocalSearchParams<{ feature?: string; reason?: string }>();

  const copy = getPaywallCopy({
    feature: (feature as any) ?? 'document_analysis',
    reason: (reason as any) ?? 'blocked',
  });

  return (
    <Screen className="px-4 md:px-8 justify-center">
      <View className="bg-surface border border-divider rounded-3xl p-6 shadow-xl max-w-md w-full mx-auto">
        <View className="items-center mb-6">
          <View className="w-16 h-16 bg-accent/10 rounded-full items-center justify-center mb-4">
            <Text className="text-3xl text-accent">⭐</Text>
          </View>
          <Text className="text-text text-[24px] font-extrabold tracking-tight text-center">Upgrade ke Premium</Text>
          <Text className="text-subtext text-base text-center mt-2 leading-relaxed px-4">{copy.why}</Text>
        </View>

        <View className="bg-bg border border-divider rounded-xl p-4 mb-6">
          <Text className="text-text text-[13px] font-bold uppercase tracking-wider mb-3">Keuntungan Premium</Text>
          <View className="gap-2.5">
            {copy.benefits.map((b, idx) => (
              <View key={idx} className="flex-row items-start gap-3">
                <Text className="text-accent text-base mt-0.5">✓</Text>
                <Text className="text-text text-[15px] leading-relaxed flex-1">{b}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="gap-3">
          <Button 
            title="Tingkatkan Sekarang (Rp 49.000/bln)" 
            variant="primary"
            onPress={() => {
              // TODO: Wire up to RevenueCat / Xendit
              alert('Pembayaran segera hadir.');
              router.back();
            }} 
          />
          <Button title="Nanti Saja" variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    </Screen>
  );
}

function getPaywallCopy(args: { feature: string; reason: string }) {
  if (args.feature === 'chat_limit') {
    return {
      why: 'Anda telah mencapai batas konsultasi AI harian.',
      benefits: ['Konsultasi AI tanpa batas', 'Prioritas analisis hukum', 'Tanpa waktu tunggu'],
    };
  }

  if (args.feature === 'document_analysis') {
    return {
      why:
        args.reason === 'limit_reached'
          ? 'Anda telah mencapai batas analisis risiko dokumen hari ini.'
          : 'Fitur analisis risiko dokumen dibatasi untuk akun gratis.',
      benefits: ['Analisis risiko dokumen tanpa batas', 'Deteksi klausul berbahaya', 'Rekomendasi perbaikan pasal'],
    };
  }

  if (args.feature === 'draft') {
    return {
      why:
        args.reason === 'limit_reached'
          ? 'Anda telah mencapai batas pembuatan draf kontrak hari ini.'
          : 'Pembuatan draf kontrak otomatis dibatasi untuk akun gratis.',
      benefits: ['Pembuatan draf tanpa batas', 'Akses ke semua template legal', 'Unduh dalam format Word/PDF'],
    };
  }

  // voice
  return {
    why: 'Fitur input suara eksklusif untuk pengguna Premium.',
    benefits: ['Konsultasi lebih cepat via suara', 'Transkripsi otomatis yang akurat', 'Ideal saat sedang di jalan'],
  };
}
