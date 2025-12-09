import axios from 'axios';
import { jsonrepair } from 'jsonrepair';

export interface DirectionAnalysis {
  direction_title: string;
  direction_name_cn?: string;
  direction_name_en?: string;
  summary?: string;
  summary_cn?: string;
  summary_en?: string;
  target_user: string;
  target_audience?: string;
  target_audience_cn?: string;
  target_audience_en?: string;
  pain_point: string;
  pain_point_cn?: string;
  pain_point_en?: string;
  opportunity_tag?: string;
  opportunity_tag_cn?: string;
  opportunity_tag_en?: string;
  alternatives: string;
  value_prop: string;
  mvps: string[];
  risks: string[];
  evidence: string[];
}

interface ClusterInfo {
  count?: number;
  clusterId?: number;
}

export class DeepSeekService {
  private apiKey: string;
  private apiUrl: string;
  private apiModel: string;
  private maxPassages: number;
  private maxPassageLength: number;
  
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';
    this.apiModel = process.env.DEEPSEEK_API_MODEL || 'deepseek-cha';
    const passageLimit = Number(process.env.DIRECTION_PASSAGE_LIMIT ?? '10');
    this.maxPassages = Number.isFinite(passageLimit) && passageLimit > 0 ? passageLimit : 10;
    const passageLengthLimit = Number(process.env.DIRECTION_PASSAGE_CHAR_LIMIT ?? '600');
    this.maxPassageLength = Number.isFinite(passageLengthLimit) && passageLengthLimit > 0 ? passageLengthLimit : 600;
  }
  
  async analyzeDirections(passages: string[], clusterInfo?: ClusterInfo): Promise<DirectionAnalysis[]> {
    const preparedPassages = this.preparePassages(passages);
    const prompt = this.buildAnalysisPrompt(preparedPassages, clusterInfo);
    
    try {
      const response = await axios.post(
        `${this.apiUrl}/chat/completions`,
        {
          model: this.apiModel,
          messages: [
            {
              role: 'system',
              content: 'You are an experienced product manager focused on early-stage startup direction discovery. Analyze user discussions to extract actionable startup opportunities.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          }
        }
      );
      
      const content = response.data.choices?.[0]?.message?.content ?? '';
      return this.parseDirections(content);
    } catch (error) {
      console.error('DeepSeek analysis error:', error);
      throw error;
    }
  }
  
  private parseDirections(content: string): DirectionAnalysis[] {
    const payload = this.extractJsonPayload(content);
    const parsed = this.tryParseJson(payload);
    if (!parsed || !Array.isArray(parsed.directions)) {
      return [];
    }
    const normalized = parsed.directions
      .map((direction) => this.normalizeDirection(direction))
      .filter((direction): direction is DirectionAnalysis => direction !== null);
    return normalized;
  }

  private preparePassages(passages: string[]): string[] {
    return passages
      .map((text) => (text ?? '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, this.maxPassages)
      .map((text) => (text.length > this.maxPassageLength ? `${text.slice(0, this.maxPassageLength)}...` : text));
  }

  private normalizeDirection(raw: unknown): DirectionAnalysis | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const data = raw as Partial<DirectionAnalysis>;

    const normalizeString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
    const normalizeArray = (value: unknown) =>
      Array.isArray(value) ? value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean) : [];

    const directionTitle = normalizeString(data.direction_title) || normalizeString(data.direction_name_cn) || normalizeString(data.direction_name_en);

    if (!directionTitle) {
      return null;
    }

    return {
      direction_title: directionTitle,
      direction_name_cn: normalizeString(data.direction_name_cn),
      direction_name_en: normalizeString(data.direction_name_en),
      summary: normalizeString(data.summary),
      summary_cn: normalizeString(data.summary_cn),
      summary_en: normalizeString(data.summary_en),
      target_user: normalizeString(data.target_user),
      target_audience: normalizeString(data.target_audience),
      target_audience_cn: normalizeString(data.target_audience_cn),
      target_audience_en: normalizeString(data.target_audience_en),
      pain_point: normalizeString(data.pain_point),
      pain_point_cn: normalizeString(data.pain_point_cn),
      pain_point_en: normalizeString(data.pain_point_en),
      opportunity_tag: normalizeString(data.opportunity_tag),
      opportunity_tag_cn: normalizeString(data.opportunity_tag_cn),
      opportunity_tag_en: normalizeString(data.opportunity_tag_en),
      value_prop: normalizeString(data.value_prop),
      alternatives: normalizeString(data.alternatives),
      mvps: normalizeArray(data.mvps),
      risks: normalizeArray(data.risks),
      evidence: normalizeArray(data.evidence),
    };
  }

  private extractJsonPayload(content: string): string {
    const trimmed = (content ?? '').trim();
    let payload = trimmed;
    if (payload.startsWith('```')) {
      payload = payload
        .replace(/^```(?:json)?/i, '')
        .replace(/```$/, '')
        .trim();
    }
    const firstCurly = payload.indexOf('{');
    if (firstCurly >= 0) {
      let depth = 0;
      let inString = false;
      let stringChar: '"' | "'" | null = null;
      let escape = false;
      for (let i = firstCurly; i < payload.length; i++) {
        const char = payload[i];
        if (escape) {
          escape = false;
          continue;
        }
        if (char === '\\') {
          escape = true;
          continue;
        }
        if (inString) {
          if (char === stringChar) {
            inString = false;
            stringChar = null;
          }
          continue;
        }
        if (char === '"' || char === "'") {
          inString = true;
          stringChar = char;
          continue;
        }
        if (char === '{') {
          depth += 1;
        } else if (char === '}') {
          depth -= 1;
          if (depth === 0) {
            payload = payload.slice(firstCurly, i + 1).trim();
            break;
          }
        }
      }
    }
    return payload;
  }

  private tryParseJson(payload: string): { directions?: unknown } | null {
    try {
      return JSON.parse(payload) as { directions?: unknown };
    } catch {
      const manuallyRepaired = this.manualRepairJsonPayload(payload);
      if (manuallyRepaired) {
        try {
          return JSON.parse(manuallyRepaired) as { directions?: unknown };
        } catch (repairError) {
          console.warn('DeepSeek manual JSON repair failed:', repairError);
        }
      }
      try {
        const autoRepaired = jsonrepair(payload);
        return JSON.parse(autoRepaired) as { directions?: unknown };
      } catch (repairError) {
        console.error('DeepSeek response parse failure:', repairError);
        return null;
      }
    }
  }

  private manualRepairJsonPayload(payload: string): string | null {
    let repaired = payload;
    let mutated = false;

    repaired = repaired.replace(/([{,]\s*)([A-Za-z0-9_\-]+)\s*:/g, (_match, prefix: string, key: string) => {
      mutated = true;
      return `${prefix}"${key}":`;
    });

    repaired = repaired.replace(/:\s*'([^']*)'/g, (_match, value: string) => {
      mutated = true;
      const escaped = value.replace(/"/g, '\\"');
      return `: "${escaped}"`;
    });

    if (mutated) {
      return repaired;
    }
    try {
      return jsonrepair(payload);
    } catch {
      return null;
    }
  }

  private buildAnalysisPrompt(passages: string[], clusterInfo?: ClusterInfo): string {
    const passageList = passages.map((p, i) => `[${i}] ${p}`).join('\n\n');
    
    return `任务：你是一个经验丰富的产品经理，专注于早期创业方向挖掘。下面我给你一组用户讨论摘录（每条是用户真实的痛点或抱怨），以及聚类统计数据。请基于这些内容：

1. 提炼出 3–6 个清晰、可验证的创业方向（每个方向给出目标用户、核心痛点、替代方案、关键价值主张）。
2. 对每个方向给出 3 条可执行的最小可行验证（MVP）建议（可测量的实验，例如 1 周内 X 用户试验、落地页面的文案、首次获客渠道）。
3. 给出基于这些讨论的风险点和反驳式假设（每个方向 1–2 条）。
4. 每个方向必须生成多语言命名与摘要（中文/英文），并为目标用户、痛点、机会标签提供补充描述。

输入数据：
${clusterInfo ? `- cluster_summary: ${JSON.stringify(clusterInfo)}` : ''}
- example_passages:
${passageList}

请返回严格的 JSON 格式，结构如下：
{
  "directions": [
    {
      "direction_title": "...",
      "direction_name_cn": "给中国用户看的短标题",
      "direction_name_en": "Short English title",
      "summary": "单段英文摘要",
      "summary_cn": "单段中文摘要",
      "summary_en": "Single paragraph English summary",
      "target_user": "...",
      "target_audience": "一句话描述目标客户画像（英文）",
      "target_audience_cn": "一句话描述目标客户画像（中文）",
      "target_audience_en": "target audience sentence in English",
      "pain_point": "...",
      "pain_point_cn": "中文痛点描述",
      "pain_point_en": "English pain point description",
      "alternatives": "...",
      "value_prop": "...",
      "opportunity_tag": "3-5 个英文词总结机会",
      "opportunity_tag_cn": "3-5 个中文词总结机会",
      "opportunity_tag_en": "3-5 english words summarizing the opportunity",
      "mvps": ["...","...","..."],
      "risks": ["..."],
      "evidence": ["引用传入的示例段落索引或摘录简短语句"]
    }
  ]
}`;
  }
}
