# Codebase Architecture Analysis Plan

## Summary
The goal of this task is to analyze the existing codebase to understand its architecture, tech stack, and structural patterns. The analysis provides a clear overview of the frontend and backend implementations, followed by an evaluation of the system's strengths and potential areas for improvement. Since the user requested analysis only, no code modifications will be made.

## Current State Analysis

### 1. Tech Stack
- **Frontend**: React Native, Expo, and Expo Router for navigation. Written in TypeScript.
- **Backend**: NestJS (Node.js framework) providing RESTful APIs. Written in TypeScript.
- **Database & Infrastructure**: PostgreSQL (managed via TypeORM) utilizing `pgvector` for vector embeddings. Redis is used for caching, rate limiting, and queueing background jobs via `BullMQ`.
- **Integrations**: OpenAI SDK for AI/RAG features.

### 2. Folder Structure
The repository uses a monorepo-style structure split between the app and backend:
- **`ilc-app/`** (Frontend)
  - `app/`: Expo Router file-based routing logic (`(auth)` vs `(tabs)`).
  - `src/components/`: Reusable core UI components.
  - `src/features/`: Domain-driven feature modules (e.g., ai, chat, contracts, documents).
  - `src/lib/`: Core utilities (api client, auth logic, query providers, stores, theme).
- **`ilc-backend/`** (Backend)
  - `src/common/`: Shared code like auth guards, decorators, rate-limiting, and caching logic.
  - `src/modules/`: Domain-specific NestJS modules (e.g., ai, auth, consultations, documents, lawyers, payments, rag).
  - `src/migrations/`: TypeORM database migrations.

### 3. Main Modules/Features
- **AI & RAG Chat**: Context-aware legal chat powered by OpenAI and Retrieval-Augmented Generation (RAG). Retrieves document chunks from PostgreSQL using `pgvector`.
- **Documents Analysis**: Allows users to upload legal documents which are processed asynchronously by backend workers (`BullMQ`).
- **Lawyers & Consultations**: A directory of lawyers, integrated with a booking and tracking system for consultations.
- **Payments**: Processing transactions for premium features and consultation bookings.
- **Contracts**: Providing templates and managing contract drafts.
- **Forum**: Community discussions structured by categories and topics.

### 4. Routing System
- **Frontend**: File-based routing powered by Expo Router. The `app/_layout.tsx` splits navigation into unauthenticated `(auth)` flows and authenticated `(tabs)` flows.
- **Backend**: Standard NestJS routing. Controllers use decorators like `@Controller('auth')` and `@Post('login')` to map class methods to REST endpoints.

### 5. Authentication Flow
- **Login**: Users authenticate using a phone number OTP flow. The app submits the phone number to the backend (`/v1/auth/login`) and receives JWT tokens (access and refresh).
- **Storage**: The frontend securely persists tokens locally using `expo-secure-store`.
- **Backend Validation**: The backend uses Passport.js (`@nestjs/passport`) and a JWT strategy to validate requests. Protected routes are wrapped with a `JwtAuthGuard`, which injects a `CurrentUser` object into the request context.

### 6. API/Data Fetching Pattern
- **Frontend Client**: A robust custom `fetch` wrapper (`src/lib/api/client.ts`) handles request timeouts via `AbortController`, error parsing, and automatically injects the JWT Bearer token into headers.
- **Token Refresh**: The API client intelligently intercepts `401 Unauthorized` responses and automatically negotiates a token refresh in the background before retrying the failed request.
- **Backend endpoints**: The backend exposes standard RESTful JSON endpoints. Input payloads are mapped to Data Transfer Objects (DTOs) and strictly validated using `class-validator`.

### 7. State Management
- **Server State**: `TanStack React Query` is heavily used to fetch, mutate, and cache server data.
- **Client & Auth State**: `Zustand` handles global client state, such as tracking the authentication session (`status`, `user`) via an `authStore`.

### 8. UI/Component Structure
- **Core Components**: A collection of reusable, atomic generic UI elements (e.g., `Button`, `TextField`, `Screen`) resides in `src/components/`. 
- **Styling**: Relies on standard React Native `StyleSheet`.
- **Theming**: A custom `useTheme` hook dynamically supplies design tokens (colors, spacing, radiuses) based on the device's color scheme to ensure consistent rendering across light and dark modes.

## Proposed Changes (Potential Improvements)

### Strengths of Current Architecture
1. **Domain-Driven Design (DDD)**: Both the frontend (`src/features`) and backend (`src/modules`) group code by feature/domain. This prevents tightly coupled spaghetti code and makes scaling easier.
2. **Robust and Modern Tech Stack**: Leveraging React Native with Expo Router, NestJS, and PostgreSQL provides a scalable, type-safe, and highly maintainable foundation.
3. **AI-Ready Infrastructure**: The native integration of `pgvector` directly in PostgreSQL avoids the complexity of a separate vector database (like Pinecone) while keeping RAG queries fast.
4. **Resilient API Handling**: The custom frontend API client with built-in JWT refresh logic and TanStack Query ensures a smooth UX even during token expirations or flaky network conditions.
5. **Scalable Background Jobs**: Using Redis and BullMQ for document processing ensures the main Node.js event loop isn't blocked by heavy asynchronous tasks.

### Weaknesses & Potential Improvements
1. **Monorepo Tooling Missing**: While the folders (`ilc-app` and `ilc-backend`) sit together, there is no explicit mention of a monorepo manager (like Nx or Turborepo). Introducing one could significantly improve shared TypeScript types (e.g., DTOs) and build caching between the front and back ends.
2. **API Type Syncing**: Currently, without a tool like OpenAPI/Swagger client generation (e.g., `openapi-ts`), the frontend might be manually duplicating types for API responses. Automating this would reduce human error.
3. **Styling Scalability**: Relying purely on standard React Native `StyleSheet` can become verbose. Introducing a utility-first styling library like NativeWind (Tailwind for React Native) or Tamagui could accelerate UI development and maintain consistency.
4. **Offline Support**: If the legal app needs to function offline (e.g., reading downloaded contracts), relying purely on TanStack Query cache might not be enough. An offline-first database like WatermelonDB or Expo SQLite could be beneficial.

## Assumptions & Decisions
- The user requested an architectural analysis only. 
- No code will be modified during this phase. 
- The project structure is mostly separated into distinct frontend and backend folders.

## Verification Steps
- Present the analysis to the user for review.
- Confirm if any specific module needs a deeper dive or if any of the potential improvements should be converted into actionable tasks.