export interface ClusterResult {
  labels: number[];
  centroids: number[][];
  numClusters: number;
}

export class ClusteringService {
  cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }
  
  kMeansClustering(embeddings: number[][], k: number, maxIterations: number = 100): ClusterResult {
    const n = embeddings.length;
    const dim = embeddings[0].length;
    
    const centroidIndices = new Set<number>();
    while (centroidIndices.size < k) {
      centroidIndices.add(Math.floor(Math.random() * n));
    }
    const centroids = Array.from(centroidIndices).map(i => [...embeddings[i]]);
    
    const labels = new Array(n).fill(0);
    let iteration = 0;
    let changed = true;
    
    while (changed && iteration < maxIterations) {
      changed = false;
      
      for (let i = 0; i < n; i++) {
        let minDist = Infinity;
        let bestCluster = 0;
        
        for (let j = 0; j < k; j++) {
          const dist = this.euclideanDistance(embeddings[i], centroids[j]);
          if (dist < minDist) {
            minDist = dist;
            bestCluster = j;
          }
        }
        
        if (labels[i] !== bestCluster) {
          labels[i] = bestCluster;
          changed = true;
        }
      }
      
      for (let j = 0; j < k; j++) {
        const clusterPoints = embeddings.filter((_, i) => labels[i] === j);
        if (clusterPoints.length > 0) {
          centroids[j] = new Array(dim).fill(0);
          for (const point of clusterPoints) {
            for (let d = 0; d < dim; d++) {
              centroids[j][d] += point[d];
            }
          }
          for (let d = 0; d < dim; d++) {
            centroids[j][d] /= clusterPoints.length;
          }
        }
      }
      
      iteration++;
    }
    
    return {
      labels,
      centroids,
      numClusters: k
    };
  }
  
  determineOptimalK(embeddings: number[][], maxK: number = 10): number {
    if (embeddings.length < 10) return Math.max(2, Math.floor(embeddings.length / 3));
    
    const scores: number[] = [];
    
    for (let k = 2; k <= Math.min(maxK, embeddings.length / 2); k++) {
      const result = this.kMeansClustering(embeddings, k, 50);
      let totalDistance = 0;
      
      for (let i = 0; i < embeddings.length; i++) {
        const dist = this.euclideanDistance(embeddings[i], result.centroids[result.labels[i]]);
        totalDistance += dist;
      }
      
      scores.push(totalDistance);
    }
    
    let bestK = 2;
    let maxImprovement = 0;
    
    for (let i = 1; i < scores.length - 1; i++) {
      const improvement = scores[i - 1] - scores[i];
      const nextImprovement = scores[i] - scores[i + 1];
      
      if (improvement > maxImprovement && improvement > nextImprovement * 1.5) {
        maxImprovement = improvement;
        bestK = i + 2;
      }
    }
    
    return bestK;
  }
}
