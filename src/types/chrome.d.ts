// Type definitions for Chrome extension API
// This is a simplified version for our specific use case

declare module 'chrome-types' {
  interface Chrome {
    tabs: {
      query: (
        queryInfo: { active: boolean; currentWindow: boolean },
        callback: (tabs: Tab[]) => void
      ) => void;
      sendMessage: (
        tabId: number,
        message: any,
        callback?: (response: any) => void
      ) => void;
    };
    runtime: {
      sendMessage: (
        message: any,
        responseCallback?: (response: any) => void
      ) => void;
      onMessage: {
        addListener: (
          callback: (
            message: any,
            sender: any,
            sendResponse: (response?: any) => void
          ) => boolean | void
        ) => void;
      };
    };
  }

  interface Tab {
    id?: number;
    url?: string;
    title?: string;
  }
}

// No need to declare chrome variable as it's already declared by @types/chrome