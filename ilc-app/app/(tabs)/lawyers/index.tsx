import { router } from 'expo-router';
import React from 'react';
import { FlatList, Text } from 'react-native';

import { Chip } from '@/src/components/Chip';
import { ListRow } from '@/src/components/ListRow';
import { Screen } from '@/src/components/Screen';
import { useLawyers } from '@/src/features/marketplace/marketplaceQueries';
import { useTheme } from '@/src/lib/theme/useTheme';

export default function LawyerListScreen() {
  const { palette, tokens } = useTheme();
  const lawyers = useLawyers();

  return (
    <Screen style={{ paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.lg }}>
      <Text style={{ color: palette.text, fontSize: 22, fontWeight: '800', marginBottom: tokens.space.lg }}>
        Lawyer
      </Text>

      <FlatList
        data={lawyers.data ?? []}
        keyExtractor={(l) => l.id}
        refreshing={lawyers.isFetching}
        onRefresh={() => lawyers.refetch()}
        renderItem={({ item }) => (
          <ListRow
            title={item.name}
            subtitle={`${item.specialization.slice(0, 2).join(', ')} • ${item.experienceYears} th • Rating ${item.rating.toFixed(1)}`}
            right={<Chip label={item.verified ? 'Verified' : '—'} tone={item.verified ? 'accent' : 'neutral'} />}
            onPress={() => router.push(`/(tabs)/lawyers/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          lawyers.isLoading ? (
            <Text style={{ color: palette.subtext }}>Memuat…</Text>
          ) : (
            <Text style={{ color: palette.subtext }}>Belum ada lawyer.</Text>
          )
        }
      />
    </Screen>
  );
}

