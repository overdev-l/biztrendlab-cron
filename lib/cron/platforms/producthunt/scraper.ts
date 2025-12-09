import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseScraper, type ScrapedPost } from '../../base';

export interface ProductHuntOptions {
  tag?: string;
  limit?: number;
}

const PH_FEED_URL = 'https://www.producthunt.com/feed';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) TrendFlowBot/1.0';

export class ProductHuntScraper extends BaseScraper {
  name = 'producthunt';

  async scrape(options: ProductHuntOptions = {}): Promise<ScrapedPost[]> {
    const { tag, limit = 40 } = options;
    const url = tag ? `${PH_FEED_URL}?category=${encodeURIComponent(tag)}` : PH_FEED_URL;

    try {
      const response = await axios.get<string>(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/atom+xml' },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data, { xmlMode: true });
      const posts: ScrapedPost[] = [];

      // Product Hunt 使用 Atom 格式
      $('entry').each((_, element) => {
        if (posts.length >= limit) return false;

        const title = $(element).find('title').text().trim();
        const link = $(element).find('link[rel="alternate"]').attr('href') || '';
        const id = $(element).find('id').text().trim() || link;
        const content = $(element).find('content').text().trim();
        const author = $(element).find('author name').text().trim() || 'Product Hunt';
        const published = $(element).find('published').text().trim();

        if (!title || !link) return;

        const createdAt = published ? new Date(published) : new Date();

        // 从 content 中提取纯文本描述
        const $content = cheerio.load(content);
        const description = $content('p').first().text().trim();

        posts.push({
          source: this.name,
          sourceId: id,
          url: link,
          title,
          body: description,
          author,
          createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
          score: 0,
          numComments: 0,
          language: 'en',
          meta: { tag },
        });
      });

      return posts;
    } catch (error) {
      console.error('Product Hunt scraping error:', error);
      return [];
    }
  }
}
