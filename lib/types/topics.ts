import type { DirectionAnalysis } from '@/lib/services/deepseek';

export interface TopicMetrics {
  count?: number;
  clusterId?: number;
  directions?: DirectionAnalysis[];
}

export interface ExamplePassage {
  text: string;
  postId?: number | null;
}

