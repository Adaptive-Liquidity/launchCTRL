import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

interface UserbotStatus {
  connected: boolean;
  username?: string;
  phoneNumber?: string;
  connectedAt?: string;
}

export function useUserbotStatus(workspaceId: string) {
  return useQuery<UserbotStatus>({
    queryKey: ['userbot-status', workspaceId],
    queryFn: () =>
      apiRequest<UserbotStatus>(`/api/v1/workspaces/${workspaceId}/userbot`),
    enabled: !!workspaceId,
    // Refetch every 30s so the card stays in sync
    refetchInterval: 30_000,
    // Don't throw on 404 — treat it as "not connected"
    retry: (failureCount, error) => {
      const msg = (error as Error)?.message ?? '';
      if (msg.includes('404') || msg.includes('HTTP 404')) return false;
      return failureCount < 2;
    },
  });
}
