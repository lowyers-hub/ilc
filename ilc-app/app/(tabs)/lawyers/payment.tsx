import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/src/components/Button';
import { Screen } from '@/src/components/Screen';
import { useSimulatePaymentFailed, useSimulatePaymentSuccess } from '@/src/features/payments/paymentsQueries';
import { handleApiError } from '@/src/lib/errors/handleApiError';
import { logEvent } from '@/src/lib/telemetry/analytics';
import { useUIStore } from '@/src/lib/stores/uiStore';
import { useTheme } from '@/src/lib/theme/useTheme';

export default function PaymentScreen() {
  const { palette, tokens } = useTheme();
  const toast = useUIStore((s) => s.pushToast);
  const { paymentId, consultationId, lawyerName, amount, checkoutUrl } = useLocalSearchParams<{
    paymentId: string;
    consultationId: string;
    lawyerName?: string;
    amount?: string;
    checkoutUrl?: string;
  }>();

  const paySuccess = useSimulatePaymentSuccess();
  const payFailed = useSimulatePaymentFailed();

  const amt = Number(amount ?? '0');

  return (
    <Screen style={{ paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.lg }}>
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: '900' }}>Pembayaran</Text>
      <Text style={{ color: palette.subtext, marginTop: 6 }}>Lawyer: {lawyerName ?? '-'}</Text>
      <Text style={{ color: palette.subtext, marginTop: 6 }}>
        Total: <Text style={{ color: palette.text, fontWeight: '800' }}>Rp {amt.toLocaleString('id-ID')}</Text>
      </Text>

      <View style={{ height: tokens.space.lg }} />
      <View style={{ gap: tokens.space.sm }}>
        {checkoutUrl ? (
          <Button
            title="Buka Midtrans Checkout"
            variant="secondary"
            onPress={async () => {
              try {
                await WebBrowser.openBrowserAsync(String(checkoutUrl));
                router.replace({
                  pathname: '/(tabs)/lawyers/payment-status',
                  params: { paymentId: String(paymentId), consultationId: String(consultationId) },
                });
              } catch (e: any) {
                toast(handleApiError(e, { feature: 'payments', action: 'open_checkout' }).userMessage);
              }
            }}
          />
        ) : null}

        <Button
          title={paySuccess.isPending ? 'Memproses…' : 'Bayar Sekarang (simulasi sukses)'}
          disabled={paySuccess.isPending || payFailed.isPending}
          onPress={async () => {
            try {
              const p = await paySuccess.mutateAsync(String(paymentId));
              logEvent('payment_success', { paymentId: p.id, consultationId: String(consultationId) });
              router.replace({ pathname: '/(tabs)/lawyers/payment-status', params: { paymentId: p.id, consultationId: String(consultationId) } });
            } catch (e: any) {
              logEvent('payment_failed', { paymentId: String(paymentId), consultationId: String(consultationId), reason: e?.message });
              toast(handleApiError(e, { feature: 'payments', action: 'pay' }).userMessage);
            }
          }}
        />

        <Button
          title={payFailed.isPending ? 'Memproses…' : 'Simulasi Gagal'}
          variant="secondary"
          disabled={paySuccess.isPending || payFailed.isPending}
          onPress={async () => {
            try {
              const p = await payFailed.mutateAsync(String(paymentId));
              logEvent('payment_failed', { paymentId: p.id, consultationId: String(consultationId), reason: 'simulated' });
              router.replace({ pathname: '/(tabs)/lawyers/payment-status', params: { paymentId: p.id, consultationId: String(consultationId) } });
            } catch (e: any) {
              toast(handleApiError(e, { feature: 'payments', action: 'fail' }).userMessage);
            }
          }}
        />

        <Button title="Batal" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
