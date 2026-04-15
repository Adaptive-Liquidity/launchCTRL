import { buildApp } from './app.js';
import { getEnv, loadEnv } from '@launchctrl/config';
import { skillRegistry } from '@launchctrl/skills';

async function main() {
  loadEnv();
  const env = getEnv();

  // Initialize skill registry
  await skillRegistry.initialize();

  const app = await buildApp();

  await app.listen({
    port: env.API_PORT,
    host: env.API_HOST,
  });

  console.log(`LaunchCtrl API running on ${env.API_HOST}:${env.API_PORT}`);
}

main().catch((err) => {
  console.error('Failed to start API server:', err);
  process.exit(1);
});
