import axios from 'axios';

interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
  }>;
}

export class EmbeddingService {
  private apiKey: string;
  private apiUrl: string;
  private apiModel: string;
  
  constructor() {
    this.apiKey = process.env.EMBEDDING_API_KEY || '';
    this.apiUrl = process.env.EMBEDDING_API_URL || 'https://api.openai.com/v1';
    this.apiModel = process.env.EMBEDDING_API_MODEL || 'https://api.openai.com/v1';
  }
  
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await axios.post<EmbeddingResponse>(
        `${this.apiUrl}/embeddings`,
        {
          model: this.apiModel,
          input: text,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          }
        }
      );
      
      return response.data.data[0]?.embedding ?? [];
    } catch (error) {
      console.error('Embedding generation error:', error);
      throw error;
    }
  }
  
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await axios.post<EmbeddingResponse>(
        `${this.apiUrl}/embeddings`,
        {
          model: this.apiModel,
          input: texts,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          }
        }
      );
      
      return response.data.data.map((item) => item.embedding);
    } catch (error) {
      console.error('Batch embedding generation error:', error);
      throw error;
    }
  }
  
  splitTextIntoPassages(text: string, maxLength: number = 500): string[] {
    if (!text || text.length === 0) return [];
    
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const passages: string[] = [];
    let currentPassage = '';
    
    for (const sentence of sentences) {
      if ((currentPassage + sentence).length > maxLength && currentPassage.length > 0) {
        passages.push(currentPassage.trim());
        currentPassage = sentence;
      } else {
        currentPassage += sentence;
      }
    }
    
    if (currentPassage.trim().length > 0) {
      passages.push(currentPassage.trim());
    }
    
    return passages;
  }
}
