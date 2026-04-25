import { router } from 'expo-router';
import React from 'react';
import { FlatList, Text, View } from 'react-native';

import { Button } from '@/src/components/Button';
import { ListRow } from '@/src/components/ListRow';
import { Screen } from '@/src/components/Screen';
import { useCreateChatSession, useChatSessions } from '@/src/features/chat/chatQueries';
import { useTheme } from '@/src/lib/theme/useTheme';

export default function ChatHomeScreen() {
  const { palette, tokens } = useTheme();
  const sessions = useChatSessions();
  const createSession = useCreateChatSession();

  return (
    <Screen style={{ paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.space.lg }}>
        <Text style={{ color: palette.text, fontSize: 22, fontWeight: '800' }}>Chat</Text>
        <Button
          title={createSession.isPending ? '…' : 'Baru'}
          onPress={async () => {
            const s = await createSession.mutateAsync({ title: 'Chat baru' });
            router.push(`/(tabs)/chat/${s.id}`);
          }}
        />
      </View>

      <FlatList
        data={sessions.data ?? []}
        keyExtractor={(i) => i.id}
        refreshing={sessions.isFetching}
        onRefresh={() => sessions.refetch()}
        ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
        renderItem={({ item }) => (
          <ListRow
            title={item.title ?? 'Chat'}
            subtitle={
              item.classification
                ? `${item.classification.category} • ${item.classification.riskLevel.toUpperCase()}`
                : 'Ketuk untuk membuka'
            }
            onPress={() => router.push(`/(tabs)/chat/${item.id}`)}
            right={<Text style={{ color: palette.subtext }}>›</Text>}
          />
        )}
        ListEmptyComponent={
          sessions.isLoading ? (
            <Text style={{ color: palette.subtext }}>Memuat…</Text>
          ) : sessions.isError ? (
            <Text style={{ color: palette.subtext }}>Gagal memuat sesi chat. Tarik untuk coba lagi.</Text>
          ) : (
            <Text style={{ color: palette.subtext }}>Belum ada sesi chat. Tekan “Baru” untuk memulai.</Text>
          )
        }
      />
    </Screen>
  );
}
