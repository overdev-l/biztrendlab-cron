import type { Provider } from '../../provider-manager';

export interface TwitterProvider extends Provider {
  searchEndpoint: string;
  commentsEndpoint: string;
}

export interface TwitterUser {
  id_str: string;
  name: string;
  screen_name: string;
  profile_image_url_https?: string;
}

export interface TwitterTweet {
  id_str: string;
  full_text?: string;
  text?: string;
  user: TwitterUser;
  created_at: string;
  favorite_count: number;
  retweet_count: number;
  reply_count?: number;
  quote_count?: number;
  conversation_id_str?: string;
}

export interface TwitterComment {
  id_str: string;
  full_text?: string;
  text?: string;
  user: TwitterUser;
  created_at: string;
  favorite_count: number;
}

export interface TwitterOptions {
  queries?: string[];
  limit?: number;
  includeComments?: boolean;
  commentsPerTweet?: number;
}

export interface SearchResult {
  result?: {
    timeline?: {
      entries?: Array<{
        content?: {
          tweet?: TwitterTweet;
          itemContent?: {
            tweet_results?: {
              result?: {
                legacy?: TwitterTweet;
                core?: {
                  user_results?: {
                    result?: {
                      legacy?: TwitterUser;
                    };
                  };
                };
              };
            };
          };
        };
      }>;
    };
  };
}
