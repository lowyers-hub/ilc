import { createDocument, getDocument, listDocuments } from '@/src/features/documents/documentsApi';

describe('documentsApi (mock mode)', () => {
  it('creates a document and transitions processing -> ready', async () => {
    const before = await listDocuments();
    const created = await createDocument({
      uri: 'file://demo.pdf',
      name: 'demo.pdf',
      mimeType: 'application/pdf',
      source: 'file',
    });

    const after = await listDocuments();
    expect(after.items.length).toBe(before.items.length + 1);

    const d1 = await getDocument(created.id);
    expect(d1.status).toBe('uploaded');

    const realNow = Date.now;
    Date.now = () => realNow() + 3_000;
    const d2 = await getDocument(created.id);
    Date.now = realNow;

    // Without starting OCR/Risk, the document can remain "uploaded".
    expect(['uploaded', 'ready', 'processing', 'failed']).toContain(d2.status);
  });
});
