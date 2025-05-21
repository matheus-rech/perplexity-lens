import authService from './AuthService';
import { EMBEDDING_API_KEY, EMBEDDING_API_URL } from '../config';

export interface GraphNode {
  id: string;
  text: string;
  frequency: number;
  lastSelected: string; // ISO date string
  userId: string;
}

export interface GraphEdge {
  id: string;
  source: string; // Node ID
  target: string; // Node ID
  weight: number;
  userId: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

class KnowledgeGraphService {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'perplexity_knowledge_graph';
  private readonly DB_VERSION = 1;
  private readonly NODES_STORE = 'nodes';
  private readonly EDGES_STORE = 'edges';
  
  async initialize(): Promise<boolean> {
    return new Promise((resolve) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create the nodes store with indexes
        if (!db.objectStoreNames.contains(this.NODES_STORE)) {
          const nodeStore = db.createObjectStore(this.NODES_STORE, { keyPath: 'id' });
          nodeStore.createIndex('userId', 'userId', { unique: false });
          nodeStore.createIndex('text', 'text', { unique: false });
        }
        
        // Create the edges store with indexes
        if (!db.objectStoreNames.contains(this.EDGES_STORE)) {
          const edgeStore = db.createObjectStore(this.EDGES_STORE, { keyPath: 'id' });
          edgeStore.createIndex('userId', 'userId', { unique: false });
          edgeStore.createIndex('source', 'source', { unique: false });
          edgeStore.createIndex('target', 'target', { unique: false });
          edgeStore.createIndex('sourceTarget', ['source', 'target'], { unique: false });
        }
      };
      
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        console.log('Knowledge graph database initialized');
        resolve(true);
      };
      
      request.onerror = (event) => {
        console.error('Failed to initialize knowledge graph database:', event);
        resolve(false);
      };
    });
  }
  
  async addSelection(text: string): Promise<void> {
    if (!this.db || !authService.isAuthenticated()) {
      throw new Error('Database not initialized or user not authenticated');
    }
    
    const userId = authService.getUserId();
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Split text into words/terms (simplified for now)
    const terms = this.extractTerms(text);
    
    // Process each term as a node
    const nodePromises = terms.map(term => this.addOrUpdateNode(term, userId));
    await Promise.all(nodePromises);
    
    // Process relationships between terms
    if (terms.length > 1) {
      const edgePromises: Promise<void>[] = [];
      
      for (let i = 0; i < terms.length; i++) {
        for (let j = i + 1; j < terms.length; j++) {
          edgePromises.push(this.addOrUpdateEdge(terms[i], terms[j], userId));
        }
      }
      
      await Promise.all(edgePromises);
    }
  }
  
  private extractTerms(text: string): string[] {
    // Simple term extraction - split by spaces and filter
    // A more sophisticated implementation would use NLP techniques
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2) // Filter out very short terms
      .filter((term, index, self) => self.indexOf(term) === index); // Unique terms
  }
  
  private async addOrUpdateNode(term: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(this.NODES_STORE, 'readwrite');
      const store = transaction.objectStore(this.NODES_STORE);
      
      // First check if node already exists
      const nodeId = `${userId}:${term}`;
      const getRequest = store.get(nodeId);
      
      getRequest.onsuccess = (event) => {
        const existingNode = (event.target as IDBRequest).result as GraphNode | undefined;
        
        if (existingNode) {
          // Update existing node
          existingNode.frequency += 1;
          existingNode.lastSelected = new Date().toISOString();
          
          const updateRequest = store.put(existingNode);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(new Error('Failed to update node'));
        } else {
          // Create new node
          const newNode: GraphNode = {
            id: nodeId,
            text: term,
            frequency: 1,
            lastSelected: new Date().toISOString(),
            userId
          };
          
          const addRequest = store.add(newNode);
          addRequest.onsuccess = () => resolve();
          addRequest.onerror = () => reject(new Error('Failed to add node'));
        }
      };
      
      getRequest.onerror = () => reject(new Error('Failed to check for existing node'));
    });
  }
  
  private async addOrUpdateEdge(sourceText: string, targetText: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const sourceId = `${userId}:${sourceText}`;
      const targetId = `${userId}:${targetText}`;
      
      // Ensure consistent edge direction by ordering
      const [source, target] = sourceId < targetId 
        ? [sourceId, targetId] 
        : [targetId, sourceId];
      
      const edgeId = `${source}:${target}`;
      
      const transaction = this.db.transaction(this.EDGES_STORE, 'readwrite');
      const store = transaction.objectStore(this.EDGES_STORE);
      
      // Check if edge already exists
      const getRequest = store.get(edgeId);
      
      getRequest.onsuccess = (event) => {
        const existingEdge = (event.target as IDBRequest).result as GraphEdge | undefined;
        
        if (existingEdge) {
          // Update existing edge
          existingEdge.weight += 1;
          
          const updateRequest = store.put(existingEdge);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(new Error('Failed to update edge'));
        } else {
          // Create new edge
          const newEdge: GraphEdge = {
            id: edgeId,
            source,
            target,
            weight: 1,
            userId
          };
          
          const addRequest = store.add(newEdge);
          addRequest.onsuccess = () => resolve();
          addRequest.onerror = () => reject(new Error('Failed to add edge'));
        }
      };
      
      getRequest.onerror = () => reject(new Error('Failed to check for existing edge'));
    });
  }
  
  async getGraph(): Promise<GraphData> {
    if (!this.db || !authService.isAuthenticated()) {
      throw new Error('Database not initialized or user not authenticated');
    }
    
    const userId = authService.getUserId();
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const nodes = await this.getNodes(userId);
    const edges = await this.getEdges(userId);
    
    console.log(`Found ${nodes.length} nodes and ${edges.length} edges in database`);
    
    // Generate semantic edges based on embeddings
    try {
      const texts = nodes.map(n => n.text);
      const embeddings = await this.fetchEmbeddings(texts);
      
      // Lower threshold for testing - this will create more edges
      const threshold = 0.5;  // Reduced threshold from 0.4 to 0.2
      
      console.log(`Testing similarities with threshold ${threshold}`);
      let semanticEdgesAdded = 0;
      
      for (let i = 0; i < embeddings.length; i++) {
        for (let j = i + 1; j < embeddings.length; j++) {
          const sim = this.cosineSimilarity(embeddings[i], embeddings[j]);
          console.log(`Similarity(${nodes[i].text}, ${nodes[j].text}) = ${sim.toFixed(3)}`);
          if (sim >= threshold) {
            console.log(`Adding semantic edge between ${nodes[i].text} and ${nodes[j].text}`);
            edges.push({
              id: `${nodes[i].id}:semantic:${nodes[j].id}`,
              source: nodes[i].id,
              target: nodes[j].id,
              weight: sim,
              userId
            });
            semanticEdgesAdded++;
          }
        }
      }
      
      console.log(`Added ${semanticEdgesAdded} semantic edges to the graph`);
    } catch (err) {
      console.error('Error generating semantic edges:', err);
    }
    
    return { nodes, edges };
  }
  
  private async getNodes(userId: string): Promise<GraphNode[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(this.NODES_STORE, 'readonly');
      const store = transaction.objectStore(this.NODES_STORE);
      const index = store.index('userId');
      
      const request = index.getAll(userId);
      
      request.onsuccess = (event) => {
        const nodes = (event.target as IDBRequest).result as GraphNode[];
        resolve(nodes);
      };
      
      request.onerror = () => reject(new Error('Failed to get nodes'));
    });
  }
  
  private async getEdges(userId: string): Promise<GraphEdge[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(this.EDGES_STORE, 'readonly');
      const store = transaction.objectStore(this.EDGES_STORE);
      const index = store.index('userId');
      
      const request = index.getAll(userId);
      
      request.onsuccess = (event) => {
        const edges = (event.target as IDBRequest).result as GraphEdge[];
        resolve(edges);
      };
      
      request.onerror = () => reject(new Error('Failed to get edges'));
    });
  }
  
  async clearGraph(): Promise<void> {
    if (!this.db || !authService.isAuthenticated()) {
      throw new Error('Database not initialized or user not authenticated');
    }
    
    const userId = authService.getUserId();
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    await this.clearNodes(userId);
    await this.clearEdges(userId);
  }
  
  private async clearNodes(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(this.NODES_STORE, 'readwrite');
      const store = transaction.objectStore(this.NODES_STORE);
      const index = store.index('userId');
      
      const keyRange = IDBKeyRange.only(userId);
      const request = index.openCursor(keyRange);
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
        
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(new Error('Failed to clear nodes'));
    });
  }
  
  private async clearEdges(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(this.EDGES_STORE, 'readwrite');
      const store = transaction.objectStore(this.EDGES_STORE);
      const index = store.index('userId');
      
      const keyRange = IDBKeyRange.only(userId);
      const request = index.openCursor(keyRange);
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
        
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(new Error('Failed to clear edges'));
    });
  }
  
  // Fetch embeddings for an array of texts using OpenAI or configured API
  private async fetchEmbeddings(texts: string[]): Promise<number[][]> {
    const apiUrl = EMBEDDING_API_URL;
    
    console.log('Fetching embeddings for', texts.length, 'terms');
    console.log('Using API URL:', apiUrl);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EMBEDDING_API_KEY}`
        },
        body: JSON.stringify({ model: 'text-embedding-3-small', input: texts })
      });
      
      console.log('Embedding API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Embedding API error:', errorText);
        throw new Error(`Embedding API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Received embeddings data with', data.data?.length || 0, 'vectors');
      
      return data.data.map((d: any) => d.embedding as number[]);
    } catch (error) {
      console.error('Error fetching embeddings:', error);
      throw error;
    }
  }
  
  // Compute cosine similarity between two vectors
  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
  }
}

// Export a singleton instance
const knowledgeGraphService = new KnowledgeGraphService();
export default knowledgeGraphService; 