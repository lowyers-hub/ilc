import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('http://localhost/v1/ping', () => HttpResponse.json({ ok: true })),
  http.get('http://localhost/v1/me', () =>
    HttpResponse.json({
      id: 'user_1',
      phoneE164: '+628111111111',
      displayName: 'Test User',
      createdAt: new Date().toISOString(),
      entitlements: { isPremium: false, features: {} },
    })
  ),
  http.get('http://localhost/v1/entitlements', () =>
    HttpResponse.json({
      isPremium: false,
      features: { 'chat.voice': false },
    })
  ),
];

