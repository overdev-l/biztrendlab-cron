import axios from 'axios';
import { BaseScraper, type ScrapedPost } from '../../base';
import { getTwitterProviderManager, type ProviderStatus } from './providers';
import type { TwitterProvider, TwitterTweet, TwitterComment, TwitterOptions, TwitterUser } from './types';

const DEFAULT_QUERIES = ['startup', 'SaaS', 'indie hacker', 'struggling with', 'need help', 'AI tool'];

export class TwitterScraper extends BaseScraper {
  name = 'twitter';
  private providerManager = getTwitterProviderManager();
  private currentProvider: TwitterProvider | null = null;

  private async getProvider(): Promise<TwitterProvider> {
    if (!this.currentProvider) {
      this.currentProvider = await this.providerManager.getAvailableProvider();
    }

    if (!this.currentProvider) {
      throw new Error('No available Twitter API provider. All quotas exhausted.');
    }

    return this.currentProvider;
  }

  private async refreshProvider(): Promise<TwitterProvider | null> {
    this.currentProvider = await this.providerManager.getAvailableProvider();
    return this.currentProvider;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const provider = await this.getProvider();
    return this.providerManager.getHeaders(provider);
  }

  private async getBaseUrl(): Promise<string> {
    const provider = await this.getProvider();
    return this.providerManager.getBaseUrl(provider);
  }

  private async recordUsage(calls: number = 1): Promise<void> {
    if (this.currentProvider) {
      await this.providerManager.recordUsage(this.currentProvider.id, calls);
    }
  }

  async getProviderStatus(): Promise<ProviderStatus[]> {
    return this.providerManager.getStatus();
  }

  async getTotalQuota(): Promise<{ total: number; used: number; remaining: number }> {
    return this.providerManager.getTotalQuota();
  }

  async scrape(options: TwitterOptions = {}): Promise<ScrapedPost[]> {
    const { queries = DEFAULT_QUERIES, limit = 10, includeComments = false, commentsPerTweet = 5 } = options;

    if (!(await this.providerManager.hasAvailableQuota())) {
      console.log('  ⚠️ All Twitter API providers have exhausted their quotas');
      return [];
    }

    const quota = await this.getTotalQuota();
    console.log(`  📊 Twitter API Quota: ${quota.used}/${quota.total} used, ${quota.remaining} remaining`);

    const posts: ScrapedPost[] = [];

    for (const query of queries) {
      if (!(await this.providerManager.hasAvailableQuota())) {
        console.log('  ⚠️ Quota exhausted during scraping, stopping...');
        break;
      }

      try {
        const provider = await this.getProvider();
        console.log(`  Searching Twitter for: "${query}" [Provider: ${provider.name}]`);
        const tweets = await this.searchTweets(query, limit);

        for (const tweet of tweets) {
          let comments: TwitterComment[] = [];

          if (includeComments && tweet.id_str) {
            if (!(await this.providerManager.hasAvailableQuota())) {
              console.log('  ⚠️ Quota exhausted, skipping comments...');
              break;
            }

            try {
              comments = await this.getComments(tweet.id_str, commentsPerTweet);
              await this.delay(500);
            } catch (err) {
              console.error(`  Error fetching comments for tweet ${tweet.id_str}:`, err);
            }
          }

          const post = this.mapTweetToPost(tweet, comments, query);
          posts.push(post);
        }

        await this.delay(1000);
      } catch (err) {
        if (axios.isAxiosError(err) && (err.response?.status === 429 || err.response?.status === 403)) {
          console.log(`  ⚠️ Provider rate limited, trying next provider...`);
          if (!(await this.refreshProvider())) {
            console.log('  ❌ No more providers available');
            break;
          }
        }
        console.error(`  Error searching Twitter for "${query}":`, err);
      }
    }

    const finalQuota = await this.getTotalQuota();
    console.log(`  📊 Final Quota Status: ${finalQuota.used}/${finalQuota.total} used`);

    return posts;
  }

  private async searchTweets(query: string, limit: number): Promise<TwitterTweet[]> {
    try {
      const provider = await this.getProvider();
      const baseUrl = await this.getBaseUrl();
      const endpoint = provider.searchEndpoint;

      const response = await axios.get(`${baseUrl}${endpoint}`, {
        params: {
          query,
          type: 'Latest',
          count: Math.min(limit, 20),
        },
        headers: await this.getHeaders(),
        timeout: 20000,
      });

      await this.recordUsage(1);

      const tweets: TwitterTweet[] = [];

      const data = response.data?.data || response.data;
      const instructions = data?.search_by_raw_query?.search_timeline?.timeline?.instructions || [];

      for (const instruction of instructions) {
        if (instruction.type !== 'TimelineAddEntries') continue;

        const entries = instruction.entries || [];
        for (const entry of entries) {
          if (tweets.length >= limit) break;

          const tweet = this.extractTweetFromSearchV2(entry);
          if (tweet && tweet.id_str) {
            tweets.push(tweet);
          }
        }
      }

      if (tweets.length === 0) {
        const legacyEntries = response.data?.result?.timeline?.entries || [];
        for (const entry of legacyEntries) {
          if (tweets.length >= limit) break;
          const tweet = this.extractTweetFromEntry(entry);
          if (tweet && tweet.id_str) {
            tweets.push(tweet);
          }
        }
      }

      return tweets;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`Twitter API error: ${error.response?.status} - ${error.message}`);
      }
      throw error;
    }
  }

  private extractTweetFromSearchV2(entry: Record<string, unknown>): TwitterTweet | null {
    try {
      const content = entry?.content as Record<string, unknown>;
      const itemContent = content?.itemContent as Record<string, unknown>;
      const tweetResults = itemContent?.tweet_results as Record<string, unknown>;
      const result = tweetResults?.result as Record<string, unknown>;

      if (!result) return null;

      const legacy = result.legacy as Record<string, unknown>;
      const core = result.core as Record<string, unknown>;
      const userResults = core?.user_results as Record<string, unknown>;
      const userResult = userResults?.result as Record<string, unknown>;
      const userLegacy = userResult?.legacy as Record<string, unknown>;

      if (!legacy) return null;

      return {
        id_str: (legacy.id_str || result.rest_id || '') as string,
        full_text: (legacy.full_text || '') as string,
        text: (legacy.text || '') as string,
        user: {
          id_str: (userLegacy?.id_str || userResult?.rest_id || '') as string,
          name: (userLegacy?.name || 'Unknown') as string,
          screen_name: (userLegacy?.screen_name || 'unknown') as string,
          profile_image_url_https: userLegacy?.profile_image_url_https as string | undefined,
        },
        created_at: (legacy.created_at || '') as string,
        favorite_count: (legacy.favorite_count || 0) as number,
        retweet_count: (legacy.retweet_count || 0) as number,
        reply_count: (legacy.reply_count || 0) as number,
        quote_count: (legacy.quote_count || 0) as number,
        conversation_id_str: (legacy.conversation_id_str || '') as string,
      };
    } catch {
      return null;
    }
  }

  private extractTweetFromEntry(entry: {
    content?: {
      tweet?: TwitterTweet;
      itemContent?: {
        tweet_results?: {
          result?: {
            legacy?: TwitterTweet;
            core?: {
              user_results?: {
                result?: {
                  legacy?: TwitterUser;
                };
              };
            };
          };
        };
      };
    };
  }): TwitterTweet | null {
    if (entry?.content?.tweet) {
      return entry.content.tweet;
    }

    const tweetResult = entry?.content?.itemContent?.tweet_results?.result;
    if (tweetResult?.legacy) {
      const legacy = tweetResult.legacy;
      const userLegacy = tweetResult.core?.user_results?.result?.legacy;

      return {
        ...legacy,
        user: userLegacy || {
          id_str: '',
          name: 'Unknown',
          screen_name: 'unknown',
        },
      };
    }

    return null;
  }

  private async getComments(tweetId: string, count: number): Promise<TwitterComment[]> {
    try {
      const provider = await this.getProvider();
      const baseUrl = await this.getBaseUrl();
      const endpoint = provider.commentsEndpoint;

      const response = await axios.get(`${baseUrl}${endpoint}`, {
        params: {
          pid: tweetId,
          rankingMode: 'Relevance',
          count: Math.min(count, 20),
        },
        headers: await this.getHeaders(),
        timeout: 20000,
      });

      await this.recordUsage(1);

      const comments: TwitterComment[] = [];

      const data = response.data?.data || response.data;
      const instructions =
        data?.threaded_conversation_with_injections_v2?.instructions || response.data?.result?.timeline?.instructions || [];

      for (const instruction of instructions) {
        const entries = instruction.entries || [];
        for (const entry of entries) {
          if (comments.length >= count) break;

          const comment = this.extractCommentFromEntry(entry);
          if (comment) {
            comments.push(comment);
          }
        }
      }

      return comments;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`Twitter comments API error: ${error.response?.status} - ${error.message}`);
      }
      throw error;
    }
  }

  private extractCommentFromEntry(entry: Record<string, unknown>): TwitterComment | null {
    try {
      const content = entry?.content as Record<string, unknown>;
      const items = content?.items as Array<Record<string, unknown>>;
      const itemContent = content?.itemContent as Record<string, unknown>;

      let tweetResults = itemContent?.tweet_results as Record<string, unknown>;

      if (!tweetResults && items?.[0]) {
        const item = items[0].item as Record<string, unknown>;
        const innerContent = item?.itemContent as Record<string, unknown>;
        tweetResults = innerContent?.tweet_results as Record<string, unknown>;
      }

      const result = tweetResults?.result as Record<string, unknown>;
      if (!result) return null;

      const legacy = result.legacy as Record<string, unknown>;
      const core = result.core as Record<string, unknown>;
      const userResults = core?.user_results as Record<string, unknown>;
      const userResult = userResults?.result as Record<string, unknown>;
      const userLegacy = userResult?.legacy as Record<string, unknown>;

      if (!legacy) return null;

      return {
        id_str: (legacy.id_str || result.rest_id || '') as string,
        full_text: (legacy.full_text || '') as string,
        text: (legacy.text || '') as string,
        user: {
          id_str: (userLegacy?.id_str || '') as string,
          name: (userLegacy?.name || 'Unknown') as string,
          screen_name: (userLegacy?.screen_name || 'unknown') as string,
        },
        created_at: (legacy.created_at || '') as string,
        favorite_count: (legacy.favorite_count || 0) as number,
      };
    } catch {
      return null;
    }
  }

  private mapTweetToPost(tweet: TwitterTweet, comments: TwitterComment[], query: string): ScrapedPost {
    const text = tweet.full_text || tweet.text || '';
    const createdAt = this.parseTwitterDate(tweet.created_at);

    return {
      source: this.name,
      sourceId: tweet.id_str,
      url: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
      title: text.length > 100 ? text.substring(0, 100) + '...' : text,
      body: text,
      author: tweet.user.screen_name,
      createdAt,
      score: tweet.favorite_count || 0,
      numComments: tweet.reply_count || 0,
      language: 'en',
      meta: {
        query,
        userName: tweet.user.name,
        retweetCount: tweet.retweet_count || 0,
        quoteCount: tweet.quote_count || 0,
        conversationId: tweet.conversation_id_str,
        comments: comments.map((c) => ({
          id: c.id_str,
          text: c.full_text || c.text || '',
          author: c.user.screen_name,
          authorName: c.user.name,
          favoriteCount: c.favorite_count || 0,
          createdAt: this.parseTwitterDate(c.created_at).toISOString(),
        })),
      },
    };
  }

  private parseTwitterDate(dateStr: string): Date {
    if (!dateStr) return new Date();

    try {
      const date = new Date(dateStr);
      return Number.isNaN(date.getTime()) ? new Date() : date;
    } catch {
      return new Date();
    }
  }
}
