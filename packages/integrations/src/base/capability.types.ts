/**
 * Describes what an integration adapter can actually do.
 * This is the honest capability model — no faking unsupported operations.
 */

export type CapabilityMode =
  | 'api_backed'       // Direct API call is possible
  | 'webhook_backed'   // Works via webhook/callback
  | 'copy_paste'       // Generates commands for user to run manually
  | 'manual_dashboard' // User must do it in a web dashboard
  | 'not_supported';   // This capability does not exist

export interface AdapterCapability {
  id: string;
  name: string;
  description: string;
  mode: CapabilityMode;
  requiresAdminRights: boolean;
  notes?: string;
}

export const ROSE_CAPABILITIES: AdapterCapability[] = [
  {
    id: 'add_to_group',
    name: 'Add to Group',
    description: 'Add Rose Bot as admin to a Telegram group',
    mode: 'manual_dashboard',
    requiresAdminRights: true,
    notes: 'Must be done by a group admin in the Telegram app',
  },
  {
    id: 'set_welcome',
    name: 'Set Welcome Message',
    description: 'Configure the welcome message for new members',
    mode: 'copy_paste',
    requiresAdminRights: true,
    notes: 'Send /setwelcome command in the group chat',
  },
  {
    id: 'set_rules',
    name: 'Set Rules',
    description: 'Configure /rules command response',
    mode: 'copy_paste',
    requiresAdminRights: true,
  },
  {
    id: 'enable_captcha',
    name: 'Enable Captcha',
    description: 'Require captcha verification for new members',
    mode: 'copy_paste',
    requiresAdminRights: true,
  },
  {
    id: 'configure_antiflood',
    name: 'Configure Anti-Flood',
    description: 'Set anti-flood threshold and action',
    mode: 'copy_paste',
    requiresAdminRights: true,
  },
  {
    id: 'save_note',
    name: 'Save Note',
    description: 'Save a named note (for command replies)',
    mode: 'copy_paste',
    requiresAdminRights: true,
  },
  {
    id: 'blacklist',
    name: 'Configure Blacklist',
    description: 'Add words/patterns to the blacklist',
    mode: 'copy_paste',
    requiresAdminRights: true,
  },
];

export const COMBOT_CAPABILITIES: AdapterCapability[] = [
  {
    id: 'add_to_group',
    name: 'Add to Group',
    description: 'Add Combot as admin to a Telegram group',
    mode: 'manual_dashboard',
    requiresAdminRights: true,
    notes: 'Must be done by a group admin in the Telegram app, then connected via combot.org',
  },
  {
    id: 'configure_antispam',
    name: 'Configure Anti-Spam',
    description: 'Set anti-spam sensitivity and rules',
    mode: 'manual_dashboard',
    requiresAdminRights: false,
    notes: 'Configuration is done via https://combot.org dashboard',
  },
  {
    id: 'enable_cas',
    name: 'Enable CAS',
    description: 'Enable Combot Anti-Spam list integration',
    mode: 'manual_dashboard',
    requiresAdminRights: false,
  },
  {
    id: 'view_stats',
    name: 'View Statistics',
    description: 'Access community activity statistics',
    mode: 'manual_dashboard',
    requiresAdminRights: false,
    notes: 'Available at https://combot.org/c/{chat_id}',
  },
];
