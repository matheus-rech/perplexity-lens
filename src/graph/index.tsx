import React from 'react';
import ReactDOM from 'react-dom/client';
import KnowledgeGraph from '../components/KnowledgeGraph';
import '../popup/index.css';
import authService from '../services/AuthService';

document.addEventListener('DOMContentLoaded', async () => {
  await authService.initialize();
  const container = document.getElementById('graph-container');
  if (container) {
    const root = ReactDOM.createRoot(container);
    const width = window.innerWidth;
    const height = window.innerHeight;
    root.render(
      <React.StrictMode>
        <KnowledgeGraph fullScreen={true} width={width} height={height} />
      </React.StrictMode>
    );
  }
}); 