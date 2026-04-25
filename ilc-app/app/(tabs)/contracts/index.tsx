import { router } from 'expo-router';
import React from 'react';
import { FlatList, Text, View } from 'react-native';

import { Button } from '@/src/components/Button';
import { Chip } from '@/src/components/Chip';
import { ListRow } from '@/src/components/ListRow';
import { Screen } from '@/src/components/Screen';
import { useContractDrafts } from '@/src/features/contracts/contractsQueries';
import { useEntitlementsStore } from '@/src/lib/stores/entitlementsStore';
import { useUIStore } from '@/src/lib/stores/uiStore';
import { openUpgrade } from '@/src/lib/paywall/openUpgrade';
import { useTheme } from '@/src/lib/theme/useTheme';

export default function ContractsHomeScreen() {
  const { palette, tokens } = useTheme();
  const drafts = useContractDrafts();
  const canCreateDraftNow = useEntitlementsStore((s) => s.canCreateDraftNow);
  const toast = useUIStore((s) => s.pushToast);

  return (
    <Screen style={{ paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.space.lg }}>
        <Text style={{ color: palette.text, fontSize: 22, fontWeight: '800' }}>Draft</Text>
        <Button
          title="Buat"
          onPress={() => {
            const check = canCreateDraftNow();
            if (!check.ok) {
              toast('Anda telah mencapai batas pembuatan draft hari ini.');
              openUpgrade({ feature: 'draft', reason: check.reason ?? 'blocked' });
              return;
            }
            router.push('/(tabs)/contracts/templates');
          }}
        />
      </View>

      <FlatList
        data={drafts.data ?? []}
        keyExtractor={(d) => d.id}
        refreshing={drafts.isFetching}
        onRefresh={() => drafts.refetch()}
        renderItem={({ item }) => (
          <ListRow
            title={item.title}
            subtitle={item.status === 'final' ? 'Final' : 'Draft'}
            right={<Chip label={item.status} tone={item.status === 'final' ? 'accent' : 'neutral'} />}
            onPress={() => router.push(`/(tabs)/contracts/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          drafts.isLoading ? <Text style={{ color: palette.subtext }}>Memuat…</Text> : <Text style={{ color: palette.subtext }}>Belum ada draft.</Text>
        }
      />
    </Screen>
  );
}
