import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import React from 'react';
import { Text, View, Pressable } from 'react-native';

import { Button } from '@/src/components/Button';
import { ListRow } from '@/src/components/ListRow';
import { Screen } from '@/src/components/Screen';
import { useCreateChatSession, useChatSessions } from '@/src/features/chat/chatQueries';

const SUGGESTIONS = [
  "Apa syarat sah perjanjian?",
  "Saya di-PHK mendadak tanpa surat...",
  "Teman saya utang tapi tidak mau bayar",
];

export default function ChatHomeScreen() {
  const sessions = useChatSessions();
  const createSession = useCreateChatSession();

  const handleCreateSession = async (initialMessage?: string) => {
    const s = await createSession.mutateAsync({ title: initialMessage ? initialMessage.slice(0, 30) + '...' : 'Chat baru' });
    router.push(`/(tabs)/chat/${s.id}${initialMessage ? `?msg=${encodeURIComponent(initialMessage)}` : ''}`);
  };

  return (
    <Screen className="px-4 md:px-8 pt-6">
      <View className="flex-row items-center justify-between mb-6">
        <Text className="text-text text-[28px] font-extrabold tracking-tight">Konsultasi AI</Text>
        <Button
          title={createSession.isPending ? '...' : 'Chat Baru'}
          onPress={() => handleCreateSession()}
          isLoading={createSession.isPending}
        />
      </View>

      <FlashList
        data={sessions.data ?? []}
        keyExtractor={(i) => i.id}
        refreshing={sessions.isFetching}
        onRefresh={() => sessions.refetch()}
        ItemSeparatorComponent={() => <View className="h-0" />}
        renderItem={({ item }) => (
          <ListRow
            title={item.title ?? 'Chat'}
            subtitle={
              item.classification
                ? `${item.classification.category} • Risiko: ${item.classification.riskLevel.toUpperCase()}`
                : 'Ketuk untuk melanjutkan'
            }
            onPress={() => router.push(`/(tabs)/chat/${item.id}`)}
            right={<Text className="text-subtext text-xl">›</Text>}
          />
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center pt-20 pb-10">
            {sessions.isLoading ? (
              <Text className="text-subtext text-base">Memuat riwayat chat...</Text>
            ) : sessions.isError ? (
              <Text className="text-danger text-base">Gagal memuat sesi. Tarik ke bawah untuk coba lagi.</Text>
            ) : (
              <View className="items-center w-full max-w-md">
                <View className="w-16 h-16 bg-accent/10 rounded-full items-center justify-center mb-6">
                  <Text className="text-accent text-2xl">⚖️</Text>
                </View>
                <Text className="text-text text-xl font-bold mb-2 text-center">Mulai Konsultasi Hukum</Text>
                <Text className="text-subtext text-base text-center mb-8 px-4 leading-relaxed">
                  Ceritakan masalah hukum Anda. AI kami akan membantu menganalisis situasi dan memberikan panduan awal.
                </Text>
                
                <View className="w-full gap-3">
                  <Text className="text-subtext text-sm font-semibold mb-1 uppercase tracking-wider">Coba tanyakan:</Text>
                  {SUGGESTIONS.map((suggestion, idx) => (
                    <Pressable
                      key={idx}
                      className="bg-surface border border-divider rounded-xl p-4 hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] transition-all"
                      onPress={() => handleCreateSession(suggestion)}
                    >
                      <Text className="text-text text-base">{suggestion}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>
        }
      />
    </Screen>
  );
}
