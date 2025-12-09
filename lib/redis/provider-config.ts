import { getRedisClient } from './client';

export interface ProviderConfig {
  id: string;
  name: string;
  host: string;
  apiKey: string;
  monthlyQuota: number;
  enabled: boolean;
  endpoints: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderUsage {
  providerId: string;
  platform: string;
  month: string;
  callCount: number;
  lastUsed: string;
}

const KEYS = {
  providers: (platform: string) => `providers:${platform}`,
  provider: (platform: string, id: string) => `provider:${platform}:${id}`,
  usage: (platform: string, providerId: string, month: string) => `usage:${platform}:${providerId}:${month}`,
  usageIndex: (platform: string, month: string) => `usage:index:${platform}:${month}`,
};

export class ProviderConfigService {
  private redis = getRedisClient();

  async getProviders(platform: string): Promise<ProviderConfig[]> {
    const providerIds = await this.redis.smembers(KEYS.providers(platform));
    if (!providerIds || providerIds.length === 0) return [];

    const providers: ProviderConfig[] = [];
    for (const id of providerIds) {
      const provider = await this.redis.get<ProviderConfig>(KEYS.provider(platform, id));
      if (provider) {
        providers.push(provider);
      }
    }

    return providers.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getProvider(platform: string, id: string): Promise<ProviderConfig | null> {
    return await this.redis.get<ProviderConfig>(KEYS.provider(platform, id));
  }

  async getEnabledProviders(platform: string): Promise<ProviderConfig[]> {
    const providers = await this.getProviders(platform);
    return providers.filter((p) => p.enabled);
  }

  async createProvider(platform: string, config: Omit<ProviderConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProviderConfig> {
    const id = `${platform}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const provider: ProviderConfig = {
      ...config,
      id,
      createdAt: now,
      updatedAt: now,
    };

    await this.redis.set(KEYS.provider(platform, id), provider);
    await this.redis.sadd(KEYS.providers(platform), id);

    return provider;
  }

  async updateProvider(platform: string, id: string, updates: Partial<Omit<ProviderConfig, 'id' | 'createdAt'>>): Promise<ProviderConfig | null> {
    const existing = await this.getProvider(platform, id);
    if (!existing) return null;

    const updated: ProviderConfig = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    await this.redis.set(KEYS.provider(platform, id), updated);
    return updated;
  }

  async deleteProvider(platform: string, id: string): Promise<boolean> {
    const existing = await this.getProvider(platform, id);
    if (!existing) return false;

    await this.redis.del(KEYS.provider(platform, id));
    await this.redis.srem(KEYS.providers(platform), id);
    return true;
  }

  async toggleProvider(platform: string, id: string, enabled: boolean): Promise<ProviderConfig | null> {
    return this.updateProvider(platform, id, { enabled });
  }

  // Usage tracking
  async getUsage(platform: string, providerId: string, month?: string): Promise<ProviderUsage | null> {
    const currentMonth = month || this.getCurrentMonth();
    return await this.redis.get<ProviderUsage>(KEYS.usage(platform, providerId, currentMonth));
  }

  async recordUsage(platform: string, providerId: string, calls: number = 1): Promise<ProviderUsage> {
    const currentMonth = this.getCurrentMonth();
    const key = KEYS.usage(platform, providerId, currentMonth);
    const existing = await this.redis.get<ProviderUsage>(key);

    const usage: ProviderUsage = {
      providerId,
      platform,
      month: currentMonth,
      callCount: (existing?.callCount || 0) + calls,
      lastUsed: new Date().toISOString(),
    };

    await this.redis.set(key, usage);
    // 设置过期时间为 35 天，确保月度数据在下月仍可查询
    await this.redis.expire(key, 35 * 24 * 60 * 60);
    // 添加到索引
    await this.redis.sadd(KEYS.usageIndex(platform, currentMonth), providerId);

    return usage;
  }

  async getUsageForMonth(platform: string, month?: string): Promise<ProviderUsage[]> {
    const currentMonth = month || this.getCurrentMonth();
    const providerIds = await this.redis.smembers(KEYS.usageIndex(platform, currentMonth));

    const usages: ProviderUsage[] = [];
    for (const providerId of providerIds) {
      const usage = await this.getUsage(platform, providerId, currentMonth);
      if (usage) {
        usages.push(usage);
      }
    }

    return usages;
  }

  async getRemainingQuota(platform: string, providerId: string): Promise<number> {
    const provider = await this.getProvider(platform, providerId);
    if (!provider) return 0;

    const usage = await this.getUsage(platform, providerId);
    return Math.max(0, provider.monthlyQuota - (usage?.callCount || 0));
  }

  async getAvailableProvider(platform: string): Promise<ProviderConfig | null> {
    const providers = await this.getEnabledProviders(platform);
    if (providers.length === 0) return null;

    // 获取所有 provider 的剩余配额
    const providersWithQuota = await Promise.all(
      providers.map(async (p) => ({
        provider: p,
        remaining: await this.getRemainingQuota(platform, p.id),
      })),
    );

    // 选择剩余配额最多的
    const sorted = providersWithQuota.filter((p) => p.remaining > 0).sort((a, b) => b.remaining - a.remaining);

    return sorted[0]?.provider || null;
  }

  async hasAvailableQuota(platform: string): Promise<boolean> {
    const provider = await this.getAvailableProvider(platform);
    return provider !== null;
  }

  async getTotalQuota(platform: string): Promise<{ total: number; used: number; remaining: number }> {
    const providers = await this.getEnabledProviders(platform);
    let total = 0;
    let used = 0;

    for (const provider of providers) {
      total += provider.monthlyQuota;
      const usage = await this.getUsage(platform, provider.id);
      used += usage?.callCount || 0;
    }

    return { total, used, remaining: total - used };
  }

  async getProviderStatus(platform: string): Promise<Array<ProviderConfig & { used: number; remaining: number; usagePercent: number }>> {
    const providers = await this.getProviders(platform);

    return Promise.all(
      providers.map(async (p) => {
        const usage = await this.getUsage(platform, p.id);
        const used = usage?.callCount || 0;
        const remaining = Math.max(0, p.monthlyQuota - used);
        const usagePercent = Math.round((used / p.monthlyQuota) * 100);

        return { ...p, used, remaining, usagePercent };
      }),
    );
  }

  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  // Bulk operations for migration
  async importProviders(platform: string, providers: Array<Omit<ProviderConfig, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ProviderConfig[]> {
    const results: ProviderConfig[] = [];
    for (const config of providers) {
      const provider = await this.createProvider(platform, config);
      results.push(provider);
    }
    return results;
  }

  async exportProviders(platform: string): Promise<ProviderConfig[]> {
    return this.getProviders(platform);
  }
}

let instance: ProviderConfigService | null = null;

export function getProviderConfigService(): ProviderConfigService {
  if (!instance) {
    instance = new ProviderConfigService();
  }
  return instance;
}

export function resetProviderConfigService(): void {
  instance = null;
}
