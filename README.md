# Perplexity Lens

A browser extension that highlights text on any web page and shows a popover with the message "Hi from Perplexity."

## Features

- Select text on any webpage to see a popover
- The popover displays "Hi from Perplexity"
- Built with React, TypeScript, and TailwindCSS

## Development

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Setup

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Build the extension:

```bash
npm run build
```

### Loading the extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" by toggling the switch in the top right corner
3. Click "Load unpacked" and select the `dist` directory from this project
4. The extension should now be installed and ready to use

## Usage

1. Navigate to any webpage
2. Select some text
3. A popover will appear showing "Hi from Perplexity"
4. Click the extension icon to see the selected text in the popup

## Project Structure

- `src/content`: Contains the content script that runs on webpages
- `src/popup`: Contains the React components for the extension popup
- `src/background`: Contains the background script for the extension
- `src/assets`: Contains icons and other assets 