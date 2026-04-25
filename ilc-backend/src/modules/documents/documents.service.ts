import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import OpenAI from 'openai';

import { DocumentEntity } from './entities/document.entity';
import { DocumentChunkEntity } from '@/modules/rag/entities/document-chunk.entity';
import { getPrompt } from '@/modules/ai/prompts/prompt-registry';
import { AiAuditService } from '@/modules/ai/services/ai-audit.service';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentEntity) private repo: Repository<DocumentEntity>,
    @InjectRepository(DocumentChunkEntity) private chunks: Repository<DocumentChunkEntity>,
    @InjectQueue('documents') private documentsQueue: Queue,
    private audits: AiAuditService
  ) {}

  async upload(userId: string, args: { title: string; source?: string }) {
    // In production: stream file to S3 and store its key.
    const doc = this.repo.create({
      userId,
      title: args.title,
      source: args.source ?? 'file',
      status: 'uploaded',
      storageKey: `s3://bucket/${userId}/${Date.now()}`,
    });
    const saved = await this.repo.save(doc);

    await this.documentsQueue.add('ingest', { documentId: saved.id, userId }, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } });
    return saved;
  }

  async listForUser(userId: string) {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async getForUser(userId: string, documentId: string) {
    const doc = await this.repo.findOne({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Not found');
    if (doc.userId !== userId) throw new ForbiddenException();
    return doc;
  }

  async startOcr(userId: string, documentId: string) {
    await this.getForUser(userId, documentId);
    await this.documentsQueue.add('ingest', { documentId, userId }, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } });
    return { status: 'processing' as const, result: null };
  }

  async getOcr(userId: string, documentId: string) {
    const doc = await this.getForUser(userId, documentId);
    if (doc.status !== 'ready') return { status: 'processing' as const, result: null };

    const parts = await this.chunks.find({ where: { documentId }, order: { chunkIndex: 'ASC' } });
    const text = parts.map((p: DocumentChunkEntity) => p.content).join('\n\n').slice(0, 20_000);
    return { status: 'ready' as const, result: { docId: documentId, text } };
  }

  async startRisk(userId: string, documentId: string) {
    // For minimal production: derive risk synchronously from extracted text. Keep same envelope.
    await this.getForUser(userId, documentId);
    return { status: 'processing' as const, result: null };
  }

  async getRisk(userId: string, documentId: string) {
    const ocr = await this.getOcr(userId, documentId);
    if (ocr.status !== 'ready' || !ocr.result?.text) return { status: 'processing' as const, result: null };

    const text = ocr.result.text.slice(0, 18_000);
    const ai = await this.analyzeRiskWithAi(userId, documentId, text);
    if (ai) return { status: 'ready' as const, result: { docId: documentId, ...ai } };

    // Fallback heuristic if OpenAI is not configured / fails.
    const t = text.toLowerCase();
    const high = t.includes('denda') || t.includes('penalti') || t.includes('sepihak');
    const medium = t.includes('terminasi') || t.includes('pemutusan') || t.includes('ganti rugi');
    const overallRisk = high ? 'high' : medium ? 'medium' : 'low';

    return {
      status: 'ready' as const,
      result: {
        docId: documentId,
        overallRisk,
        riskScore: overallRisk === 'high' ? 85 : overallRisk === 'medium' ? 55 : 25,
        findings: [
          {
            severity: overallRisk,
            clause: 'N/A (fallback)',
            issue: 'Analisis fallback',
            whyItMatters: 'Analisis AI tidak tersedia, sehingga hasil berbasis kata kunci dan perlu verifikasi manual.',
            recommendation: 'Tinjau klausul kewajiban, penalti/denda, terminasi, dan penyelesaian sengketa.',
          },
        ],
        missingClauses: ['Penyelesaian sengketa', 'Pembatasan tanggung jawab', 'Terminasi', 'Denda/penalti'],
        questionsForLawyer: ['Apakah klausul-klausul utama sudah seimbang?', 'Apakah ada risiko tersembunyi terkait penalti/terminasi?'],
        promptVersion: getPrompt('document-risk-v1').version,
        requestId: randomUUID(),
      },
    };
  }

  private async analyzeRiskWithAi(
    userId: string,
    documentId: string,
    text: string
  ): Promise<
    | null
    | {
        overallRisk: 'low' | 'medium' | 'high';
        riskScore: number;
        findings: Array<{ severity: 'low' | 'medium' | 'high'; clause: string; issue: string; whyItMatters: string; recommendation: string }>;
        missingClauses: string[];
        questionsForLawyer: string[];
        promptVersion: string;
        requestId: string;
        model: string | null;
      }
  > {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini';
    const prompt = getPrompt('document-risk-v1');
    const requestId = randomUUID();
    const t0 = Date.now();

    const user = `PROMPT_VERSION=${prompt.version}\n\nTEKS OCR (potongan):\n${text}`;

    const res = await client.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: user },
      ],
    });

    const raw = res.choices?.[0]?.message?.content ?? '';
    const parsed = parseJsonObject(raw);
    const validated = validateDocRisk(parsed);
    if (!validated) return null;

    const out = {
      ...validated,
      promptVersion: prompt.version,
      requestId,
      model,
    };

    await this.audits.record({
      requestId,
      userId,
      kind: 'document-risk',
      promptVersion: prompt.version,
      model,
      tokenUsage: res.usage ?? null,
      retrievedChunkIds: [],
      confidence: null,
      escalation: validated.overallRisk === 'high',
      escalationMeta: null,
      fallbackUsed: false,
      cacheHit: false,
      latencyMs: Date.now() - t0,
      input: { documentId },
      rawModelOutput: raw,
      sanitizedOutput: out,
      finalResponse: out,
    });

    return out;
  }
}

function parseJsonObject(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
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

function validateDocRisk(obj: any):
  | null
  | {
      overallRisk: 'low' | 'medium' | 'high';
      riskScore: number;
      findings: Array<{ severity: 'low' | 'medium' | 'high'; clause: string; issue: string; whyItMatters: string; recommendation: string }>;
      missingClauses: string[];
      questionsForLawyer: string[];
    } {
  if (!obj) return null;
  if (!['low', 'medium', 'high'].includes(obj.overallRisk)) return null;
  const riskScore = Number(obj.riskScore);
  if (Number.isNaN(riskScore) || riskScore < 0 || riskScore > 100) return null;
  if (!Array.isArray(obj.findings)) return null;
  const findings = obj.findings.map((f: any) => ({
    severity: (['low', 'medium', 'high'].includes(f?.severity) ? f.severity : obj.overallRisk) as 'low' | 'medium' | 'high',
    clause: String(f?.clause ?? ''),
    issue: String(f?.issue ?? ''),
    whyItMatters: String(f?.whyItMatters ?? ''),
    recommendation: String(f?.recommendation ?? ''),
  }));
  if (!Array.isArray(obj.missingClauses)) return null;
  if (!Array.isArray(obj.questionsForLawyer)) return null;
  return {
    overallRisk: obj.overallRisk,
    riskScore,
    findings,
    missingClauses: obj.missingClauses.map(String),
    questionsForLawyer: obj.questionsForLawyer.map(String),
  };
}
