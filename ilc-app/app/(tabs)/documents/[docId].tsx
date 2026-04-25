import { useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/src/components/Button';
import { Chip } from '@/src/components/Chip';
import { Screen } from '@/src/components/Screen';
import { useDocument, useOcr, useRisk, useStartOcr, useStartRisk } from '@/src/features/documents/documentsQueries';
import { useEntitlementsStore } from '@/src/lib/stores/entitlementsStore';
import { useUIStore } from '@/src/lib/stores/uiStore';
import { handleApiError } from '@/src/lib/errors/handleApiError';
import { useTheme } from '@/src/lib/theme/useTheme';

export default function DocumentDetailScreen() {
  const { palette, tokens } = useTheme();
  const { docId } = useLocalSearchParams<{ docId: string }>();
  const id = String(docId);

  const doc = useDocument(id);
  const ocr = useOcr(id);
  const risk = useRisk(id);
  const startOcr = useStartOcr(id);
  const startRisk = useStartRisk(id);

  const [tab, setTab] = React.useState<'ocr' | 'risk'>('ocr');
  const canRisk = useEntitlementsStore((s) => s.canFeature('documents.riskAnalysis'));
  const toast = useUIStore((s) => s.pushToast);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  return (
    <Screen style={{ paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.lg }}>
      <View style={{ gap: tokens.space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: palette.text, fontSize: 18, fontWeight: '800' }}>{doc.data?.title ?? 'Dokumen'}</Text>
          {doc.data ? <Chip label={doc.data.status} /> : null}
        </View>
        {doc.data ? (
          <View style={{ flexDirection: 'row', gap: tokens.space.sm, alignItems: 'center' }}>
            <Text style={{ color: palette.subtext, fontSize: 12 }}>Sumber: {doc.data.source}</Text>
            <Text style={{ color: palette.subtext, fontSize: 12 }}>•</Text>
            <Text style={{ color: palette.subtext, fontSize: 12 }}>
              {new Date(doc.data.createdAt).toLocaleString()}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: tokens.space.sm, marginTop: tokens.space.md }}>
        <Button title="OCR" variant={tab === 'ocr' ? 'primary' : 'secondary'} onPress={() => setTab('ocr')} />
        <Button
          title="Risk"
          variant={tab === 'risk' ? 'primary' : 'secondary'}
          onPress={() => (canRisk ? setTab('risk') : toast('Fitur premium.'))}
        />
      </View>

      <ScrollView style={{ marginTop: tokens.space.lg }}>
        {tab === 'ocr' ? (
          <View style={{ gap: tokens.space.md }}>
            {ocr.isError ? (
              <ErrorBox message="Dokumen tidak dapat dianalisis, coba ulangi atau gunakan file lain." />
            ) : null}

            {ocr.data?.status === 'processing' ? (
              <Text style={{ color: palette.subtext }}>Memproses OCR…</Text>
            ) : null}

            {ocr.data?.result?.text ? (
              <View style={{ gap: tokens.space.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: palette.text, fontWeight: '800' }}>Hasil OCR</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={async () => {
                      await Clipboard.setStringAsync(ocr.data?.result?.text ?? '');
                      toast('Tersalin.');
                    }}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderWidth: 1,
                      borderColor: palette.divider,
                      borderRadius: tokens.radius.md,
                      backgroundColor: palette.surface,
                    }}
                  >
                    <Text style={{ color: palette.text, fontWeight: '700', fontSize: 12 }}>Copy</Text>
                  </Pressable>
                </View>
                <Text style={{ color: palette.text, lineHeight: 20 }}>{ocr.data.result.text}</Text>
                <Text style={{ color: palette.subtext, fontSize: 12, lineHeight: 18 }}>
                  Catatan: hasil OCR dan analisis bersifat informatif dan bukan nasihat hukum final.
                </Text>
              </View>
            ) : (
              <Button
                title={startOcr.isPending ? 'Memulai…' : 'Mulai OCR'}
                onPress={async () => {
                  try {
                    await startOcr.mutateAsync();
                  } catch (e: any) {
                    toast(handleApiError(e, { feature: 'documents', action: 'ocr' }).userMessage);
                  }
                }}
                disabled={startOcr.isPending || ocr.data?.status === 'processing'}
              />
            )}
          </View>
        ) : (
          <View style={{ gap: tokens.space.md }}>
            {risk.isError ? (
              <ErrorBox message="Dokumen tidak dapat dianalisis, coba ulangi atau gunakan file lain." />
            ) : null}

            {risk.data?.status === 'processing' ? <Text style={{ color: palette.subtext }}>Memproses risk…</Text> : null}

            {risk.data?.result ? (
              <View style={{ gap: tokens.space.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: palette.text, fontWeight: '800' }}>Ringkasan Risiko</Text>
                  <Chip label={risk.data.result.overallRisk} tone={risk.data.result.overallRisk === 'high' ? 'danger' : risk.data.result.overallRisk === 'medium' ? 'accent' : 'neutral'} />
                </View>
                {typeof risk.data.result.riskScore === 'number' ? (
                  <Text style={{ color: palette.subtext, fontSize: 12 }}>Skor risiko: {risk.data.result.riskScore}/100</Text>
                ) : null}

                {(['high', 'medium', 'low'] as const).map((sev) => {
                  const items = risk.data?.result?.findings?.filter((f) => f.severity === sev) ?? [];
                  if (items.length === 0) return null;

                  return (
                    <View key={sev} style={{ gap: tokens.space.sm }}>
                      <Text style={{ color: palette.subtext, fontSize: 12, fontWeight: '800' }}>
                        {sev.toUpperCase()}
                      </Text>
                      {items.map((f, idx) => {
                        const title = f.issue ?? f.title ?? 'Temuan';
                        const description = f.whyItMatters ?? f.description ?? '';
                        const clause = f.clause ? `Klausul: ${f.clause}` : '';
                        const key = `${sev}-${idx}-${title}`;
                        const open = Boolean(expanded[key]);
                        return (
                          <Pressable
                            key={key}
                            onPress={() => setExpanded((s) => ({ ...s, [key]: !open }))}
                            style={{
                              padding: tokens.space.md,
                              borderWidth: 1,
                              borderColor: palette.divider,
                              borderRadius: tokens.radius.md,
                              backgroundColor: palette.surface,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Text style={{ color: palette.text, fontWeight: '800', flex: 1, paddingRight: 12 }}>
                                {title}
                              </Text>
                              <Chip
                                label={f.severity}
                                tone={f.severity === 'high' ? 'danger' : f.severity === 'medium' ? 'accent' : 'neutral'}
                              />
                            </View>
                            {open ? (
                              <View style={{ marginTop: tokens.space.sm, gap: tokens.space.sm }}>
                                {clause ? <Text style={{ color: palette.subtext, lineHeight: 20 }}>{clause}</Text> : null}
                                {description ? <Text style={{ color: palette.text, lineHeight: 20 }}>{description}</Text> : null}
                                <Text style={{ color: palette.subtext, lineHeight: 20 }}>
                                  Rekomendasi: {f.recommendation}
                                </Text>
                              </View>
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  );
                })}

                {risk.data.result.missingClauses?.length ? (
                  <View style={{ gap: tokens.space.xs }}>
                    <Text style={{ color: palette.subtext, fontSize: 12, fontWeight: '800' }}>MISSING CLAUSES</Text>
                    {risk.data.result.missingClauses.slice(0, 6).map((x, i) => (
                      <Text key={i} style={{ color: palette.text, lineHeight: 20 }}>
                        • {x}
                      </Text>
                    ))}
                  </View>
                ) : null}

                {risk.data.result.questionsForLawyer?.length ? (
                  <View style={{ gap: tokens.space.xs }}>
                    <Text style={{ color: palette.subtext, fontSize: 12, fontWeight: '800' }}>PERTANYAAN UNTUK LAWYER</Text>
                    {risk.data.result.questionsForLawyer.slice(0, 4).map((x, i) => (
                      <Text key={i} style={{ color: palette.text, lineHeight: 20 }}>
                        • {x}
                      </Text>
                    ))}
                  </View>
                ) : null}

                <Text style={{ color: palette.subtext, fontSize: 12, lineHeight: 18 }}>
                  Ini adalah informasi umum, bukan nasihat hukum final. Untuk kepastian, konsultasikan dengan lawyer.
                </Text>
              </View>
            ) : (
              <Button
                title={startRisk.isPending ? 'Memulai…' : 'Mulai Risk Analysis'}
                onPress={async () => {
                  try {
                    await startRisk.mutateAsync();
                  } catch (e: any) {
                    toast(handleApiError(e, { feature: 'documents', action: 'risk' }).userMessage);
                  }
                }}
                disabled={startRisk.isPending || risk.data?.status === 'processing'}
              />
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function ErrorBox({ message }: { message: string }) {
  const { palette, tokens } = useTheme();
  return (
    <View
      style={{
        padding: tokens.space.md,
        borderWidth: 1,
        borderColor: palette.divider,
        borderRadius: tokens.radius.md,
        backgroundColor: `${palette.danger}10`,
      }}
    >
      <Text style={{ color: palette.text, fontWeight: '700', marginBottom: 4 }}>Gagal</Text>
      <Text style={{ color: palette.subtext, lineHeight: 20 }}>{message}</Text>
    </View>
  );
}
