export type View = 'public' | 'admin';

export type LogLevel = 'info' | 'success' | 'warning' | 'error';

export interface Workspace {
  id: string;
  user_id: string;
  app_name: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  site_description: string;
  updated_at: string;
}

export interface NexaModule {
  id: string;
  user_id: string;
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  settings: Record<string, unknown>;
}

export interface SystemLog {
  id: string;
  level: LogLevel;
  event: string;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PublishPlatform {
  id: string;
  label: string;
  connected: boolean;
}

export interface SyndicationChannel {
  id: string;
  label: string;
  enabled: boolean;
}
