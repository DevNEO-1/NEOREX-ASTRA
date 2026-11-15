import dns from 'node:dns';
import { createServer } from './server.js';
import { loadConfig } from './config.js';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Ignore in environments where not supported
}

const config = loadConfig();
const app = createServer(config);

app.listen(config.port, config.host, () => {
  console.log(`[NEOREX ASTRA] Dr. Astra Gemini Backend listening at http://${config.host}:${config.port}`);
  console.log(`[NEOREX ASTRA] Gemini Model: ${config.geminiModel} | Key Configured: ${Boolean(config.geminiApiKey)}`);
});
