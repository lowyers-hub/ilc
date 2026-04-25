# Plan — ILC App (Indonesia Lawyers Club) Full v1 (Frontend-first, Existing Backend)

## Summary
Build a comprehensive Expo (React Native) app that connects Indonesian clients and lawyers with AI-assisted legal triage: AI chat with Indonesian-law context (RAG), voice input, document OCR + risk analysis, contract drafting, and a community forum. Authentication will use **phone OTP**. **Billing is deferred**; the app will implement **premium gating stubs** driven by backend entitlements.

This plan assumes the backend already exists (or will be provided separately). The frontend will integrate via well-defined API contracts, with mock mode supported through `EXPO_PUBLIC_USE_MOCK_DATA`.

## Current State Analysis
- The folder currently contains **no app repository/code** (only an empty workspace). Therefore, this plan includes steps to **initialize** an Expo + TypeScript project and then add the proposed architecture.
- Known requirements from the request:
  - Frontend: Expo + TypeScript, Zustand, React Query
  - AI: LiteLLM proxy, RAG via vector search (backend-owned)
  - Features: AI chat, voice input, document analysis, draft contract, forum, billing/subscription (deferred)
  - Testing: Jest + React Native Testing Library
  - Env vars: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SOCKET_URL`, `EXPO_PUBLIC_USE_MOCK_DATA`
- UI direction (frontend-skill): restrained, premium, minimal cards, clear hierarchy, tasteful motion.

## Proposed Changes

### A) Project initialization (new files)
1. Create a new Expo app with TypeScript (managed workflow).
2. Add **expo-router** for file-based navigation.
3. Add dependencies:
   - State/data: `zustand`, `@tanstack/react-query`
   - Forms: `react-hook-form`, `zod`
   - Storage: `expo-secure-store`
   - Upload/capture: `expo-image-picker`, `expo-document-picker`, `expo-camera`, `expo-av`
   - Motion: `react-native-reanimated` (optionally `moti`)
   - Testing: `jest`, `@testing-library/react-native`, `msw`
4. Add `.env.example` and `.env` usage (Expo public env only).

**Files/directories (target)**
- `app/` (expo-router routes)
- `src/components/` (design system)
- `src/features/{auth,chat,documents,contracts,forum,account}/`
- `src/lib/{api,query,stores,theme}/`
- `src/types/`
- `__tests__/` (or `src/**/__tests__`)

### B) Core infrastructure (new/modified files)

#### 1) Navigation (expo-router)
**Create**
- `app/_layout.tsx` — root providers (QueryClientProvider, theme, etc.)
- `app/(auth)/_layout.tsx` — auth stack
- `app/(tabs)/_layout.tsx` — tab navigator
- `app/modals/*.tsx` — sheets/modals (paywall stub, report sheet, document capture)

**Routes (minimum)**
- Auth:
  - `app/(auth)/phone.tsx` (enter phone)
  - `app/(auth)/otp.tsx` (verify code)
- Tabs:
  - `app/(tabs)/chat/index.tsx`, `app/(tabs)/chat/[sessionId].tsx`
  - `app/(tabs)/documents/index.tsx`, `app/(tabs)/documents/[docId].tsx`
  - `app/(tabs)/contracts/index.tsx`, `app/(tabs)/contracts/[draftId].tsx`, `app/(tabs)/contracts/templates.tsx`
  - `app/(tabs)/forum/index.tsx`, `app/(tabs)/forum/category/[categoryId].tsx`, `app/(tabs)/forum/topic/[topicId].tsx`
  - `app/(tabs)/account/index.tsx`, `app/(tabs)/account/settings.tsx`

#### 2) API client + types (React Query)
**Create**
- `src/lib/api/client.ts`
  - Base URL from `EXPO_PUBLIC_API_URL`
  - `requestJson<T>()`, `requestMultipart<T>()`
  - `ApiError` normalization
  - Authorization header injection (access token from SecureStore)
  - One-shot refresh flow on 401: `POST /v1/auth/refresh` then retry once
- `src/lib/api/endpoints/*.ts` per feature
- `src/lib/query/queryClient.ts` — QueryClient config; retry rules, cache times
- `src/lib/query/keys.ts` — canonical query keys

**Why**
- Keeps UI and feature hooks clean.
- Centralizes auth retry and error handling.

#### 3) Stores (Zustand) + persistence
**Create**
- `src/lib/stores/authStore.ts`
  - `status: "unknown" | "signedOut" | "signedIn"`
  - tokens persisted in **expo-secure-store** (not plain storage)
  - actions: `bootstrap()`, `startOtp()`, `verifyOtp()`, `signOut()`, `refreshMe()`
- `src/lib/stores/entitlementsStore.ts`
  - fetch `/v1/entitlements`
  - `can(featureKey)` helper for premium gating stubs
- `src/lib/stores/uiStore.ts` (toasts, global modal triggers)

**Why**
- Zustand for app/session UI state; React Query for server state.

### C) Feature implementations (screens + hooks + API)

#### 1) Phone OTP authentication
**Implement**
- UI: phone entry + OTP entry (6 digits), resend timer
- API contracts:
  - `POST /v1/auth/otp/start`
  - `POST /v1/auth/otp/verify`
  - `GET /v1/me`
  - `POST /v1/auth/refresh`
- Optional Android OTP autofill (if adopting an Expo module for SMS Retriever later).

**Acceptance**
- Cold start boots auth state, routes to auth or tabs accordingly.

#### 2) AI Chat (RAG via backend)
**Implement**
- Sessions list + create session
- Thread view with messages list + composer
- Send message mutation with optimistic user message; then append assistant response.
- Support citations UI (bottom sheet/drawer) if backend returns citations/snippets.

**API contracts**
- `GET/POST /v1/chat/sessions`
- `GET /v1/chat/sessions/{id}/messages`
- `POST /v1/chat/sessions/{id}/messages`
- Optional: SSE streaming endpoint (feature-flagged) if backend supports it.

#### 3) Voice input (transcribe → insert to composer)
**Implement**
- Record audio via Expo AV
- Upload audio as multipart to backend transcription endpoint
- Insert returned text into chat input (user can edit before sending)

**API contracts**
- `POST /v1/speech/transcribe` (multipart)

**Note**
- Prefer backend transcription (e.g., Whisper) for consistent output across devices; local-only transcription can be considered later.

#### 4) Document analysis (upload → OCR → risk analysis)
**Implement**
- Import options: camera capture, image picker, document picker (PDF/image)
- Upload via multipart; show status chip (uploaded/processing/ready)
- OCR view: rendered text + copy
- Risk view: list of findings by severity; detail sheet per finding
- Polling: if backend is async, use React Query `refetchInterval` while status is `processing`.

**API contracts**
- `POST /v1/documents` (multipart)
- `GET /v1/documents`, `GET /v1/documents/{docId}`
- `POST/GET /v1/documents/{docId}/ocr`
- `POST/GET /v1/documents/{docId}/risk-analysis`

#### 5) Draft contract
**Implement**
- Templates list
- Draft creation form (simple inputs)
- Draft detail editor (markdown editor + preview toggle)
- Finalize action

**API contracts**
- `GET /v1/contracts/templates`
- `POST /v1/contracts/drafts`
- `GET /v1/contracts/drafts`, `GET /v1/contracts/drafts/{draftId}`
- `PATCH /v1/contracts/drafts/{draftId}`
- `POST /v1/contracts/drafts/{draftId}/finalize`

#### 6) Community forum
**Implement**
- Categories list
- Topic list per category (cursor pagination)
- Topic detail: posts list + reply composer
- Create topic screen
- Report post flow (bottom sheet)

**API contracts**
- `GET /v1/forum/categories`
- `GET/POST /v1/forum/categories/{categoryId}/topics`
- `GET/POST /v1/forum/topics/{topicId}/posts`
- `POST /v1/forum/posts/{postId}/report`

#### 7) Billing/subscription (deferred) → premium gating stub
**Implement**
- Call `/v1/entitlements` after login + on app resume
- Central `EntitlementGate` component:
  - If not allowed, disable action and open `UpgradeModal` (stub content only)
- Feature keys (example):
  - `chat.voice`
  - `documents.riskAnalysis`
  - `contracts.unlimitedDrafts`

**API contracts**
- `GET /v1/entitlements`

### D) UI system (frontend-skill compliant)
**Create**
- `src/lib/theme/tokens.ts` (spacing, radii, typography, colors)
- `src/components/*` for:
  - `Screen`, `TopBar`, `Button`, `TextField`, `OtpField`, `ListRow`, `Chip`, `BottomSheet`, `Toast`, `Skeleton`, `EmptyState`

**Rules**
- Default to sections, lists, dividers; avoid card mosaics.
- Use a single accent color; neutral surfaces; minimal shadows.
- Motion: 2–3 intentional motions total (screen entry, sheet open/close, message appearance).

### E) Testing strategy (Jest + RNTL + MSW)
**Create**
- `jest.config.*` and test setup file
- MSW handlers mirroring API contracts

**Minimum test coverage**
- Auth store bootstrap + OTP verify flow routing
- Chat send message: optimistic user message then assistant message
- Document upload triggers processing and transitions to ready (polling mocked)
- Forum create topic appears in topic list

## Assumptions & Decisions
- **Backend exists** and will implement the API contracts described above; the frontend will not implement NestJS in this scope.
- **Phone OTP** is the only auth method for v1.
- **Billing deferred**: no payment SDK/provider integration; only entitlement-driven gating + stub paywall UI.
- AI/RAG, OCR, risk analysis, and transcription are **backend-owned**; the mobile app never ships model/provider secrets.
- Navigation uses **expo-router**.
- Styling uses a lightweight in-house component system (no heavy UI kit) to align with the premium, restrained UI constraints.

## Verification Steps (Executor Checklist)
1. App boots on iOS/Android simulator and shows auth flow when signed out.
2. OTP flow:
   - Start OTP → verify OTP → tokens stored → user fetched → routes to tabs.
3. API integration:
   - All React Query hooks hit correct endpoints; errors are normalized.
   - Access token is attached; refresh retry works on forced 401.
4. Chat:
   - Create session, send message, display assistant response.
   - Citations render correctly when present.
   - (If enabled) streaming updates UI incrementally.
5. Voice:
   - Record audio, upload, transcription text appears in composer.
6. Documents:
   - Upload image/PDF, status updates, OCR and risk results display; polling stops when ready.
7. Contracts:
   - Create draft from template inputs, edit, finalize.
8. Forum:
   - Browse categories/topics, create topic, reply, report.
9. Premium gating:
   - Denied feature triggers upgrade stub modal consistently.
10. Tests:
   - `npm test` passes (unit + component tests) using MSW mocks.

## External References (for implementation details)
- Expo docs: Authentication patterns (OTP/magic link concepts): https://docs.expo.dev/develop/authentication/
- Expo upload example recommends FormData over base64 for performance: https://github.com/expo/image-upload-example
- Whisper in Expo/RN (local option; can also be backend): https://www.npmjs.com/package/expo-whisper

