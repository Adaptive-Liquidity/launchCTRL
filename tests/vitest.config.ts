import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: { reporter: ['text', 'json', 'html'] },
    setupFiles: ['./setup.ts'],
  },
  resolve: {
    alias: {
      '@launchctrl/types': resolve(__dirname, '../packages/types/src/index.ts'),
      '@launchctrl/config': resolve(__dirname, '../packages/config/src/index.ts'),
      '@launchctrl/lib': resolve(__dirname, '../packages/lib/src/index.ts'),
      '@launchctrl/domain': resolve(__dirname, '../packages/domain/src/index.ts'),
      '@launchctrl/skills': resolve(__dirname, '../packages/skills/src/index.ts'),
      '@launchctrl/templates': resolve(__dirname, '../packages/templates/src/index.ts'),
      '@launchctrl/integrations': resolve(__dirname, '../packages/integrations/src/index.ts'),
    },
  },
});
