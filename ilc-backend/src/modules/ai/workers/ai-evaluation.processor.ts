import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import OpenAI from 'openai';
import { AiAuditService } from '../services/ai-audit.service';

@Processor('ai-evaluations')
export class AiEvaluationProcessor extends WorkerHost {
  private readonly logger = new Logger(AiEvaluationProcessor.name);
  private openai: OpenAI | null = null;

  constructor(private readonly audits: AiAuditService) {
    super();
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.logger.warn('OPENAI_API_KEY not found. AI Evaluation will be skipped.');
    }
  }

  async process(job: Job<{ requestId: string }>) {
    const { requestId } = job.data;
    this.logger.log(`Processing AI Evaluation for request: ${requestId}`);

    if (!this.openai) {
      this.logger.warn(`Skipping evaluation for ${requestId} - Missing API Key`);
      return;
    }

    try {
      // 1. Fetch audit record
      const audit = await this.audits.findByRequestId(requestId);
      if (!audit) {
        throw new Error(`Audit record not found for requestId: ${requestId}`);
      }

      if (audit.evaluations) {
        this.logger.log(`Request ${requestId} already evaluated. Skipping.`);
        return;
      }

      // Extract necessary context
      const userMessage = audit.input?.message || 'Unknown';
      const aiResponse = audit.finalResponse;
      const retrievedChunks = audit.retrievedChunkIds || [];

      // 2. Run LLM Evaluation
      const judgePrompt = `You are a strict AI evaluator for an Indonesian legal tech platform.

CASE DATA:
- User Question: "${userMessage}"
- Retrieved RAG Chunks: ${retrievedChunks.length > 0 ? JSON.stringify(retrievedChunks) : 'None'}

AI GENERATED RESPONSE:
${JSON.stringify(aiResponse, null, 2)}

EVALUATION CRITERIA:
1. CorrectnessScore (0.0 to 1.0): Does the legalExplanation accurately reflect Indonesian law and directly answer the user's question?
2. HallucinationScore (0 or 1): Did the AI invent a specific Law/Pasal/UU that was NOT provided in the retrieved chunks? (1 = Fail/Hallucinated, 0 = Pass/Safe).
3. UsefulnessScore (0.0 to 1.0): Are the suggestedSteps practical, clear, and actionable for an Indonesian citizen?

Respond strictly in JSON format:
{
  "correctnessScore": number,
  "hallucinationScore": number,
  "usefulnessScore": number,
  "rationale": "Brief explanation of your scores"
}`;

      const judgeRes = await this.openai.chat.completions.create({
        model: 'gpt-4o', // Judge model
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: judgePrompt }],
      });

      const rawOutput = judgeRes.choices[0]?.message?.content || '{}';
      const scores = JSON.parse(rawOutput);

      const evaluationMetrics = {
        correctnessScore: typeof scores.correctnessScore === 'number' ? scores.correctnessScore : 0,
        hallucinationScore: typeof scores.hallucinationScore === 'number' ? scores.hallucinationScore : 1,
        usefulnessScore: typeof scores.usefulnessScore === 'number' ? scores.usefulnessScore : 0,
        rationale: scores.rationale || 'Failed to parse rationale',
        evaluatedAt: new Date().toISOString(),
        model: 'gpt-4o',
      };

      // 3. Call saveEvaluation
      await this.audits.saveEvaluation(requestId, evaluationMetrics);
      this.logger.log(`Successfully evaluated request: ${requestId} | Correctness: ${evaluationMetrics.correctnessScore} | Hallucination: ${evaluationMetrics.hallucinationScore}`);
      
    } catch (error: any) {
      this.logger.error(`Failed to evaluate request ${requestId}: ${error.message}`, error.stack);
      throw error; // Rethrow to trigger BullMQ retry logic
    }
  }
}