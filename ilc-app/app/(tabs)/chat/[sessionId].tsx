import { FlashList } from '@shopify/flash-list';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { Button } from '@/src/components/Button';
import { Chip } from '@/src/components/Chip';
import { EntitlementGate } from '@/src/components/EntitlementGate';
import { Screen } from '@/src/components/Screen';
import { useChatMessages, useSendChatMessage } from '@/src/features/chat/chatQueries';
import { isRecording, startRecording, stopRecording } from '@/src/features/voice/recorder';
import { useTranscription } from '@/src/features/voice/useTranscription';
import { enforceVoiceOrThrow } from '@/src/lib/entitlements/enforce';
import { useUIStore } from '@/src/lib/stores/uiStore';
import { useTheme } from '@/src/lib/theme/useTheme';
import type { ChatMessage } from '@/src/types/models';

export default function ChatThreadScreen() {
  const { palette, tokens } = useTheme();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const messagesQuery = useChatMessages(String(sessionId));
  const sendMutation = useSendChatMessage(String(sessionId));

  const toast = useUIStore((s) => s.pushToast);

  const [draft, setDraft] = React.useState('');
  const [recording, setRecording] = React.useState(false);
  const tx = useTranscription();
  const startingRef = React.useRef(false);
  const list = messagesQuery.data ?? [];

  async function onSend() {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    await sendMutation.mutateAsync(text);
  }

  async function onVoicePress() {
    try {
      if (startingRef.current) return;

      enforceVoiceOrThrow();

      if (!recording && !isRecording()) {
        setRecording(true);
        startingRef.current = true;
        await startRecording();
        startingRef.current = false;
        toast('Merekam… ketuk lagi untuk berhenti.');
        return;
      }

      setRecording(false);
      const file = await stopRecording();
      const res = await tx.transcribe(file);
      setDraft(res.text);
    } catch (e: any) {
      setRecording(false);
      startingRef.current = false;
      toast(e?.message ?? 'Gagal merekam/transkripsi');
    }
  }

  return (
    <Screen style={{ paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.lg }}>
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: '800', marginBottom: tokens.space.md }}>
        Konsultasi
      </Text>

      <FlashList
        data={list}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => <MessageBubble msg={item} />}
        ListFooterComponent={
          sendMutation.isPending ? (
            <Text style={{ color: palette.subtext, marginTop: tokens.space.sm }}>AI sedang menyiapkan jawaban…</Text>
          ) : null
        }
        ListEmptyComponent={
          messagesQuery.isLoading ? <Text style={{ color: palette.subtext }}>Memuat…</Text> : null
        }
      />

      <View
        style={{
          position: 'absolute',
          left: tokens.space.lg,
          right: tokens.space.lg,
          bottom: tokens.space.lg,
          gap: tokens.space.sm,
        }}
      >
        <View style={{ flexDirection: 'row', gap: tokens.space.sm }}>
          <EntitlementGate
            featureKey="chat.voice"
            accessibilityLabel="Voice input"
            testID="voice-button"
            style={{
              width: 48,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: palette.divider,
              borderRadius: tokens.radius.md,
              backgroundColor: palette.surface,
            }}
            onAllowedPress={onVoicePress}
          >
            {recording ? (
              <View
                testID="recording-indicator"
                style={{ width: 10, height: 10, borderRadius: 99, backgroundColor: palette.danger }}
              />
            ) : (
              <Text style={{ color: palette.text, fontSize: 18 }}>🎙</Text>
            )}
          </EntitlementGate>

          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Tulis pertanyaan hukum…"
            placeholderTextColor={palette.subtext}
            testID="chat-composer-input"
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: palette.divider,
              borderRadius: tokens.radius.md,
              paddingHorizontal: 14,
              paddingVertical: 12,
              backgroundColor: palette.surface,
              color: palette.text,
            }}
          />
          <Button title="Kirim" onPress={onSend} disabled={sendMutation.isPending || !draft.trim()} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: palette.subtext, fontSize: 12 }}>
            Catatan: jawaban AI bersifat informatif dan bukan nasihat hukum final.
          </Text>
          {tx.isUploading ? <ActivityIndicator size="small" /> : null}
        </View>
      </View>
    </Screen>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const { palette, tokens } = useTheme();
  const isUser = msg.role === 'user';

  return (
    <View style={{ marginBottom: tokens.space.md, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
      <View
        style={{
          maxWidth: '92%',
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: tokens.radius.lg,
          backgroundColor: isUser ? `${palette.accent}22` : palette.surface,
          borderWidth: 1,
          borderColor: palette.divider,
        }}
      >
        {msg.structured ? (
          <StructuredAI msg={msg} />
        ) : (
          <Text style={{ color: palette.text, lineHeight: 20 }}>{msg.content}</Text>
        )}

        {msg.citations?.length ? (
          <View style={{ marginTop: tokens.space.sm, gap: tokens.space.xs }}>
            <Chip label="Citations" tone="accent" />
            {msg.citations.slice(0, 2).map((c) => (
              <Text key={c.docId} style={{ color: palette.subtext, fontSize: 12, lineHeight: 16 }}>
                • {c.title ?? c.docId}: {c.snippet}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function StructuredAI({ msg }: { msg: ChatMessage }) {
  const { palette, tokens } = useTheme();
  const ai = msg.structured!;

  const sectionTitle = (t: string) => (
    <Text style={{ color: palette.subtext, fontSize: 12, fontWeight: '800', marginTop: tokens.space.sm }}>
      {t.toUpperCase()}
    </Text>
  );

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: palette.text, fontWeight: '800', lineHeight: 20 }}>{ai.summary}</Text>
      {sectionTitle('Penjelasan')}
      <Text style={{ color: palette.text, lineHeight: 20 }}>{ai.legalExplanation}</Text>

      {ai.suggestedSteps?.length ? (
        <>
          {sectionTitle('Langkah disarankan')}
          {ai.suggestedSteps.slice(0, 5).map((s, idx) => (
            <Text key={idx} style={{ color: palette.text, lineHeight: 20 }}>
              • {s}
            </Text>
          ))}
        </>
      ) : null}

      {ai.requiredDocuments?.length ? (
        <>
          {sectionTitle('Dokumen dibutuhkan')}
          {ai.requiredDocuments.slice(0, 5).map((d, idx) => (
            <Text key={idx} style={{ color: palette.text, lineHeight: 20 }}>
              • {d}
            </Text>
          ))}
        </>
      ) : null}

      {ai.risks?.length ? (
        <>
          {sectionTitle('Risiko')}
          {ai.risks.slice(0, 4).map((r, idx) => (
            <Text key={idx} style={{ color: palette.text, lineHeight: 20 }}>
              • {r}
            </Text>
          ))}
        </>
      ) : null}

      {ai.whenNeedLawyer?.length ? (
        <>
          {sectionTitle('Kapan perlu lawyer')}
          {ai.whenNeedLawyer.slice(0, 4).map((r: string, idx: number) => (
            <Text key={idx} style={{ color: palette.text, lineHeight: 20 }}>
              • {r}
            </Text>
          ))}
        </>
      ) : null}

      <View style={{ marginTop: tokens.space.sm }}>
        <Text style={{ color: palette.subtext, fontSize: 12, lineHeight: 16 }}>{ai.disclaimer}</Text>
      </View>

      {ai.escalation ? (
        <View
          style={{
            marginTop: tokens.space.sm,
            padding: tokens.space.md,
            borderWidth: 1,
            borderColor: palette.divider,
            borderRadius: tokens.radius.md,
            backgroundColor: `${palette.accent}10`,
            gap: tokens.space.sm,
          }}
        >
          <Text style={{ color: palette.text, fontWeight: '800' }}>Anda mungkin memerlukan bantuan lawyer</Text>
          <Text style={{ color: palette.subtext, lineHeight: 20 }}>
            Untuk kasus berisiko tinggi, pertimbangkan konsultasi langsung dengan lawyer.
          </Text>
          <Button
            title="Konsultasi Sekarang"
            onPress={() => router.push({ pathname: '/(tabs)/lawyers', params: { source: 'ai_escalation' } })}
          />
        </View>
      ) : null}
    </View>
  );
}
