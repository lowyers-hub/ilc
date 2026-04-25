# UI/UX Enforcement and Validation Plan

## Summary
This plan enforces, validates, and optimizes the existing Expo UI/UX architecture to ensure cross-platform consistency and real-world scalability. It introduces NativeWind for declarative responsive styling, enforces component behavior contracts via TypeScript and Jest static validation, and resolves UX inconsistencies across mobile and web platforms.

## Current State Analysis
*   **Architecture**: Uses a custom `useTheme` with raw `StyleSheet` styling. No layout switching between Mobile Tabs and Web Sidebar.
*   **Components**: `Button`, `TextField`, `ListRow`, `Screen`, etc. lack standardized hover/focus/loading/disabled state enforcement, and minimum touch targets are not explicitly enforced.
*   **Validation**: Missing automated checks to ensure all UI elements follow the design system constraints (e.g., touch target size, required props).

## Proposed Changes

### 1. System Enforcement (NativeWind & Tokens)
*   **What**: Integrate `nativewind` (Tailwind CSS for React Native) to replace arbitrary inline styling and `StyleSheet`.
*   **Why**: Enforces spacing scales, semantic colors, and breakpoints without runtime JS calculations.
*   **How**: Install `nativewind` & `tailwindcss`, create `tailwind.config.js` mapped exactly to the existing `tokens.ts` (colors, spacing), and configure `babel.config.js` / `metro.config.js`.

### 2. Component Validation & Interaction Consistency (Phases 2 & 3)
*   **What**: Refactor `Button`, `TextField`, `ListRow`, and `Screen` to use `className` with NativeWind. Add missing states.
*   **Why**: Ensure components gracefully handle all user interactions (hover, focus, disabled, loading) and provide proper platform feedback.
*   **How**:
    *   **Button**: Add `isLoading` prop. Use `min-h-[44px]`. Add `hover:opacity-80` and `focus:ring-2` for web. Add `expo-haptics` on press for non-web.
    *   **TextField**: Add `focus` outline state. Ensure `error` prop displays accessible red borders.
    *   **ListRow**: Enforce `min-h-[44px]`.
    *   **Modal (Adaptive)**: Implement `AdaptiveModal.tsx` (using Bottom Sheet) and `AdaptiveModal.web.tsx` (using Center Dialog).

### 3. Mobile & Web UX Validation (Phases 4, 5, & 6)
*   **What**: Refine responsive navigation and container layouts. Optimize performance.
*   **Why**: Maximize usability on both platforms without UI stretching or layout thrashing.
*   **How**:
    *   **Screen**: Wrap inner content in `max-w-5xl mx-auto w-full` for web.
    *   **Navigation**: Modify `app/(tabs)/_layout.tsx` to conditionally render a Left Sidebar on `md` (Web) and Bottom Tabs on `sm` (Mobile). Use CSS breakpoints (`hidden md:flex`) instead of `useWindowDimensions`.
    *   **Lists**: Verify or migrate list rendering to `@shopify/flash-list`.

### 4. UI QA Automation & Accessibility (Phases 7 & 8)
*   **What**: Implement self-validating UI checks and enforce WCAG compliance.
*   **Why**: Prevent future regressions as the team scales.
*   **How**:
    *   Ensure `accessibilityRole` and `accessibilityLabel` are applied correctly.
    *   Create a new Jest test suite `__tests__/uiSystemValidation.test.tsx` that uses static analysis (parsing files or checking types) to ensure:
        *   Buttons have `isLoading` and `disabled` props.
        *   Inputs have `error` props.
        *   Pressables have `min-h-[44px]` (via class parsing or rendering).
        *   Hover states are present on interactive elements.

## Assumptions & Decisions
*   **Decision**: We will migrate the current `StyleSheet` + `useTheme` architecture to NativeWind. This is a significant but necessary change requested by the user to enforce "Must use NativeWind responsive classes".
*   **Decision**: We will implement UI QA Automation via a dedicated Jest test suite rather than building a custom ESLint plugin, as it is faster to set up, highly effective, and avoids external linting configuration complexity.
*   **Assumption**: The project is compatible with the standard NativeWind setup.

## Verification Steps
1.  Run `npx tailwindcss` to verify configuration.
2.  Run `npm run test` to execute the new `uiSystemValidation.test.tsx`.
3.  Check web preview to ensure max-width constraints and sidebar render correctly on large screens.
4.  Check mobile preview to ensure Bottom Tabs and haptics function as intended.
