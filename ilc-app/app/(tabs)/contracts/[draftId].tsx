import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { Button } from '@/src/components/Button';
import { Chip } from '@/src/components/Chip';
import { Screen } from '@/src/components/Screen';
import { useContractDraft, useFinalizeDraft, useUpdateDraft } from '@/src/features/contracts/contractsQueries';
import { useTheme } from '@/src/lib/theme/useTheme';

export default function DraftDetailScreen() {
  const { palette, tokens } = useTheme();
  const { draftId } = useLocalSearchParams<{ draftId: string }>();
  const id = String(draftId);

  const draft = useContractDraft(id);
  const update = useUpdateDraft(id);
  const finalize = useFinalizeDraft(id);

  const [text, setText] = React.useState('');

  React.useEffect(() => {
    if (draft.data?.contentMarkdown) setText(draft.data.contentMarkdown);
  }, [draft.data?.contentMarkdown]);

  return (
    <Screen style={{ paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: '800' }} numberOfLines={1}>
          {draft.data?.title ?? 'Draft'}
        </Text>
        {draft.data ? <Chip label={draft.data.status} tone={draft.data.status === 'final' ? 'accent' : 'neutral'} /> : null}
      </View>

      <ScrollView style={{ marginTop: tokens.space.lg }}>
        <TextInput
          multiline
          value={text}
          onChangeText={setText}
          style={{
            minHeight: 260,
            borderWidth: 1,
            borderColor: palette.divider,
            borderRadius: tokens.radius.md,
            backgroundColor: palette.surface,
            color: palette.text,
            padding: 14,
            textAlignVertical: 'top',
          }}
        />

        <View style={{ height: tokens.space.md }} />
        <Button
          title={update.isPending ? 'Menyimpan…' : 'Simpan'}
          onPress={() => update.mutateAsync({ contentMarkdown: text })}
          disabled={update.isPending || !draft.data || draft.data.status === 'final'}
        />
        <View style={{ height: tokens.space.sm }} />
        <Button
          title={finalize.isPending ? 'Memfinalisasi…' : 'Finalize'}
          variant="secondary"
          onPress={() => finalize.mutateAsync()}
          disabled={finalize.isPending || !draft.data || draft.data.status === 'final'}
        />
      </ScrollView>
    </Screen>
  );
}

