import { bedrock } from '@ai-sdk/amazon-bedrock';
import { generateText } from 'ai';
import initialHandbookData from '../data/handbook.json'; 

export interface InteractionLog {
  id: string;
  timestamp: string;
  query: string;
  response: string;
  latencyMs: number;
  source: string;
  status: 'success' | 'error';
}

export class AIOrchestrator {
  private model = bedrock('us.anthropic.claude-3-5-sonnet-20241022-v2:0');
  private cache = new Map<string, string>();
  private logs: InteractionLog[] = [];

  // STATE: Load JSON into memory
  private handbook = { ...initialHandbookData };

  // --- ADMIN TOOLS ---

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
    // Clear cache so the AI uses the new data immediately
    this.cache.clear();
  
    // Look in protocols
    const protocolIndex = this.handbook.protocols.findIndex(p => p.id === id);
    if (protocolIndex !== -1) {
      // Merge the updates into the existing protocol
      this.handbook.protocols[protocolIndex] = { 
        ...this.handbook.protocols[protocolIndex], 
        ...updates 
      };
      return true;
    }
  
    // Look in policies
    const policyIndex = this.handbook.policies.findIndex(p => p.id === id);
    if (policyIndex !== -1) {
      // Merge the updates into the existing policy
      this.handbook.policies[policyIndex] = { 
        ...this.handbook.policies[policyIndex], 
        ...updates 
      };
      return true;
    }
  
    return false;
  }

  // RAG LOGIC 

  private getContext(): string {
    const protocols = this.handbook.protocols.map(p => 
      `[PROTOCOL - ${p.urgency.toUpperCase()}]
       TOPIC: ${p.topic}
       CONTENT: "${p.content}"
       OPERATOR NOTE: ${p.operator_action}
       SOURCE: ${p.display_source}`
    ).join('\n---\n');

    const policies = this.handbook.policies.map(p => 
      `[POLICY]
       TOPIC: ${p.topic}
       CONTENT: "${p.content}"
       OPERATOR NOTE: ${p.operator_action}
       SOURCE: ${p.display_source}`
    ).join('\n---\n');

    return `CRITICAL SAFETY PROTOCOLS:\n${protocols}\n\nGENERAL POLICIES:\n${policies}`;
  }

  // GENERATION LOGIC 

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
        status: 'success'
      });
      return { success: true, text: response, metadata: { model: "cache-hit" } };
    }

    // Build Context
    const context = this.getContext();
    
    // SYSTEM PROMPT
    const systemPrompt = `
      You are the AI Front Desk for ${this.handbook.school_info.name}.
      CURRENT DATE: ${new Date().toLocaleDateString()}
      
      CORE INSTRUCTIONS:
      1. USE ONLY the provided context.
      2. SAFETY FIRST: Quote rules exactly for "CRITICAL" protocols.
      3. CITATIONS: You MUST cite the [SOURCE] provided in the data at the end of your response.
      4. OPERATOR NOTES: Pay attention to "OPERATOR NOTE" for instructions on how to handle the situation (e.g., escalating to a nurse).
      5. TONE: Professional and warm.
      
      CONTEXT DATA:
      ${context}
    `;

    try {
      // Call AI
      const result = await generateText({
        model: this.model,
        system: systemPrompt,
        prompt: userQuery,
        temperature: 0,
      });

      this.cache.set(cacheKey, result.text);
      this.logs.push({
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toISOString(),
        query: userQuery,
        response: result.text,
        latencyMs: Date.now() - startTime,
        source: 'AI',
        status: 'success'
      });

      return { success: true, text: result.text, metadata: { model: "claude-3-5-sonnet-v2" } };

    } catch (error) {
      console.error("AI Error:", error);
      this.logs.push({
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toISOString(),
        query: userQuery,
        response: "Error",
        latencyMs: Date.now() - startTime,
        source: 'ERROR',
        status: 'error'
      });
      return { success: false, text: "System Error.", metadata: { error: String(error) } };
    }
  }
}

export const orchestrator = new AIOrchestrator();