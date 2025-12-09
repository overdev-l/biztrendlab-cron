export interface ScrapedPost {
  source: string;
  sourceId: string;
  url: string;
  title: string;
  body: string;
  author: string;
  createdAt: Date;
  score: number;
  numComments: number;
  language: string;
  meta?: Record<string, unknown>;
}

export abstract class BaseScraper {
  abstract name: string;

  abstract scrape(options?: Record<string, unknown>): Promise<ScrapedPost[]>;

  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export interface PlatformConfig {
  name: string;
  scraper: () => BaseScraper;
  options: Record<string, unknown>;
  recommendedInterval: string;
  hasProviderManager: boolean;
}
