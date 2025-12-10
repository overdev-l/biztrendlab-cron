import type { BaseScraper, PlatformConfig } from '../base';
import {
  TwitterScraper,
  RedditScraper,
  HackerNewsScraper,
  V2EXScraper,
  GitHubScraper,
  LinuxDoScraper,
  ProductHuntScraper,
  GoogleTrendsScraper,
} from '../platforms';

export const AVAILABLE_SOURCES = [
  'twitter',
  'reddit',
  'hackernews',
  'v2ex',
  'github',
  'googletrends',
  'producthunt',
  'linuxdo',
] as const;

export type SourceName = (typeof AVAILABLE_SOURCES)[number];

export const PLATFORM_CONFIGS: Record<SourceName, PlatformConfig> = {
  twitter: {
    name: 'Twitter',
    scraper: () => new TwitterScraper() as BaseScraper,
    options: {
      queries: ['startup pain point', 'SaaS struggle', 'indie hacker problem', 'founder challenge', 'AI tool need'],
      limit: 10,
      includeComments: true,
      commentsPerTweet: 3,
    },
    recommendedInterval: '每6小时 (0 */6 * * *) - API配额限制',
    hasProviderManager: true,
  },

  reddit: {
    name: 'Reddit',
    scraper: () => new RedditScraper() as BaseScraper,
    options: {
      useTopSubreddits: true, // 使用 Top 热门子版面列表
      limit: 500,
      sort: 'top' as const,
      timeFilter: 'week' as const,
      minScore: 10,
      minComments: 30, // 评论数 > 30
      batchSize: 10,
      batchDelay: 2000,
      concurrency: 2,
    },
    recommendedInterval: '每4小时 (0 */4 * * *)',
    hasProviderManager: false,
  },
  hackernews: {
    name: 'Hacker News',
    scraper: () => new HackerNewsScraper() as BaseScraper,
    options: {
      type: 'top' as const,
      limit: 100,
      minScore: 20,
      minComments: 10,
      includeAskHN: true,
    },
    recommendedInterval: '每4小时 (0 */4 * * *)',
    hasProviderManager: false,
  },
  v2ex: {
    name: 'V2EX',
    scraper: () => new V2EXScraper() as BaseScraper,
    options: {
      type: 'hot' as const,
      limit: 80,
    },
    recommendedInterval: '每6小时 (0 */6 * * *)',
    hasProviderManager: false,
  },
  github: {
    name: 'GitHub',
    scraper: () => new GitHubScraper() as BaseScraper,
    options: {
      limit: 60,
      minReactions: 5,
      minComments: 3,
    },
    recommendedInterval: '每6小时 (0 */6 * * *)',
    hasProviderManager: false,
  },
  googletrends: {
    name: 'Google Trends',
    scraper: () => new GoogleTrendsScraper() as BaseScraper,
    options: {
      geo: 'US',
      limit: 30,
    },
    recommendedInterval: '每12小时 (0 */12 * * *)',
    hasProviderManager: false,
  },
  producthunt: {
    name: 'Product Hunt',
    scraper: () => new ProductHuntScraper() as BaseScraper,
    options: {
      limit: 50,
    },
    recommendedInterval: '每12小时 (0 */12 * * *)',
    hasProviderManager: false,
  },
  linuxdo: {
    name: 'Linux.do',
    scraper: () => new LinuxDoScraper() as BaseScraper,
    options: {
      limit: 50,
    },
    recommendedInterval: '每6小时 (0 */6 * * *)',
    hasProviderManager: false,
  },
};

export function getPlatformConfig(source: SourceName): PlatformConfig {
  return PLATFORM_CONFIGS[source];
}

export function getAvailablePlatforms(): SourceName[] {
  return [...AVAILABLE_SOURCES];
}

export function hasProviderManager(source: SourceName): boolean {
  return PLATFORM_CONFIGS[source]?.hasProviderManager ?? false;
}
