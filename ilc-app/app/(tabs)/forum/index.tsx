import { router } from 'expo-router';
import React from 'react';
import { FlatList, Text } from 'react-native';

import { ListRow } from '@/src/components/ListRow';
import { Screen } from '@/src/components/Screen';
import { useForumCategories } from '@/src/features/forum/forumQueries';
import { useTheme } from '@/src/lib/theme/useTheme';

export default function ForumCategoriesScreen() {
  const { palette, tokens } = useTheme();
  const categories = useForumCategories();

  return (
    <Screen style={{ paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.lg }}>
      <Text style={{ color: palette.text, fontSize: 22, fontWeight: '800', marginBottom: tokens.space.lg }}>Forum</Text>

      <FlatList
        data={categories.data ?? []}
        keyExtractor={(c) => c.id}
        refreshing={categories.isFetching}
        onRefresh={() => categories.refetch()}
        renderItem={({ item }) => (
          <ListRow
            title={item.name}
            subtitle={item.description}
            onPress={() => router.push(`/(tabs)/forum/category/${item.id}`)}
            right={<Text style={{ color: palette.subtext }}>›</Text>}
          />
        )}
        ListEmptyComponent={
          categories.isLoading ? (
            <Text style={{ color: palette.subtext }}>Memuat…</Text>
          ) : (
            <Text style={{ color: palette.subtext }}>Belum ada kategori.</Text>
          )
        }
      />
    </Screen>
  );
}

