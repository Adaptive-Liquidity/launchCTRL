'use client';

import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { SetupWizard } from '@/components/wizard/SetupWizard';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { api } from '@/lib/api';
import { haptic } from '@/lib/telegram';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function SetupContent({ id }: { id: string }) {
  const router = useRouter();
  const { token } = useWorkspaceStore();

  const handleComplete = async (answers: Record<string, unknown>) => {
    if (!token) return;
    haptic('medium');

    try {
      const result = await api.plans.create(token, id, answers);
      if (result.success) {
        const plan = result.data as { plan?: { id: string } };
        if (plan?.plan?.id) {
          router.push(`/workspace/${id}?plan=${plan.plan.id}`);
        } else {
          router.push(`/workspace/${id}`);
        }
      }
    } catch (err) {
      console.error('Failed to create plan:', err);
      router.push(`/workspace/${id}`);
    }
  };

  return (
    <AppShell
      title="Setup Wizard"
      showBack
      onBack={() => router.push(`/workspace/${id}`)}
      showNav={false}
    >
      <SetupWizard
        workspaceId={id}
        onComplete={handleComplete}
        onCancel={() => router.push(`/workspace/${id}`)}
      />
    </AppShell>
  );
}

export default function SetupPage({ params }: { params: { id: string } }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SetupContent id={params.id} />
    </QueryClientProvider>
  );
}
