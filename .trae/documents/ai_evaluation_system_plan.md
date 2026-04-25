# AI Evaluation System Plan

## Summary
Design a comprehensive AI evaluation system to systematically test and grade the Legal AI Assistant's responses. The system will introduce a structured dataset of Indonesian legal cases, define expected outputs, and implement an automated "LLM-as-a-judge" scoring mechanism to evaluate correctness, hallucination, and usefulness. Additionally, we will design a visually strong web-based Evaluation Dashboard (incorporating `frontend-skill` principles) to run tests and visualize metrics.

## Current State Analysis
- **Frontend (`ilc-app`)**: Contains a robust Jest test suite (`aiEvaluation.test.ts`) that runs offline regex/rule-based checks against a fixture dataset (`aiEvaluationCases.ts`).
- **Backend (`ilc-backend`)**: Completely lacks an automated testing framework or evaluation runner. It does, however, possess a strong production auditing table (`ai_audits`) that logs every AI interaction (latency, tokens, RAG chunks used, raw vs. sanitized output).
- **Gap**: There is no automated way to semantically grade the AI's legal reasoning or hallucination rates. Regex-based frontend tests cannot reliably score the nuance of a generated legal explanation.

## Proposed Changes

### 1. Test Dataset (Legal Cases)
Create a new JSON/YAML dataset in the backend (`ilc-backend/src/scripts/eval-dataset.json`) containing diverse Indonesian legal scenarios.
Each case will include:
- **`id`**: Unique identifier.
- **`category`**: e.g., `employment`, `contracts`, `criminal`.
- **`userMessage`**: The simulated user query (e.g., "Saya dipecat tanpa SP, apakah berhak dapat pesangon?").
- **`expectedRiskLevel`**: `low` | `medium` | `high`.
- **`expectedEscalation`**: `true` | `false`.
- **`groundTruthSummary`**: Key legal facts that *must* be present in the answer.

### 2. Expected Structured Output
The evaluation runner will expect the AI to return the standard `LegalChatResponse` schema. The evaluation will specifically target:
- `summary` & `legalExplanation`: Evaluated for semantic correctness.
- `citations`: Evaluated to ensure every cited `chunkId` actually exists in the retrieved RAG context (Hallucination check).
- `suggestedSteps`: Evaluated for practicality (Usefulness check).

### 3. Scoring Mechanism (LLM-as-a-Judge)
Implement an evaluation service (`AiEvaluatorService`) that takes the AI's generated output and passes it to a stronger, more expensive model (e.g., `gpt-4o`) configured as a strict grader.
- **Correctness (0.0 - 1.0)**: Does the `legalExplanation` align with the `groundTruthSummary`? Does it accurately reflect Indonesian law based *only* on the provided RAG context?
- **Hallucination (Binary 0 or 1)**: Did the model invent a specific law (e.g., "Pasal 378 KUHP") that was not present in the `retrievedChunkIds`? If yes, score = 0 (Fail).
- **Usefulness (0.0 - 1.0)**: Are the `suggestedSteps` actionable for an Indonesian citizen? Do they make logical sense for the specific `riskLevel`?

### 4. Automated Test Runner Concept & UI
**Backend Runner CLI:**
Create a standalone Node script (`ilc-backend/src/scripts/run-evals.ts`) that:
1. Iterates through `eval-dataset.json`.
2. Calls `AiService.chat()` for each case.
3. Passes the result to `AiEvaluatorService`.
4. Saves the results (scores, latency, token usage) to a new database table: `ai_evaluations`.

**Frontend Evaluation Dashboard (Applying `frontend-skill`):**
Create a visually striking, internal web dashboard to view these metrics.
- **Visual Thesis**: A premium, data-dense, "Linear-style" operational workspace. Calm surface hierarchy, sparse copy, and rigorous alignment.
- **Layout**: No generic card mosaics. Use a clean, edge-to-edge data table as the primary workspace.
- **Content Plan**:
  - *Header*: Minimalist navigation. "AI Evaluation Matrix".
  - *Hero/Top Bar*: Three massive, high-contrast KPI numbers: **Average Correctness**, **Hallucination Rate**, and **Average Latency**.
  - *Primary Workspace*: A dense, easily scannable list/table of individual test runs. Color-coded risk accents (Red for Hallucinations, Green for Perfect Scores).
  - *Detail Inspector*: Clicking a row slides open a side panel (smooth Framer Motion transition) comparing the AI's raw output against the Evaluator LLM's grading rationale.

## Assumptions & Decisions
- We assume `gpt-4o` (or an equivalent frontier model) will be used as the judge, requiring an OpenAI API key in the environment.
- The evaluation system will be built into the backend as a developer/admin tool, not exposed to regular app users.
- The `frontend-skill` rules strictly prohibit cluttered dashboards and generic cards, so the UI will prioritize typography, a single accent color for status, and a robust data table.

## Verification Steps
- Run the backend CLI script and verify it processes 5 test cases and successfully writes the scores to the database.
- Review the LLM-as-a-judge prompt to ensure it is not overly lenient.
- Review the frontend dashboard design to ensure it adheres to the premium, cardless aesthetic defined in the frontend-skill guidelines.