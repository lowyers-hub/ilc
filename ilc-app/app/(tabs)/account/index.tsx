import { router } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/src/components/Button';
import { ListRow } from '@/src/components/ListRow';
import { Screen } from '@/src/components/Screen';
import { useAuthStore } from '@/src/lib/stores/authStore';
import { useEntitlementsStore } from '@/src/lib/stores/entitlementsStore';
import { useTheme } from '@/src/lib/theme/useTheme';

export default function AccountScreen() {
  const { palette, tokens } = useTheme();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const isPremium = useEntitlementsStore((s) => s.isPremium);
  const usage = useEntitlementsStore((s) => s.usage);
  const limits = useEntitlementsStore((s) => s.limits);

  return (
    <Screen style={{ paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.lg }}>
      <Text style={{ color: palette.text, fontSize: 22, fontWeight: '800', marginBottom: tokens.space.lg }}>Akun</Text>

      <View style={{ padding: tokens.space.lg, borderWidth: 1, borderColor: palette.divider, borderRadius: tokens.radius.lg, backgroundColor: palette.surface }}>
        <Text style={{ color: palette.subtext, fontSize: 12 }}>Pengguna</Text>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: '800', marginTop: 2 }}>
          {user?.displayName ?? '—'}
        </Text>
        <Text style={{ color: palette.subtext, marginTop: 4 }}>{user?.phoneE164 ?? ''}</Text>
        <Text style={{ color: palette.subtext, marginTop: 8, fontSize: 12 }}>
          Usage hari ini: Dokumen {usage.documentsAnalyzed}/{limits.documentsPerDay} • Draft {usage.draftsCreated}/{limits.draftsPerDay}
        </Text>
        <View style={{ height: tokens.space.md }} />
        <Button
          title={isPremium ? 'Premium aktif' : 'Upgrade (stub)'}
          variant="secondary"
          onPress={() => router.push('/upgrade')}
        />
      </View>

      <View style={{ height: tokens.space.lg }} />

      <ListRow title="Pengaturan" subtitle="Preferensi aplikasi" onPress={() => router.push('/(tabs)/account/settings')} />
      <ListRow title="Cari Lawyer" subtitle="Marketplace konsultasi" onPress={() => router.push('/(tabs)/lawyers')} />
      <ListRow title="Riwayat Konsultasi" subtitle="Booking dan status pembayaran" onPress={() => router.push('/(tabs)/lawyers/history')} />
      <ListRow title="Kebijakan & Legal" subtitle="S&K, privasi (placeholder)" />

      <View style={{ height: tokens.space.xl }} />
      <Button title="Keluar" variant="ghost" onPress={() => signOut()} />
    </Screen>
  );
}
