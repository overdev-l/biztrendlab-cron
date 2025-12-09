import 'dotenv/config';
import { getProviderConfigService } from '../lib/redis';

// 预定义的 API 配置模板
interface ApiTemplate {
  host: string;
  endpoints: Record<string, string>;
}

const TWITTER_TEMPLATES: Record<string, ApiTemplate> = {
  'twttr-api': {
    host: 'twttr-api.p.rapidapi.com',
    endpoints: { search: '/search-v2', comments: '/comments-v2' },
  },
  'twitter-api47': {
    host: 'twitter-api47.p.rapidapi.com',
    endpoints: { search: '/v3/search', comments: '/v3/tweet/replies' },
  },
  'twitter-api45': {
    host: 'twitter-api45.p.rapidapi.com',
    endpoints: { search: '/search.php', comments: '/replies.php' },
  },
  'twitter135': {
    host: 'twitter135.p.rapidapi.com',
    endpoints: { search: '/v2/Search/', comments: '/v2/TweetReplies/' },
  },
};

// 解析 Provider 配置字符串
// 格式: apiKey 或 apiKey@template 或 apiKey@host:search_endpoint:comments_endpoint
function parseProviderConfig(
  configStr: string,
  index: number,
): { name: string; host: string; apiKey: string; endpoints: Record<string, string> } | null {
  const parts = configStr.trim().split('@');
  const apiKey = parts[0];
  if (!apiKey) return null;

  const templates = TWITTER_TEMPLATES;
  const defaultTemplate = TWITTER_TEMPLATES['twttr-api'];

  if (parts.length === 1) {
    // 只有 apiKey，使用默认模板
    return {
      name: `twitter API #${index + 1}`,
      host: defaultTemplate.host,
      apiKey,
      endpoints: defaultTemplate.endpoints,
    };
  }

  const templateOrCustom = parts[1];

  // 检查是否是预定义模板
  if (templates[templateOrCustom]) {
    const template = templates[templateOrCustom];
    return {
      name: `${templateOrCustom} #${index + 1}`,
      host: template.host,
      apiKey,
      endpoints: template.endpoints,
    };
  }

  // 自定义格式: host:search:comments
  const customParts = templateOrCustom.split(':');
  if (customParts.length >= 3) {
    return {
      name: `${customParts[0]} #${index + 1}`,
      host: customParts[0],
      apiKey,
      endpoints: {
        search: customParts[1],
        comments: customParts[2],
      },
    };
  }

  // 无法解析，使用默认
  console.warn(`  ⚠ Cannot parse config "${configStr}", using default template`);
  return {
    name: `twitter API #${index + 1}`,
    host: defaultTemplate.host,
    apiKey,
    endpoints: defaultTemplate.endpoints,
  };
}

async function initProviders() {
  const service = getProviderConfigService();

  console.log('=== Initializing API Providers ===\n');

  // Twitter Providers
  // 格式: key1,key2@twitter-api47,key3@custom-host.com:/v1/search:/v1/replies
  const twitterConfigs = process.env.TWITTER_RAPIDAPI_KEYS?.split(',') || [];
  if (twitterConfigs.length > 0 && twitterConfigs[0]) {
    console.log('Setting up Twitter providers...');
    for (let i = 0; i < twitterConfigs.length; i++) {
      const config = parseProviderConfig(twitterConfigs[i], i);
      if (!config) continue;

      await service.createProvider('twitter', {
        name: config.name,
        host: config.host,
        apiKey: config.apiKey,
        monthlyQuota: 500,
        enabled: true,
        endpoints: config.endpoints,
      });
      console.log(`  ✓ Created ${config.name} (${config.host})`);
    }
  } else {
    console.log('⚠ No TWITTER_RAPIDAPI_KEYS found, skipping Twitter setup');
  }

  // 显示状态
  console.log('\n=== Provider Status ===');
  for (const platform of ['twitter']) {
    const status = await service.getProviderStatus(platform);
    if (status.length === 0) {
      console.log(`\n${platform}: No providers configured`);
      continue;
    }
    console.log(`\n${platform}:`);
    for (const p of status) {
      const statusIcon = p.enabled ? '✓' : '✗';
      console.log(`  ${statusIcon} ${p.name}: ${p.remaining}/${p.monthlyQuota} remaining (${p.usagePercent}% used)`);
    }
  }

  console.log('\n=== Done ===');
}

// 显示现有 Providers
async function showStatus() {
  const service = getProviderConfigService();

  console.log('=== Current Provider Status ===');
  for (const platform of ['twitter']) {
    const status = await service.getProviderStatus(platform);
    if (status.length === 0) {
      console.log(`\n${platform}: No providers configured`);
      continue;
    }
    console.log(`\n${platform}:`);
    for (const p of status) {
      const statusIcon = p.enabled ? '✓' : '✗';
      console.log(`  ${statusIcon} ${p.name} (${p.id})`);
      console.log(`    Host: ${p.host}`);
      console.log(`    Quota: ${p.used}/${p.monthlyQuota} (${p.usagePercent}% used)`);
      console.log(`    Remaining: ${p.remaining}`);
    }

    const total = await service.getTotalQuota(platform);
    console.log(`\n  Total: ${total.used}/${total.total} used, ${total.remaining} remaining`);
  }
}

// 清除所有 Providers
async function clearAll() {
  const service = getProviderConfigService();

  console.log('=== Clearing All Providers ===');
  for (const platform of ['twitter']) {
    const providers = await service.getProviders(platform);
    for (const p of providers) {
      await service.deleteProvider(platform, p.id);
      console.log(`  Deleted ${platform}/${p.name}`);
    }
  }
  console.log('Done');
}

// 命令行参数处理
const command = process.argv[2];

switch (command) {
  case 'init':
    initProviders().catch(console.error);
    break;
  case 'status':
    showStatus().catch(console.error);
    break;
  case 'clear':
    clearAll().catch(console.error);
    break;
  default:
    console.log(`
Usage: bun run scripts/init-providers.ts <command>

Commands:
  init    - Initialize providers from environment variables
  status  - Show current provider status
  clear   - Remove all providers

Environment Variables:
  TWITTER_RAPIDAPI_KEYS    - Comma-separated RapidAPI keys for Twitter

Key Format:
  - Simple:    apiKey
  - Template:  apiKey@template-name
  - Custom:    apiKey@host:search-endpoint:comments-endpoint

Twitter Templates:
  - twttr-api     (default) twttr-api.p.rapidapi.com
  - twitter-api47           twitter-api47.p.rapidapi.com
  - twitter-api45           twitter-api45.p.rapidapi.com
  - twitter135              twitter135.p.rapidapi.com

Examples:
  # Simple (uses default twttr-api)
  TWITTER_RAPIDAPI_KEYS="key1,key2" bun run providers:init

  # Mixed templates
  TWITTER_RAPIDAPI_KEYS="key1,key2@twitter-api47,key3@twitter135" bun run providers:init

  # Custom API
  TWITTER_RAPIDAPI_KEYS="key1@my-api.p.rapidapi.com:/v1/search:/v1/replies" bun run providers:init
`);
}
