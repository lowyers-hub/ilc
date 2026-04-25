import 'reflect-metadata';

import { readFileSync, readdirSync } from 'fs';
import path from 'path';

import { KB_USER_ID } from '@/common/constants';
import { AppDataSource } from '@/data-source';
import { DocumentEntity } from '@/modules/documents/entities/document.entity';
import { DocumentChunkEntity } from '@/modules/rag/entities/document-chunk.entity';
import { ChunkingService } from '@/modules/rag/services/chunking.service';
import { EmbeddingService } from '@/modules/rag/services/embedding.service';

async function main() {
  const kbDir = path.join(process.cwd(), 'resources', 'kb');
  const files = readdirSync(kbDir).filter((f: string) => f.endsWith('.md'));
  if (files.length === 0) throw new Error('KB kosong: resources/kb/*.md tidak ditemukan');

  await AppDataSource.initialize();
  const docsRepo = AppDataSource.getRepository(DocumentEntity);
  const chunksRepo = AppDataSource.getRepository(DocumentChunkEntity);
  const chunking = new ChunkingService();
  const embedder = new EmbeddingService();

  for (const f of files) {
    const full = path.join(kbDir, f);
    const content = readFileSync(full, 'utf8');
    const title = f.replace(/\.md$/, '').replace(/[-_]/g, ' ');

    const doc = (await docsRepo.save(
      docsRepo.create({
        userId: KB_USER_ID,
        title: `[KB] ${title}`,
        source: 'kb',
        status: 'ready',
        storageKey: `kb://${f}`,
        mimeType: 'text/markdown',
        sizeBytes: String(content.length),
      } as any)
    )) as unknown as DocumentEntity;

    const parts = chunking.chunk(content, { maxChars: 1800, overlapChars: 150 });
    const embeddings = await embedder.embed(parts);

    for (let i = 0; i < parts.length; i++) {
      await chunksRepo.save(
        chunksRepo.create({
          documentId: doc.id,
          chunkIndex: i,
          content: parts[i],
          tokenCount: null,
          embedding: embeddings[i] ?? null,
        } as any)
      );
    }

    // eslint-disable-next-line no-console
    console.log(`Seeded KB doc: ${doc.title} (${parts.length} chunks)`);
  }

  await AppDataSource.destroy();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
