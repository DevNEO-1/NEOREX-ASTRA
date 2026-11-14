import { createServer } from './server.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = createServer(config);

app.listen(config.port, config.host, () => {
  console.log(`[NEOREX ASTRA] Dr. Astra Gemini Backend listening at http://${config.host}:${config.port}`);
  console.log(`[NEOREX ASTRA] Gemini Model: ${config.geminiModel} | Key Configured: ${Boolean(config.geminiApiKey)}`);
});
