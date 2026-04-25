import { useAuthStore } from '@/src/lib/stores/authStore';

describe('authStore (mock mode)', () => {
  beforeEach(async () => {
    await useAuthStore.getState().signOut();
    useAuthStore.setState({ status: 'unknown', user: null });
  });

  it('starts OTP and verifies with demo code', async () => {
    const start = await useAuthStore.getState().startOtp('+628123');
    expect(start.verificationId).toContain('mock_');

    await expect(useAuthStore.getState().verifyOtp(start.verificationId, '000000')).rejects.toBeTruthy();

    await useAuthStore.getState().verifyOtp(start.verificationId, '123456');
    expect(useAuthStore.getState().status).toBe('signedIn');
    expect(useAuthStore.getState().user?.phoneE164).toBe('+628123');
  });
});
