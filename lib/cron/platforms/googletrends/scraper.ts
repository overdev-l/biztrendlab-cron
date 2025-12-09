import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseScraper, type ScrapedPost } from '../../base';

export interface GoogleTrendsOptions {
  geo?: string;
  limit?: number;
}

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export class GoogleTrendsScraper extends BaseScraper {
  name = 'googletrends';

  async scrape(options: GoogleTrendsOptions = {}): Promise<ScrapedPost[]> {
    const { geo = 'US', limit = 20 } = options;
    const rssUrl = `https://trends.google.com/trending/rss?geo=${encodeURIComponent(geo)}`;

    try {
      const response = await axios.get<string>(rssUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 20000,
      });

      const posts = this.parseRss(response.data, geo, limit);
      return posts;
    } catch (error) {
      console.error('Google Trends RSS scraping error:', error);
      return this.scrapeHtml(geo, limit);
    }
  }

  private parseRss(xml: string, geo: string, limit: number): ScrapedPost[] {
    const $ = cheerio.load(xml, { xmlMode: true });
    const posts: ScrapedPost[] = [];

    $('item').each((_, element) => {
      if (posts.length >= limit) return false;

      const title = $(element).find('title').text().trim();
      const link = $(element).find('link').text().trim();
      const pubDate = $(element).find('pubDate').text().trim();
      const description = $(element).find('description').text().trim();
      const traffic = $(element).find('ht\\:approx_traffic, approx_traffic').text().trim();
      const newsSource = $(element).find('ht\\:news_item_source, news_item_source').first().text().trim();

      if (!title) return;

      const score = this.parseTraffic(traffic);
      const createdAt = pubDate ? new Date(pubDate) : new Date();

      posts.push({
        source: this.name,
        sourceId: `${geo}-${title.replace(/\s+/g, '-').toLowerCase()}`,
        url: link || `https://trends.google.com/trends/explore?q=${encodeURIComponent(title)}&geo=${geo}`,
        title,
        body: description || `Trending search: ${title}`,
        author: newsSource || 'Google Trends',
        createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
        score,
        numComments: 0,
        language: 'en',
        meta: { geo, traffic },
      });
    });

    return posts;
  }

  private async scrapeHtml(geo: string, limit: number): Promise<ScrapedPost[]> {
    const htmlUrl = `https://trends.google.com/trends/trendingsearches/daily?geo=${encodeURIComponent(geo)}`;

    try {
      const response = await axios.get<string>(htmlUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 20000,
      });

      const $ = cheerio.load(response.data);
      const posts: ScrapedPost[] = [];

      $('[data-trending-query], .feed-item, .trending-card').each((_, element) => {
        if (posts.length >= limit) return false;

        const title = $(element).attr('data-trending-query') || $(element).find('.title, .trending-title').text().trim();
        const traffic = $(element).find('.search-count, .traffic').text().trim();

        if (!title) return;

        posts.push({
          source: this.name,
          sourceId: `${geo}-${title.replace(/\s+/g, '-').toLowerCase()}`,
          url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(title)}&geo=${geo}`,
          title,
          body: `Trending search: ${title}`,
          author: 'Google Trends',
          createdAt: new Date(),
          score: this.parseTraffic(traffic),
          numComments: 0,
          language: 'en',
          meta: { geo, traffic },
        });
      });

      return posts;
    } catch (error) {
      console.error('Google Trends HTML fallback error:', error);
      return [];
    }
  }

  private parseTraffic(traffic: string): number {
    if (!traffic) return 0;
    const cleaned = traffic.replace(/[^0-9KMkm.]/g, '').toUpperCase();
    const match = cleaned.match(/^([\d.]+)([KM])?$/);
    if (!match) return 0;
    const num = parseFloat(match[1]);
    const multiplier = match[2] === 'M' ? 1_000_000 : match[2] === 'K' ? 1_000 : 1;
    return Math.round(num * multiplier);
  }
}
