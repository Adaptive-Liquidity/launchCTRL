export interface RoseWelcomeConfig {
  message: string;
  mediaId?: string;
  muteOnJoin?: boolean;
}

export interface RoseFilterConfig {
  word: string;
  action: 'delete' | 'warn' | 'ban' | 'mute';
}

export interface RoseNoteConfig {
  noteName: string;
  content: string;
  mediaId?: string;
}

export interface RoseCommandBundle {
  setupCommands: string[];
  welcomeCommand: string;
  rulesCommand: string | null;
  filterCommands: string[];
  noteCommands: string[];
  captchaCommand: string | null;
  antiFloodCommands: string[];
}
