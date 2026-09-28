import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.ts';

test('preserves source assessment from collector through queue to ingest', async () => {
  const originalFetch = globalThis.fetch;
  const queued: Array<{ body: any }> = [];
  const ingested: any[] = [];
  const assessment = {
    verificationState: 'reviewed',
    freshnessState: 'current',
    availabilityState: 'primary',
    assessedAt: '2026-09-28T00:00:00.000Z',
  };
  const rss = `<rss><channel><item>
    <guid>lineage-1</guid>
    <title>Lineage test</title>
    <link>https://example.com/news/lineage-1</link>
    <pubDate>Mon, 28 Sep 2026 00:00:00 GMT</pubDate>
    <description>Test document</description>
  </item></channel></rss>`;
  const env = {
    NARS_SOURCE_CONFIG_JSON: JSON.stringify([{
      key: 'lineage-feed',
      name: 'Lineage Feed',
      type: 'rss',
      endpoint: 'https://example.com/feed.xml',
      ...assessment,
      metadata: { owner: 'research' },
    }]),
    SUPABASE_URL: 'https://supabase.test',
    SUPABASE_SERVICE_ROLE_KEY: 'test-secret',
    NARS_INGEST_QUEUE: {
      sendBatch: async (batch: Array<{ body: any }>) => { queued.push(...batch); },
    },
  } as any;

  globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url === 'https://example.com/feed.xml') return new Response(rss, { status: 200 });
    if (url.endsWith('/functions/v1/nars-source-status')) return new Response('{}', { status: 200 });
    if (url.endsWith('/functions/v1/nars-ingest')) {
      ingested.push(JSON.parse(String(init?.body)));
      return new Response('{}', { status: 200 });
    }
    throw new Error(`Unexpected fetch in lineage test: ${url}`);
  };

  try {
    const runResponse = await (worker as any).fetch(
      new Request('https://collector.test/run', {
        method: 'POST',
        headers: { authorization: 'Bearer test-secret' },
      }),
      env,
    );
    assert.equal(runResponse.status, 200);
    assert.deepEqual(await runResponse.json(), { sources: 1, queued: 1, failures: [] });
    assert.equal(queued.length, 1);
    assert.deepEqual(queued[0].body.source.metadata, {
      owner: 'research',
      ...assessment,
    });

    let acknowledged = false;
    let retried = false;
    await (worker as any).queue({
      messages: [{
        body: queued[0].body,
        attempts: 1,
        id: 'lineage-message',
        ack: () => { acknowledged = true; },
        retry: () => { retried = true; },
      }],
    }, env);

    assert.equal(ingested.length, 1);
    assert.deepEqual(ingested[0].source.metadata, {
      owner: 'research',
      ...assessment,
    });
    assert.equal(acknowledged, true);
    assert.equal(retried, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
