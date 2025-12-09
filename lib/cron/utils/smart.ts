import { BaseScraper, type ScrapedPost } from '../base';
import {
  RedditScraper,
  HackerNewsScraper,
  V2EXScraper,
  GitHubScraper,
  LinuxDoScraper,
  ProductHuntScraper,
  GoogleTrendsScraper,
  TwitterScraper,
} from '../platforms';
import { GenericScraper } from './generic';

export class SmartScraper {
  private scrapers: BaseScraper[] = [];
  private genericScraper: GenericScraper;

  constructor() {
    this.scrapers = [
      new RedditScraper(),
      new HackerNewsScraper(),
      new V2EXScraper(),
      new GitHubScraper(),
      new LinuxDoScraper(),
      new ProductHuntScraper(),
      new GoogleTrendsScraper(),
      new TwitterScraper(),
    ];
    this.genericScraper = new GenericScraper();
  }

  async scrape(url: string): Promise<ScrapedPost[]> {
    const scraper = this.findScraper(url);

    if (scraper) {
      console.log(`[SmartScraper] Matched specialized scraper: ${scraper.name} for ${url}`);
      try {
        // For now, fallback to generic for single URL scraping
        // Most specialized scrapers are designed for feed/list scraping
      } catch (e) {
        console.warn(`[SmartScraper] Specialized scraper ${scraper.name} failed, falling back to generic`, e);
      }
    }

    console.log(`[SmartScraper] Using generic scraper for ${url}`);
    return this.genericScraper.scrape({ url });
  }

  private findScraper(url: string): BaseScraper | null {
    const domain = new URL(url).hostname.replace('www.', '');

    if (domain.includes('reddit.com')) return this.scrapers.find((s) => s.name === 'reddit') || null;
    if (domain.includes('news.ycombinator.com')) return this.scrapers.find((s) => s.name === 'hackernews') || null;
    if (domain.includes('v2ex.com')) return this.scrapers.find((s) => s.name === 'v2ex') || null;
    if (domain.includes('github.com')) return this.scrapers.find((s) => s.name === 'github') || null;
    if (domain.includes('linux.do')) return this.scrapers.find((s) => s.name === 'linuxdo') || null;
    if (domain.includes('producthunt.com')) return this.scrapers.find((s) => s.name === 'producthunt') || null;
    if (domain.includes('trends.google.com')) return this.scrapers.find((s) => s.name === 'googletrends') || null;
    if (domain.includes('twitter.com') || domain.includes('x.com')) return this.scrapers.find((s) => s.name === 'twitter') || null;

    return null;
  }
}
