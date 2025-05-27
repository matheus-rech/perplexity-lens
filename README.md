# Perplexity Lens 🔍

A browser extension that provides deeper insights using Perplexity AI and creates personalized knowledge graphs from your browsing activity.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/username/perplexity-lens)

![Perplexity Lens Banner](https://via.placeholder.com/1200x300/69b3a2/ffffff?text=Perplexity+Lens+-+Knowledge+Graph+Extension)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Knowledge Graph Sharing](#knowledge-graph-sharing)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Architecture](#architecture)
- [Privacy & Security](#privacy--security)
- [Technical Details](#technical-details)
- [Contributing](#contributing)
- [License](#license)

## 🌟 Overview

Perplexity Lens transforms your browsing experience by providing AI-powered insights and building a personalized knowledge graph that visualizes connections between concepts you encounter online. The extension allows you to select text on any webpage to get explanations and automatically adds the concepts to your knowledge graph. You can also share your knowledge graph with others via public URLs.

## ✨ Features

- 🔍 **Smart Text Selection**: Get AI-powered explanations for selected text using Perplexity AI
- 📊 **Knowledge Graph Visualization**: Explore connections between concepts with an interactive D3.js graph
- 🔗 **Public Sharing**: Generate shareable URLs for your knowledge graphs that anyone can access
- 🔐 **User Authentication**: Secure personal data with Firebase authentication
- 💾 **Local & Cloud Storage**: Store data locally with IndexedDB and in the cloud with Firebase
- 🖱️ **Interactive Graphs**: Zoom, pan, drag, and explore your knowledge connections
- 📱 **Responsive Design**: Works across devices with adaptive layouts
- 🎨 **Modern UI**: Built with React, TypeScript, and TailwindCSS

## 📥 Installation

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)
- Google Chrome or compatible browser
- Firebase account (for sharing functionality)
- Firebase CLI (`npm install -g firebase-tools`)

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/username/perplexity-lens.git
   cd perplexity_lens
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure API Keys**:
   Edit `src/config.ts` and add your API keys:
   ```typescript
   // Your Perplexity API key
   export const PERPLEXITY_API_KEY = 'your-perplexity-key';
   
   // Your OpenAI API key (for embeddings)
   export const EMBEDDING_API_KEY = 'your-openai-key';
   
   // Firebase configuration
   export const FIREBASE_HOSTING_URL = 'https://your-project-id.web.app';
   ```

4. **Build the extension**:
   ```bash
   npm run build
   ```

5. **Load in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" and select the `dist` directory

## 🚀 Usage

1. **Sign In**: Click the extension icon in your browser toolbar and sign in with your Firebase account
2. **Select Text**: Highlight any text on a webpage to see AI-powered explanations
3. **View Graph**: Click the "Graph" tab in the extension popup to see your knowledge graph
4. **Explore Connections**: Interact with your graph - drag nodes, zoom in/out, and hover for details
5. **Share Graph**: Click "Share Graph" to create a public URL that anyone can access

## 🔗 Knowledge Graph Sharing

### How to Share Your Knowledge Graph

1. **Build Your Graph**: Use the extension to select text and build your knowledge graph
2. **Open Graph View**: Click on the extension icon and navigate to the Graph tab
3. **Click Share**: Click the "Share Graph" button
4. **Access Public URL**: A new tab will open with your public knowledge graph
5. **Copy and Share**: Copy the URL from the address bar to share with others

### What Others Will See

When someone visits your shared knowledge graph, they'll see:

- **Interactive Visualization**: Full D3.js powered graph with zoom and drag capabilities
- **Concept Details**: Node sizes representing frequency and hover information
- **Relationship Types**: Color-coded edges showing different types of connections
- **Graph Statistics**: Total concepts and connections count
- **Creation Date**: When the graph was shared
- **Download Option**: Ability to download the graph data as JSON
- **Copy Link**: Button to easily copy the sharing URL

### Setup for Public Sharing

1. **Firebase Setup**:
   ```bash
   # Login to Firebase
   firebase login
   
   # Initialize project (if not already done)
   firebase init
   
   # Select Firestore and Hosting options
   ```

2. **Deploy to Firebase**:
   ```bash
   firebase deploy
   ```

3. **Update Configuration**:
   - Your site will be available at `https://your-project-id.web.app`
   - Update `FIREBASE_HOSTING_URL` in `src/config.ts` with your actual domain
   - Rebuild and redeploy after updating the config

## ❓ Troubleshooting

### Link Not Working
- Check that the URL is complete and properly copied
- Ensure the graph was successfully shared (button clicked)
- Verify your internet connection
- Check Firebase deployment status

### Empty Graph
- Make sure you've selected text and built a knowledge graph first
- Try refreshing your graph before sharing
- Check that you're signed in when sharing

### Slow Loading
- Large graphs may take a moment to load
- Check your internet connection
- Try refreshing the page

### Can't See Graph
- Ensure JavaScript is enabled in your browser
- Try a different browser (Chrome, Firefox, Safari, Edge)
- Check browser console for error messages

## 💻 Development

### Local Development

```bash
# Start development server with watch mode
npm run dev

# Build for production
npm run build

# Deploy to Firebase
firebase deploy
```

### Project Structure

```
perplexity-lens/
├── dist/               # Build output
├── public/             # Static assets
│   ├── icons/          # Extension icons
│   ├── view.html       # Public graph viewer
│   └── ...
├── src/
│   ├── background/     # Extension background scripts
│   ├── components/     # React components
│   ├── content/        # Content scripts
│   ├── graph/          # Knowledge graph implementation
│   ├── popup/          # Extension popup UI
│   ├── services/       # API and data services
│   ├── types/          # TypeScript type definitions
│   ├── config.ts       # Configuration file
│   └── firebase.ts     # Firebase initialization
├── scripts/            # Helper scripts
├── firebase.json       # Firebase configuration
├── firestore.rules     # Firestore security rules
├── package.json        # Project dependencies
└── webpack.config.js   # Build configuration
```

## 🏛️ Architecture

- **Frontend**: React + TypeScript + D3.js for visualization
- **Backend**: Firebase (Firestore + Hosting + Authentication)
- **Storage**: 
  - Local: IndexedDB for personal graph data
  - Cloud: Firebase Firestore for shared graphs
- **APIs**:
  - Perplexity AI for text explanations
  - OpenAI for embeddings and semantic connections
- **Build System**: Webpack + PostCSS + TailwindCSS

## 🔒 Privacy & Security

### What's Shared
- ✅ Concept names and their relationships
- ✅ Frequency of concept encounters
- ✅ Semantic connections between concepts
- ✅ Timestamps of when concepts were last selected

### What's NOT Shared
- ❌ Your personal account information
- ❌ The full text of your selections
- ❌ The websites where you found the content
- ❌ Your browsing history
- ❌ Any private notes or comments

### Security Features
- **Firebase Security Rules**: Protect your data with custom access controls
- **Public Read-Only Access**: Shared graphs are read-only for viewers
- **User Authentication**: Secure account-based access
- **HTTPS Encryption**: All data transfer is encrypted

## 🔧 Technical Details

### Graph Data Format
```json
{
  "nodes": [
    {
      "id": "concept_123",
      "text": "machine learning",
      "frequency": 5,
      "lastSelected": "2024-01-15T10:30:00Z"
    }
  ],
  "edges": [
    {
      "id": "edge_456",
      "source": "concept_123",
      "target": "concept_789",
      "weight": 0.8
    }
  ]
}
```

### URL Structure
- Base URL: `https://your-domain.web.app/view.html`
- Graph ID parameter: `?id=firestore-document-id`
- Example: `https://perplexity-lens.web.app/view.html?id=abc123def456`

### Firebase Security Rules
The project includes Firestore rules that:
- Allow public read access to shared graphs (`/graphs/{id}`)
- Require authentication for user data
- Prevent unauthorized modifications

## 👥 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgements

- [Perplexity AI](https://www.perplexity.ai/) for their powerful AI API
- [D3.js](https://d3js.org/) for the visualization library
- [Firebase](https://firebase.google.com/) for authentication and storage
- [React](https://reactjs.org/) and [TypeScript](https://www.typescriptlang.org/) for the UI framework
- [TailwindCSS](https://tailwindcss.com/) for styling

---

**Happy Learning & Sharing! 🚀**

Transform your browsing experience and build beautiful knowledge graphs with Perplexity Lens. 