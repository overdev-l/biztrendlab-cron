import axios from 'axios';
import { BaseScraper, type ScrapedPost } from '../../base';

interface DiscourseUser {
  id: number;
  username: string;
}

interface DiscourseTopic {
  id: number;
  title: string;
  slug: string;
  posts_count: number;
  reply_count: number;
  views: number;
  like_count: number;
  created_at: string;
  excerpt?: string;
  posters?: Array<{ user_id: number }>;
}

interface DiscourseLatestResponse {
  users?: DiscourseUser[];
  topic_list?: { topics?: DiscourseTopic[] };
}

export interface LinuxDoOptions {
  category?: string;
  limit?: number;
}

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export class LinuxDoScraper extends BaseScraper {
  name = 'linuxdo';

  async scrape(options: LinuxDoOptions = {}): Promise<ScrapedPost[]> {
    const { category = 'latest', limit = 30 } = options;
    const apiPath = category === 'latest' ? '/latest.json' : `/c/${category}.json`;
    const url = `https://linux.do${apiPath}`;

    try {
      const response = await axios.get<DiscourseLatestResponse>(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          Referer: 'https://linux.do/',
        },
        timeout: 20000,
      });

      const topics = response.data?.topic_list?.topics || [];
      const users = response.data?.users || [];
      const userMap = new Map(users.map((u) => [u.id, u.username]));

      const posts: ScrapedPost[] = [];

      for (const topic of topics.slice(0, limit)) {
        const firstPosterId = topic.posters?.[0]?.user_id;
        const author = firstPosterId ? userMap.get(firstPosterId) || 'unknown' : 'unknown';
        const createdAt = new Date(topic.created_at);

        posts.push({
          source: this.name,
          sourceId: String(topic.id),
          url: `https://linux.do/t/${topic.slug}/${topic.id}`,
          title: topic.title,
          body: topic.excerpt || '',
          author,
          createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
          score: topic.like_count || topic.views || 0,
          numComments: topic.reply_count || topic.posts_count - 1 || 0,
          language: 'zh',
          meta: {
            category,
            views: topic.views,
            likeCount: topic.like_count,
            postsCount: topic.posts_count,
          },
        });
      }

      return posts;
    } catch (error) {
      console.error('linux.do scraping error:', error);
      return [];
    }
  }
}
