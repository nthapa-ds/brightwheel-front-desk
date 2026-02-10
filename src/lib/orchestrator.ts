import { bedrock } from '@ai-sdk/amazon-bedrock';
import { generateText } from 'ai';
import initialHandbookData from '../data/handbook.json'; 

//  TYPES 
export interface InteractionLog {
  id: string;
  timestamp: string;
  query: string;
  response: string;
  latencyMs: number;
  source: 'CACHE' | 'AI' | 'ERROR';
  status: 'success' | 'error';
  category?: 'MATCH' | 'GAP' | 'UNRELATED';
}

export class AIOrchestrator {
  private model = bedrock('us.anthropic.claude-3-5-sonnet-20241022-v2:0');
  private cache = new Map<string, string>();
  private logs: InteractionLog[] = [];
  
  // Load initial data
  public handbook = { ...initialHandbookData };

  constructor() {
    console.log("🚀 AI Orchestrator Initialized (In-Memory)");
  }

  //ADMIN TOOLS 

  public getLogs() {
    return this.logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public getKnowledgeBase() {
    return [
      ...this.handbook.protocols.map(p => ({ ...p, type: 'protocol' })),
      ...this.handbook.policies.map(p => ({ ...p, type: 'policy' }))
    ];
  }

  public updatePolicy(id: string, updates: any) {
    this.cache.clear();
    
    // 1. Try to find and update existing protocol
    const pIdx = this.handbook.protocols.findIndex(p => p.id === id);
    if (pIdx !== -1) {
      this.handbook.protocols[pIdx] = { ...this.handbook.protocols[pIdx], ...updates };
      return true;
    }

    // 2. Try to find and update existing policy
    const polIdx = this.handbook.policies.findIndex(p => p.id === id);
    if (polIdx !== -1) {
      this.handbook.policies[polIdx] = { ...this.handbook.policies[polIdx], ...updates };
      return true;
    }

    // 3. If ID not found, it's a NEW policy (Upsert)
    // Determine type based on updates.type or default to 'policy'
    if (updates.type === 'protocol') {
        this.handbook.protocols.unshift({ ...updates, id });
    } else {
        this.handbook.policies.unshift({ ...updates, id });
    }
    return true;
  }

  public deletePolicy(id: string) {
    this.cache.clear();
    
    const pIdx = this.handbook.protocols.findIndex(p => p.id === id);
    if (pIdx !== -1) {
      this.handbook.protocols.splice(pIdx, 1);
      return true;
    }
  
    const polIdx = this.handbook.policies.findIndex(p => p.id === id);
    if (polIdx !== -1) {
      this.handbook.policies.splice(polIdx, 1);
      return true;
    }
    return false;
  }

  // RAG LOGIC

  private getContext(): string {
    const protocols = this.handbook.protocols.map(p => 
      `[PROTOCOL - ${p.urgency?.toUpperCase() || 'STANDARD'}] TOPIC: ${p.topic} CONTENT: "${p.content}" SOURCE: ${p.display_source} NOTE: ${p.operator_action}`
    ).join('\n---\n');

    const policies = this.handbook.policies.map(p => 
      `[POLICY] TOPIC: ${p.topic} CONTENT: "${p.content}" SOURCE: ${p.display_source} NOTE: ${p.operator_action}`
    ).join('\n---\n');

    return `SCHOOL NAME: ${this.handbook.school_info.name}\n\nPROTOCOLS:\n${protocols}\n\nPOLICIES:\n${policies}`;
  }

  async generateResponse(userQuery: string) {
    const startTime = Date.now();
    const cacheKey = userQuery.trim().toLowerCase();

    // Check Cache
    if (this.cache.has(cacheKey)) {
      const response = this.cache.get(cacheKey)!;
      this.logs.push({
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toISOString(),
        query: userQuery,
        response: response,
        latencyMs: Date.now() - startTime,
        source: 'CACHE',
        status: 'success',
        category: 'MATCH'
      });
      return { success: true, text: response, metadata: { model: "cache-hit", category: "MATCH" } };
    }

    const systemPrompt = `
      You are the AI Front Desk for ${this.handbook.school_info.name}.
      CURRENT TIME: ${new Date().toLocaleString()}
      
      INSTRUCTIONS:
      1. Use ONLY provided context. 
      2. Cite [SOURCE] at the end.
      3. Categorize your answer at the very end of your response on a new line using exactly one of these tags:
         [STATUS: MATCH] - Answer found in context.
         [STATUS: GAP] - Question is about school/childcare but info is missing.
         [STATUS: UNRELATED] - Question is not about school policies.

      CONTEXT:
      ${this.getContext()}
    `;

    try {
      const result = await generateText({
        model: this.model,
        system: systemPrompt,
        prompt: userQuery,
        temperature: 0,
      });

      let category: any = 'MATCH';
      if (result.text.includes('[STATUS: GAP]')) category = 'GAP';
      else if (result.text.includes('[STATUS: UNRELATED]')) category = 'UNRELATED';

      const cleanText = result.text.replace(/\[STATUS: (.*?)\]/g, "").trim();

      this.cache.set(cacheKey, cleanText);
      this.logs.push({
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toISOString(),
        query: userQuery,
        response: cleanText,
        latencyMs: Date.now() - startTime,
        source: 'AI',
        status: 'success',
        category: category
      });

      return { success: true, text: cleanText, metadata: { model: "claude-3-5-sonnet-v2", category } };

    } catch (error) {
      console.error("Bedrock Error:", error);
      return { success: false, text: "System Error." };
    }
  }
}

// For hot reloading in development
const globalForOrchestrator = global as unknown as { orchestrator: AIOrchestrator };

export const orchestrator = globalForOrchestrator.orchestrator || new AIOrchestrator();

if (process.env.NODE_ENV !== 'production') {
  globalForOrchestrator.orchestrator = orchestrator;
}