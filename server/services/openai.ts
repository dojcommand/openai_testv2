import OpenAI from 'openai';
import { spawn } from 'child_process';
import { storage } from '../storage';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const DEFAULT_MODEL = 'gpt-4o';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export class OpenAIService {
  private serverClient: OpenAI | null = null;
  private serverUseG4F: boolean = false;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || '';
    
    // Check if the API key is valid (should start with 'sk-' for OpenAI)
    if (!apiKey || apiKey.length < 10 || !apiKey.startsWith('sk-')) {
      console.log('No valid server OpenAI API key found, will use G4F (free) service as fallback');
      this.serverUseG4F = true;
    } else {
      this.serverClient = new OpenAI({ apiKey });
      this.serverUseG4F = false;
    }
  }

  private createUserClient(userApiKey: string): OpenAI {
    return new OpenAI({ apiKey: userApiKey });
  }

  private shouldUseUserKey(user: any): { useUserKey: boolean; apiKey?: string } {
    if (user?.settings?.usePersonalApiKey && user?.settings?.personalOpenaiApiKey) {
      return {
        useUserKey: true,
        apiKey: user.settings.personalOpenaiApiKey
      };
    }
    return { useUserKey: false };
  }

  private async callG4F(messages: ChatMessage[], options: ChatCompletionOptions = {}): Promise<{ content: string; tokens: number; cost: number }> {
    const {
      model = 'gpt-4o-mini',
      temperature = 0.7,
      maxTokens = 2000
    } = options;

    return new Promise((resolve, reject) => {
      const python = spawn('python3', ['-u', './server/services/g4f_client.py']);
      
      const requestData = {
        messages: messages.map(msg => ({ role: msg.role, content: msg.content })),
        model,
        temperature,
        max_tokens: maxTokens
      };

      let output = '';
      let errorOutput = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`G4F process failed: ${errorOutput}`));
          return;
        }

        try {
          const result = JSON.parse(output.trim());
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve(result);
          }
        } catch (parseError) {
          reject(new Error(`Failed to parse G4F response: ${parseError}`));
        }
      });

      python.stdin.write(JSON.stringify(requestData));
      python.stdin.end();
    });
  }

  async chatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {},
    user?: any
  ): Promise<{ content: string; tokens: number; cost: number }> {
    const adminSettings = await storage.getAdminSettings();
    
    const {
      model = adminSettings.apiSettings.defaultModel || DEFAULT_MODEL,
      temperature = 0.7,
      maxTokens = adminSettings.responseGuidelines.maxResponseLength || 2000,
      systemPrompt = adminSettings.responseGuidelines.systemPrompt
    } = options;

    // Add system prompt if provided
    const messagesWithSystem: ChatMessage[] = systemPrompt 
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    // Filter out blocked keywords
    const filteredMessages = await this.filterBlockedContent(messagesWithSystem);

    // Determine which client to use
    const userKeyInfo = this.shouldUseUserKey(user);
    let clientToUse: OpenAI | null = null;
    let useG4F = false;

    if (userKeyInfo.useUserKey && userKeyInfo.apiKey) {
      // User wants to use their own API key
      try {
        clientToUse = this.createUserClient(userKeyInfo.apiKey);
        console.log('Using user\'s personal OpenAI API key');
      } catch (error) {
        console.error('Failed to create user client:', error);
        useG4F = true;
      }
    } else if (this.serverClient) {
      // Use server API key
      clientToUse = this.serverClient;
      console.log('Using server OpenAI API key');
    } else {
      // Fall back to G4F
      useG4F = true;
    }

    // Use G4F if no valid OpenAI client
    if (useG4F || !clientToUse) {
      try {
        console.log('Using G4F (free) service for AI completion');
        const result = await this.callG4F(filteredMessages, { model, temperature, maxTokens });
        
        // Filter response for blocked content
        const filteredContent = await this.filterResponse(result.content);
        
        return {
          content: filteredContent,
          tokens: result.tokens,
          cost: result.cost,
        };
      } catch (error: any) {
        console.error('G4F Error:', error);
        throw new Error('Failed to generate response using free service. Please try again.');
      }
    }

    // Use OpenAI API
    try {
      const response = await clientToUse.chat.completions.create({
        model,
        messages: filteredMessages,
        temperature,
        max_tokens: maxTokens,
      });

      const content = response.choices[0]?.message?.content || '';
      const tokens = response.usage?.total_tokens || 0;
      const cost = this.calculateCost(tokens, model);

      // Apply content filtering to response
      const filteredContent = await this.filterResponse(content);

      return {
        content: filteredContent,
        tokens,
        cost,
      };
    } catch (error: any) {
      console.error('OpenAI API Error:', error);
      
      if (error.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key.');
      } else if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.status === 402) {
        throw new Error('Insufficient credits. Please check your OpenAI account balance.');
      }
      
      throw new Error('Failed to generate response. Please try again.');
    }
  }

  async analyzeDocument(text: string): Promise<{ summary: string; keyPoints: string[] }> {
    const prompt = `Analyze the following document and provide:
1. A concise summary (2-3 sentences)
2. Key points (3-5 bullet points)

Document:
${text}

Please respond in JSON format with "summary" and "keyPoints" fields.`;

    // Use server client or G4F for document analysis
    const clientToUse = this.serverClient;
    
    if (!clientToUse) {
      // Use G4F for document analysis
      try {
        const result = await this.callG4F([{ role: 'user', content: prompt }]);
        const parsedResult = JSON.parse(result.content);
        return {
          summary: parsedResult.summary || 'Unable to generate summary',
          keyPoints: parsedResult.keyPoints || [],
        };
      } catch (error) {
        console.error('G4F document analysis error:', error);
        return {
          summary: 'Document analysis not available with free service',
          keyPoints: ['Document analysis requires OpenAI API key'],
        };
      }
    }

    try {
      const response = await clientToUse.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      return {
        summary: result.summary || 'Unable to generate summary',
        keyPoints: result.keyPoints || [],
      };
    } catch (error) {
      console.error('Document analysis error:', error);
      throw new Error('Failed to analyze document');
    }
  }

  async moderateContent(content: string): Promise<{ flagged: boolean; reason?: string }> {
    // Skip moderation if no OpenAI client is available
    if (!this.serverClient) {
      return { flagged: false };
    }

    try {
      const response = await this.serverClient.moderations.create({
        input: content,
      });

      const result = response.results[0];
      if (result.flagged) {
        const flaggedCategories = Object.entries(result.categories)
          .filter(([_, flagged]) => flagged)
          .map(([category, _]) => category);

        return {
          flagged: true,
          reason: `Content flagged for: ${flaggedCategories.join(', ')}`,
        };
      }

      return { flagged: false };
    } catch (error) {
      console.error('Content moderation error:', error);
      return { flagged: false };
    }
  }

  private async filterBlockedContent(messages: ChatMessage[]): Promise<ChatMessage[]> {
    const adminSettings = await storage.getAdminSettings();
    const blockedKeywords = adminSettings.responseGuidelines.blockedKeywords;

    if (!blockedKeywords.length) return messages;

    return messages.map(message => {
      let content = message.content;
      
      blockedKeywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi');
        content = content.replace(regex, '[FILTERED]');
      });

      return { ...message, content };
    });
  }

  private async filterResponse(content: string): Promise<string> {
    const adminSettings = await storage.getAdminSettings();
    
    // Apply content filtering
    if (adminSettings.contentFiltering.blockHarmfulContent) {
      const moderation = await this.moderateContent(content);
      if (moderation.flagged) {
        return 'I apologize, but I cannot provide that type of content. Please rephrase your request.';
      }
    }

    // Apply length limit
    if (content.length > adminSettings.responseGuidelines.maxResponseLength) {
      return content.substring(0, adminSettings.responseGuidelines.maxResponseLength) + '...';
    }

    return content;
  }

  private calculateCost(tokens: number, model: string): number {
    // Pricing per 1K tokens (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
    };

    const modelPricing = pricing[model] || pricing['gpt-4o'];
    // Approximate cost (assuming 50/50 input/output split)
    return ((tokens / 1000) * (modelPricing.input + modelPricing.output)) / 2;
  }

  async generateTitle(messages: ChatMessage[]): Promise<string> {
    const firstUserMessage = messages.find(msg => msg.role === 'user')?.content || '';
    
    if (!firstUserMessage) return 'New Chat';

    const prompt = `Generate a short, descriptive title (3-5 words) for a chat that starts with: "${firstUserMessage.substring(0, 100)}"`;

    try {
      const response = await this.serverClient!.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 20,
      });

      return response.choices[0]?.message?.content?.trim() || 'New Chat';
    } catch (error) {
      console.error('Title generation error:', error);
      return 'New Chat';
    }
  }
}

export const openaiService = new OpenAIService();
