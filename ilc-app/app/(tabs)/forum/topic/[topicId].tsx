import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';

import { Button } from '@/src/components/Button';
import { Chip } from '@/src/components/Chip';
import { Screen } from '@/src/components/Screen';
import { useCreatePost, useForumPosts } from '@/src/features/forum/forumQueries';
import { useTheme } from '@/src/lib/theme/useTheme';

export default function TopicDetailScreen() {
  const { palette, tokens } = useTheme();
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const id = String(topicId);

  const posts = useForumPosts(id);
  const createPost = useCreatePost(id);

  const [draft, setDraft] = React.useState('');

  return (
    <Screen style={{ paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.lg }}>
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: '800', marginBottom: tokens.space.md }}>Diskusi</Text>

      <FlatList
        data={posts.data ?? []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingBottom: 140 }}
        renderItem={({ item }) => (
          <View style={{ marginBottom: tokens.space.md, padding: tokens.space.md, borderWidth: 1, borderColor: palette.divider, borderRadius: tokens.radius.md, backgroundColor: palette.surface }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: palette.subtext, fontSize: 12 }}>{item.authorId}</Text>
              {String(item.authorId).includes('lawyer') ? <Chip label="Verified" tone="accent" /> : null}
            </View>
            <Text style={{ color: palette.text, marginTop: 4, lineHeight: 20 }}>{item.body}</Text>
          </View>
        )}
        ListEmptyComponent={posts.isLoading ? <Text style={{ color: palette.subtext }}>Memuat…</Text> : null}
      />

      <View style={{ position: 'absolute', left: tokens.space.lg, right: tokens.space.lg, bottom: tokens.space.lg, gap: tokens.space.sm }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Balas…"
          placeholderTextColor={palette.subtext}
          style={{
            borderWidth: 1,
            borderColor: palette.divider,
            borderRadius: tokens.radius.md,
            paddingHorizontal: 14,
            paddingVertical: 12,
            backgroundColor: palette.surface,
            color: palette.text,
          }}
        />
        <Button
          title={createPost.isPending ? 'Mengirim…' : 'Kirim'}
          onPress={async () => {
            await createPost.mutateAsync({ body: draft.trim() });
            setDraft('');
          }}
          disabled={createPost.isPending || !draft.trim()}
        />
      </View>
    </Screen>
  );
}
