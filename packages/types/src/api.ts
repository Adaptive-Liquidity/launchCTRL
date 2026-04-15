// API request/response types

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// Auth
export interface InitDataPayload {
  initData: string;
}

export interface SessionResponse {
  token: string;
  user: {
    id: string;
    telegramUserId: number;
    telegramFirstName: string;
    telegramUsername: string | null;
    telegramPhotoUrl: string | null;
  };
  expiresAt: string;
}

// Workspaces
export interface CreateWorkspaceInput {
  name: string;
  description?: string;
}

export interface AddEntityInput {
  telegramChatId?: number;
  telegramUsername?: string;
  displayName: string;
  entityType: 'group' | 'supergroup' | 'channel' | 'bot';
  description?: string;
}

// Wizard / Planner
export interface CreatePlanInput {
  workspaceId: string;
  answers: import('./wizard.js').WizardAnswers;
}

export interface ApprovePlanInput {
  planId: string;
  isDryRun: boolean;
}

// Assets
export interface UpdateAssetInput {
  content: string;
  variables?: Record<string, string>;
}
