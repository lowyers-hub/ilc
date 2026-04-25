import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash, randomUUID } from 'crypto';
import OpenAI from 'openai';

import { RedisCacheService } from '@/common/cache/redis-cache.service';
import { RetrievalService } from '@/modules/rag/services/retrieval.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSessionEntity } from './entities/chat-session.entity';
import { ChatMessageEntity } from './entities/chat-message.entity';

import { getPrompt, SPECIALISTS, type LegalCategory } from './prompts/prompt-registry';
import { AiAuditService } from './services/ai-audit.service';
import { SafetySanitizerService } from './services/safety-sanitizer.service';

export type Classification = { categories: string[]; intent: string; riskLevel: 'low' | 'medium' | 'high' };
export type ChatHistoryItem = { role: 'user' | 'assistant'; content: string };

export type EscalationMeta = {
  escalation: boolean;
  reason: string;
  recommendedSpecialization: 'employment' | 'contract' | 'consumer' | 'criminal' | 'family' | 'general';
};

export type LegalChatResponse = {
  sessionId: string; // added to return session back to frontend
  summary: string;
  legalExplanation: string;
  suggestedSteps: string[];
  requiredDocuments: string[];
  risks: string[];
  whenNeedLawyer: string[];
  confidence: 'low' | 'medium' | 'high';
  citations: Array<{ chunkId: string; source: string; score: number; snippet: string }>;
  disclaimer: string;
  escalation: boolean;
  escalationMeta: EscalationMeta;

  // Metadata (not part of the strict user-facing schema, but included for audit/debug)
  requestId: string;
  promptVersion: string;
  model: string | null;
  latencyMs: number;
  fallbackUsed: boolean;
  cacheHit: boolean;
  retrievedChunkIds: string[];
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private retrieval: RetrievalService,
    private safety: SafetySanitizerService,
    private cache: RedisCacheService,
    private audits: AiAuditService,
    @InjectRepository(ChatSessionEntity) private sessions: Repository<ChatSessionEntity>,
    @InjectRepository(ChatMessageEntity) private messages: Repository<ChatMessageEntity>,
    @InjectQueue('ai-evaluations') private aiEvaluationsQueue: Queue
  ) {}

  async getSessions(userId: string) {
    return this.sessions.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async getMessages(userId: string, sessionId: string) {
    const session = await this.sessions.findOne({ where: { id: sessionId, userId } });
    if (!session) throw new NotFoundException('Session not found');
    const messages = await this.messages.find({ where: { sessionId }, order: { createdAt: 'ASC' } });
    
    // Backward compatibility mapping
    return messages.map((msg: ChatMessageEntity) => {
      if (msg.role === 'assistant') {
        if (msg.meta) {
          return {
            ...msg,
            content: JSON.stringify(msg.meta)
          };
        }
        // Handle legacy messages where content is already JSON stringified
        return msg;
      }
      return msg;
    });
  }

  async getUserMemory(userId: string) {
    const cachedMemory = await this.cache.getJson(`ai:memory:${userId}`);
    return cachedMemory || { userId, lastUpdated: new Date().toISOString(), pastIssues: [] };
  }

  async classify(message: string): Promise<Classification> {
    const d = classifyDetailed(message);
    return { categories: d.categoryLabels, intent: d.intent, riskLevel: d.riskLevel };
  }

  async chat(userId: string, args: { message: string; sessionId?: string }) {
    const t0 = Date.now();
    const requestId = randomUUID();
    const promptVersion = getPrompt('legal-chat-v1').version;
    const detailed = classifyDetailed(args.message);
    const classification = { categories: detailed.categoryLabels, intent: detailed.intent, riskLevel: detailed.riskLevel };

    // Handle Session
    let sessionId = args.sessionId || '';
    let chatHistory: ChatHistoryItem[] = [];
    if (!sessionId) {
      const newSession = await this.sessions.save(this.sessions.create({ userId }));
      sessionId = newSession.id;
    } else {
      const existing = await this.sessions.findOne({ where: { id: sessionId, userId } });
      if (!existing) {
        throw new NotFoundException('Session not found or belongs to another user');
      }
      
      // Load previous messages from database (limit 10 for context)
      const recentMessages = await this.messages.find({
        where: { sessionId },
        order: { createdAt: 'DESC' },
        take: 10,
      });
      
      chatHistory = recentMessages
        .reverse()
        .map((m: ChatMessageEntity) => ({ role: m.role, content: m.content }));
    }

    // Fetch past sessions to build user memory context
    const pastSessions = await this.sessions.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 4,
    });
    
    let userMemory = '';
    const memoryLines: string[] = [];
    const otherSessions = pastSessions.filter((s: ChatSessionEntity) => s.id !== sessionId).slice(0, 3);
    if (otherSessions.length > 0) {
      // Optimized query: Fetch only the first and last message of each session to reduce memory footprint
      const sessionIds = otherSessions.map((s: ChatSessionEntity) => s.id);
      
      const firstUserMessages = await this.messages.createQueryBuilder('msg')
        .where('msg.sessionId IN (:...sessionIds)', { sessionIds })
        .andWhere('msg.role = :role', { role: 'user' })
        .distinctOn(['msg.sessionId'])
        .orderBy('msg.sessionId', 'ASC')
        .addOrderBy('msg.createdAt', 'ASC')
        .getMany();
        
      const lastAssistantMessages = await this.messages.createQueryBuilder('msg')
        .where('msg.sessionId IN (:...sessionIds)', { sessionIds })
        .andWhere('msg.role = :role', { role: 'assistant' })
        .distinctOn(['msg.sessionId'])
        .orderBy('msg.sessionId', 'ASC')
        .addOrderBy('msg.createdAt', 'DESC')
        .getMany();

      const sessionEvaluations = await this.audits.getEvaluationsBySessionIds(sessionIds);

      const structuredMemory = {
        userId,
        lastUpdated: new Date().toISOString(),
        pastIssues: [] as Array<{ sessionId: string; category: string; issue: string; status: string; recommendation: string }>
      };

      for (const s of otherSessions) {
        // Adaptive Memory: Check if this session had a bad evaluation
        const audit = sessionEvaluations.find((a: any) => a.input?.sessionId === s.id);
        if (audit && audit.evaluations) {
          const { hallucinationScore = 0, correctnessScore = 1.0 } = audit.evaluations;
          if (hallucinationScore === 1 || correctnessScore < 0.8) {
            continue; // Reduce influence by completely skipping low-quality past sessions
          }
        }

        const firstUserMsg = firstUserMessages.find((m: ChatMessageEntity) => m.sessionId === s.id);
        const lastAsstMsg = lastAssistantMessages.find((m: ChatMessageEntity) => m.sessionId === s.id);

        if (firstUserMsg) {
          const issue = firstUserMsg.content.slice(0, 100).replace(/\n/g, ' ');
          let status = 'Belum selesai';
          let recommendation = 'Umum';
          let pastCategory = 'general';

          if (lastAsstMsg && lastAsstMsg.meta) {
            status = lastAsstMsg.meta.escalation ? 'Eskalasi ke Pengacara' : 'Selesai di AI';
            recommendation = lastAsstMsg.meta.escalationMeta?.recommendedSpecialization || 'Umum';
            // Extract the actual category the LLM classified this past session as
            pastCategory = lastAsstMsg.meta.escalationMeta?.recommendedSpecialization || 'general';
          }
          
          structuredMemory.pastIssues.push({
            sessionId: s.id,
            category: pastCategory,
            issue: `${issue}...`,
            status,
            recommendation
          });
        }
      }

      // Filter memory to only inject highly relevant past issues into the prompt
      // This saves tokens and reduces noise by omitting completely unrelated past legal problems
      const currentCategories = detailed.categories;
      const relevantPastIssues = structuredMemory.pastIssues.filter(
        issue => currentCategories.includes(issue.category) || issue.status === 'Belum selesai'
      );

      for (const issue of relevantPastIssues) {
         memoryLines.push(`- Isu: "${issue.issue}" | Status: ${issue.status} | Rekomendasi: ${issue.recommendation}`);
      }

      if (memoryLines.length > 0) {
        userMemory = memoryLines.join('\n');
        // Store the FULL structured memory in cache for analytics and personalization (UI)
        await this.cache.setJson(`ai:memory:${userId}`, structuredMemory, 86400 * 7); // Cache for 7 days
      }
    }

    // Save user message
    await this.messages.save(this.messages.create({
      sessionId,
      role: 'user',
      content: args.message,
      meta: null,
    }));

    // Predictive Layer: Detect ambiguity
    const isAmbiguous = analyzeAmbiguity(args.message);

    const retrieved = await this.retrieval.retrieve({ 
      userId, 
      query: args.message, 
      topK: 10, 
      riskLevel: detailed.riskLevel,
      categories: detailed.categories,
      isAmbiguous
    });
    const retrievedChunkIds = retrieved.map((c) => c.id);
    const hasContext = retrieved.length > 0;

    // Predictive Layer: Detect low knowledge coverage
    const maxRetrievalScore = retrieved.length > 0 ? Math.max(...retrieved.map(c => c.score)) : 0;
    const lowCoverage = retrieved.length === 0 || maxRetrievalScore < 0.55; // Lowered from 0.65 to avoid false negatives

    // Fetch health state to adapt AI behavior and tone
    let minCorrectnessTrend = 1.0;
    for (const cat of detailed.categories) {
      const health = await this.cache.getJson<{ correctnessTrend: number }>(`ai:health:metrics:${cat}`);
      if (health && health.correctnessTrend < minCorrectnessTrend) {
        minCorrectnessTrend = health.correctnessTrend;
      }
    }
    const correctnessTrend = minCorrectnessTrend;
    let adaptiveTone = correctnessTrend < 0.85 
      ? 'CONSERVATIVE_MODE: Be cautious. Do not make assumptions beyond the text, but STILL provide actionable general guidance. Do not refuse to answer if general information can help.' 
      : 'CONFIDENT_MODE: Be helpful, direct, and authoritative based on the context.';

    // Predictive Layer: Preemptively adjust tone to prevent hallucination
    if (lowCoverage) {
      adaptiveTone += '\nPREDICTIVE_WARNING (LOW_COVERAGE): The retrieved context is weak or missing. DO NOT invent specific laws, but DO provide helpful general principles and common practices.';
    }
    if (isAmbiguous) {
      adaptiveTone += '\nPREDICTIVE_WARNING (HIGH_AMBIGUITY): The user query is vague or lacks specific facts. Provide general guidance, ask clarifying questions, and DO NOT make assumptions.';
    }

    // Content cache (for UX/perf). We still generate a new requestId and audit record per request.
    const historyHash = chatHistory.length > 0 ? sha1(JSON.stringify(chatHistory)) : 'empty';
    
    // Normalize user memory for hashing (lowercase, trim, deduplicate, sort) to prevent cache misses on superficial differences
    const normalizedMemory = [...new Set(memoryLines.map((line: string) => line.trim().toLowerCase()))].sort().join('\n');
    const userMemoryHash = normalizedMemory ? sha1(normalizedMemory) : 'empty';
    
    // Deduplicate and sort chunk IDs to prevent cache misses on identical chunks returned in different order or with duplicates
    const normalizedChunkIds = [...new Set(retrievedChunkIds.map((id: string) => id.trim()))].sort();
    const retrievedChunksHash = normalizedChunkIds.length > 0 ? sha1(JSON.stringify(normalizedChunkIds)) : 'empty';
    
    const cacheKey = `ai:chat:${promptVersion}:${userId}:${sessionId}:${historyHash}:${userMemoryHash}:${retrievedChunksHash}:${sha1(args.message.trim().toLowerCase())}`;
    const cachedPayload = await this.cache.getJson<Omit<LegalChatResponse, 'requestId' | 'latencyMs' | 'cacheHit' | 'sessionId'>>(cacheKey);
    if (cachedPayload) {
      const out: LegalChatResponse = {
        ...cachedPayload,
        sessionId,
        requestId,
        latencyMs: Date.now() - t0,
        cacheHit: true,
      };

      // Save AI message
      await this.messages.save(this.messages.create({
        sessionId,
        role: 'assistant',
        content: out.summary, // store main message as plain text
        meta: out, // store structured data in separate JSON column
      }));

      await this.audits.record({
        requestId,
        userId,
        kind: 'legal-chat',
        promptVersion,
        model: out.model,
        tokenUsage: null,
        retrievedChunkIds,
        confidence: out.confidence,
        escalation: out.escalation,
        escalationMeta: out.escalationMeta,
        fallbackUsed: out.fallbackUsed,
        cacheHit: true,
        latencyMs: out.latencyMs,
        input: { ...args, classification },
        rawModelOutput: null,
        sanitizedOutput: out, // already sanitized
        finalResponse: out,
        cacheKey,
      });
      
      // Dispatch background evaluation job
      await this.aiEvaluationsQueue.add('evaluate', { requestId }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      });
      
      return out;
    }

    // Combine specialists for multi-label
    const documentChecklist = [...new Set(detailed.categories.flatMap(cat => SPECIALISTS[cat as LegalCategory]?.documentChecklist || []))];
    const clarifyingFacts = [...new Set(detailed.categories.flatMap(cat => SPECIALISTS[cat as LegalCategory]?.clarifyingFacts || []))];
    
    const specialist = { 
      categories: detailed.categoryLabels, 
      documentChecklist,
      clarifyingFacts
    };
    const clarifyingQuestions = pickClarifyingQuestions(args.message, specialist.clarifyingFacts, 4);
    
    // Determine confidence before generating the prompt to adapt language strictly
    const confidence: LegalChatResponse['confidence'] = deriveConfidence({
      hasContext,
      clarifyingQuestionsCount: clarifyingQuestions.length,
      riskLevel: detailed.riskLevel,
      lowCoverage,
      isAmbiguous
    });

    if (confidence === 'low') {
      adaptiveTone += '\nSTRICT_LANGUAGE_RULE: Confidence is LOW. WAJIB gunakan kata-kata seperti "kemungkinan", "umumnya", atau "perlu verifikasi lebih lanjut". JANGAN SEKALI-KALI menggunakan bahasa yang pasti atau menjamin hasil. Hindari pernyataan absolut.';
    }

    const gen = await this.generateLegalChatV1({
      message: args.message,
      history: chatHistory,
      userMemory,
      retrieved,
      specialist,
      classification,
      clarifyingQuestions,
      adaptiveTone,
      confidence,
    });

    // Compute regex-based fallback escalation
    const fallbackEscalationMeta = computeEscalation(args.message, detailed);

    // Enforce schema + grounding constraints with a safe fallback to prevent 500 errors
    let validated: Omit<LegalChatResponse, 'requestId' | 'promptVersion' | 'model' | 'latencyMs' | 'fallbackUsed' | 'cacheHit' | 'retrievedChunkIds' | 'sessionId'>;
    try {
      validated = validateLegalChatResponse(gen.parsed, retrievedChunkIds);
    } catch (error: any) {
      this.logger.warn(`LLM Output validation failed: ${error.message}. Triggering safe fallback.`);
      validated = fallbackLegalChat({
        message: args.message,
        retrieved,
        specialist,
        clarifyingQuestions,
        confidence,
      });
      gen.fallbackUsed = true;
    }
    
    // Safety Fallback: If LLM missed high risk that regex caught, override it
    if (!validated.escalation && fallbackEscalationMeta.escalation) {
      validated.escalation = true;
      validated.escalationMeta = fallbackEscalationMeta;
    }

    const sanitized = sanitizeLegalChat(validated, this.safety, hasContext);

    // Compute final confidence safely (take the most conservative of system-derived vs LLM-generated)
    const finalConfidence = 
      (confidence === 'low' || sanitized.confidence === 'low') ? 'low' :
      (confidence === 'medium' || sanitized.confidence === 'medium') ? 'medium' :
      'high';

    const out: LegalChatResponse = {
      ...sanitized,
      sessionId,
      confidence: finalConfidence,
      disclaimer: 'Ini adalah informasi umum, bukan nasihat hukum final.',
      requestId,
      promptVersion,
      model: gen.model,
      latencyMs: Date.now() - t0,
      fallbackUsed: gen.fallbackUsed,
      cacheHit: false,
      retrievedChunkIds,
    };

    // Save AI message
    await this.messages.save(this.messages.create({
      sessionId,
      role: 'assistant',
      content: out.summary, // store main message as plain text
      meta: out, // store structured data in separate JSON column
    }));

    await this.cache.setJson(cacheKey, omitMetaForCache(out), 300);

    await this.audits.record({
      requestId,
      userId,
      kind: 'legal-chat',
      promptVersion,
      model: gen.model,
      tokenUsage: gen.usage,
      retrievedChunkIds,
      confidence: out.confidence,
      escalation: out.escalation,
      escalationMeta: out.escalationMeta,
      fallbackUsed: out.fallbackUsed,
      cacheHit: false,
      latencyMs: out.latencyMs,
      input: { ...args, classification, specialist: specialist.categories, clarifyingQuestions },
      rawModelOutput: gen.raw,
      sanitizedOutput: sanitized,
      finalResponse: out,
      cacheKey,
    });

    // Dispatch background evaluation job
    await this.aiEvaluationsQueue.add('evaluate', { requestId }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 }
    });

    return out;
  }

  private async generateLegalChatV1(args: {
    message: string;
    history: ChatHistoryItem[];
    userMemory: string;
    retrieved: Array<{ id: string; content: string; score: number; source: string }>;
    specialist: { categories: string[]; documentChecklist: string[] };
    classification: Classification;
    clarifyingQuestions: string[];
    adaptiveTone: string;
    confidence: 'low' | 'medium' | 'high';
  }): Promise<{ raw: string | null; parsed: any; model: string | null; usage: any | null; fallbackUsed: boolean }> {
    const prompt = getPrompt('legal-chat-v1');
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini';

    if (!apiKey) {
      return {
        raw: null,
        model: null,
        usage: null,
        fallbackUsed: true,
        parsed: fallbackLegalChat({ ...args, confidence: args.confidence }),
      };
    }

    const client = new OpenAI({ apiKey });
    const ragBlock =
      args.retrieved.length === 0
        ? 'RAG_CONTEXT: (none)'
        : `RAG_CONTEXT:\n${args.retrieved
            .slice(0, 8)
            .map((c) => `CHUNK ${c.id} (score=${c.score.toFixed(3)} source=${c.source}):\n${c.content}`)
            .join('\n\n')}`;

    const historyBlock =
      args.history.length === 0
        ? 'HISTORY: (none)'
        : `HISTORY:\n${args.history
            .slice(-5)
            .map((h) => `${h.role.toUpperCase()}: ${h.content}`)
            .join('\n')}`;

    const userContent = [
      `PROMPT_VERSION=${prompt.version}`,
      `ADAPTIVE_TONE=${args.adaptiveTone}`,
      `CATEGORIES=${args.specialist.categories.join(', ')}`,
      args.specialist.categories.length > 1 ? 'MULTI_CATEGORY_RESOLUTION: Multiple legal domains detected. Address each domain clearly. Prioritize high-risk aspects (e.g., Criminal, Family) over civil/contract aspects.' : '',
      `RISK_LEVEL=${args.classification.riskLevel}`,
      `USER_MEMORY:\n${args.userMemory || '(none)'}`,
      ragBlock,
      historyBlock,
      args.clarifyingQuestions.length ? `CLARIFYING_QUESTIONS:\n- ${args.clarifyingQuestions.join('\n- ')}` : 'CLARIFYING_QUESTIONS: (none)',
      `DOCUMENT_CHECKLIST:\n- ${args.specialist.documentChecklist.join('\n- ')}`,
      `USER_QUESTION:\n${args.message}`,
      `RETRIEVED_CHUNK_IDS:\n${args.retrieved.map((r) => r.id).join(', ') || '(none)'}`,
    ].join('\n\n');

    const res = await client.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: userContent },
      ],
    });

    const raw = res.choices?.[0]?.message?.content ?? '';
    const parsed = parseJsonObject(raw);
    if (!parsed) {
      return { raw, parsed: fallbackLegalChat({ ...args, confidence: args.confidence }), model, usage: res.usage ?? null, fallbackUsed: true };
    }
    return { raw, parsed, model, usage: res.usage ?? null, fallbackUsed: false };
  }
}

function sha1(s: string) {
  return createHash('sha1').update(s).digest('hex');
}

function parseJsonObject(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    // Try to salvage if model adds extra text
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function omitMetaForCache(out: LegalChatResponse) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { requestId, latencyMs, cacheHit, sessionId, ...rest } = out;
  return rest;
}

function analyzeAmbiguity(message: string): boolean {
  const wordCount = message.trim().split(/\s+/).length;
  const hasSpecificFacts = /\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}|rp|\d+\s*(juta|miliar|ribu)|pasal|undang-undang|uu)\b/i.test(message);
  return wordCount < 10 || !hasSpecificFacts;
}

function classifyDetailed(message: string) {
  const m = message.toLowerCase();
  const has = (re: RegExp) => re.test(m);

  const categories: string[] = [];
  const categoryLabels: string[] = [];

  if (has(/\b(phk|pesangon|upah|karyawan|pkwt|pkwtt|ketenagakerjaan)\b/)) {
    categories.push('employment');
    categoryLabels.push('Employment/PHK');
  }
  if (has(/\b(kontrak|perjanjian|klausul|terminasi|wanprestasi)\b/)) {
    categories.push('contracts');
    categoryLabels.push('Contracts');
  }
  if (has(/\b(utang|invoice|tagihan|piutang)\b/)) {
    categories.push('debt');
    categoryLabels.push('Debt/Invoice');
  }
  if (has(/\b(refund|garansi|penjual|marketplace|konsumen)\b/)) {
    categories.push('consumer');
    categoryLabels.push('Consumer');
  }
  if (has(/\b(sewa|kost|kontrakan|deposit)\b/)) {
    categories.push('landlord_tenant');
    categoryLabels.push('Landlord/Tenant');
  }
  if (has(/\b(cerai|perceraian|hak asuh|nafkah|harta bersama|kdrt)\b/)) {
    categories.push('family');
    categoryLabels.push('Family');
  }
  if (has(/\b(pidana|polisi|pengadilan|lapor polisi|penipuan|penggelapan)\b/)) {
    categories.push('criminal');
    categoryLabels.push('Criminal Risk');
  }

  if (categories.length === 0) {
    categories.push('general');
    categoryLabels.push('General');
  }

  const riskLevel: Classification['riskLevel'] = has(/\b(pidana|polisi|pengadilan|penahanan)\b/)
    ? 'high'
    : has(/\b(somasi|deadline|jatuh tempo|gugatan)\b/) || categories.includes('contracts') || categories.includes('debt')
      ? 'medium'
      : 'low';

  return { categories, categoryLabels, riskLevel, intent: 'triage' as const };
}

function pickClarifyingQuestions(message: string, candidates: string[], max: number) {
  // Heuristic: if message is too short or lacks specific facts, ask more.
  const short = message.trim().length < 40;
  const hasDate = /\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}|kemarin|besok|minggu|bulan|tahun)\b/i.test(message);
  const hasAmount = /\b(rp|\d+\s*(juta|miliar|ribu))\b/i.test(message);
  const need = short || (!hasDate && !hasAmount);
  if (!need) return [];
  return candidates.slice(0, Math.max(2, Math.min(max, candidates.length)));
}

function deriveConfidence(args: { hasContext: boolean; clarifyingQuestionsCount: number; riskLevel: Classification['riskLevel']; lowCoverage: boolean; isAmbiguous: boolean }): 'low' | 'medium' | 'high' {
  if (!args.hasContext || args.lowCoverage || args.isAmbiguous || args.clarifyingQuestionsCount >= 2) return 'low';
  if (args.riskLevel === 'high') return 'medium';
  return 'high';
}

function computeEscalation(message: string, d: ReturnType<typeof classifyDetailed>): EscalationMeta {
  const m = message.toLowerCase();
  const mentionsCourt = /\b(pengadilan|gugatan|sidang)\b/.test(m);
  const mentionsPolice = /\b(polisi|pidana|ditangkap|penahanan)\b/.test(m);
  const mentionsDeadline = /\b(deadline|besok|hari ini|jatuh tempo|minggu ini)\b/.test(m);
  const bigMoney = /\b(\d+)\s*(juta|miliar)\b/.test(m) || /\brp\s*\d{8,}\b/.test(m);

  let escalation = d.riskLevel === 'high' || mentionsCourt || mentionsPolice || (mentionsDeadline && d.riskLevel !== 'low') || bigMoney;
  let recommendedSpecialization: EscalationMeta['recommendedSpecialization'] =
    d.categories.includes('criminal')
      ? 'criminal'
      : d.categories.includes('family')
        ? 'family'
        : d.categories.includes('employment')
          ? 'employment'
          : d.categories.includes('consumer')
            ? 'consumer'
            : d.categories.includes('contracts') || d.categories.includes('debt') || d.categories.includes('landlord_tenant')
              ? 'contract'
              : 'contract';

  const reason = mentionsPolice
    ? 'Ada indikasi risiko pidana/panggilan aparat.'
    : mentionsCourt
      ? 'Ada indikasi proses litigasi/pengadilan.'
      : bigMoney
        ? 'Nilai sengketa tampak besar.'
        : mentionsDeadline
          ? 'Ada tenggat waktu/deadline.'
          : d.riskLevel === 'high'
            ? 'Kasus ditandai berisiko tinggi.'
            : 'Tidak ada';

  if (reason === 'Tidak ada') escalation = false;
  return { escalation, reason, recommendedSpecialization };
}

function validateLegalChatResponse(obj: any, retrievedChunkIds: string[]): Omit<LegalChatResponse, 'requestId' | 'promptVersion' | 'model' | 'latencyMs' | 'fallbackUsed' | 'cacheHit' | 'retrievedChunkIds' | 'sessionId'> {
  const requiredString = (k: string) => typeof obj?.[k] === 'string' && obj[k].trim().length > 0;
  const requiredArray = (k: string) => Array.isArray(obj?.[k]);

  if (!requiredString('summary')) throw new Error('invalid summary');
  if (!requiredString('legalExplanation')) throw new Error('invalid legalExplanation');
  for (const k of ['suggestedSteps', 'requiredDocuments', 'risks', 'whenNeedLawyer']) {
    if (!requiredArray(k)) throw new Error(`invalid ${k}`);
  }
  if (!['low', 'medium', 'high'].includes(obj?.confidence)) throw new Error('invalid confidence');
  if (!Array.isArray(obj?.citations)) throw new Error('invalid citations');
  if (!requiredString('disclaimer')) throw new Error('invalid disclaimer');

  const citations = (obj.citations as any[]).map((c) => ({
    chunkId: String(c?.chunkId ?? ''),
    source: String(c?.source ?? ''),
    score: Number(c?.score ?? 0),
    snippet: String(c?.snippet ?? ''),
  }));

  // Grounding: citations must come from retrieved chunk ids
  if (retrievedChunkIds.length === 0 && citations.length > 0) throw new Error('citations must be empty when no RAG context');
  for (const c of citations) {
    if (!c.chunkId) throw new Error('citation missing chunkId');
    if (retrievedChunkIds.length > 0 && !retrievedChunkIds.includes(c.chunkId)) throw new Error('citation not grounded');
  }

  return {
    summary: obj.summary,
    legalExplanation: obj.legalExplanation,
    suggestedSteps: obj.suggestedSteps.map(String),
    requiredDocuments: obj.requiredDocuments.map(String),
    risks: obj.risks.map(String),
    whenNeedLawyer: obj.whenNeedLawyer.map(String),
    confidence: obj.confidence,
    citations,
    disclaimer: obj.disclaimer,
    escalation: Boolean(obj.escalationMeta?.escalation ?? false),
    escalationMeta: {
      escalation: Boolean(obj.escalationMeta?.escalation ?? false),
      reason: String(obj.escalationMeta?.reason ?? 'Tidak ada'),
      recommendedSpecialization: obj.escalationMeta?.recommendedSpecialization ?? 'general',
    }
  };
}

function sanitizeLegalChat(
  out: Omit<LegalChatResponse, 'requestId' | 'promptVersion' | 'model' | 'latencyMs' | 'fallbackUsed' | 'cacheHit' | 'retrievedChunkIds' | 'sessionId'>,
  safety: SafetySanitizerService,
  hasContext: boolean
) {
  const s = (t: string) => safety.stripLawCitationsIfNoContext(safety.sanitize(t), hasContext);
  return {
    ...out,
    summary: s(out.summary),
    legalExplanation: s(out.legalExplanation),
    suggestedSteps: out.suggestedSteps.map(s),
    requiredDocuments: out.requiredDocuments.map(s),
    risks: out.risks.map(s),
    whenNeedLawyer: out.whenNeedLawyer.map(s),
    citations: out.citations.map((c) => ({ ...c, snippet: s(c.snippet).slice(0, 280) })),
    disclaimer: 'Ini adalah informasi umum, bukan nasihat hukum final.',
  };
}

function fallbackLegalChat(args: {
  message: string;
  retrieved: Array<{ id: string; content: string; score: number; source: string }>;
  specialist: { documentChecklist: string[] };
  clarifyingQuestions: string[];
  confidence: 'low' | 'medium' | 'high';
}) {
  const hasContext = args.retrieved.length > 0;
  return {
    summary: `Triase awal untuk masalah: ${args.message.length > 60 ? args.message.slice(0, 60) + '...' : args.message}`,
    legalExplanation: hasContext
      ? `Berdasarkan pencarian pada sistem, terdapat beberapa referensi hukum yang relevan dengan situasi Anda. Namun, karena saat ini sistem sedang beroperasi dalam mode cadangan (fallback), saya tidak dapat memberikan analisis yang mendalam. Silakan merujuk pada langkah-langkah praktis di bawah ini untuk mengamankan posisi Anda.`
      : `Saat ini sistem sedang beroperasi dalam mode cadangan (fallback) dan belum menemukan referensi hukum yang spesifik untuk masalah Anda. Oleh karena itu, panduan ini difokuskan pada langkah-langkah aman secara umum. Kami menyarankan Anda untuk tetap berhati-hati dan mendokumentasikan setiap bukti terkait.`,
    suggestedSteps: [
      ...args.clarifyingQuestions.map((q) => `Mohon klarifikasi: ${q}`),
      'Susun kronologi kejadian secara berurutan (tanggal, pihak yang terlibat, kejadian, dan bukti).',
      'Kumpulkan dan amankan semua dokumen pendukung terkait masalah ini.',
      'Pertimbangkan untuk mengirimkan komunikasi atau permintaan tertulis yang sopan dan terdokumentasi kepada pihak terkait.',
    ],
    requiredDocuments: args.specialist.documentChecklist.slice(0, 6),
    risks: [
      'Jika bukti yang Anda miliki kurang kuat, posisi Anda bisa menjadi lemah dalam negosiasi atau proses hukum.', 
      'Terdapat risiko salah langkah jika Anda bertindak secara sepihak tanpa data dan informasi yang lengkap.'
    ],
    whenNeedLawyer: [
      'Jika terdapat ancaman pidana atau Anda menerima panggilan resmi dari kepolisian.', 
      'Jika nilai sengketa atau kerugian cukup besar, serta jika terdapat tenggat waktu yang ketat.', 
      'Jika Anda akan memasuki proses mediasi formal atau litigasi di pengadilan.'
    ],
    confidence: args.confidence,
    citations: args.retrieved.slice(0, 3).map((c) => ({
      chunkId: c.id,
      source: c.source,
      score: c.score,
      snippet: c.content.slice(0, 280),
    })),
    disclaimer: 'Ini adalah informasi umum, bukan nasihat hukum final.',
    escalation: false,
    escalationMeta: {
      escalation: false,
      reason: 'Sistem beroperasi dalam mode fallback',
      recommendedSpecialization: 'general' as const
    }
  };
}
