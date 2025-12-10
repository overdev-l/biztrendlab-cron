import axios from 'axios';
import { BaseScraper, type ScrapedPost } from '../../base';
import { TOP_SUBREDDITS, type SubredditCategory, getSubredditsByCategories } from './top-subreddits';

/**
 * Reddit JSON API 返回的帖子数据结构
 */
interface RedditSubmission {
  id: string;
  title: string;
  selftext?: string;
  author: string;
  subreddit: string;
  created_utc: number;
  score: number;
  num_comments: number;
  permalink: string;
  url?: string;
  is_self?: boolean;
  upvote_ratio?: number;
  link_flair_text?: string;
  total_awards_received?: number;
  removed_by_category?: string;
  removed?: boolean;
}

interface RedditListingResponse {
  data: {
    children: Array<{ data: RedditSubmission }>;
    after?: string;
  };
}

export interface RedditOptions {
  subreddit?: string | string[];
  categories?: SubredditCategory[];
  useTopSubreddits?: boolean;
  limit?: number;
  sort?: 'hot' | 'new' | 'top' | 'rising';
  timeFilter?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  minScore?: number;
  minComments?: number;
  batchSize?: number;
  batchDelay?: number;
  concurrency?: number;
  maxRetries?: number;
}

export class RedditScraper extends BaseScraper {
  name = 'reddit';
  
  private readonly REDDIT_API = 'https://www.reddit.com';
  private readonly DEFAULT_BATCH_SIZE = 10;
  private readonly DEFAULT_BATCH_DELAY = 3000; // ms - 增加延迟避免限流
  private readonly DEFAULT_CONCURRENCY = 2;
  private readonly REQUEST_TIMEOUT = 20000;
  private readonly MAX_RETRIES = 3;

  // 用于跟踪连续失败次数
  private consecutiveFailures = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 10;

  async scrape(options: RedditOptions = {}): Promise<ScrapedPost[]> {
    const {
      subreddit,
      categories,
      useTopSubreddits = true,
      limit = 500,
      sort = 'top',
      timeFilter = 'week',
      minScore = 10,
      minComments = 30,
      batchSize = this.DEFAULT_BATCH_SIZE,
      batchDelay = this.DEFAULT_BATCH_DELAY,
      concurrency = this.DEFAULT_CONCURRENCY,
      maxRetries = this.MAX_RETRIES,
    } = options;

    // 重置失败计数器
    this.consecutiveFailures = 0;

    // 确定要抓取的子版面列表
    let subreddits: string[];
    
    if (subreddit) {
      subreddits = Array.isArray(subreddit) ? subreddit : [subreddit];
    } else if (categories && categories.length > 0) {
      subreddits = getSubredditsByCategories(categories);
    } else if (useTopSubreddits) {
      subreddits = TOP_SUBREDDITS;
    } else {
      subreddits = ['startups', 'SaaS', 'Entrepreneur', 'SideProject', 'indiehackers', 'business'];
    }

    console.log(`[Reddit] 准备抓取 ${subreddits.length} 个子版面，过滤条件: 评论数 > ${minComments}`);

    const allPosts: ScrapedPost[] = [];
    const batches = this.createBatches(subreddits, batchSize);
    
    console.log(`[Reddit] 分为 ${batches.length} 批次，每批 ${batchSize} 个子版面，并发数: ${concurrency}`);

    for (let i = 0; i < batches.length; i++) {
      // 检查是否连续失败太多次
      if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        console.warn(`[Reddit] 连续失败 ${this.consecutiveFailures} 次，停止抓取`);
        break;
      }

      const batch = batches[i];
      console.log(`[Reddit] 处理第 ${i + 1}/${batches.length} 批次 (${batch.length} 个子版面)`);
      
      const batchResults = await this.processBatchWithConcurrency(
        batch,
        concurrency,
        async (sub) => {
          return this.scrapeSubredditWithRetry(sub, {
            sort,
            timeFilter,
            minScore,
            minComments,
            maxRetries,
          });
        }
      );
      
      allPosts.push(...batchResults.flat());
      
      // 批次间延迟，避免触发限流
      if (i < batches.length - 1) {
        await this.delay(batchDelay);
      }
    }

    console.log(`[Reddit] 共抓取 ${allPosts.length} 条帖子，按评论数排序取前 ${limit} 条`);
    
    // 按评论数降序排序，取前 limit 条
    return allPosts
      .sort((a, b) => b.numComments - a.numComments)
      .slice(0, limit);
  }

  /**
   * 带重试的子版面抓取
   */
  private async scrapeSubredditWithRetry(
    subreddit: string,
    options: {
      sort: string;
      timeFilter: string;
      minScore: number;
      minComments: number;
      maxRetries: number;
    }
  ): Promise<ScrapedPost[]> {
    const { maxRetries, ...scrapeOptions } = options;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.scrapeSubreddit(subreddit, scrapeOptions);
        // 成功后重置连续失败计数
        this.consecutiveFailures = 0;
        return result;
      } catch (error) {
        if (attempt < maxRetries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.log(`  ⏳ r/${subreddit}: 第 ${attempt} 次失败，${waitTime/1000}s 后重试`);
          await this.delay(waitTime);
        } else {
          this.consecutiveFailures++;
          console.error(`  ✗ r/${subreddit}: 重试 ${maxRetries} 次后仍然失败`);
          return [];
        }
      }
    }
    return [];
  }

  /**
   * 使用 Reddit JSON API 抓取单个子版面
   */
  private async scrapeSubreddit(
    subreddit: string,
    options: {
      sort: string;
      timeFilter: string;
      minScore: number;
      minComments: number;
    }
  ): Promise<ScrapedPost[]> {
    const { sort, timeFilter, minScore, minComments } = options;
    
    // 构建 Reddit JSON API URL
    const url = sort === 'top'
      ? `${this.REDDIT_API}/r/${subreddit}/${sort}.json?limit=100&t=${timeFilter}`
      : `${this.REDDIT_API}/r/${subreddit}/${sort}.json?limit=100`;

    const response = await axios.get<RedditListingResponse>(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      timeout: this.REQUEST_TIMEOUT,
      validateStatus: (status) => status < 500, // 只对 5xx 错误抛异常
    });

    // 处理非 200 响应
    if (response.status === 403 || response.status === 404) {
      // 子版面可能是私有的或不存在，静默跳过
      return [];
    }
    
    if (response.status === 429) {
      // 限流，抛出错误触发重试
      throw new Error('Rate limited');
    }
    
    if (response.status !== 200) {
      console.log(`  - r/${subreddit}: HTTP ${response.status}`);
      return [];
    }

    // 检查响应是否为有效的 JSON
    if (!response.data?.data?.children) {
      console.log(`  - r/${subreddit}: 无效响应格式`);
      return [];
    }

    const children = response.data.data.children;
    const posts: ScrapedPost[] = [];

    for (const child of children) {
      const post = child.data;
      
      // 跳过不符合条件的帖子
      if (post.score < minScore) continue;
      if (post.num_comments < minComments) continue;
      if (post.removed_by_category || post.removed || !post.title) continue;
      
      // 过滤低质量内容
      const title = post.title.toLowerCase();
      const isLowQuality =
        title.includes('upvote') ||
        title.includes('karma') ||
        title.includes('test post') ||
        post.link_flair_text?.toLowerCase().includes('meta');

      if (isLowQuality) continue;

      const bodyText = post.selftext || '';

      posts.push({
        source: 'reddit',
        sourceId: post.id,
        url: `https://www.reddit.com${post.permalink}`,
        title: post.title,
        body: bodyText,
        author: post.author,
        createdAt: new Date(post.created_utc * 1000),
        score: post.score,
        numComments: post.num_comments,
        language: 'en',
        meta: {
          subreddit: post.subreddit,
          upvoteRatio: post.upvote_ratio,
          flair: post.link_flair_text,
          hasSubstantialContent: bodyText.length > 100 || post.num_comments >= 10,
          isTextPost: post.is_self ?? true,
          awards: post.total_awards_received || 0,
        },
      });
    }

    if (posts.length > 0) {
      console.log(`  ✓ r/${subreddit}: ${posts.length} 条高热度帖子`);
    }

    return posts;
  }

  /**
   * 将数组分成多个批次
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 带并发控制的批量处理
   */
  private async processBatchWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    processor: (item: T) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = [];
    let activeCount = 0;
    let currentIndex = 0;

    return new Promise((resolve) => {
      const processNext = () => {
        while (activeCount < concurrency && currentIndex < items.length) {
          const index = currentIndex++;
          activeCount++;
          
          processor(items[index])
            .then((result) => {
              results.push(result);
            })
            .catch(() => {
              // 错误已在 processor 中处理
            })
            .finally(() => {
              activeCount--;
              if (currentIndex < items.length) {
                // 请求间延迟
                setTimeout(processNext, 800);
              } else if (activeCount === 0) {
                resolve(results);
              }
            });
        }
      };

      processNext();
    });
  }
}
