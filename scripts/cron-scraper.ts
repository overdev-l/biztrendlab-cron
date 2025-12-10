import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { posts, passages, embeddings, clusters, clusterMembers, topics } from '../lib/db/trend/schema';
import {
  RedditScraper,
  HackerNewsScraper,
  V2EXScraper,
  GitHubScraper,
  LinuxDoScraper,
  ProductHuntScraper,
  GoogleTrendsScraper,
  TwitterScraper,
  type BaseScraper,
} from '../lib/cron';
import { EmbeddingService } from '../lib/services/embedding';
import { ClusteringService } from '../lib/services/clustering';
import { DeepSeekService } from '../lib/services/deepseek';
import { eq, and, isNull } from 'drizzle-orm';
import type { DirectionAnalysis } from '../lib/services/deepseek';
import type { ExamplePassage } from '../lib/types/topics';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const db = drizzle(pool);
const parallelArg = process.argv.find((arg) => arg.startsWith('--parallel='));
const envParallel = process.env.DIRECTION_ANALYSIS_PARALLEL ? Number.parseInt(process.env.DIRECTION_ANALYSIS_PARALLEL, 10) : Number.NaN;
const cliParallel = parallelArg ? Number.parseInt(parallelArg.split('=')[1], 10) : Number.NaN;
const directionParallelLimit = [cliParallel, envParallel].find((value) => Number.isFinite(value) && value > 0) || 1;

// 解析 --source 参数，支持单个或多个平台
const sourceArg = process.argv.find((arg) => arg.startsWith('--source='));
const selectedSources = sourceArg 
  ? sourceArg.split('=')[1].split(',').map(s => s.trim().toLowerCase())
  : null; // null 表示运行所有

// 支持的平台列表
const AVAILABLE_SOURCES = ['reddit', 'hackernews', 'v2ex', 'github', 'googletrends', 'twitter', 'producthunt', 'linuxdo'] as const;
type SourceName = typeof AVAILABLE_SOURCES[number];

// 各平台配置：包含爬虫实例、选项和建议频率
const SCRAPER_CONFIGS: Record<SourceName, {
  scraper: () => BaseScraper;
  options: Record<string, unknown>;
  recommendedInterval: string; // cron 表达式或描述
}> = {
  reddit: {
    scraper: () => new RedditScraper(),
    options: {
      // 使用精选的商业/科技相关子版面（约 100 个）
      categories: ['business', 'tech', 'ai', 'product'] as const,
      limit: 300,
      sort: 'top' as const,
      timeFilter: 'week' as const,
      minScore: 10,
      minComments: 30, // 评论数 > 30
      batchSize: 15,
      batchDelay: 1500,
      concurrency: 3,
    },
    recommendedInterval: '每4小时 (0 */4 * * *)'
  },
  hackernews: {
    scraper: () => new HackerNewsScraper(),
    options: {
      type: 'top' as const,
      limit: 100,
      minScore: 20,
      minComments: 10,
      includeAskHN: true
    },
    recommendedInterval: '每4小时 (0 */4 * * *)'
  },
  v2ex: {
    scraper: () => new V2EXScraper(),
    options: {
      type: 'hot' as const,
      limit: 80
    },
    recommendedInterval: '每6小时 (0 */6 * * *)'
  },
  github: {
    scraper: () => new GitHubScraper(),
    options: {
      limit: 60,
      minReactions: 5,
      minComments: 3
    },
    recommendedInterval: '每6小时 (0 */6 * * *)'
  },
  googletrends: {
    scraper: () => new GoogleTrendsScraper(),
    options: {
      geo: 'US',
      limit: 30
    },
    recommendedInterval: '每12小时 (0 */12 * * *)'
  },
  twitter: {
    scraper: () => new TwitterScraper(),
    options: {
      queries: [
        'startup pain point',
        'SaaS struggle',
        'indie hacker problem',
        'founder challenge',
        'AI tool need'
      ],
      limit: 10,
      includeComments: true,
      commentsPerTweet: 3
    },
    recommendedInterval: '每6小时 (0 */6 * * *) - API配额限制'
  },

  producthunt: {
    scraper: () => new ProductHuntScraper(),
    options: {
      limit: 50
    },
    recommendedInterval: '每12小时 (0 */12 * * *)'
  },
  linuxdo: {
    scraper: () => new LinuxDoScraper(),
    options: {
      limit: 50
    },
    recommendedInterval: '每6小时 (0 */6 * * *)'
  }
};



async function scrapeAllSources() {
  console.log(`[${new Date().toISOString()}] Starting scheduled scraping...`);
  
  // 根据 --source 参数过滤要运行的爬虫
  const sourcesToRun = selectedSources 
    ? AVAILABLE_SOURCES.filter(s => selectedSources.includes(s))
    : AVAILABLE_SOURCES;
  
  if (sourcesToRun.length === 0) {
    console.log('❌ 没有匹配的数据源。可用选项:', AVAILABLE_SOURCES.join(', '));
    return 0;
  }
  
  if (selectedSources) {
    console.log(`📋 运行指定平台: ${sourcesToRun.join(', ')}`);
  } else {
    console.log(`📋 运行所有平台: ${sourcesToRun.join(', ')}`);
  }
  
  // 构建爬虫列表
  const scrapers = sourcesToRun.map(name => ({
    name,
    scraper: SCRAPER_CONFIGS[name].scraper(),
    options: SCRAPER_CONFIGS[name].options
  }));
  
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  
  for (const { name, scraper, options } of scrapers) {
    try {
      console.log(`Scraping ${name}...`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scrapedPosts = await scraper.scrape(options as any);
      
      let inserted = 0;
      let updated = 0;
      let skipped = 0;
      
      for (const post of scrapedPosts) {
        try {
          const existing = await db.select()
            .from(posts)
            .where(and(
              eq(posts.source, post.source),
              eq(posts.sourceId, post.sourceId)
            ))
            .limit(1);
          
          if (existing.length > 0) {
            const existingPost = existing[0];
            const needsUpdate = 
              existingPost.score !== post.score ||
              existingPost.numComments !== post.numComments ||
              existingPost.body !== post.body;
            
            if (needsUpdate) {
              await db.update(posts)
                .set({
                  score: post.score,
                  numComments: post.numComments,
                  body: post.body,
                  meta: post.meta,
                  scrapedAt: new Date(),
                })
                .where(eq(posts.id, existingPost.id));
              updated++;
              console.log(`  Updated: ${post.title.substring(0, 50)}...`);
            } else {
              skipped++;
            }
            continue;
          }
          
          const [insertedPost] = await db.insert(posts).values({
            source: post.source,
            sourceId: post.sourceId,
            url: post.url,
            title: post.title,
            body: post.body,
            author: post.author,
            createdAt: post.createdAt,
            score: post.score,
            numComments: post.numComments,
            language: post.language,
            meta: post.meta,
          }).returning();
          
          const embeddingService = new EmbeddingService();
          const fullText = `${post.title}\n\n${post.body}`;
          const passageTexts = embeddingService.splitTextIntoPassages(fullText);
          
          for (let i = 0; i < passageTexts.length; i++) {
            await db.insert(passages).values({
              postId: insertedPost.id,
              passageText: passageTexts[i],
              passageIndex: i,
            });
          }
          
          inserted++;
          console.log(`  Inserted: ${post.title.substring(0, 50)}...`);
        } catch (err) {
          console.error(`Error processing post from ${name}:`, err);
        }
      }
      
      console.log(`✓ ${name}: ${inserted} inserted, ${updated} updated, ${skipped} skipped`);
      totalInserted += inserted;
      totalUpdated += updated;
      totalSkipped += skipped;
    } catch (error) {
      console.error(`✗ Error scraping ${name}:`, error);
    }
  }
  
  console.log(`\nScraping Summary: ${totalInserted} inserted, ${totalUpdated} updated, ${totalSkipped} skipped\n`);
  return totalInserted + totalUpdated;
}

async function generateEmbeddings() {
  console.log(`[${new Date().toISOString()}] Generating embeddings...`);
  
  try {
    const unprocessedPassages = await db.select()
      .from(passages)
      .leftJoin(embeddings, eq(passages.id, embeddings.passageId))
      .where(isNull(embeddings.id))
      .limit(100);
    
    if (unprocessedPassages.length === 0) {
      console.log('No unprocessed passages found');
      return 0;
    }
    
    console.log(`Found ${unprocessedPassages.length} unprocessed passages`);
    const embeddingService = new EmbeddingService();
    const batchSize = 20;
    let totalGenerated = 0;
    
    for (let i = 0; i < unprocessedPassages.length; i += batchSize) {
      const batch = unprocessedPassages.slice(i, i + batchSize);
      const texts = batch.map(p => p.passages.passageText);
      
      try {
        const vectors = await embeddingService.generateBatchEmbeddings(texts);
        
        for (let j = 0; j < batch.length; j++) {
          await db.insert(embeddings).values({
            passageId: batch[j].passages.id,
            model: 'text-embedding-nomic-embed-text-v1.5',
            vector: vectors[j],
          });
        }
        
        totalGenerated += batch.length;
        console.log(`✓ Generated ${batch.length} embeddings (${totalGenerated}/${unprocessedPassages.length})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error('✗ Error generating embeddings batch:', err);
      }
    }
    
    console.log(`\nEmbeddings Summary: ${totalGenerated} generated\n`);
    return totalGenerated;
  } catch (error) {
    console.error('Error in generateEmbeddings:', error);
    return 0;
  }
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Find best matching existing cluster for a new centroid
function findMatchingCluster(
  newCentroid: number[],
  existingClusters: { id: number; centroid: number[] | null }[],
  threshold: number = 0.75
): number | null {
  let bestMatch: number | null = null;
  let bestSimilarity = threshold;
  
  for (const cluster of existingClusters) {
    if (!cluster.centroid) continue;
    const similarity = cosineSimilarity(newCentroid, cluster.centroid);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = cluster.id;
    }
  }
  
  return bestMatch;
}

async function performClustering() {
  console.log(`[${new Date().toISOString()}] Performing incremental clustering analysis...`);
  
  try {
    const allEmbeddings = await db.select().from(embeddings);
    
    if (allEmbeddings.length < 10) {
      console.log(`Not enough embeddings for clustering (${allEmbeddings.length} < 10)`);
      return 0;
    }
    
    console.log(`Found ${allEmbeddings.length} embeddings`);
    const vectors = allEmbeddings.map(e => e.vector as number[]);
    const clusteringService = new ClusteringService();
    
    const optimalK = clusteringService.determineOptimalK(vectors, 10);
    console.log(`Optimal k determined: ${optimalK}`);
    
    const result = clusteringService.kMeansClustering(vectors, optimalK);
    
    // Get existing clusters for matching
    const existingClusters = await db.select().from(clusters);
    console.log(`Found ${existingClusters.length} existing clusters`);
    
    // Track which existing clusters are matched
    const matchedExistingIds = new Set<number>();
    const newClusterIdMapping: number[] = []; // Maps new cluster index to database cluster id
    
    let created = 0;
    let updated = 0;
    
    // Process each new cluster centroid
    for (let i = 0; i < result.numClusters; i++) {
      const newCentroid = result.centroids[i];
      const matchedId = findMatchingCluster(
        newCentroid,
        existingClusters.map(c => ({ id: c.id, centroid: c.centroid as number[] | null }))
      );
      
      if (matchedId !== null && !matchedExistingIds.has(matchedId)) {
        // Update existing cluster's centroid
        matchedExistingIds.add(matchedId);
        await db.update(clusters)
          .set({ centroid: newCentroid })
          .where(eq(clusters.id, matchedId));
        newClusterIdMapping[i] = matchedId;
        updated++;
      } else {
        // Create new cluster
        const [newCluster] = await db.insert(clusters).values({
          clusterLabel: `cluster_${Date.now()}_${i}`,
          centroid: newCentroid,
        }).returning();
        newClusterIdMapping[i] = newCluster.id;
        created++;
      }
    }
    
    // Clear old cluster members and reassign
    // Only delete members for clusters that will be updated
    const activeClusterIds = [...new Set(newClusterIdMapping)];
    for (const clusterId of activeClusterIds) {
      await db.delete(clusterMembers).where(eq(clusterMembers.clusterId, clusterId));
    }
    
    // Insert new cluster members
    for (let i = 0; i < allEmbeddings.length; i++) {
      const label = result.labels[i];
      const clusterId = newClusterIdMapping[label];
      await db.insert(clusterMembers).values({
        clusterId,
        passageId: allEmbeddings[i].passageId,
        score: 1.0,
      });
    }
    
    console.log(`✓ Clustering completed: ${created} new, ${updated} updated, ${result.numClusters} total active\n`);
    return result.numClusters;
  } catch (error) {
    console.error('✗ Error in clustering:', error);
    return 0;
  }
}

async function generateTopicsAndDirections() {
  console.log(`[${new Date().toISOString()}] Generating/updating topics and analyzing directions...`);
  console.log(`   ↳ Direction analysis workers: ${directionParallelLimit}`);
  
  try {
    // Get all clusters with members
    const allClusters = await db.select().from(clusters);
    
    if (allClusters.length === 0) {
      console.log('No clusters found. Skipping topic generation.');
      return 0;
    }
    
    console.log(`Found ${allClusters.length} clusters`);
    
    // Get existing topics and build a map by clusterId
    const existingTopics = await db.select().from(topics);
    const topicByClusterId = new Map<number, typeof existingTopics[0]>();
    for (const topic of existingTopics) {
      const metrics = topic.metrics as { clusterId?: number } | null;
      if (metrics?.clusterId) {
        topicByClusterId.set(metrics.clusterId, topic);
      }
    }
    console.log(`Found ${existingTopics.length} existing topics`);
    
    const deepseekService = new DeepSeekService();
    let totalDirections = 0;
    let created = 0;
    let updated = 0;
    
    // Track which clusters are active
    const activeClusterIds = new Set<number>();
    
    await runWithConcurrency(allClusters, directionParallelLimit, async (cluster) => {
      try {
        const members = await db.select()
          .from(clusterMembers)
          .innerJoin(passages, eq(clusterMembers.passageId, passages.id))
          .where(eq(clusterMembers.clusterId, cluster.id))
          .limit(20);
        
        if (members.length === 0) {
          return;
        }
        
        activeClusterIds.add(cluster.id);
        
        const examplePassages: ExamplePassage[] = members.map(m => ({
          text: m.passages.passageText,
          postId: m.passages.postId
        }));
        
        const passageTexts = examplePassages.map(p => p.text);
        
        // Check if topic exists for this cluster
        const existingTopic = topicByClusterId.get(cluster.id);
        
        let directions: DirectionAnalysis[] = [];
        try {
          directions = await deepseekService.analyzeDirections(
            passageTexts,
            { count: members.length, clusterId: cluster.id }
          );
          console.log(`  ✓ Analyzed cluster ${cluster.id}: ${directions.length} directions found`);
        } catch (error) {
          console.error(`  ✗ Error analyzing cluster ${cluster.id}:`, error);
          // If topic exists, keep existing directions; otherwise use fallback
          if (existingTopic) {
            const existingMetrics = existingTopic.metrics as { directions?: DirectionAnalysis[] } | null;
            directions = existingMetrics?.directions || [buildFallbackDirection(cluster.clusterLabel, members.length)];
          } else {
            directions = [buildFallbackDirection(cluster.clusterLabel, members.length)];
          }
        }
        
        totalDirections += directions.length;
        
        const primaryDirection = directions[0];
        const title = pickPrimaryTitle(primaryDirection, cluster.clusterLabel);
        const summary = pickSummary(primaryDirection, members.length);
        
        const metricsData = {
          count: members.length,
          clusterId: cluster.id,
          directions: directions,
        };

        if (existingTopic) {
          // Update existing topic
          await db.update(topics)
            .set({
              title,
              summary,
              examplePassages: examplePassages,
              metrics: metricsData,
            })
            .where(eq(topics.id, existingTopic.id));
          updated++;
          console.log(`  ✓ Updated topic ${existingTopic.id} (cluster ${cluster.id})`);
        } else {
          // Create new topic
          const [topic] = await db.insert(topics).values({
            title,
            summary,
            examplePassages: examplePassages,
            metrics: metricsData,
          }).returning();
          created++;
          console.log(`  ✓ Created topic ${topic.id} (cluster ${cluster.id})`);
        }
      } catch (error) {
        console.error(`  ✗ Error processing cluster ${cluster.id}:`, error);
      }
    });
    
    // Mark stale topics (clusters no longer active) - keep them but log
    const staleTopics = existingTopics.filter(t => {
      const metrics = t.metrics as { clusterId?: number } | null;
      return metrics?.clusterId && !activeClusterIds.has(metrics.clusterId);
    });
    if (staleTopics.length > 0) {
      console.log(`  ℹ ${staleTopics.length} topics are stale (cluster no longer active), keeping for subscriptions`);
    }
    
    console.log(`\nTopics Summary: ${created} created, ${updated} updated, ${staleTopics.length} stale, ${totalDirections} total directions\n`);
    return totalDirections;
  } catch (error) {
    console.error('Error in generateTopicsAndDirections:', error);
    return 0;
  }
}

function pickPrimaryTitle(direction: DirectionAnalysis, clusterLabel: string) {
  return direction.direction_name_cn
    || direction.direction_name_en
    || direction.direction_title
    || `Topic from ${clusterLabel}`;
}

function pickSummary(direction: DirectionAnalysis, passageCount: number) {
  return direction.summary_cn
    || direction.summary
    || `${direction.target_user || '待分析'} - ${direction.pain_point || `基于 ${passageCount} 条讨论`}`;
}

function buildFallbackDirection(clusterLabel: string, passageCount: number): DirectionAnalysis {
  const base = `产品方向 - ${clusterLabel}`;
  return {
    direction_title: base,
    direction_name_cn: base,
    direction_name_en: `Direction - ${clusterLabel}`,
    summary_cn: `基于 ${passageCount} 条相关讨论`,
    summary_en: `Based on ${passageCount} related discussions`,
    summary: `Based on ${passageCount} related discussions`,
    target_user: '待分析',
    target_audience: '待分析',
    target_audience_cn: '待分析',
    target_audience_en: 'Pending',
    pain_point: '待分析',
    pain_point_cn: '待分析',
    pain_point_en: 'Pending',
    opportunity_tag: '待分析',
    opportunity_tag_cn: '待分析',
    opportunity_tag_en: 'Pending',
    alternatives: '待分析',
    value_prop: `基于 ${passageCount} 条相关讨论`,
    mvps: [],
    risks: [],
    evidence: [],
  };
}

async function runWithConcurrency<T>(
  list: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
) {
  const size = Math.min(limit, list.length);
  if (size <= 1) {
    for (let i = 0; i < list.length; i++) {
      await worker(list[i], i);
    }
    return;
  }

  let cursor = 0;
  const runners = Array.from({ length: size }).map(async () => {
    while (true) {
      const current = cursor;
      cursor += 1;
      if (current >= list.length) break;
      await worker(list[current], current);
    }
  });

  await Promise.all(runners);
}

async function runScheduledTask() {
  console.log('\n' + '='.repeat(80));
  console.log(`🚀 Scheduled Task Started at ${new Date().toLocaleString()}`);
  console.log('='.repeat(80) + '\n');
  
  try {
    const newDataCount = await scrapeAllSources();
    const embeddingsGenerated = await generateEmbeddings();
    
    if (embeddingsGenerated > 0 || newDataCount > 0) {
      const clustersCreated = await performClustering();
      
      // Generate topics and analyze directions after clustering
      if (clustersCreated > 0) {
        await generateTopicsAndDirections();
      } else {
        console.log('⏭️  Skipping topic generation (no clusters created)\n');
      }
    } else {
      console.log('⏭️  Skipping clustering (no new data)\n');
    }
    
    console.log('='.repeat(80));
    console.log(`✅ Task Completed Successfully at ${new Date().toLocaleString()}`);
    console.log('='.repeat(80) + '\n');
  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error(`❌ Task Failed at ${new Date().toLocaleString()}`);
    console.error('='.repeat(80));
    console.error(error);
  }
}

// 显示帮助信息
function showHelp() {
  console.log(`
🤖 TrendFlow Cron Scraper - 多平台数据采集工具

用法:
  npx tsx scripts/cron-scraper.ts [选项]

选项:
  --source=<平台>    指定要运行的平台，多个平台用逗号分隔
                     可用平台: ${AVAILABLE_SOURCES.join(', ')}
  --parallel=<数量>  方向分析并发数 (默认: 1)
  --list            显示所有平台及其建议运行频率
  --help            显示此帮助信息

示例:
  # 运行所有平台
  npx tsx scripts/cron-scraper.ts

  # 只运行 Twitter 爬虫
  npx tsx scripts/cron-scraper.ts --source=twitter

  # 运行多个平台
  npx tsx scripts/cron-scraper.ts --source=reddit,hackernews,github

  # 只运行高频平台 (Reddit + HackerNews)
  npx tsx scripts/cron-scraper.ts --source=reddit,hackernews

  # 只运行 API 限流平台 (Twitter + GoogleTrends)
  npx tsx scripts/cron-scraper.ts --source=twitter,googletrends

各平台建议运行频率:
`);
  for (const [name, config] of Object.entries(SCRAPER_CONFIGS)) {
    console.log(`  ${name.padEnd(14)} ${config.recommendedInterval}`);
  }
  console.log('');
}

// 显示平台列表
function showList() {
  console.log('\n📋 可用数据源平台:\n');
  for (const [name, config] of Object.entries(SCRAPER_CONFIGS)) {
    console.log(`  ${name.padEnd(14)} | ${config.recommendedInterval}`);
  }
  console.log('\n使用 --source=<平台名> 来指定运行的平台\n');
}

// 主函数
async function main() {
  // 处理命令行参数
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  if (process.argv.includes('--list')) {
    showList();
    process.exit(0);
  }

  console.log('\n' + '='.repeat(80));
  console.log('🤖 TrendFlow Task Starting...');
  if (selectedSources) {
    console.log(`📋 指定平台: ${selectedSources.join(', ')}`);
  }
  console.log('='.repeat(80) + '\n');

  try {
    await runScheduledTask();
  } catch (err) {
    console.error('❌ Task failed:', err);
    process.exit(1);
  }

  // 关闭数据库连接
  await pool.end();
  console.log('✅ Task completed and DB connections closed');
  process.exit(0);
}

main();

