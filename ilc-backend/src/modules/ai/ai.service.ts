import { Injectable, NotFoundException } from '@nestjs/common';
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

export type Classification = { category: string; intent: string; riskLevel: 'low' | 'medium' | 'high' };
export type ChatHistoryItem = { role: 'user' | 'assistant'; content: string };

export type EscalationMeta = {
  escalation: boolean;
  reason: string;
  recommendedSpecialization: 'employment' | 'contract' | 'consumer' | 'criminal' | 'family';
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

  async classify(message: string): Promise<Classification> {
    const d = classifyDetailed(message);
    return { category: d.categoryLabel, intent: d.intent, riskLevel: d.riskLevel };
  }

  async chat(userId: string, args: { message: string; sessionId?: string }) {
    const t0 = Date.now();
    const requestId = randomUUID();
    const promptVersion = getPrompt('legal-chat-v1').version;

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

      const structuredMemory = {
        userId,
        lastUpdated: new Date().toISOString(),
        pastIssues: [] as Array<{ sessionId: string; issue: string; status: string; recommendation: string }>
      };

      for (const s of otherSessions) {
        const firstUserMsg = firstUserMessages.find((m: ChatMessageEntity) => m.sessionId === s.id);
        const lastAsstMsg = lastAssistantMessages.find((m: ChatMessageEntity) => m.sessionId === s.id);

        if (firstUserMsg) {
          const issue = firstUserMsg.content.slice(0, 100).replace(/\n/g, ' ');
          let status = 'Belum selesai';
          let recommendation = 'Umum';

          if (lastAsstMsg && lastAsstMsg.meta) {
            status = lastAsstMsg.meta.escalation ? 'Eskalasi ke Pengacara' : 'Selesai di AI';
            recommendation = lastAsstMsg.meta.escalationMeta?.recommendedSpecialization || 'Umum';
          }
          
          memoryLines.push(`- Isu: "${issue}..." | Status: ${status} | Rekomendasi Spesialisasi: ${recommendation}`);
          structuredMemory.pastIssues.push({
            sessionId: s.id,
            issue: `${issue}...`,
            status,
            recommendation
          });
        }
      }
      if (memoryLines.length > 0) {
        userMemory = memoryLines.join('\n');
        // Store structured memory in cache for analytics and personalization
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

    const detailed = classifyDetailed(args.message);
    const classification = { category: detailed.categoryLabel, intent: detailed.intent, riskLevel: detailed.riskLevel };

    const retrieved = await this.retrieval.retrieve({ userId, query: args.message, topK: 10, riskLevel: detailed.riskLevel });
    const retrievedChunkIds = retrieved.map((c) => c.id);
    const hasContext = retrieved.length > 0;

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
      });
      
      // Dispatch background evaluation job
      await this.aiEvaluationsQueue.add('evaluate', { requestId }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      });
      
      return out;
    }

    const specialist = SPECIALISTS[detailed.category];
    const clarifyingQuestions = pickClarifyingQuestions(args.message, specialist.clarifyingFacts, 4);
    const gen = await this.generateLegalChatV1({
      message: args.message,
      history: chatHistory,
      userMemory,
      retrieved,
      specialist,
      classification,
      clarifyingQuestions,
    });

    // Compute regex-based fallback escalation
    const fallbackEscalationMeta = computeEscalation(args.message, detailed);

    // Enforce schema + grounding constraints
    const validated = validateLegalChatResponse(gen.parsed, retrievedChunkIds);
    
    // Safety Fallback: If LLM missed high risk that regex caught, override it
    if (!validated.escalation && fallbackEscalationMeta.escalation) {
      validated.escalation = true;
      validated.escalationMeta = fallbackEscalationMeta;
    }

    const confidence: LegalChatResponse['confidence'] = deriveConfidence({
      hasContext,
      clarifyingQuestionsCount: clarifyingQuestions.length,
      riskLevel: detailed.riskLevel,
    });

    const sanitized = sanitizeLegalChat(validated, this.safety, hasContext);

    const out: LegalChatResponse = {
      ...sanitized,
      sessionId,
      confidence,
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
      input: { ...args, classification, specialist: specialist.category, clarifyingQuestions },
      rawModelOutput: gen.raw,
      sanitizedOutput: sanitized,
      finalResponse: out,
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
    specialist: { category: LegalCategory; documentChecklist: string[] };
    classification: Classification;
    clarifyingQuestions: string[];
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
        parsed: fallbackLegalChat(args),
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
      `CATEGORY=${args.specialist.category}`,
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
      return { raw, parsed: fallbackLegalChat(args), model, usage: res.usage ?? null, fallbackUsed: true };
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

function classifyDetailed(message: string) {
  const m = message.toLowerCase();
  const has = (re: RegExp) => re.test(m);

  const category: LegalCategory = has(/\b(phk|pesangon|upah|karyawan|pkwt|pkwtt|ketenagakerjaan)\b/)
    ? 'employment'
    : has(/\b(kontrak|perjanjian|klausul|terminasi|wanprestasi)\b/)
      ? 'contracts'
      : has(/\b(utang|invoice|tagihan|piutang)\b/)
        ? 'debt'
        : has(/\b(refund|garansi|penjual|marketplace|konsumen)\b/)
          ? 'consumer'
          : has(/\b(sewa|kost|kontrakan|deposit)\b/)
            ? 'landlord_tenant'
            : has(/\b(cerai|perceraian|hak asuh|nafkah|harta bersama|kdrt)\b/)
              ? 'family'
              : has(/\b(pidana|polisi|pengadilan|lapor polisi|penipuan|penggelapan)\b/)
                ? 'criminal'
                : 'general';

  const riskLevel: Classification['riskLevel'] = has(/\b(pidana|polisi|pengadilan|penahanan)\b/)
    ? 'high'
    : has(/\b(somasi|deadline|jatuh tempo|gugatan)\b/)
      ? 'medium'
      : category === 'contracts' || category === 'debt'
        ? 'medium'
        : 'low';

  const categoryLabel =
    category === 'employment'
      ? 'Employment/PHK'
      : category === 'contracts'
        ? 'Contracts'
        : category === 'debt'
          ? 'Debt/Invoice'
          : category === 'consumer'
            ? 'Consumer'
            : category === 'landlord_tenant'
              ? 'Landlord/Tenant'
              : category === 'family'
                ? 'Family'
                : category === 'criminal'
                  ? 'Criminal Risk'
                  : 'General';

  return { category, categoryLabel, riskLevel, intent: 'triage' as const };
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

function deriveConfidence(args: { hasContext: boolean; clarifyingQuestionsCount: number; riskLevel: Classification['riskLevel'] }): 'low' | 'medium' | 'high' {
  if (!args.hasContext || args.clarifyingQuestionsCount >= 2) return 'low';
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
    d.category === 'employment'
      ? 'employment'
      : d.category === 'contracts' || d.category === 'debt' || d.category === 'landlord_tenant'
        ? 'contract'
        : d.category === 'consumer'
          ? 'consumer'
          : d.category === 'family'
            ? 'family'
            : d.category === 'criminal'
              ? 'criminal'
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
}) {
  const hasContext = args.retrieved.length > 0;
  return {
    summary: `Ringkasan masalah: ${args.message}`,
    legalExplanation: hasContext
      ? `Saya menemukan konteks pendukung dari dokumen referensi. Ini membantu, namun tetap perlu verifikasi fakta dan dokumen Anda.`
      : `Konteks dokumen yang relevan belum cukup. Tanpa konteks, saya tidak akan menyebut pasal/UU tertentu dan fokus pada langkah aman secara umum.`,
    suggestedSteps: [
      ...args.clarifyingQuestions.map((q) => `Klarifikasi: ${q}`),
      'Susun kronologi (tanggal, pihak, kejadian, bukti).',
      'Siapkan dokumen pendukung.',
      'Pertimbangkan komunikasi/permintaan tertulis yang sopan dan terdokumentasi.',
    ],
    requiredDocuments: args.specialist.documentChecklist.slice(0, 6),
    risks: ['Jika bukti kurang, posisi bisa lemah.', 'Ada risiko salah langkah jika Anda bertindak tanpa data lengkap.'],
    whenNeedLawyer: ['Jika ada ancaman pidana/panggilan resmi.', 'Jika nilai sengketa besar atau ada tenggat waktu.', 'Jika Anda akan masuk proses litigasi/mediasi formal.'],
    confidence: hasContext ? 'medium' : 'low',
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
      reason: 'Fallback logic used',
      recommendedSpecialization: 'general' as const
    }
  };
}
