interface UserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
}

class AuthService {
  private currentUser: UserInfo | null = null;
  private token: string | null = null;

  async initialize(): Promise<boolean> {
    try {
      // Check if we have cached user info
      const cachedUser = await this.getCachedUserInfo();
      if (cachedUser) {
        this.currentUser = cachedUser;
        console.log('User loaded from cache:', this.currentUser.email);
        return true;
      }
      
      // Try to get a new token
      return await this.authenticate();
    } catch (error) {
      console.error('Failed to initialize authentication:', error);
      return false;
    }
  }

  async authenticate(): Promise<boolean> {
    return new Promise((resolve) => {
      chrome.identity.getAuthToken({ interactive: true }, async (token) => {
        console.log('Token:', token);
        if (chrome.runtime.lastError || !token) {
          console.error('Auth error:', chrome.runtime.lastError);
          resolve(false);
          return;
        }

        this.token = token;
        
        try {
          // Fetch user info using the token
          const userInfo = await this.fetchUserInfo(token);
          
          // Cache the user info
          await this.cacheUserInfo(userInfo);
          
          this.currentUser = userInfo;
          console.log('User authenticated:', userInfo.email);
          resolve(true);
        } catch (error) {
          console.error('Failed to fetch user info:', error);
          resolve(false);
        }
      });
    });
  }

  async fetchUserInfo(token: string): Promise<UserInfo> {
    const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.status}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      email: data.email,
      name: data.name || data.email.split('@')[0],
      picture: data.picture || ''
    };
  }

  async signOut(): Promise<void> {
    if (!this.token) return;

    return new Promise((resolve) => {
      chrome.identity.removeCachedAuthToken({ token: this.token as string }, async () => {
        this.token = null;
        this.currentUser = null;
        
        // Clear cached user info
        await chrome.storage.local.remove('user_info');
        console.log('User signed out');
        resolve();
      });
    });
  }

  async getCachedUserInfo(): Promise<UserInfo | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get('user_info', (result) => {
        resolve(result.user_info || null);
      });
    });
  }

  async cacheUserInfo(userInfo: UserInfo): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ user_info: userInfo }, resolve);
    });
  }

  getUserId(): string | null {
    return this.currentUser?.id || null;
  }

  getUser(): UserInfo | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return !!this.currentUser;
  }
}

// Export a singleton instance
const authService = new AuthService();
export default authService; 