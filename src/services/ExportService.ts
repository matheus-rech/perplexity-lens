import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FIREBASE_CONFIG } from '../config';
import { GraphData } from './KnowledgeGraphService';

// Initialize Firebase app and storage
const app = initializeApp(FIREBASE_CONFIG);
const storage = getStorage(app);

class ExportService {
  /**
   * Uploads the graph data as a JSON file to Firebase Storage and returns a public download URL.
   */
  async uploadGraphData(graphData: GraphData): Promise<string> {
    const json = JSON.stringify(graphData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const fileName = `graph_${Date.now()}.json`;
    const storageRef = ref(storage, `graphs/${fileName}`);
    // Upload the JSON blob
    await uploadBytes(storageRef, blob, { contentType: 'application/json' });
    // Get a public URL
    const url = await getDownloadURL(storageRef);
    return url;
  }
}

export default new ExportService(); 