import { router } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useForm } from 'react-hook-form';

import { Button } from '@/src/components/Button';
import { ListRow } from '@/src/components/ListRow';
import { Screen } from '@/src/components/Screen';
import { TextField } from '@/src/components/TextField';
import { useContractTemplates, useCreateDraft } from '@/src/features/contracts/contractsQueries';
import { useTheme } from '@/src/lib/theme/useTheme';

type FormValues = { title: string; partyA: string; partyB: string };

export default function TemplatesScreen() {
  const { palette, tokens } = useTheme();
  const templates = useContractTemplates();
  const createDraft = useCreateDraft();

  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(null);
  const form = useForm<FormValues>({ defaultValues: { title: 'Draft Kontrak', partyA: '', partyB: '' } });

  async function onSubmit(values: FormValues) {
    if (!selectedTemplateId) return;
    const draft = await createDraft.mutateAsync({
      templateId: selectedTemplateId,
      title: values.title,
      inputs: { partyA: values.partyA, partyB: values.partyB, jurisdiction: 'Indonesia' },
    });
    router.replace(`/(tabs)/contracts/${draft.id}`);
  }

  return (
    <Screen style={{ paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.lg }}>
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: '800' }}>Template Kontrak</Text>
      <Text style={{ color: palette.subtext, marginTop: 4 }}>Pilih template lalu isi input sederhana.</Text>

      <ScrollView style={{ marginTop: tokens.space.lg }}>
        <View style={{ marginBottom: tokens.space.lg }}>
          {(templates.data ?? []).map((t) => (
            <ListRow
              key={t.id}
              title={t.name}
              subtitle={t.description}
              onPress={() => setSelectedTemplateId(t.id)}
              right={<Text style={{ color: palette.subtext }}>{selectedTemplateId === t.id ? '✓' : ''}</Text>}
            />
          ))}
        </View>

        <View style={{ gap: tokens.space.md }}>
          <TextField label="Judul" value={form.watch('title')} onChangeText={(v) => form.setValue('title', v)} />
          <TextField label="Pihak A" value={form.watch('partyA')} onChangeText={(v) => form.setValue('partyA', v)} />
          <TextField label="Pihak B" value={form.watch('partyB')} onChangeText={(v) => form.setValue('partyB', v)} />
          <Button
            title={createDraft.isPending ? 'Membuat…' : 'Buat Draft'}
            onPress={form.handleSubmit(onSubmit)}
            disabled={!selectedTemplateId || createDraft.isPending}
          />
          <Button title="Batal" variant="ghost" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </Screen>
  );
}

