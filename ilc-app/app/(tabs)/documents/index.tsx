import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { FlatList, Text, View } from 'react-native';

import { Chip } from '@/src/components/Chip';
import { ListRow } from '@/src/components/ListRow';
import { Screen } from '@/src/components/Screen';
import { useCreateDocument, useDocuments } from '@/src/features/documents/documentsQueries';
import { useUIStore } from '@/src/lib/stores/uiStore';
import { useTheme } from '@/src/lib/theme/useTheme';

export default function DocumentsHomeScreen() {
  const { palette, tokens } = useTheme();
  const docs = useDocuments();
  const createDoc = useCreateDocument();
  const toast = useUIStore((s) => s.pushToast);

  async function pickFile() {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    const f = res.assets[0];
    const doc = await createDoc.mutateAsync({
      uri: f.uri,
      name: f.name ?? 'document',
      mimeType: f.mimeType ?? 'application/octet-stream',
      source: 'file',
    });
    toast('Dokumen diupload. Memproses…');
    router.push(`/(tabs)/documents/${doc.id}`);
  }

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return toast('Izin galeri diperlukan.');
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (res.canceled) return;
    const a = res.assets[0];
    const doc = await createDoc.mutateAsync({
      uri: a.uri,
      name: 'photo.jpg',
      mimeType: a.mimeType ?? 'image/jpeg',
      source: 'camera',
    });
    toast('Gambar diupload. Memproses…');
    router.push(`/(tabs)/documents/${doc.id}`);
  }

  return (
    <Screen style={{ paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.lg }}>
      <Text style={{ color: palette.text, fontSize: 22, fontWeight: '800', marginBottom: tokens.space.lg }}>
        Dokumen
      </Text>

      <View style={{ flexDirection: 'row', gap: tokens.space.sm, marginBottom: tokens.space.lg }}>
        <View style={{ flex: 1 }}>
          <Text
            onPress={() => pickFile()}
            style={{
              textAlign: 'center',
              color: palette.text,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: palette.divider,
              borderRadius: tokens.radius.md,
              backgroundColor: palette.surface,
              fontWeight: '700',
            }}
          >
            Pilih File
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            onPress={() => pickPhoto()}
            style={{
              textAlign: 'center',
              color: palette.text,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: palette.divider,
              borderRadius: tokens.radius.md,
              backgroundColor: palette.surface,
              fontWeight: '700',
            }}
          >
            Pilih Foto
          </Text>
        </View>
      </View>

      <FlatList
        data={docs.data ?? []}
        keyExtractor={(i) => i.id}
        refreshing={docs.isFetching}
        onRefresh={() => docs.refetch()}
        renderItem={({ item }) => (
          <ListRow
            title={item.title}
            subtitle={`Sumber: ${item.source}`}
            right={<Chip label={item.status} tone={item.status === 'failed' ? 'danger' : 'neutral'} />}
            onPress={() => router.push(`/(tabs)/documents/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          docs.isLoading ? (
            <Text style={{ color: palette.subtext }}>Memuat…</Text>
          ) : docs.isError ? (
            <Text style={{ color: palette.subtext }}>Gagal memuat dokumen. Tarik untuk coba lagi.</Text>
          ) : (
            <Text style={{ color: palette.subtext }}>Belum ada dokumen. Unggah PDF/foto untuk mulai analisis.</Text>
          )
        }
      />

      <View style={{ height: tokens.space['2xl'] }} />
      {createDoc.isPending ? <Text style={{ color: palette.subtext, fontSize: 12 }}>Mengunggah…</Text> : null}
    </Screen>
  );
}
