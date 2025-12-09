import { BaseProviderManager, type ProviderStatus } from '../../provider-manager';
import type { ProviderConfig } from '../../../redis/provider-config';
import type { TwitterProvider } from './types';

const DEFAULT_ENDPOINTS = {
  search: '/search-v2',
  comments: '/comments-v2',
};

export class TwitterProviderManager extends BaseProviderManager<TwitterProvider> {
  protected platformName = 'twitter';

  protected transformProvider(config: ProviderConfig): TwitterProvider {
    return {
      id: config.id,
      name: config.name,
      host: config.host,
      apiKey: config.apiKey,
      monthlyQuota: config.monthlyQuota,
      enabled: config.enabled,
      endpoints: config.endpoints,
      searchEndpoint: config.endpoints.search || DEFAULT_ENDPOINTS.search,
      commentsEndpoint: config.endpoints.comments || DEFAULT_ENDPOINTS.comments,
    };
  }
}

let instance: TwitterProviderManager | null = null;

export function getTwitterProviderManager(): TwitterProviderManager {
  if (!instance) {
    instance = new TwitterProviderManager();
  }
  return instance;
}

export function resetTwitterProviderManager(): void {
  instance = null;
}

export type { ProviderStatus };
