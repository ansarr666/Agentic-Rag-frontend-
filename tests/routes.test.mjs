import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('standalone UI pages and runtime API config are served', async () => {
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  try {
    await server.listen();
    const address = server.httpServer.address();
    assert.ok(address && typeof address !== 'string');
    const origin = `http://127.0.0.1:${address.port}`;

    for (const [path, root] of [
      ['/', 'widget-root'],
      ['/widget', 'widget-root'],
      ['/admin', 'id="root"'],
      ['/demo', 'OrionSoft'],
    ]) {
      const response = await fetch(origin + path);
      assert.equal(response.status, 200, path);
      assert.match(await response.text(), new RegExp(root));
    }

    const config = await fetch(origin + '/config.js');
    assert.equal(config.status, 200);
    assert.match(await config.text(), /__RAG_CONFIG__/);
  } finally {
    await server.close();
  }
});
