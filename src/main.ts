import { Actor, log } from 'apify';

import { buildServer, loadConfig } from './presentation/apify/composition-root.js';

await Actor.init();

const { useProxy, ...config } = loadConfig();
let proxyUrl: string | undefined;
if (useProxy) {
    const proxyConfiguration = await Actor.createProxyConfiguration();
    proxyUrl = await proxyConfiguration?.newUrl();
}

const server = buildServer({ ...config, ...(proxyUrl ? { proxyUrl } : {}) });
server.listen(config.port, () => {
    log.info('Catastro REST API listening', { port: config.port, proxy: Boolean(proxyUrl) });
});

Actor.on('aborting', async () => {
    server.close();
    await Actor.exit();
});
