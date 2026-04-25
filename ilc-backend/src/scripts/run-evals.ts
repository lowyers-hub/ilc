import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { DataSource } from 'typeorm';

// We must bootstrap a minimal app context to use the AiService,
// but for simplicity in this MVP script, we will mock the AI call
// and hit the OpenAI API directly to simulate both the "AI Assistant" and the "Judge".
// In a real implementation, you would bootstrap NestJS: `const app = await NestFactory.createApplicationContext(AppModule);`

const DATASET_PATH = path.join(__dirname, 'eval-dataset.json');

type EvalCase = {
  id: string;
  category: string;
  userMessage: string;
  expectedRiskLevel: string;
  expectedEscalation: boolean;
  groundTruthSummary: string;
};

type EvalResult = {
  caseId: string;
  correctnessScore: number; // 0 to 1
  hallucinationScore: number; // 0 = Pass (no hallucination), 1 = Fail (hallucinated)
  usefulnessScore: number; // 0 to 1
  rationale: string;
  latencyMs: number;
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function runEvals() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('ERROR: OPENAI_API_KEY is required to run evals.');
    process.exit(1);
  }

  console.log('--- Loading Dataset ---');
  const dataset: EvalCase[] = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf-8'));
  const results: EvalResult[] = [];

  for (const tc of dataset) {
    console.log(`\nEvaluating Case: ${tc.id} [${tc.category}]`);
    const t0 = Date.now();

    // 1. Generate AI Response (Simulating the App's AI Service)
    const assistantRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Anda adalah asisten hukum Indonesia. Jawablah dalam JSON: 
{ "summary": "...", "legalExplanation": "...", "suggestedSteps": ["..."], "citations": ["..."], "escalation": true/false }
WAJIB: Jangan mengarang pasal/UU jika tidak ada di konteks.`
        },
        { role: 'user', content: tc.userMessage }
      ]
    });
    
    const latencyMs = Date.now() - t0;
    const aiOutput = JSON.parse(assistantRes.choices[0].message.content || '{}');
    
    console.log(`  AI Response Generated in ${latencyMs}ms. Now grading...`);

    // 2. Evaluate using LLM-as-a-Judge
    const judgePrompt = `You are a strict AI evaluator for a legal tech platform in Indonesia.
    
CASE DATA:
- User Question: "${tc.userMessage}"
- Expected Ground Truth: "${tc.groundTruthSummary}"
- Expected Escalation: ${tc.expectedEscalation}

AI GENERATED RESPONSE:
${JSON.stringify(aiOutput, null, 2)}

EVALUATION CRITERIA:
1. Correctness (0.0 to 1.0): Does the legalExplanation align with the Ground Truth? 1.0 = Perfect alignment, 0.0 = completely wrong.
2. Hallucination (0 or 1): Did the AI invent a specific Law/Pasal/UU that it shouldn't have? (1 = Fail/Hallucinated, 0 = Pass/Safe).
3. Usefulness (0.0 to 1.0): Are the suggestedSteps practical, clear, and actionable?

Respond strictly in JSON:
{
  "correctnessScore": number,
  "hallucinationScore": number,
  "usefulnessScore": number,
  "rationale": "Brief explanation of your scores"
}`;

    const judgeRes = await openai.chat.completions.create({
      model: 'gpt-4o', // Judge uses a smarter model
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: judgePrompt }]
    });

    const scores = JSON.parse(judgeRes.choices[0].message.content || '{}');

    results.push({
      caseId: tc.id,
      correctnessScore: scores.correctnessScore,
      hallucinationScore: scores.hallucinationScore,
      usefulnessScore: scores.usefulnessScore,
      rationale: scores.rationale,
      latencyMs
    });

    console.log(`  [SCORE] Correctness: ${scores.correctnessScore} | Hallucination: ${scores.hallucinationScore} | Usefulness: ${scores.usefulnessScore}`);
  }

  // Calculate Aggregates
  const avgCorrectness = results.reduce((sum, r) => sum + r.correctnessScore, 0) / results.length;
  const hallucinationRate = (results.filter(r => r.hallucinationScore === 1).length / results.length) * 100;
  const avgUsefulness = results.reduce((sum, r) => sum + r.usefulnessScore, 0) / results.length;

  console.log('\n======================================');
  console.log('         EVALUATION REPORT');
  console.log('======================================');
  console.log(`Total Cases: ${results.length}`);
  console.log(`Average Correctness: ${(avgCorrectness * 100).toFixed(1)}%`);
  console.log(`Average Usefulness:  ${(avgUsefulness * 100).toFixed(1)}%`);
  console.log(`Hallucination Rate:  ${hallucinationRate.toFixed(1)}%`);
  console.log('======================================\n');
}

runEvals().catch(console.error);