import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/src/components/Button';
import { Chip } from '@/src/components/Chip';
import { Screen } from '@/src/components/Screen';
import { useConsultation, useConfirmConsultation } from '@/src/features/marketplace/marketplaceQueries';
import { usePayment } from '@/src/features/payments/paymentsQueries';
import { env } from '@/src/lib/env';
import { logEvent } from '@/src/lib/telemetry/analytics';
import { useTheme } from '@/src/lib/theme/useTheme';

export default function PaymentStatusScreen() {
  const { palette, tokens } = useTheme();
  const { paymentId, consultationId } = useLocalSearchParams<{ paymentId: string; consultationId?: string }>();
  const pid = String(paymentId ?? '');
  const cid = String(consultationId ?? '');

  const payment = usePayment(pid);
  const consultation = useConsultation(cid);
  const confirm = useConfirmConsultation();

  const syncStartedRef = React.useRef<number | null>(null);
  const [showRetry, setShowRetry] = React.useState(false);

  React.useEffect(() => {
    if (!pid || !cid) return;
    if (syncStartedRef.current == null) {
      syncStartedRef.current = Date.now();
      logEvent('payment_consultation_sync_started', { paymentId: pid, consultationId: cid });
    }
  }, [pid, cid]);

  const paymentStatus = payment.data?.status ?? (payment.isLoading ? 'loading' : 'unknown');
  const consultStatus = consultation.data?.status ?? (consultation.isLoading ? 'loading' : 'unknown');

  const isMismatch =
    payment.data?.status === 'paid' &&
    (consultation.data?.status === 'pending_payment' || consultation.data?.status === 'paid');

  const isConfirmed = consultation.data?.status === 'confirmed' || consultation.data?.status === 'completed';

  // Auto-confirm (guarded by flag)
  React.useEffect(() => {
    if (!env.autoConfirmConsultation) return;
    if (!pid || !cid) return;
    if (confirm.isPending) return;
    if (payment.data?.status === 'paid' && consultation.data && !isConfirmed) {
      confirm.mutate(cid, {
        onSuccess: () => {
          logEvent('payment_consultation_sync_success', { paymentId: pid, consultationId: cid });
          router.replace(`/(tabs)/lawyers/consultation/${cid}`);
        },
      });
    }
  }, [pid, cid, payment.data?.status, consultation.data?.status, env.autoConfirmConsultation]);

  // Final state → navigate to consultation detail
  React.useEffect(() => {
    if (!pid || !cid) return;
    if (isConfirmed) {
      logEvent('payment_consultation_sync_success', { paymentId: pid, consultationId: cid });
      router.replace(`/(tabs)/lawyers/consultation/${cid}`);
    }
  }, [pid, cid, isConfirmed]);

  // Failsafe: mismatch persists > 10s
  React.useEffect(() => {
    if (!pid || !cid) return;
    if (!isMismatch) {
      setShowRetry(false);
      return;
    }

    const start = syncStartedRef.current ?? Date.now();
    const t = setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed > 10_000) {
        setShowRetry(true);
        logEvent('payment_consultation_sync_failed', { paymentId: pid, consultationId: cid, reason: 'mismatch_timeout' });
        clearInterval(t);
      }
    }, 500);
    return () => clearInterval(t);
  }, [pid, cid, isMismatch]);

  return (
    <Screen style={{ paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.lg }}>
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: '900' }}>Status Pembayaran</Text>

      <View style={{ height: tokens.space.md }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: palette.subtext }}>Payment ID</Text>
        <Text style={{ color: palette.text, fontWeight: '700' }}>{pid}</Text>
      </View>

      <View style={{ height: tokens.space.md }} />
      <Chip
        label={`payment: ${String(paymentStatus)}`}
        tone={paymentStatus === 'paid' ? 'accent' : paymentStatus === 'failed' ? 'danger' : 'neutral'}
      />

      <View style={{ height: tokens.space.sm }} />
      <Chip
        label={`consultation: ${String(consultStatus)}`}
        tone={consultStatus === 'confirmed' || consultStatus === 'completed' ? 'accent' : consultStatus === 'cancelled' ? 'danger' : 'neutral'}
      />

      <View style={{ height: tokens.space.lg }} />
      {!cid ? (
        <Text style={{ color: palette.subtext, lineHeight: 20 }}>Consultation ID tidak tersedia.</Text>
      ) : null}

      {paymentStatus === 'requires_action' ? (
        <Text style={{ color: palette.subtext, lineHeight: 20 }}>
          Menunggu pembayaran… (polling)
        </Text>
      ) : null}
      {isMismatch ? (
        <Text style={{ color: palette.subtext, lineHeight: 20 }}>
          Menunggu konfirmasi sistem
        </Text>
      ) : null}

      {paymentStatus === 'paid' && isConfirmed ? (
        <Text style={{ color: palette.subtext, lineHeight: 20 }}>
          Pembayaran berhasil. Konsultasi Anda terkonfirmasi.
        </Text>
      ) : null}
      {paymentStatus === 'failed' ? (
        <Text style={{ color: palette.subtext, lineHeight: 20 }}>
          Pembayaran gagal. Silakan coba lagi.
        </Text>
      ) : null}

      <View style={{ height: tokens.space.lg }} />
      {showRetry ? (
        <Button
          title="Coba Sinkronisasi Lagi"
          variant="secondary"
          onPress={async () => {
            setShowRetry(false);
            syncStartedRef.current = Date.now();
            logEvent('payment_consultation_sync_started', { paymentId: pid, consultationId: cid });
            await Promise.all([payment.refetch(), consultation.refetch()]);
          }}
        />
      ) : null}
      <View style={{ height: tokens.space.sm }} />
      <Button title="Lihat Riwayat Konsultasi" onPress={() => router.replace('/(tabs)/lawyers/history')} />
    </Screen>
  );
}
