export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  isUpgraded?: boolean;
  safeSearchEnabled?: boolean;
  parentalPin?: string;
  mfaEnabled?: boolean;
  cardLast4?: string;
  usageLimit?: number; // Max messages per day
  monitoredChat?: boolean; // Send logs to email
  restrictedContent?: boolean; // Filter sensitive topics
  mobileOptimized?: boolean; // Mobile-optimized viewport option
  theme?: 'dark' | 'midnight' | 'sepia';

  // Browser Settings
  browserDefaultHomePage?: string;
  browserSearchEngine?: 'google' | 'duckduckgo' | 'bing' | 'ecosia';
  browserBlockPopups?: boolean;
  browserAutoSummarize?: boolean;

  // Accessibility Settings
  accessibilityMagnifier?: boolean;
  accessibilityTtsEnabled?: boolean;
  accessibilityDisableGlassEffects?: boolean;
  accessibilityHighContrast?: boolean;
  accessibilityReducedMotion?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'model';
  content: string;
  type: 'text' | 'image' | 'video';
  metadata?: {
    imageUrl?: string;
    videoUrl?: string;
    prompt?: string;
  };
  createdAt: any;
}

export interface Gem {
  id: string;
  name: string;
  instructions: string;
  userId?: string;
  description?: string;
  category?: string;
  iconName?: string;
  samplePrompts?: string[];
  isPremade?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: any;
  updatedAt: any;
  gemId?: string | null;
  pinned?: boolean;
}

export type AppMode = 'chat' | 'notebook' | 'browser';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
}

export interface BrowserTab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  content?: string;
  isLoading?: boolean;
}
