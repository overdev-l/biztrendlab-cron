import axios from 'axios';
import { BaseScraper, type ScrapedPost } from '../../base';

interface GitHubIssueLabel {
  name: string;
}

interface GitHubIssue {
  id: number;
  html_url: string;
  title: string;
  body?: string | null;
  user?: { login?: string };
  created_at: string;
  reactions?: { total_count?: number };
  comments: number;
  state?: string;
  labels: GitHubIssueLabel[];
}

export interface GitHubOptions {
  query?: string | string[];
  limit?: number;
  minReactions?: number;
  minComments?: number;
}

export class GitHubScraper extends BaseScraper {
  name = 'github';

  async scrape(options: GitHubOptions = {}): Promise<ScrapedPost[]> {
    const {
      query = [
        'label:enhancement is:issue is:open sort:reactions-+1-desc',
        'label:feature-request is:issue is:open sort:reactions-+1-desc',
        'pain point in:body is:issue sort:comments-desc',
        'struggling with in:body is:issue sort:comments-desc',
        'would love to have in:body is:issue sort:reactions-desc',
      ],
      limit = 50,
      minReactions = 3,
      minComments = 2,
    } = options;

    const queries = Array.isArray(query) ? query : [query];
    const allPosts: ScrapedPost[] = [];
    const seenIds = new Set<string>();

    for (const q of queries) {
      try {
        const posts = await this.scrapeQuery(q, Math.ceil(limit / queries.length), minReactions, minComments);
        for (const post of posts) {
          if (!seenIds.has(post.sourceId)) {
            seenIds.add(post.sourceId);
            allPosts.push(post);
          }
        }
        await this.delay(2000);
      } catch (error) {
        console.error(`Error scraping GitHub query "${q}":`, error);
      }
    }

    return allPosts
      .sort((a, b) => {
        const scoreA = a.score + a.numComments * 3;
        const scoreB = b.score + b.numComments * 3;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  private async scrapeQuery(query: string, limit: number, minReactions: number, minComments: number): Promise<ScrapedPost[]> {
    try {
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Mozilla/5.0 (compatible; TrendFlowBot/1.0)',
      };

      if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
      }

      const response = await axios.get('https://api.github.com/search/issues', {
        params: {
          q: query,
          per_page: limit * 2,
          sort: 'reactions',
          order: 'desc',
        },
        headers,
        timeout: 10000,
      });

      const issues: GitHubIssue[] = response.data?.items || [];
      const posts: ScrapedPost[] = [];

      for (const issue of issues) {
        const reactions = issue.reactions?.total_count || 0;
        const comments = issue.comments || 0;

        if (reactions < minReactions && comments < minComments) continue;
        if (issue.html_url.includes('/pull/')) continue;

        const title = issue.title.toLowerCase();
        const body = (issue.body || '').toLowerCase();

        const hasRelevantKeywords =
          title.includes('feature') ||
          title.includes('request') ||
          title.includes('enhancement') ||
          title.includes('would be great') ||
          title.includes('wish') ||
          body.includes('pain point') ||
          body.includes('struggling') ||
          body.includes('difficult') ||
          body.includes('would love') ||
          body.includes('need') ||
          body.includes('missing');

        const isBugReport = title.includes('bug') || title.includes('error') || title.includes('crash') || title.includes('broken');

        if (isBugReport && reactions < 10) continue;

        const labelKeywords = (issue.labels || []).map((l) => l.name.toLowerCase()).join(' ');
        const isEnhancement = labelKeywords.includes('enhancement') || labelKeywords.includes('feature') || labelKeywords.includes('request');

        const relevanceBoost = hasRelevantKeywords || isEnhancement ? 1.5 : 1.0;
        const adjustedScore = Math.round(reactions * relevanceBoost);

        const repoMatch = issue.html_url.match(/github\.com\/([^/]+\/[^/]+)/);
        const repoName = repoMatch ? repoMatch[1] : 'unknown';

        posts.push({
          source: 'github',
          sourceId: issue.id.toString(),
          url: issue.html_url,
          title: issue.title,
          body: issue.body || '',
          author: issue.user?.login || 'unknown',
          createdAt: new Date(issue.created_at),
          score: adjustedScore,
          numComments: comments,
          language: 'en',
          meta: {
            state: issue.state,
            labels: issue.labels?.map((label) => label.name).filter(Boolean) ?? [],
            repository: repoName,
            originalReactions: reactions,
            isEnhancement,
            hasRelevantKeywords,
          },
        });
      }

      return posts;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`GitHub API error: ${error.response?.status} - ${error.message}`);
        if (error.response?.status === 403) {
          console.error('GitHub rate limit exceeded. Consider adding GITHUB_TOKEN to .env');
        }
      } else {
        console.error('GitHub scraping error:', error);
      }
      return [];
    }
  }
}
