import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseScraper, type ScrapedPost } from '../base';

export class GenericScraper extends BaseScraper {
  name = 'generic';

  async scrape(options: { url?: string } = {}): Promise<ScrapedPost[]> {
    const { url } = options;
    if (!url) {
      console.error('GenericScraper requires a URL');
      return [];
    }

    try {
      const response = await axios.get<string>(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 20000,
      });

      const $ = cheerio.load(response.data);

      $('script').remove();
      $('style').remove();
      $('nav').remove();
      $('footer').remove();
      $('header').remove();
      $('.ads').remove();
      $('.sidebar').remove();

      const title =
        $('title').text().trim() ||
        $('h1').first().text().trim() ||
        $('meta[property="og:title"]').attr('content') ||
        url;

      let body = '';

      const selectors = ['article', 'main', '.post-content', '.entry-content', '.article-body', '#content', '.content'];

      for (const selector of selectors) {
        const element = $(selector);
        if (element.length > 0) {
          body = element.text().trim();
          break;
        }
      }

      if (!body) {
        body = $('body').text().trim();
      }

      body = body.replace(/\s+/g, ' ').trim();

      if (body.length > 10000) {
        body = body.slice(0, 10000);
      }

      const description =
        $('meta[name="description"]').attr('content') ||
        $('meta[property="og:description"]').attr('content') ||
        body.slice(0, 200) + '...';

      const posts: ScrapedPost[] = [
        {
          source: this.name,
          sourceId: url,
          url,
          title,
          body,
          author: $('meta[name="author"]').attr('content') || 'unknown',
          createdAt: new Date(),
          score: 0,
          numComments: 0,
          language: 'en',
          meta: { description },
        },
      ];

      return posts;
    } catch (error) {
      console.error(`Generic scraping error for ${url}:`, error);
      return [];
    }
  }
}
