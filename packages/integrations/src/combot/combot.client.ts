import { getLogger } from '@launchctrl/lib';

const logger = getLogger();

/**
 * Combot API client.
 *
 * Note: Combot's public API is limited. Most configuration must be done
 * via the web dashboard at https://combot.org
 *
 * This client wraps the available public endpoints only.
 */
export class CombotClient {
  private readonly baseUrl = 'https://combot.org/api';
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
  }

  /**
   * Gets group statistics if available.
   * This requires the group to be connected to Combot.
   */
  async getGroupStats(chatId: number): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/stats/${chatId}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      logger.error({ error, chatId }, 'Combot API request failed');
      return { success: false, error: String(error) };
    }
  }
}
