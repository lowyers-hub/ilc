import { router } from 'expo-router';
import React from 'react';
import { FlatList, Text } from 'react-native';

import { Chip } from '@/src/components/Chip';
import { ListRow } from '@/src/components/ListRow';
import { Screen } from '@/src/components/Screen';
import { useConsultations } from '@/src/features/marketplace/marketplaceQueries';
import { useTheme } from '@/src/lib/theme/useTheme';

export default function ConsultationHistoryScreen() {
  const { palette, tokens } = useTheme();
  const consultations = useConsultations();

  return (
    <Screen style={{ paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.lg }}>
      <Text style={{ color: palette.text, fontSize: 22, fontWeight: '800', marginBottom: tokens.space.lg }}>
        Riwayat Konsultasi
      </Text>

      <FlatList
        data={consultations.data ?? []}
        keyExtractor={(c) => c.id}
        refreshing={consultations.isFetching}
        onRefresh={() => consultations.refetch()}
        renderItem={({ item }) => (
          <ListRow
            title={item.lawyerName ?? item.lawyerId}
            subtitle={`${new Date(item.scheduledAt).toLocaleString()} • ${item.topic ?? '-'}`}
            onPress={() => router.push(`/(tabs)/lawyers/consultation/${item.id}`)}
            right={
              <Chip
                label={item.status}
                tone={item.status === 'confirmed' || item.status === 'paid' ? 'accent' : item.status === 'pending_payment' ? 'neutral' : 'danger'}
              />
            }
          />
        )}
        ListEmptyComponent={
          consultations.isLoading ? (
            <Text style={{ color: palette.subtext }}>Memuat…</Text>
          ) : (
            <Text style={{ color: palette.subtext }}>Belum ada konsultasi.</Text>
          )
        }
      />

      <Text
        onPress={() => router.push('/(tabs)/lawyers')}
        style={{ color: palette.subtext, marginTop: tokens.space.lg, textAlign: 'center' }}
      >
        Cari lawyer →
      </Text>
    </Screen>
  );
}
