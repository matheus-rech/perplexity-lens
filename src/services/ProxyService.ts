// services/ProxyService.ts
import { EMBEDDING_API_KEY, EMBEDDING_API_URL } from '../config';

/**
 * Service to handle API requests that might encounter CORS issues
 * by proxying them through the background script
 */
class ProxyService {
  /**
   * Fetch embeddings through the background script to avoid CORS issues
   * @param texts Array of texts to get embeddings for
   * @returns Promise resolving to the embeddings or an error
   */
  async fetchEmbeddings(texts: string[]): Promise<{ embeddings?: number[][], error?: string }> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'fetchEmbeddings', texts },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error in proxy service:', chrome.runtime.lastError);
            resolve({ error: chrome.runtime.lastError.message });
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  /**
   * Alternative implementation using direct API fetch with proper error handling
   * This can be used if background script proxying doesn't work
   */
  async fetchEmbeddingsDirect(texts: string[]): Promise<{ embeddings?: number[][], error?: string }> {
    try {
      const response = await fetch(EMBEDDING_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EMBEDDING_API_KEY}`
        },
        body: JSON.stringify({ 
          model: 'text-embedding-3-small', 
          input: texts 
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Embedding API error (${response.status}):`, errorText);
        return { error: `API error ${response.status}: ${errorText}` };
      }
      
      const data = await response.json();
      const embeddings = data.data.map((d: any) => d.embedding as number[]);
      return { embeddings };
    } catch (err) {
      console.error('Error fetching embeddings directly:', err);
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }
}

export default new ProxyService();