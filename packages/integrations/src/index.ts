export * from './base/adapter.interface.js';
export * from './base/capability.types.js';
export * from './rose/rose.adapter.js';
export * from './rose/rose.generator.js';
export * from './rose/rose.types.js';
export * from './combot/combot.adapter.js';
export * from './combot/combot.client.js';
export * from './combot/combot.types.js';
export * from './stubs/safeguard.stub.js';
export * from './stubs/controllerbot.stub.js';
export * from './stubs/buybot.stub.js';
export * from './stubs/alertbot.stub.js';
export * from './stubs/chainfuel.stub.js';
export * from './stubs/teleme.stub.js';

import type { IntegrationAdapter } from './base/adapter.interface.js';
import { RoseAdapter } from './rose/rose.adapter.js';
import { CombotAdapter } from './combot/combot.adapter.js';
import { SafeguardAdapterStub } from './stubs/safeguard.stub.js';
import { ControllerBotAdapterStub } from './stubs/controllerbot.stub.js';
import { BuyBotAdapterStub } from './stubs/buybot.stub.js';
import { AlertBotAdapterStub } from './stubs/alertbot.stub.js';
import { ChainfuelAdapterStub } from './stubs/chainfuel.stub.js';
import { TeleMeAdapterStub } from './stubs/teleme.stub.js';

const ADAPTERS: IntegrationAdapter[] = [
  new RoseAdapter(),
  new CombotAdapter(),
  new SafeguardAdapterStub(),
  new ControllerBotAdapterStub(),
  new BuyBotAdapterStub(),
  new AlertBotAdapterStub(),
  new ChainfuelAdapterStub(),
  new TeleMeAdapterStub(),
];

const adapterMap = new Map(ADAPTERS.map((a) => [a.slug, a]));

export function getAdapter(slug: string): IntegrationAdapter | null {
  return adapterMap.get(slug) ?? null;
}

export function getAllAdapters(): IntegrationAdapter[] {
  return [...ADAPTERS];
}
