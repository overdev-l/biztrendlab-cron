import { getProviderConfigService, type ProviderConfig } from '../redis/provider-config';

export interface Provider {
  id: string;
  name: string;
  host: string;
  apiKey: string;
  monthlyQuota: number;
  enabled: boolean;
  endpoints: Record<string, string>;
}

export interface ProviderStatus {
  id: string;
  name: string;
  host: string;
  enabled: boolean;
  monthlyQuota: number;
  used: number;
  remaining: number;
  usagePercent: number;
}

export abstract class BaseProviderManager<T extends Provider = Provider> {
  protected configService = getProviderConfigService();
  protected abstract platformName: string;
  protected cachedProviders: T[] | null = null;
  protected cacheExpiry: number = 0;
  protected cacheTTL = 60 * 1000; // 1 minute cache

  protected abstract transformProvider(config: ProviderConfig): T;

  protected async loadProviders(): Promise<T[]> {
    const now = Date.now();
    if (this.cachedProviders && now < this.cacheExpiry) {
      return this.cachedProviders;
    }

    try {
      const configs = await this.configService.getEnabledProviders(this.platformName);
      this.cachedProviders = configs.map((c) => this.transformProvider(c));
      this.cacheExpiry = now + this.cacheTTL;
      return this.cachedProviders;
    } catch (error) {
      console.error(`Failed to load ${this.platformName} providers from Redis:`, error);
      return this.cachedProviders || [];
    }
  }

  clearCache(): void {
    this.cachedProviders = null;
    this.cacheExpiry = 0;
  }

  async getAvailableProvider(): Promise<T | null> {
    const config = await this.configService.getAvailableProvider(this.platformName);
    if (!config) return null;
    return this.transformProvider(config);
  }

  async recordUsage(providerId: string, calls: number = 1): Promise<void> {
    await this.configService.recordUsage(this.platformName, providerId, calls);
  }

  getHeaders(provider: T): Record<string, string> {
    return {
      'x-rapidapi-host': provider.host,
      'x-rapidapi-key': provider.apiKey,
    };
  }

  getBaseUrl(provider: T): string {
    return `https://${provider.host}`;
  }

  async getStatus(): Promise<ProviderStatus[]> {
    return this.configService.getProviderStatus(this.platformName);
  }

  async getTotalQuota(): Promise<{ total: number; used: number; remaining: number }> {
    return this.configService.getTotalQuota(this.platformName);
  }

  async getProviderCount(): Promise<number> {
    const providers = await this.loadProviders();
    return providers.length;
  }

  async hasAvailableQuota(): Promise<boolean> {
    return this.configService.hasAvailableQuota(this.platformName);
  }
}
