import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { FlatList, Text, View } from 'react-native';

import { Button } from '@/src/components/Button';
import { ListRow } from '@/src/components/ListRow';
import { Screen } from '@/src/components/Screen';
import { TextField } from '@/src/components/TextField';
import { useCreateTopic, useForumTopics } from '@/src/features/forum/forumQueries';
import { useEntitlementsStore } from '@/src/lib/stores/entitlementsStore';
import { useUIStore } from '@/src/lib/stores/uiStore';
import { useTheme } from '@/src/lib/theme/useTheme';

export default function TopicListScreen() {
  const { palette, tokens } = useTheme();
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const id = String(categoryId);

  const topics = useForumTopics(id);
  const createTopic = useCreateTopic(id);

  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const canPost = useEntitlementsStore((s) => s.canFeature('forum.posting'));
  const toast = useUIStore((s) => s.pushToast);

  return (
    <Screen style={{ paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.lg }}>
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: '800' }}>Topik</Text>

      <View style={{ marginTop: tokens.space.lg, gap: tokens.space.md }}>
        <Text style={{ color: palette.subtext, fontSize: 12 }}>Buat topik (ringkas).</Text>
        <TextField label="Judul" value={title} onChangeText={setTitle} />
        <TextField label="Pertanyaan" value={body} onChangeText={setBody} multiline />
        <Button
          title={createTopic.isPending ? 'Membuat…' : 'Posting'}
          onPress={async () => {
            if (!canPost) return toast('Fitur premium.');
            const res = await createTopic.mutateAsync({ title: title.trim(), body: body.trim() });
            setTitle('');
            setBody('');
            router.push(`/(tabs)/forum/topic/${res.topic.id}`);
          }}
          disabled={createTopic.isPending || !title.trim() || !body.trim()}
        />
      </View>

      <View style={{ height: tokens.space.xl }} />

      <FlatList
        data={topics.data ?? []}
        keyExtractor={(t) => t.id}
        refreshing={topics.isFetching}
        onRefresh={() => topics.refetch()}
        renderItem={({ item }) => (
          <ListRow
            title={item.title}
            subtitle="Ketuk untuk membuka"
            onPress={() => router.push(`/(tabs)/forum/topic/${item.id}`)}
            right={<Text style={{ color: palette.subtext }}>›</Text>}
          />
        )}
        ListEmptyComponent={
          topics.isLoading ? <Text style={{ color: palette.subtext }}>Memuat…</Text> : <Text style={{ color: palette.subtext }}>Belum ada topik.</Text>
        }
      />
    </Screen>
  );
}
