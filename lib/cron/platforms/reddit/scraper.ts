import axios from 'axios';
import { BaseScraper, type ScrapedPost } from '../../base';

export interface RedditOptions {
  subreddit?: string | string[];
  limit?: number;
  sort?: 'hot' | 'new' | 'top';
  timeFilter?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  minScore?: number;
  minComments?: number;
}

export class RedditScraper extends BaseScraper {
  name = 'reddit';

  async scrape(options: RedditOptions = {}): Promise<ScrapedPost[]> {
    const {
      subreddit = ['startups', 'SaaS', 'Entrepreneur', 'SideProject', 'indiehackers', 'business'],
      limit = 50,
      sort = 'hot',
      timeFilter = 'week',
      minScore = 10,
      minComments = 3,
    } = options;

    const subreddits = Array.isArray(subreddit) ? subreddit : [subreddit];
    const postsPerSubreddit = Math.ceil(limit / subreddits.length);
    const allPosts: ScrapedPost[] = [];

    for (const sub of subreddits) {
      try {
        const subPosts = await this.scrapeSubreddit(sub, postsPerSubreddit, sort, timeFilter, minScore, minComments);
        allPosts.push(...subPosts);
        await this.delay(1000);
      } catch (error) {
        console.error(`Error scraping r/${sub}:`, error);
      }
    }

    return allPosts.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private async scrapeSubreddit(
    subreddit: string,
    limit: number,
    sort: 'hot' | 'new' | 'top',
    timeFilter: string,
    minScore: number,
    minComments: number,
  ): Promise<ScrapedPost[]> {
    try {
      const url =
        sort === 'top'
          ? `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=${limit}&t=${timeFilter}`
          : `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=${limit}`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TrendFlowBot/1.0)',
        },
        timeout: 10000,
      });

      const posts: ScrapedPost[] = [];
      const children = response.data?.data?.children || [];

      for (const child of children) {
        const post = child.data;

        if (post.score < minScore || post.num_comments < minComments) continue;
        if (post.removed_by_category || post.removed || !post.title) continue;

        const bodyText = post.selftext || '';
        const title = post.title.toLowerCase();
        const isLowQuality =
          title.includes('upvote') ||
          title.includes('karma') ||
          title.includes('test post') ||
          post.link_flair_text?.toLowerCase().includes('meta');

        if (isLowQuality) continue;

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
            isTextPost: post.is_self,
            awards: post.total_awards_received || 0,
          },
        });
      }

      return posts;
    } catch (error) {
      console.error(`Reddit scraping error for r/${subreddit}:`, error);
      return [];
    }
  }
}
