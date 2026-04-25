import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/src/components/Button';
import { Screen } from '@/src/components/Screen';
import { TextField } from '@/src/components/TextField';
import { useCreateConsultation } from '@/src/features/marketplace/marketplaceQueries';
import { useCreatePayment } from '@/src/features/payments/paymentsQueries';
import { handleApiError } from '@/src/lib/errors/handleApiError';
import { logEvent } from '@/src/lib/telemetry/analytics';
import { useUIStore } from '@/src/lib/stores/uiStore';
import { useTheme } from '@/src/lib/theme/useTheme';

export default function ConsultationBookingScreen() {
  const { palette, tokens } = useTheme();
  const toast = useUIStore((s) => s.pushToast);
  const { lawyerId, lawyerName, source } = useLocalSearchParams<{ lawyerId: string; lawyerName?: string; source?: string }>();

  const create = useCreateConsultation();
  const createPayment = useCreatePayment();
  const [scheduleAt, setScheduleAt] = React.useState(new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16));
  const [topic, setTopic] = React.useState('');

  return (
    <Screen style={{ paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.lg }}>
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: '900' }}>Booking Konsultasi</Text>
      <Text style={{ color: palette.subtext, marginTop: 6 }}>Lawyer: {lawyerName ?? lawyerId}</Text>

      <View style={{ height: tokens.space.lg }} />
      <View style={{ gap: tokens.space.md }}>
        <TextField label="Jadwal (ISO local)" value={scheduleAt} onChangeText={setScheduleAt} />
        <TextField label="Topik" value={topic} onChangeText={setTopic} multiline />
        <Button
          title={create.isPending || createPayment.isPending ? 'Memproses…' : 'Lanjut ke Pembayaran'}
          disabled={create.isPending || createPayment.isPending || !topic.trim()}
          onPress={async () => {
            try {
              const iso = scheduleAt.includes('T') ? `${scheduleAt}:00.000Z` : new Date().toISOString();

              // TODO: replace userId with authenticated userId from /me once backend is ready.
              const consultation = await create.mutateAsync({
                lawyerId: String(lawyerId),
                scheduledAt: iso,
                topic: topic.trim(),
              });

              const payment = await createPayment.mutateAsync({
                consultationId: consultation.id,
                amount: consultation.price,
              });

              logEvent('consultation_booked', { consultationId: consultation.id, lawyerId: consultation.lawyerId });
              logEvent('payment_started', { paymentId: payment.id, consultationId: consultation.id, amount: payment.amount });

              router.push({
                pathname: '/(tabs)/lawyers/payment',
                params: {
                  paymentId: payment.id,
                  consultationId: consultation.id,
                  lawyerName: consultation.lawyerName ?? lawyerName ?? '',
                  amount: String(payment.amount),
                  checkoutUrl: payment.checkoutUrl ?? '',
                  source: String(source ?? 'booking'),
                },
              });
            } catch (e: any) {
              toast(handleApiError(e, { feature: 'marketplace', action: 'create_consultation' }).userMessage);
            }
          }}
        />
        <Button title="Batal" variant="ghost" onPress={() => router.back()} />
        <Text style={{ color: palette.subtext, fontSize: 12 }}>
          Analisis ini bersifat awal dan perlu ditinjau oleh profesional.
          {source ? ` (Sumber: ${source})` : ''}
        </Text>
      </View>
    </Screen>
  );
}
