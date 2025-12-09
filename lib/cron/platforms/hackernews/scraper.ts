import axios from 'axios';
import { BaseScraper, type ScrapedPost } from '../../base';

export interface HackerNewsOptions {
  type?: 'top' | 'new' | 'ask' | 'show' | 'best';
  limit?: number;
  minScore?: number;
  minComments?: number;
  includeAskHN?: boolean;
}

export class HackerNewsScraper extends BaseScraper {
  name = 'hackernews';

  async scrape(options: HackerNewsOptions = {}): Promise<ScrapedPost[]> {
    const { type = 'top', limit = 50, minScore = 10, minComments = 5, includeAskHN = true } = options;

    try {
      const storiesResponse = await axios.get(`https://hacker-news.firebaseio.com/v0/${type}stories.json`, {
        timeout: 10000,
      });

      const storyIds = storiesResponse.data.slice(0, limit * 3);
      const posts: ScrapedPost[] = [];

      for (const id of storyIds) {
        if (posts.length >= limit) break;

        try {
          const storyResponse = await axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
            timeout: 5000,
          });

          const story = storyResponse.data;

          if (!story || story.deleted || story.dead) continue;
          if ((story.score || 0) < minScore) continue;
          if ((story.descendants || 0) < minComments) continue;

          const title = (story.title || '').toLowerCase();
          const text = (story.text || '').toLowerCase();

          const isRelevant =
            title.includes('startup') ||
            title.includes('business') ||
            title.includes('saas') ||
            title.includes('founder') ||
            title.includes('entrepreneur') ||
            title.includes('product') ||
            title.includes('launch') ||
            title.includes('problem') ||
            title.includes('solution') ||
            title.includes('tool') ||
            title.includes('app') ||
            text.includes('pain point') ||
            text.includes('struggling with') ||
            text.includes('need help') ||
            story.type === 'ask' ||
            (includeAskHN && title.startsWith('ask hn'));

          const isJob =
            title.includes('hiring') ||
            title.includes('[hiring]') ||
            title.includes('who is hiring') ||
            title.includes('job');

          if (isJob) continue;

          if (title.startsWith('ask hn') && story.descendants < 10) continue;

          const relevanceBoost = isRelevant ? 1.5 : 1.0;
          const adjustedScore = Math.round((story.score || 0) * relevanceBoost);

          posts.push({
            source: 'hackernews',
            sourceId: story.id.toString(),
            url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
            title: story.title || '',
            body: story.text || '',
            author: story.by || 'unknown',
            createdAt: new Date(story.time * 1000),
            score: adjustedScore,
            numComments: story.descendants || 0,
            language: 'en',
            meta: {
              type: story.type,
              kids: story.kids || [],
              isRelevant,
              originalScore: story.score || 0,
              url: story.url,
            },
          });

          await this.delay(100);
        } catch (err) {
          console.error(`Error fetching HN story ${id}:`, err);
        }
      }

      posts.sort((a, b) => {
        const scoreA = a.score + a.numComments * 2;
        const scoreB = b.score + b.numComments * 2;
        return scoreB - scoreA;
      });

      return posts.slice(0, limit);
    } catch (error) {
      console.error('HackerNews scraping error:', error);
      return [];
    }
  }
}
