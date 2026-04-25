import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import OpenAI from 'openai';
import { AiAuditService } from '../services/ai-audit.service';
import { RedisCacheService } from '@/common/cache/redis-cache.service';

@Processor('ai-evaluations')
export class AiEvaluationProcessor extends WorkerHost {
  private readonly logger = new Logger(AiEvaluationProcessor.name);
  private openai: OpenAI | null = null;

  constructor(
    private readonly audits: AiAuditService,
    private readonly cache: RedisCacheService
  ) {
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
      
      // 4. Adaptive Cache: Bypass cache for low-quality responses
      if ((evaluationMetrics.hallucinationScore > 0 || evaluationMetrics.correctnessScore < 0.8) && audit.cacheKey) {
        this.logger.warn(`Removing low-quality response from cache for request: ${requestId}`);
        await this.cache.del(audit.cacheKey);
      }

      // 5. Chunk Performance Tracking: Penalize chunks involved in hallucinations with decay
      if (evaluationMetrics.hallucinationScore > 0 && retrievedChunks.length > 0) {
        const now = Date.now();
        for (const chunkId of retrievedChunks) {
          const penaltyKey = `ai:chunk:penalty:${chunkId}`;
          const penaltyStr = await this.cache.get(penaltyKey);
          
          let currentScore = 0;
          if (penaltyStr) {
            try {
              const data = JSON.parse(penaltyStr);
              // Calculate decay: half-life of 7 days
              const daysPassed = (now - (data.lastUpdated || now)) / (1000 * 60 * 60 * 24);
              currentScore = data.score * Math.pow(0.5, daysPassed);
            } catch (e) {
              // Fallback if old plain-string format exists
              currentScore = parseInt(penaltyStr, 10) || 0;
            }
          }
          
          // Add 1 penalty point and store
          await this.cache.setJson(penaltyKey, {
            score: currentScore + 1,
            lastUpdated: now
          }, 86400 * 30); // 30 day absolute TTL to prevent infinite storage
        }
      }

    } catch (error: any) {
      this.logger.error(`Failed to evaluate request ${requestId}: ${error.message}`, error.stack);
      throw error; // Rethrow to trigger BullMQ retry logic
    }
  }
}