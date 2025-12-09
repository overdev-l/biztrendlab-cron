import axios from 'axios';
import { BaseScraper, type ScrapedPost } from '../../base';

export interface V2EXOptions {
  type?: 'hot' | 'latest';
  limit?: number;
}

export class V2EXScraper extends BaseScraper {
  name = 'v2ex';

  async scrape(options: V2EXOptions = {}): Promise<ScrapedPost[]> {
    const { type = 'hot', limit = 50 } = options;

    try {
      const endpoint = type === 'hot' ? 'hot' : 'latest';
      const response = await axios.get(`https://www.v2ex.com/api/topics/${endpoint}.json`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TrendFlowBot/1.0)',
        },
      });

      const topics = response.data || [];
      const posts: ScrapedPost[] = [];

      for (const topic of topics.slice(0, limit)) {
        posts.push({
          source: 'v2ex',
          sourceId: topic.id.toString(),
          url: topic.url,
          title: topic.title,
          body: topic.content || '',
          author: topic.member?.username || 'unknown',
          createdAt: new Date(topic.created * 1000),
          score: 0,
          numComments: topic.replies || 0,
          language: 'zh',
          meta: {
            node: topic.node,
            lastTouched: topic.last_touched,
          },
        });
      }

      return posts;
    } catch (error) {
      console.error('V2EX scraping error:', error);
      return [];
    }
  }
}
