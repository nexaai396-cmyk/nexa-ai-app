import type { NexaModule } from './types';

export const DEFAULT_MODULES: Omit<NexaModule, 'id' | 'user_id'>[] = [
  {
    key: 'content_generation',
    label: 'Content Generation',
    description: 'AI-crafted SEO articles with targeted keywords, backlinks, and anchor text.',
    enabled: true,
    settings: { model: 'gemini', tone: 'professional', wordCount: 1200 },
  },
  {
    key: 'auto_publishing',
    label: 'Auto-Publishing Engine',
    description: 'Push formatted HTML posts to Blogger, WordPress, and Medium over REST.',
    enabled: true,
    settings: { platforms: ['blogger', 'wordpress', 'medium'], format: 'html' },
  },
  {
    key: 'indexing_console',
    label: 'Automatic Indexing',
    description: 'Trigger Google indexing requests for freshly published URLs.',
    enabled: true,
    settings: { provider: 'google', priority: 'normal' },
  },
  {
    key: 'syndication',
    label: 'Social & Web 2.0 Syndication',
    description: 'Distribute links across Telegram, Twitter/X, and Web 2.0 webhooks.',
    enabled: true,
    settings: { channels: ['telegram', 'twitter', 'web2'] },
  },
  {
    key: 'rebranding',
    label: 'System Rebranding Engine',
    description: 'Dynamically update app name, theme colors, logo, and metadata.',
    enabled: true,
    settings: {},
  },
  {
    key: 'training_console',
    label: 'AI Training & Feature Console',
    description: 'Natural-language terminal to teach Nexa new capabilities and workflows.',
    enabled: true,
    settings: { model: 'gemini' },
  },
];

export const PUBLISH_PLATFORMS = [
  { id: 'blogger', label: 'Blogger' },
  { id: 'wordpress', label: 'WordPress' },
  { id: 'medium', label: 'Medium' },
];

export const SYNDICATION_CHANNELS = [
  { id: 'telegram', label: 'Telegram' },
  { id: 'twitter', label: 'Twitter / X' },
  { id: 'web2', label: 'Web 2.0 Webhooks' },
];

export const INDEXING_PROVIDERS = [
  { id: 'google', label: 'Google Indexing API' },
  { id: 'bing', label: 'Bing Webmaster' },
];
