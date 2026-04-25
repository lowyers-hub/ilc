import { FlashList } from '@shopify/flash-list';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';

import { Button } from '@/src/components/Button';
import { Chip } from '@/src/components/Chip';
import { EntitlementGate } from '@/src/components/EntitlementGate';
import { Screen } from '@/src/components/Screen';
import { useChatMessages, useSendChatMessage } from '@/src/features/chat/chatQueries';
import { isRecording, startRecording, stopRecording } from '@/src/features/voice/recorder';
import { useTranscription } from '@/src/features/voice/useTranscription';
import { enforceVoiceOrThrow } from '@/src/lib/entitlements/enforce';
import { useUIStore } from '@/src/lib/stores/uiStore';
import type { ChatMessage } from '@/src/types/models';

export default function ChatThreadScreen() {
  const { sessionId, msg: initialMsg } = useLocalSearchParams<{ sessionId: string, msg?: string }>();

  const messagesQuery = useChatMessages(String(sessionId));
  const sendMutation = useSendChatMessage(String(sessionId));

  const toast = useUIStore((s) => s.pushToast);

  const [draft, setDraft] = React.useState('');
  const [recording, setRecording] = React.useState(false);
  const tx = useTranscription();
  const startingRef = React.useRef(false);
  const list = messagesQuery.data ?? [];

  useEffect(() => {
    if (initialMsg && list.length === 0 && !sendMutation.isPending) {
      sendMutation.mutateAsync(initialMsg);
    }
  }, [initialMsg, list.length]);

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
    <Screen className="px-4 md:px-8 pt-6">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-text text-[24px] font-bold">Konsultasi</Text>
      </View>

      <FlashList
        data={list}
        inverted
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingBottom: 160 }}
        renderItem={({ item, index }) => (
          <MessageBubble 
            msg={item} 
            isLatest={index === 0} 
            onSuggestionPress={(text) => setDraft(text)} 
          />
        )}
        ListFooterComponent={
          sendMutation.isPending ? (
            <View className="p-4 items-start mb-4">
              <View className="bg-surface border border-divider px-4 py-3 rounded-2xl rounded-tl-sm flex-row items-center gap-3">
                <ActivityIndicator size="small" color="var(--color-accent)" />
                <Text className="text-subtext text-sm">AI sedang menganalisis...</Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          messagesQuery.isLoading ? (
            <Text className="text-subtext text-center mt-10">Memuat...</Text>
          ) : null
        }
      />

      <View className="absolute left-4 right-4 md:left-8 md:right-8 bottom-6 bg-bg pt-2">
        <View className="flex-row gap-3">
          <EntitlementGate
            featureKey="chat.voice"
            accessibilityLabel="Voice input"
            testID="voice-button"
            className={`w-12 items-center justify-center border border-divider rounded-xl bg-surface transition-colors ${recording ? 'bg-danger/10 border-danger' : 'hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer'}`}
            onAllowedPress={onVoicePress}
          >
            {recording ? (
              <View
                testID="recording-indicator"
                className="w-3 h-3 rounded-full bg-danger animate-pulse"
              />
            ) : (
              <Text className="text-text text-xl">🎙</Text>
            )}
          </EntitlementGate>

          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={list.length === 0 ? "Ketik pertanyaan hukum Anda di sini..." : "Balas pesan..."}
            placeholderTextColor="var(--color-subtext)"
            testID="chat-composer-input"
            className="flex-1 border border-divider rounded-xl px-4 py-3 bg-surface text-text text-base outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            multiline
            maxLength={1000}
          />
          <Button 
            title="Kirim" 
            onPress={onSend} 
            disabled={sendMutation.isPending || !draft.trim()} 
            className="self-end h-[48px]"
          />
        </View>
        <View className="flex-row items-center justify-between mt-3">
          <Text className="text-subtext text-xs">
            Catatan: AI memberikan panduan awal, bukan nasihat hukum final.
          </Text>
          {tx.isUploading ? <ActivityIndicator size="small" color="var(--color-subtext)" /> : null}
        </View>
      </View>
    </Screen>
  );
}

function MessageBubble({ msg, isLatest, onSuggestionPress }: { msg: ChatMessage, isLatest: boolean, onSuggestionPress: (text: string) => void }) {
  const isUser = msg.role === 'user';

  return (
    <View className={`mb-6 ${isUser ? 'items-end' : 'items-start'}`}>
      <View
        className={`max-w-[92%] px-4 py-3 border border-divider ${
          isUser 
            ? 'rounded-2xl rounded-tr-sm bg-accent/10' 
            : 'rounded-2xl rounded-tl-sm bg-surface shadow-sm'
        }`}
      >
        {msg.structured ? (
          <StructuredAI msg={msg} isLatest={isLatest} onSuggestionPress={onSuggestionPress} />
        ) : (
          <Text className="text-text text-[15px] leading-relaxed">{msg.content}</Text>
        )}

        {msg.citations?.length ? (
          <View className="mt-3 gap-1.5 border-t border-divider/50 pt-3">
            <Chip label="Referensi Dokumen" tone="accent" />
            {msg.citations.slice(0, 2).map((c) => (
              <Text key={c.docId} className="text-subtext text-xs leading-relaxed">
                • <Text className="font-semibold">{c.title ?? c.docId}:</Text> {c.snippet}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function StructuredAI({ msg, isLatest, onSuggestionPress }: { msg: ChatMessage, isLatest: boolean, onSuggestionPress: (text: string) => void }) {
  const ai = msg.structured!;

  const SectionTitle = ({ children }: { children: string }) => (
    <Text className="text-subtext text-[11px] font-bold mt-5 mb-1 uppercase tracking-wider">
      {children}
    </Text>
  );

  const confidenceTone = ai.confidence === 'high' ? 'success' : ai.confidence === 'medium' ? 'warning' : 'danger';
  const confidenceHelper = ai.confidence === 'high' 
    ? 'Konteks cukup kuat, tetap bukan nasihat final.' 
    : ai.confidence === 'medium' 
    ? 'Cukup relevan, tetap perlu validasi.' 
    : 'Informasi masih terbatas, perlu verifikasi.';

  const dynamicFollowUps = useMemo(() => {
    if (!ai.suggestedSteps?.length) return [
      "Bisakah Anda menjelaskan aspek hukum dari situasi ini secara lebih detail?",
      "Bisakah Anda membuatkan draf surat terkait masalah ini?"
    ];

    const contextKeywords = ai.summary.toLowerCase();
    
    if (contextKeywords.includes("phk") || contextKeywords.includes("pesangon") || contextKeywords.includes("karyawan")) {
      return [
        "Bagaimana cara menghitung pesangon yang seharusnya saya dapat?",
        "Apakah ada dasar hukum spesifik terkait PHK ini?",
        "Bisakah Anda buatkan draf surat somasi ke perusahaan?"
      ];
    }

    if (contextKeywords.includes("kontrak") || contextKeywords.includes("perjanjian")) {
      return [
        "Apa pasal yang paling berisiko dari kontrak ini?",
        "Bagaimana cara membatalkan perjanjian ini secara sah?",
        "Bisakah buatkan draf addendum kontrak?"
      ];
    }

    if (contextKeywords.includes("utang") || contextKeywords.includes("pinjaman")) {
      return [
        "Apa langkah hukum pertama jika debitur kabur?",
        "Bisakah Anda buatkan draf surat peringatan (somasi) utang?",
        "Apakah kasus ini bisa masuk ke ranah pidana?"
      ];
    }

    return [
      `Bisakah Anda jelaskan lebih rinci mengenai langkah pertama?`,
      "Apa dasar hukum (Undang-Undang) yang mengatur hal ini?",
      "Bisakah Anda membuatkan draf surat/dokumen yang dibutuhkan?"
    ];
  }, [ai.summary, ai.suggestedSteps]);

  return (
    <View className="gap-1.5">
      {ai.fallbackUsed ? (
        <View className="bg-danger/10 border border-danger/20 p-3 rounded-lg mb-3 flex-row items-start gap-2">
          <Text className="text-danger text-base mt-0.5">⚠️</Text>
          <Text className="text-danger text-xs font-semibold flex-1 leading-relaxed">
            Mode simulasi aktif. Jawaban ini digunakan untuk pengujian karena AI provider belum aktif.
          </Text>
        </View>
      ) : null}

      <Text className="text-text text-[16px] font-bold leading-snug mb-1">{ai.summary}</Text>
      
      {ai.confidence && (
        <View className="flex-row items-center flex-wrap gap-2 mb-2">
          <Chip label={`Confidence: ${ai.confidence.toUpperCase()}`} tone={confidenceTone} />
          <Text className="text-subtext text-xs italic">{confidenceHelper}</Text>
        </View>
      )}

      <SectionTitle>Analisis Hukum</SectionTitle>
      <Text className="text-text text-[15px] leading-relaxed">{ai.legalExplanation}</Text>

      {ai.suggestedSteps?.length ? (
        <>
          <SectionTitle>Langkah yang Disarankan</SectionTitle>
          <View className="gap-2">
            {ai.suggestedSteps.map((s, idx) => (
              <View 
                key={idx} 
                className={`flex-row items-start gap-2 p-2 rounded-lg ${idx === 0 ? 'bg-accent/5 border border-accent/20' : ''}`}
              >
                <View className={`w-5 h-5 rounded-full items-center justify-center mt-0.5 ${idx === 0 ? 'bg-accent text-white' : 'bg-accent/10'}`}>
                  <Text className={`text-[10px] font-bold ${idx === 0 ? 'text-white' : 'text-accent'}`}>{idx + 1}</Text>
                </View>
                <Text className={`text-[15px] leading-relaxed flex-1 ${idx === 0 ? 'text-text font-medium' : 'text-text'}`}>{s}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {ai.requiredDocuments?.length ? (
        <>
          <SectionTitle>Dokumen yang Disiapkan</SectionTitle>
          <View className="gap-1.5">
            {ai.requiredDocuments.map((d, idx) => (
              <View key={idx} className="flex-row items-start gap-2">
                <Text className="text-subtext text-sm mt-0.5">•</Text>
                <Text className="text-text text-[15px] leading-relaxed flex-1">{d}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {ai.risks?.length ? (
        <>
          <SectionTitle>Potensi Risiko</SectionTitle>
          <View className="bg-warning/10 border border-warning/20 p-3 rounded-xl gap-1.5">
            {ai.risks.map((r, idx) => (
              <View key={idx} className="flex-row items-start gap-2">
                <Text className="text-warning text-sm mt-0.5">!</Text>
                <Text className="text-text text-[14px] leading-relaxed flex-1">{r}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <View className="mt-5 border-t border-divider/50 pt-3">
        <Text className="text-subtext text-[11px] leading-relaxed italic">{ai.disclaimer}</Text>
      </View>

      {ai.escalation ? (
        <View className="mt-4 p-4 border border-accent/30 rounded-xl bg-accent/5 gap-3">
          <View className="flex-row items-center gap-2">
            <Text className="text-accent text-lg">⚖️</Text>
            <Text className="text-text font-bold flex-1">Rekomendasi Konsultasi Lanjutan</Text>
          </View>
          <Text className="text-text text-[14px] leading-relaxed">
            Untuk kasus ini, kami sangat menyarankan Anda berdiskusi langsung dengan pengacara profesional untuk mendapatkan perlindungan hukum yang pasti.
          </Text>
          <Button
            title="Temukan Pengacara"
            variant="primary"
            onPress={() => router.push({ pathname: '/(tabs)/account', params: { source: 'ai_escalation' } })}
            className="mt-1"
          />
        </View>
      ) : null}

      {isLatest && !ai.escalation ? (
        <View className="mt-5 border-t border-divider/50 pt-4">
          <Text className="text-text font-semibold mb-3">Saran pertanyaan lanjutan:</Text>
          <View className="gap-2">
            {dynamicFollowUps.map((question, idx) => (
              <Button 
                key={idx}
                title={question} 
                variant="secondary" 
                onPress={() => onSuggestionPress(question)} 
                className="justify-start items-start text-left"
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
