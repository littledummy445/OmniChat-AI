/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Paperclip,
  Lock,
  MessageSquare, 
  LogOut, 
  History, 
  SendHorizontal, 
  Image as ImageIcon,
  Video,
  Edit2,
  Trash2,
  User as UserIcon,
  ChevronLeft,
  Menu,
  X,
  Sparkles,
  ChevronDown,
  Zap,
  Shield,
  Globe,
  Layout,
  Mic,
  Settings,
  HelpCircle,
  CreditCard,
  Search,
  Copy,
  Share,
  Check as CheckIcon,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Square,
  Sliders,
  Download,
  RotateCw,
  Pin,
  Dumbbell,
  BookOpen,
  Code,
  Feather,
  Languages,
  Bot,
  Keyboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PREMADE_GPTS } from './data/premadeGpts';
import { 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  setDoc,
  deleteDoc,
  getDoc,
  Timestamp 
} from 'firebase/firestore';

import { auth, db, signInWithGoogle } from './lib/firebase';
import { generateText, generateImage, generateVideo, editImage, editVideo } from './lib/gemini';
import { Conversation, Message, Gem, UserProfile, AppMode } from './types';
import LiveModal from './components/LiveModal';
import GemManager from './components/GemManager';
import UpgradeModal from './components/UpgradeModal';
import SettingsModal from './components/SettingsModal';
import ShareModal from './components/ShareModal';
import SpeechController from './components/SpeechController';
import ExportModal from './components/ExportModal';
import MarkdownRenderer from './components/MarkdownRenderer';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import AINotebook from './components/AINotebook';
import AIBrowser from './components/AIBrowser';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [appMode, setAppMode] = useState<AppMode>('chat');
  const [activeTheme, setActiveTheme] = useState<'dark' | 'midnight' | 'sepia'>(() => {
    return (localStorage.getItem('omnichat_theme') as 'dark' | 'midnight' | 'sepia') || 'dark';
  });
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationType, setGenerationType] = useState<'text' | 'image' | 'video' | 'edit' | 'edit_video'>('text');
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [editingVideo, setEditingVideo] = useState<string | null>(null);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [showGemManager, setShowGemManager] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [shareContent, setShareContent] = useState('');
  const [activeGem, setActiveGem] = useState<Gem | null>(null);
  const [gems, setGems] = useState<Gem[]>([]);
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [speechRate, setSpeechRate] = useState<number>(1);
  const [speechPitch, setSpeechPitch] = useState<number>(1);
  const [speechVoice, setSpeechVoice] = useState<string>('');
  const [isSpeechPaused, setIsSpeechPaused] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showSpeechControls, setShowSpeechControls] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [isProMode, setIsProMode] = useState(false);
  const [isUpgraded, setIsUpgraded] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [promptPolicyError, setPromptPolicyError] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const [showGptDropdown, setShowGptDropdown] = useState(false);
  const gptDropdownRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const handleChatScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setIsScrolled(scrollTop > 15);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState<string>('');
  const [customInstructions, setCustomInstructions] = useState(() => {
    return localStorage.getItem('omnichat_custom_instructions') || '';
  });
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState<string>('');

  useEffect(() => {
    const key = user ? `omnichat_pinned_${user.uid}` : 'omnichat_pinned_guest';
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setPinnedIds(JSON.parse(saved));
      } catch (e) {
        setPinnedIds([]);
      }
    } else {
      setPinnedIds([]);
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('omnichat_custom_instructions', customInstructions);
  }, [customInstructions]);

  const togglePinChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = user ? `omnichat_pinned_${user.uid}` : 'omnichat_pinned_guest';
    setPinnedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  };

  const startRenameChat = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(id);
    setRenameTitle(currentTitle);
  };

  const handleRenameSave = async (id: string) => {
    if (!renameTitle.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      if (user) {
        await updateDoc(doc(db, 'conversations', id), {
          title: renameTitle.trim(),
          updatedAt: serverTimestamp()
        });
      } else {
        // Since we are in guest/demo mode, titles can be updated locally.
        // We'll update conversations local cache or since guest has just 'demo', we don't have multiple convs.
      }
    } catch (e) {
      console.error('Failed to rename:', e);
    } finally {
      setRenamingId(null);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isMobileOptimized = !!(profile?.mobileOptimized || localStorage.getItem('omnichat_mobile_optimized') === 'true');

  useEffect(() => {
    if (isMobileOptimized) {
      setIsSidebarOpen(false);
    }
  }, [isMobileOptimized]);

  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoMessages, setDemoMessages] = useState<Message[]>([]);
  const [demoCount, setDemoCount] = useState(() => {
    const saved = localStorage.getItem('omnichat_demo_count');
    const savedDate = localStorage.getItem('omnichat_demo_date');
    const today = new Date().toDateString();
    if (savedDate === today) return saved ? parseInt(saved) : 0;
    return 0;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isDemoLimitReached = !user && isDemoMode && demoCount >= 7;

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setIsDemoMode(false);
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          setProfile({ ...data, uid: u.uid });
          setIsUpgraded(!!data.isUpgraded);
        } else {
          const newProfile: Partial<UserProfile> = {
            email: u.email!,
            displayName: u.displayName!,
            photoURL: u.photoURL!,
            isUpgraded: false,
            safeSearchEnabled: false
          };
          await setDoc(doc(db, 'users', u.uid), {
            ...newProfile,
            createdAt: serverTimestamp()
          });
          setProfile({ ...newProfile as UserProfile, uid: u.uid });
          setIsUpgraded(false);
        }
      } else {
        setProfile(null);
        setIsUpgraded(false);
        setActiveTheme('dark');
        localStorage.setItem('omnichat_theme', 'dark');
      }
      setLoadingInitial(false);
    });
    return unsubscribe;
  }, []);

  // Theme listeners and dynamic application
  useEffect(() => {
    if (profile?.theme) {
      setActiveTheme(profile.theme);
      localStorage.setItem('omnichat_theme', profile.theme);
    }
  }, [profile?.theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
    document.body.setAttribute('data-theme', activeTheme);
  }, [activeTheme]);

  // Accessibility settings dynamic DOM application
  useEffect(() => {
    const glassDisabled = profile?.accessibilityDisableGlassEffects ?? (localStorage.getItem('omnichat_accessibility_glass') === 'true');
    const magnifier = profile?.accessibilityMagnifier ?? (localStorage.getItem('omnichat_accessibility_magnifier') === 'true');
    const highContrast = profile?.accessibilityHighContrast ?? (localStorage.getItem('omnichat_accessibility_highcontrast') === 'true');
    const reducedMotion = profile?.accessibilityReducedMotion ?? (localStorage.getItem('omnichat_accessibility_reducedmotion') === 'true');

    document.documentElement.setAttribute('data-disable-glass', String(glassDisabled));
    document.documentElement.setAttribute('data-magnifier', String(magnifier));
    document.documentElement.setAttribute('data-high-contrast', String(highContrast));
    document.documentElement.setAttribute('data-reduced-motion', String(reducedMotion));
  }, [profile]);

  // Handle clicking outside menus to close them
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
        setShowPlusMenu(false);
      }
      if (gptDropdownRef.current && !gptDropdownRef.current.contains(event.target as Node)) {
        setShowGptDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // Ctrl + K -> Focus search input
      if (isCmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSidebarOpen(true);
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 50);
        return;
      }

      // Ctrl + N -> New Chat
      if (isCmdOrCtrl && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        createNewChat();
        return;
      }

      // Ctrl + / -> Toggle Keyboard Shortcuts Modal
      if (isCmdOrCtrl && e.key === '/') {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
        return;
      }

      // Ctrl + Shift + L -> Toggle Live Voice Mode
      if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setShowLiveModal(prev => !prev);
        return;
      }

      // Esc -> Close active modals
      if (e.key === 'Escape') {
        setShowShortcutsModal(false);
        setShowGptDropdown(false);
        setShowPlusMenu(false);
        setShowGemManager(false);
        setShowSettingsModal(false);
        setShowExportModal(false);
        setShowUpgradeModal(false);
        setShowLiveModal(false);
        setShowShareModal(false);
        setEditingMessageId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Conversations listener
  useEffect(() => {
    if (!user) {
      setConversations([]);
      return;
    }
    const q = query(
      collection(db, 'conversations'),
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
      setConversations(data);
    });
    return unsubscribe;
  }, [user]);

  // Custom GPTs / Gems listener
  useEffect(() => {
    if (!user) {
      setGems([]);
      return;
    }
    const q = query(collection(db, 'gems'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gem)));
    });
    return unsubscribe;
  }, [user]);

  const handleLogout = async () => {
    try {
      window.speechSynthesis.cancel();
      setActiveSpeechId(null);
      await signOut(auth);
      setMessages([]);
      setDemoMessages([]);
      setActiveId(null);
      setActiveGem(null);
    } catch (e) {
      console.error("Logout failed: ", e);
    }
  };

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        if (voices.length > 0 && !speechVoice) {
          const defaultVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
          setSpeechVoice(defaultVoice.name);
        }
      }
    };
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const handleSpeak = (text: string, id: string) => {
    if (activeSpeechId === id) {
      window.speechSynthesis.cancel();
      setActiveSpeechId(null);
      setIsSpeechPaused(false);
      setShowSpeechControls(false);
      return;
    }

    window.speechSynthesis.cancel();
    setIsSpeechPaused(false);
    
    // Clean text by stripping markdown etc. for smoother speech synthesis output.
    const cleanText = text
      .substring(0, 3000) // safety limit for synthesis
      .replace(/[*#_~`\-+>]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    setSpokenText(cleanText);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    if (speechVoice) {
      const selectedVoice = availableVoices.find(v => v.name === speechVoice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    utterance.onend = () => {
      setActiveSpeechId(null);
      setIsSpeechPaused(false);
      setShowSpeechControls(false);
    };
    utterance.onerror = () => {
      setActiveSpeechId(null);
      setIsSpeechPaused(false);
      setShowSpeechControls(false);
    };

    speechUtteranceRef.current = utterance;
    setActiveSpeechId(id);
    setShowSpeechControls(true);
    window.speechSynthesis.speak(utterance);
  };

  const pauseResumeSpeech = () => {
    if (!activeSpeechId) return;
    if (isSpeechPaused) {
      window.speechSynthesis.resume();
      setIsSpeechPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsSpeechPaused(true);
    }
  };

  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setActiveSpeechId(null);
    setIsSpeechPaused(false);
    setShowSpeechControls(false);
  };

  const updateSpeechRate = (rate: number) => {
    setSpeechRate(rate);
    if (activeSpeechId && spokenText) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.rate = rate;
      utterance.pitch = speechPitch;
      if (speechVoice) {
        const selectedVoice = availableVoices.find(v => v.name === speechVoice);
        if (selectedVoice) utterance.voice = selectedVoice;
      }
      utterance.onend = () => {
        setActiveSpeechId(null);
        setIsSpeechPaused(false);
        setShowSpeechControls(false);
      };
      utterance.onerror = () => {
        setActiveSpeechId(null);
        setIsSpeechPaused(false);
        setShowSpeechControls(false);
      };
      speechUtteranceRef.current = utterance;
      setIsSpeechPaused(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const updateSpeechVoice = (voiceName: string) => {
    setSpeechVoice(voiceName);
    if (activeSpeechId && spokenText) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.rate = speechRate;
      utterance.pitch = speechPitch;
      const selectedVoice = availableVoices.find(v => v.name === voiceName);
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.onend = () => {
        setActiveSpeechId(null);
        setIsSpeechPaused(false);
        setShowSpeechControls(false);
      };
      utterance.onerror = () => {
        setActiveSpeechId(null);
        setIsSpeechPaused(false);
        setShowSpeechControls(false);
      };
      speechUtteranceRef.current = utterance;
      setIsSpeechPaused(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Messages & Gem listener
  useEffect(() => {
    if (!activeId || !user) {
      setMessages([]);
      setActiveGem(null);
      return;
    }

    const conv = conversations.find(c => c.id === activeId);
    if (conv?.gemId) {
      const gemRef = doc(db, 'gems', conv.gemId);
      getDoc(gemRef).then(snap => {
        if (snap.exists()) {
          setActiveGem({ id: snap.id, ...snap.data() } as Gem);
        }
      });
    } else {
      setActiveGem(null);
    }

    const q = query(
      collection(db, 'conversations', activeId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(data);
    });
    return unsubscribe;
  }, [activeId, user, conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, demoMessages]);

  const createNewChat = async () => {
    if (!user) {
      setIsDemoMode(true);
      setActiveId(null);
      setDemoMessages([]);
      return;
    }
    const docRef = await addDoc(collection(db, 'conversations'), {
      userId: user.uid,
      title: 'New Chat',
      gemId: activeGem?.id || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setActiveId(docRef.id);
  };

  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeId === id) setActiveId(null);
    await deleteDoc(doc(db, 'conversations', id));
  };

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;
    if (isDemoLimitReached) return;
    
    // Safety check BEFORE starting
    const profanityPatterns = [
      /\bf[u|*|0|v|k|x|q|w|i|a|e|c|s|t|z|y|u]*[c|k|q|x|z|u|v]+[k|q|x|z|u|v]?\b/i,
      /fu[c|k]/i,
      /\bs[h|*|!|1|i]t\b/i,
      /\ba[s|$]{2,}\b/i,
      /\bb[i|*|1|l|!]tch\b/i,
      /\bd[a|*|4]mn\b/i,
      /\bh[e|*|3]ll\b/i
    ];

    const threatPatterns = [
      /\bi\s+(?:will|am\s+going\s+to|am\s+gonna|gonna|shall)\s+.*\b(?:kill|hurt|destroy|bomb|hack|attack|murder|injure|beat)\b/i,
      /\bwatch\s+your\s+back\b/i,
      /\bi\s+know\s+where\s+you\s+live\b/i,
      /\byou\s+will\s+pay\b/i,
      /\bi'm\s+coming\s+for\s+you\b/i
    ];
    
    const cleanedText = input.toLowerCase().replace(/[^a-z0-9 ]/g, '');
    const words = cleanedText.split(/\s+/);
    
    const hasViolation = profanityPatterns.some(pattern => pattern.test(input)) || 
                        threatPatterns.some(pattern => pattern.test(input)) ||
                        words.some(word => ['fuc', 'fck', 'shit', 'ass', 'bitch'].includes(word));

    // Prepare inputs
    const currentInput = input;
    const currentGenerationType = generationType;
    const currentEditingImage = editingImage;
    const currentEditingVideo = editingVideo;
    const currentSearch = isSearchEnabled;
    const currentPro = isProMode;
    const currentAttachedImage = attachedImage;
    const currentUpgraded = isUpgraded;
    const isSafeSearch = profile?.safeSearchEnabled;
    let effectiveConversationId = activeId;

    if (!user && (currentGenerationType === 'video' || currentGenerationType === 'image' || currentAttachedImage)) {
      signInWithGoogle();
      return;
    }

    // Reset UI
    setInput('');
    setIsGenerating(true);
    setGenerationType('text');
    setEditingImage(null);
    setEditingVideo(null);
    setAttachedImage(null);

    // Automatically create a new chat for logged-in users if none is active
    if (user && !effectiveConversationId) {
      try {
        const docRef = await addDoc(collection(db, 'conversations'), {
          userId: user.uid,
          title: currentInput.trim().slice(0, 30) || 'New Chat',
          gemId: activeGem?.id || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        effectiveConversationId = docRef.id;
        setActiveId(docRef.id);
      } catch (error) {
        console.error("Error creating new chat:", error);
      }
    }

    // Automatically start demo mode for guests
    if (!user && !isDemoMode) {
      setIsDemoMode(true);
    }

    // Add User Message immediately
    const tempId = Date.now().toString();
    const userMsg: Message = {
      id: tempId,
      conversationId: effectiveConversationId || 'demo',
      role: 'user',
      content: currentInput,
      type: currentGenerationType === 'image' ? 'image' : currentGenerationType === 'video' ? 'video' : 'text',
      createdAt: new Date(),
    };

    if (user && effectiveConversationId) {
      await addDoc(collection(db, 'conversations', effectiveConversationId, 'messages'), {
        ...userMsg,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'conversations', effectiveConversationId), { updatedAt: serverTimestamp() });
    } else {
      setDemoMessages(prev => [...prev, userMsg]);
      const newCount = demoCount + 1;
      setDemoCount(newCount);
      localStorage.setItem('omnichat_demo_count', newCount.toString());
      localStorage.setItem('omnichat_demo_date', new Date().toDateString());
    }

    if (hasViolation) {
      // Delay to simulate processing
      await new Promise(r => setTimeout(r, 1200));

      const refusalMsg: Message = {
        id: (Date.now() + 1).toString(),
        conversationId: effectiveConversationId || 'demo',
        role: 'model',
        content: "⚠️ This prompt goes against my guidelines. I cannot fulfill this request.",
        type: 'text',
        createdAt: new Date(),
      };

      if (user && effectiveConversationId) {
        await addDoc(collection(db, 'conversations', effectiveConversationId, 'messages'), {
          ...refusalMsg,
          createdAt: serverTimestamp(),
        });
      } else {
        setDemoMessages(prev => [...prev, refusalMsg]);
      }
      
      setIsGenerating(false);
      return;
    }

    const proSystemInstruction = `You are OmniChat AI. 
The user is currently a ${currentUpgraded ? 'Pro' : 'Free'} user. 
${isSafeSearch ? 'SafeSearch is currently ENABLED. You MUST filter out any explicit, harmful, or inappropriate content.' : ''}
${profile?.mfaEnabled ? 'Multi-Factor Authentication is ENABLED for this account.' : ''}
Free users CANNOT generate videos or upload files. If a Free user asks to create a video or analyze a file, you MUST politely refuse and suggest they click the 'Upgrade' button in the sidebar.
Pro users have unlimited access to all features including cinematic video generation and image analysis.
Always be helpful, precise, and maintain a friendly ChatGPT-like persona.
Use emojis naturally in your responses to make the conversation feel more expressive and friendly (e.g., "Hello! 😄 How's your day going so far?").`;

    try {
      let aiContent = '';
      let aiType: 'text' | 'image' | 'video' = 'text';
      let metadata = {};

      if (currentGenerationType === 'image') {
        const imageUrl = await generateImage(currentInput);
        aiContent = `Generated image for: ${currentInput}`;
        aiType = 'image';
        metadata = { imageUrl, prompt: currentInput };
      } else if (currentGenerationType === 'video' || currentGenerationType === 'edit_video') {
        if (!currentUpgraded) throw new Error("PRO_REQUIRED");
        const videoUrl = currentEditingVideo 
          ? await editVideo(currentEditingVideo, currentInput) 
          : await generateVideo(currentInput);
        aiContent = `Generated video for: ${currentInput}`;
        aiType = 'video';
        metadata = { videoUrl, prompt: currentInput };
      } else if (currentGenerationType === 'edit' && currentEditingImage) {
        const imageUrl = await editImage(currentEditingImage, currentInput);
        aiContent = `Edited image for: ${currentInput}`;
        aiType = 'image';
        metadata = { imageUrl, prompt: currentInput };
      } else {
        const history = (user ? messages : demoMessages).map(m => ({
          role: m.role === 'model' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));
        let instruction = activeGem?.instructions ? `${proSystemInstruction}\n\nAdditional persona instructions: ${activeGem.instructions}` : proSystemInstruction;
        if (customInstructions.trim()) {
          instruction += `\n\nCustom instruction definition constraint: The user has requested that you follow these style/format rules in all responses: "${customInstructions.trim()}"`;
        }
        aiContent = await generateText(currentInput, history, instruction, currentSearch, currentPro, currentAttachedImage || undefined) || 'I am sorry, I could not generate a response.';
      }

      const modelMessage: Message = {
        id: Date.now().toString(),
        conversationId: effectiveConversationId || 'demo',
        role: 'model',
        content: aiContent,
        type: aiType,
        metadata,
        createdAt: new Date(),
      };

      if (user && effectiveConversationId) {
        await addDoc(collection(db, 'conversations', effectiveConversationId, 'messages'), {
          ...modelMessage,
          createdAt: serverTimestamp(),
        });
      } else {
        setDemoMessages(prev => [...prev, modelMessage]);
      }
    } catch (error: any) {
      console.error(error);
      let errorMessage = 'Sorry, there was an error processing your request.';
      if (error?.message === "PRO_REQUIRED") {
        errorMessage = "Video generation and editing are Pro features. Please upgrade to unlock cinematic creation!";
      } else if (error?.status === 403 || error?.message?.includes('403') || error?.message?.includes('PERMISSION_DENIED')) {
        errorMessage = 'I am sorry, but your account, project, or region does not currently have permission to use this specific AI model or feature (like Google Search/Video Generation).';
      }
      const errMessage: Message = {
        id: Date.now().toString(),
        conversationId: effectiveConversationId || 'demo',
        role: 'model',
        content: errorMessage,
        type: 'text',
        createdAt: new Date(),
      };
      if (user && effectiveConversationId) {
        await addDoc(collection(db, 'conversations', effectiveConversationId, 'messages'), { ...errMessage, createdAt: serverTimestamp() });
      } else {
        setDemoMessages(prev => [...prev, errMessage]);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  const shareMessage = (text: string) => {
    setShareContent(text);
    setShowShareModal(true);
  };

  const handleRegenerateResponse = async (msgId: string) => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const currentMsgs = user ? messages : demoMessages;
      const targetIndex = currentMsgs.findIndex(m => m.id === msgId);
      if (targetIndex === -1) {
        setIsGenerating(false);
        return;
      }

      const precedingMsgs = currentMsgs.slice(0, targetIndex);
      if (precedingMsgs.length === 0) {
        setIsGenerating(false);
        return;
      }

      const promptMsg = precedingMsgs[precedingMsgs.length - 1];
      const promptText = promptMsg.content;
      const historyMsgs = precedingMsgs.slice(0, precedingMsgs.length - 1);

      const history = historyMsgs.map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const proSystemInstruction = `You are OmniChat AI. 
The user is currently a ${isUpgraded ? 'Pro' : 'Free'} user. 
${profile?.safeSearchEnabled ? 'SafeSearch is currently ENABLED. You MUST filter out any explicit, harmful, or inappropriate content.' : ''}
${profile?.mfaEnabled ? 'Multi-Factor Authentication is ENABLED for this account.' : ''}
Free users CANNOT generate videos or upload files. If a Free user asks to create a video or analyze a file, you MUST politely refuse and suggest they click the 'Upgrade' button in the sidebar.
Pro users have unlimited access to all features including cinematic video generation and image analysis.
Always be helpful, precise, and maintain a friendly ChatGPT-like persona.
Use emojis naturally in your responses to make the conversation feel more expressive and friendly (e.g., "Hello! 😄 How's your day going so far?").`;

      let instruction = activeGem?.instructions ? `${proSystemInstruction}\n\nAdditional persona instructions: ${activeGem.instructions}` : proSystemInstruction;
      if (customInstructions.trim()) {
        instruction += `\n\nCustom instruction definition constraint: The user has requested that you follow these style rules in all responses: "${customInstructions.trim()}"`;
      }

      if (user && activeId) {
        await updateDoc(doc(db, 'conversations', activeId, 'messages', msgId), {
          content: '⏳ Regenerating response...',
          createdAt: serverTimestamp()
        });
      } else {
        setDemoMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: '⏳ Regenerating response...' } : m));
      }

      const newResponse = await generateText(promptText, history, instruction, isSearchEnabled, isProMode, undefined) || 'I am sorry, I could not generate a response.';

      if (user && activeId) {
        await updateDoc(doc(db, 'conversations', activeId, 'messages', msgId), {
          content: newResponse,
          createdAt: serverTimestamp()
        });
      } else {
        setDemoMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: newResponse } : m));
      }

    } catch (e) {
      console.error('Failed to regenerate response:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditPastMessage = async (msgId: string, newPromptText: string) => {
    if (isGenerating || !newPromptText.trim()) return;
    setIsGenerating(true);
    setEditingMessageId(null);

    const currentMsgs = user ? messages : demoMessages;
    const targetIdx = currentMsgs.findIndex(m => m.id === msgId);
    if (targetIdx === -1) {
      setIsGenerating(false);
      return;
    }

    try {
      if (user && activeId) {
        await updateDoc(doc(db, 'conversations', activeId, 'messages', msgId), {
          content: newPromptText
        });

        const subsequentMsgs = currentMsgs.slice(targetIdx + 1);
        for (const outMsg of subsequentMsgs) {
          await deleteDoc(doc(db, 'conversations', activeId, 'messages', outMsg.id));
        }

        await new Promise(r => setTimeout(r, 450));
      } else {
        setDemoMessages(prev => {
          const cut = prev.slice(0, targetIdx);
          const updatedUserMsg = { ...prev[targetIdx], content: newPromptText };
          return [...cut, updatedUserMsg];
        });
      }

      const precedingMsgs = currentMsgs.slice(0, targetIdx);
      const history = precedingMsgs.map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const proSystemInstruction = `You are OmniChat AI. 
The user is currently a ${isUpgraded ? 'Pro' : 'Free'} user. 
${profile?.safeSearchEnabled ? 'SafeSearch is currently ENABLED. You MUST filter out any explicit, harmful, or inappropriate content.' : ''}
${profile?.mfaEnabled ? 'Multi-Factor Authentication is ENABLED for this account.' : ''}
Free users CANNOT generate videos or upload files. If a Free user asks to create a video or analyze a file, you MUST politely refuse and suggest they click the 'Upgrade' button in the sidebar.
Pro users have unlimited access to all features including cinematic video generation and image analysis.
Always be helpful, precise, and maintain a friendly ChatGPT-like persona.
Use emojis naturally in your responses to make the conversation feel more expressive and friendly (e.g., "Hello! 😄 How's your day going so far?").`;

      let instruction = activeGem?.instructions ? `${proSystemInstruction}\n\nAdditional persona instructions: ${activeGem.instructions}` : proSystemInstruction;
      if (customInstructions.trim()) {
        instruction += `\n\nCustom instruction definition constraint: The user has requested that you follow these style rules in all responses: "${customInstructions.trim()}"`;
      }

      if (user && activeId) {
        const msgRef = doc(collection(db, 'conversations', activeId, 'messages'));
        const modelMessageWithCustomId: Message = {
          id: msgRef.id,
          conversationId: activeId,
          role: 'model',
          content: '⏳ Thinking...',
          type: 'text',
          createdAt: new Date()
        };
        await setDoc(msgRef, {
          ...modelMessageWithCustomId,
          createdAt: serverTimestamp()
        });

        const calculatedResponse = await generateText(newPromptText, history, instruction, isSearchEnabled, isProMode, undefined) || 'I am sorry, I could not generate a response.';

        await updateDoc(msgRef, {
          content: calculatedResponse
        });
      } else {
        const modelMsgId = Date.now().toString();
        const modelMessage: Message = {
          id: modelMsgId,
          conversationId: 'demo',
          role: 'model',
          content: '⏳ Thinking...',
          type: 'text',
          createdAt: new Date()
        };
        setDemoMessages(prev => [...prev, modelMessage]);

        const generatedRes = await generateText(newPromptText, history, instruction, isSearchEnabled, isProMode, undefined) || 'I am sorry, I could not generate a response.';
        setDemoMessages(prev => prev.map(m => m.id === modelMsgId ? { ...m, content: generatedRes } : m));
      }

    } catch (e) {
      console.error('Failed to edit past message:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!user) {
        signInWithGoogle();
        return;
      }
      if (isUpgraded) {
        const reader = new FileReader();
        reader.onloadend = () => setAttachedImage(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setShowUpgradeModal(true);
      }
    }
  };

  const renderConversationItem = (conv: Conversation, isPinned: boolean) => {
    const isEditing = renamingId === conv.id;
    const isActive = activeId === conv.id;

    return (
      <div
        key={conv.id}
        onClick={() => { if(!isEditing) setActiveId(conv.id); }}
        className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
          isActive ? 'bg-theme-active text-theme-text font-medium shadow-sm' : 'hover:bg-theme-hover text-theme-muted hover:text-theme-text'
        }`}
      >
        {isEditing ? (
          <form 
            onSubmit={(e) => { e.preventDefault(); handleRenameSave(conv.id); }} 
            className="flex-1 flex gap-1 items-center shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              className="flex-1 bg-black/40 border border-indigo-500/50 rounded px-1.5 py-0.5 text-xs text-white outline-none font-sans font-normal"
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setRenamingId(null);
              }}
              autoFocus
            />
          </form>
        ) : (
          <span className="text-sm truncate flex-1 select-none pr-1">{conv.title}</span>
        )}

        {/* Action Buttons */}
        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                startRenameChat(conv.id, conv.title, e);
              }}
              className="p-1 opacity-0 group-hover:opacity-100 hover:text-white transition-opacity duration-200"
              title="Rename chat"
            >
              <Edit2 className="w-3 h-3 text-white/30 hover:text-white" />
            </button>
            
            <button
              onClick={(e) => togglePinChat(conv.id, e)}
              className={`p-1 ${isPinned ? 'opacity-80 hover:opacity-100 text-indigo-400' : 'opacity-0 group-hover:opacity-100 text-white/30 hover:text-white'} transition-opacity duration-200`}
              title={isPinned ? "Unpin chat" : "Pin chat"}
            >
              <Pin className={`w-3 h-3 ${isPinned ? '' : 'rotate-45'}`} />
            </button>

            <button 
              onClick={(e) => deleteChat(conv.id, e)} 
              className="p-1 opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-opacity duration-200"
              title="Delete chat"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loadingInitial) {
    return (
      <div className="h-screen w-full bg-[#212121] flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-white/20 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex bg-[#212121] font-sans text-[#ececec] overflow-hidden select-none">
      
      {/* Collapsed Sidebar Rail matching the mockup */}
      {!isSidebarOpen && !isMobileOptimized && (
        <div className="w-14 h-full bg-[#171717] border-r border-white/5 flex flex-col items-center py-4 justify-between select-none z-30 shrink-0">
          <div className="flex flex-col items-center gap-5 w-full">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-white/5 rounded-xl text-white/50 hover:text-white transition-all"
              title="Open sidebar"
            >
              <Layout className="w-5 h-5" />
            </button>
            
            <button 
              onClick={createNewChat}
              className="p-2 hover:bg-white/5 rounded-xl text-white/50 hover:text-white transition-all"
              title="New chat"
            >
              <MessageSquare className="w-5 h-5 text-indigo-400" />
            </button>

            <button 
              onClick={() => {
                setIsSidebarOpen(true);
                setTimeout(() => {
                  const inputEl = document.querySelector('input[placeholder="Search chats..."]') as HTMLInputElement;
                  if (inputEl) inputEl.focus();
                }, 100);
              }}
              className="p-2 hover:bg-white/5 rounded-xl text-white/50 hover:text-white transition-all"
              title="Search chats"
            >
              <Search className="w-5 h-5" />
            </button>

            <button 
              onClick={() => {
                if (user) {
                  setShowGemManager(true);
                } else {
                  signInWithGoogle();
                }
              }}
              className="p-2 hover:bg-white/5 rounded-xl text-white/50 hover:text-white transition-all"
              title="My GPTs"
            >
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-4 w-full">
            {user ? (
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="w-8 h-8 rounded-full border border-white/10 hover:border-indigo-500 overflow-hidden transition-all"
                title="Profile Settings"
              >
                <img src={user.photoURL || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </button>
            ) : (
              <button 
                onClick={signInWithGoogle}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"
                title="Log In"
              >
                <UserIcon size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {!isSidebarOpen && (
          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(true)}
            className={`fixed top-4 left-4 z-50 p-2 gpt-button-secondary ${isMobileOptimized ? 'block' : 'lg:hidden'}`}
          >
            <Menu className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSidebarOpen && isMobileOptimized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-30 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={isMobileOptimized 
          ? { width: isSidebarOpen ? '280px' : '0px', x: isSidebarOpen ? 0 : -280 } 
          : { width: isSidebarOpen ? '260px' : '0px', x: isSidebarOpen ? 0 : -260 }
        }
        className={`h-full gpt-sidebar flex flex-col overflow-hidden ${
          isMobileOptimized 
            ? 'fixed inset-y-0 left-0 z-50 bg-[#171717]/95 backdrop-blur-2xl border-r border-white/5 shadow-2xl' 
            : 'relative z-40 lg:static'
        }`}
      >
        <div className="p-3 flex flex-col h-full">
          <div className="flex items-center justify-between px-1 mb-2">
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 gpt-button-secondary">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={createNewChat} className="p-2 gpt-button-secondary" title="New chat">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1 mt-2 flex-1 overflow-y-auto px-1">
            <button onClick={() => { setAppMode('chat'); createNewChat(); }} className="flex items-center gap-2 p-2 w-full text-left rounded-lg hover:bg-white/5 transition-all group">
              <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center bg-white/5 group-hover:bg-white/10">
                 <MessageSquare className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">New chat</span>
            </button>

            {/* Apps & Workspaces Section */}
            <div className="pt-3 pb-1 px-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center justify-between">
              <span>Apps & Tools</span>
            </div>

            <button 
              onClick={() => setAppMode('chat')} 
              className={`flex items-center gap-2.5 p-2 w-full text-left rounded-xl transition-all ${
                appMode === 'chat' ? 'bg-indigo-600/20 text-white font-bold border border-indigo-500/30' : 'hover:bg-white/5 text-white/60'
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm">AI Chat</span>
            </button>

            <button 
              onClick={() => setAppMode('notebook')} 
              className={`flex items-center gap-2.5 p-2 w-full text-left rounded-xl transition-all ${
                appMode === 'notebook' ? 'bg-indigo-600/20 text-white font-bold border border-indigo-500/30' : 'hover:bg-white/5 text-white/60'
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center shrink-0">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm">AI Notebook</span>
            </button>

            <button 
              onClick={() => setAppMode('browser')} 
              className={`flex items-center gap-2.5 p-2 w-full text-left rounded-xl transition-all ${
                appMode === 'browser' ? 'bg-indigo-600/20 text-white font-bold border border-indigo-500/30' : 'hover:bg-white/5 text-white/60'
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                <Globe className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm">AI Web Browser</span>
            </button>

            <div className="relative group px-1 pt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
              <input 
                ref={searchInputRef}
                type="text"
                placeholder="Search chats..."
                value={chatSearchQuery}
                onChange={(e) => setChatSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-lg py-1.5 pl-8 pr-12 text-xs placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-white"
              />
              {!chatSearchQuery && (
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-mono font-bold text-white/30 bg-white/5 border border-white/10 rounded pointer-events-none">⌘K</kbd>
              )}
              {chatSearchQuery && (
                <button 
                  onClick={() => setChatSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button onClick={() => setGenerationType('image')} className="flex items-center gap-2 p-2 w-full text-left rounded-lg hover:bg-white/5 transition-all text-white/60">
              <ImageIcon className="w-4 h-4 ml-2" />
              <span className="text-sm font-medium">Images</span>
            </button>

            {gems.length > 0 && (
              <div className="pt-4 pb-1 px-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                My GPTs
              </div>
            )}
            {gems.length > 0 && (
              <button
                onClick={() => {
                  setActiveGem(null);
                  if (activeId) {
                    updateDoc(doc(db, 'conversations', activeId), { gemId: null });
                  }
                }}
                className={`flex items-center gap-2 p-2 w-full text-left rounded-lg transition-all ${
                  !activeGem ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/60'
                }`}
              >
                <div className="w-5 h-5 bg-white/5 rounded-md flex items-center justify-center shrink-0">
                  <Sparkles className="w-3 h-3 text-white/40" />
                </div>
                <span className="text-sm truncate font-medium">Default AI</span>
              </button>
            )}
            {gems.map((gem) => (
              <button
                key={gem.id}
                onClick={() => {
                  setActiveGem(gem);
                  if (activeId) {
                    updateDoc(doc(db, 'conversations', activeId), { gemId: gem.id });
                  }
                }}
                className={`flex items-center gap-2 p-2 w-full text-left rounded-lg transition-all ${
                  activeGem?.id === gem.id ? 'bg-indigo-600/10 text-white animate-pulse' : 'hover:bg-white/5 text-white/60'
                }`}
                title={gem.name}
              >
                <div className="w-5 h-5 bg-indigo-600/20 rounded-md flex items-center justify-center shrink-0">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                </div>
                <span className="text-sm truncate font-medium">{gem.name}</span>
              </button>
            ))}

            {/* Pinned conversations segment */}
            {conversations.filter(c => pinnedIds.includes(c.id)).length > 0 && (
              <>
                <div className="pt-4 pb-1.5 px-2 text-[10px] font-bold text-indigo-400/40 uppercase tracking-widest flex items-center gap-1.5">
                  <Pin className="w-3 h-3 rotate-45 text-indigo-400" />
                  <span>Pinned</span>
                </div>
                {conversations
                  .filter(c => pinnedIds.includes(c.id))
                  .filter(conv => conv.title.toLowerCase().includes(chatSearchQuery.toLowerCase()))
                  .map((conv) => renderConversationItem(conv, true))}
              </>
            )}

            <div className="pt-4 pb-1.5 px-2 text-[10px] font-bold text-white/20 uppercase tracking-widest flex items-center justify-between mt-1">
              <span>Recent</span>
              {chatSearchQuery && <span className="text-[9px] text-indigo-400 lowercase font-normal">Found {conversations.filter(c => !pinnedIds.includes(c.id) && c.title.toLowerCase().includes(chatSearchQuery.toLowerCase())).length}</span>}
            </div>
            
            {conversations
              .filter(c => !pinnedIds.includes(c.id))
              .filter(conv => conv.title.toLowerCase().includes(chatSearchQuery.toLowerCase()))
              .map((conv) => renderConversationItem(conv, false))}
          </div>

          <div className="pt-4 border-t border-white/5 space-y-1">
            {user && !isUpgraded && (
              <button 
                onClick={() => setShowUpgradeModal(true)}
                className="flex items-center gap-3 p-2 w-full text-left rounded-lg hover:bg-white/5 transition-all group"
              >
                <div className="w-6 h-6 bg-indigo-600/20 rounded-md flex items-center justify-center group-hover:bg-indigo-600/30">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                </div>
                <span className="text-sm">See plans and pricing</span>
              </button>
            )}
            <button 
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-3 p-2 w-full text-left rounded-lg hover:bg-white/5 transition-all text-white/60"
            >
              <Settings className="w-4 h-4 ml-1" />
              <span className="text-sm">Settings</span>
            </button>
            <button 
              onClick={() => setShowShortcutsModal(true)}
              className="flex items-center gap-3 p-2 w-full text-left rounded-lg hover:bg-white/5 transition-all text-white/60 group"
            >
              <Keyboard className="w-4 h-4 ml-1 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Shortcuts</span>
              <span className="ml-auto text-[9px] font-mono font-bold bg-white/10 px-1.5 py-0.5 rounded text-white/40">Ctrl+/</span>
            </button>

            <div className="pt-2">
              {user ? (
                <button onClick={handleLogout} className="flex items-center gap-3 p-2 w-full text-left rounded-lg hover:bg-white/5 transition-all group">
                   <img src={user.photoURL || ''} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                   <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.displayName}</p>
                   </div>
                   <LogOut className="w-4 h-4 text-white/20 group-hover:text-white/60" />
                </button>
              ) : (
                <div className="p-2 space-y-2">
                   <p className="text-[10px] text-white/30 px-2 leading-tight">Log in to save chats and unlock advanced features.</p>
                   <button onClick={signInWithGoogle} className="w-full py-2 px-3 bg-white text-black hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-600 hover:text-white text-sm font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] hover:scale-[1.02] active:scale-[0.98] border border-transparent hover:border-indigo-300/40">Log In</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.aside>

      <main className="gpt-main flex-1 flex flex-col relative">
        <header className={`absolute top-0 left-0 w-full h-14 flex items-center justify-between px-4 z-20 glass-header ${isScrolled ? 'scrolled border-b border-theme-border' : 'bg-transparent'}`}>
          <div className="flex items-center gap-2 relative" ref={gptDropdownRef}>
            <button 
              onClick={() => setShowGptDropdown(!showGptDropdown)} 
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all text-sm font-bold glass-button text-theme-text"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>{activeGem ? activeGem.name : 'OmniChat 4o'}</span>
              <ChevronDown className={`w-4 h-4 text-theme-muted transition-transform duration-200 ${showGptDropdown ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showGptDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="absolute top-full left-0 mt-2 w-72 rounded-2xl bg-theme-sidebar/95 backdrop-blur-2xl border border-white/15 shadow-[0_15px_35px_rgba(0,0,0,0.6)] p-2 z-50 flex flex-col gap-1"
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold text-theme-muted uppercase tracking-wider">
                    AI Models & Personas
                  </div>

                  {/* Default Model */}
                  <button
                    onClick={() => { setActiveGem(null); setShowGptDropdown(false); }}
                    className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-left transition-all text-sm ${!activeGem ? 'bg-indigo-600/20 text-white font-bold border border-indigo-500/30' : 'hover:bg-white/10 text-theme-text'}`}
                  >
                    <div className="p-2 bg-indigo-600 text-white rounded-lg">
                      <Bot size={16} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold truncate">OmniChat 4o</span>
                      <span className="text-[10px] text-theme-muted truncate">Default fast & intelligent AI</span>
                    </div>
                    {!activeGem && <CheckIcon size={14} className="ml-auto text-indigo-400" />}
                  </button>

                  <div className="my-1 border-t border-theme-border" />
                  <div className="px-3 py-1 text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                    Featured GPTs
                  </div>

                  {PREMADE_GPTS.map(gpt => {
                    const isActive = activeGem?.id === gpt.id;
                    return (
                      <button
                        key={gpt.id}
                        onClick={() => { setActiveGem(gpt); setShowGptDropdown(false); }}
                        className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-left transition-all text-sm ${isActive ? 'bg-indigo-600/20 text-white font-bold border border-indigo-500/30' : 'hover:bg-white/10 text-theme-text'}`}
                      >
                        <div className="p-2 bg-white/5 border border-white/10 text-indigo-400 rounded-lg shrink-0">
                          {gpt.iconName === 'Dumbbell' && <Dumbbell size={16} className="text-emerald-400" />}
                          {gpt.iconName === 'BookOpen' && <BookOpen size={16} className="text-purple-400" />}
                          {gpt.iconName === 'Code' && <Code size={16} className="text-blue-400" />}
                          {gpt.iconName === 'Feather' && <Feather size={16} className="text-amber-400" />}
                          {gpt.iconName === 'Languages' && <Languages size={16} className="text-pink-400" />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold truncate">{gpt.name}</span>
                          <span className="text-[10px] text-theme-muted truncate">{gpt.category}</span>
                        </div>
                        {isActive && <CheckIcon size={14} className="ml-auto text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })}

                  <div className="my-1 border-t border-theme-border" />

                  <button
                    onClick={() => { setShowGptDropdown(false); setShowGemManager(true); }}
                    className="flex items-center justify-center gap-2 w-full p-2 rounded-xl text-xs font-bold text-indigo-400 hover:bg-indigo-500/10 transition-all border border-indigo-500/20"
                  >
                    <Sparkles size={14} /> Explore & Build Custom GPTs...
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Header Workspace Mode Segmented Control */}
          <div className="hidden sm:flex items-center bg-white/5 border border-white/10 rounded-2xl p-1 gap-1">
            <button
              onClick={() => setAppMode('chat')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                appMode === 'chat' ? 'bg-indigo-600 text-white shadow-md' : 'text-theme-muted hover:text-theme-text'
              }`}
            >
              <MessageSquare size={13} />
              <span>Chat</span>
            </button>

            <button
              onClick={() => setAppMode('notebook')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                appMode === 'notebook' ? 'bg-indigo-600 text-white shadow-md' : 'text-theme-muted hover:text-theme-text'
              }`}
            >
              <BookOpen size={13} />
              <span>AI Notebook</span>
            </button>

            <button
              onClick={() => setAppMode('browser')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                appMode === 'browser' ? 'bg-indigo-600 text-white shadow-md' : 'text-theme-muted hover:text-theme-text'
              }`}
            >
              <Globe size={13} />
              <span>AI Browser</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
             {((user ? messages : demoMessages).length > 0) && (
               <button 
                 onClick={() => setShowExportModal(true)} 
                 className="px-3 py-1.5 glass-button flex items-center gap-1.5 text-xs text-theme-text font-bold rounded-xl"
                 title="Export Conversation"
                 id="export-chat-header-btn"
               >
                 <Download className="w-3.5 h-3.5 text-theme-muted" />
                 <span className="hidden sm:inline font-bold">Export</span>
               </button>
             )}
             {!user && (
               <>
                 <button onClick={signInWithGoogle} className="glass-button text-sm font-medium px-4 py-1.5 rounded-xl text-theme-text">Log in</button>
                 <button onClick={signInWithGoogle} className="glass-button-primary text-sm font-medium px-4 py-1.5 rounded-xl">Sign up for free</button>
               </>
             )}
             {user && (
               <button onClick={() => setShowLiveModal(true)} className="p-2 glass-button rounded-xl text-indigo-400 hover:text-indigo-300" title="Live mode">
                 <Zap className="w-5 h-5 text-indigo-400" />
               </button>
             )}
          </div>
        </header>

        {appMode === 'notebook' && (
          <div className="flex-1 h-full pt-14 flex flex-col overflow-hidden">
            <AINotebook
              user={user}
              onSendToChat={(prompt) => {
                setInput(prompt);
                setAppMode('chat');
              }}
              isUpgraded={!!profile?.isUpgraded}
            />
          </div>
        )}

        {appMode === 'browser' && (
          <div className="flex-1 h-full pt-14 flex flex-col overflow-hidden relative">
            <div className={`w-full h-full flex flex-col ${!user ? 'filter blur-md pointer-events-none select-none opacity-40' : ''}`}>
              <AIBrowser
                user={user}
                onSendToChat={(prompt) => {
                  setInput(prompt);
                  setAppMode('chat');
                }}
                onSaveToNotebook={() => {
                  setAppMode('notebook');
                }}
                defaultHomePage={profile?.browserDefaultHomePage || localStorage.getItem('omnichat_browser_homepage') || undefined}
                defaultSearchEngine={profile?.browserSearchEngine || (localStorage.getItem('omnichat_browser_searchengine') as any) || undefined}
              />
            </div>

            {!user && (
              <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
                <div className="max-w-md w-full p-8 rounded-3xl bg-[#171717]/95 border border-white/10 shadow-2xl backdrop-blur-2xl text-center space-y-6 animate-in fade-in zoom-in duration-300">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto shadow-inner">
                    <Globe size={32} />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      Signin to access AI Browser and other features
                    </h3>
                    <p className="text-xs text-white/50 leading-relaxed max-w-xs mx-auto">
                      Explore the web with real-time AI summarization, direct chat prompts, and seamless notebook saves.
                    </p>
                  </div>

                  <button
                    onClick={signInWithGoogle}
                    className="w-full py-3.5 px-6 bg-white text-black hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-600 hover:text-white font-bold rounded-2xl transition-all duration-300 shadow-xl hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 text-sm border border-transparent hover:border-indigo-300/40 group"
                  >
                    <UserIcon size={18} className="group-hover:scale-110 transition-transform" />
                    <span>Sign in with Google</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {appMode === 'chat' && (
          <>
            <div 
              ref={chatContainerRef}
          onScroll={handleChatScroll}
          className={`flex-1 overflow-y-auto ${isMobileOptimized ? 'px-2 pt-12 pb-32' : 'px-4 pt-14 pb-48'}`}
        >
          <div className={`${isMobileOptimized ? 'max-w-full space-y-4 mt-6 mx-auto md:max-w-2xl px-1' : 'max-w-3xl mx-auto space-y-8 mt-12'}`}>
            {(user ? messages : demoMessages).length === 0 && !isGenerating && (
              <div className="max-w-3xl mx-auto py-8 flex flex-col items-center text-center space-y-8 animate-fade-in select-text">
                <div className="flex flex-col items-center gap-2 justify-center mb-2">
                  <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/30 mb-2">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
                    {activeGem ? `Chatting with ${activeGem.name}` : 'What can I help with today?'}
                  </h1>
                  <p className="text-sm text-theme-muted max-w-md">
                    {activeGem ? activeGem.description : 'Select a specialized GPT persona or type any request below.'}
                  </p>
                </div>

                {/* Featured GPTs Section */}
                <div className="w-full text-left space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} /> Featured GPT Personas
                    </span>
                    <button
                      onClick={() => setShowGemManager(true)}
                      className="text-xs text-theme-muted hover:text-white transition-colors font-medium flex items-center gap-1"
                    >
                      View all custom GPTs →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {PREMADE_GPTS.map((gpt) => {
                      const isSelected = activeGem?.id === gpt.id;
                      return (
                        <div
                          key={gpt.id}
                          onClick={() => setActiveGem(gpt)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                            isSelected
                              ? 'bg-indigo-600/20 border-indigo-500 shadow-xl shadow-indigo-500/10'
                              : 'glass-button bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/[0.08]'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="p-2 bg-white/5 border border-white/10 rounded-xl">
                                {gpt.iconName === 'Dumbbell' && <Dumbbell size={18} className="text-emerald-400" />}
                                {gpt.iconName === 'BookOpen' && <BookOpen size={18} className="text-purple-400" />}
                                {gpt.iconName === 'Code' && <Code size={18} className="text-blue-400" />}
                                {gpt.iconName === 'Feather' && <Feather size={18} className="text-amber-400" />}
                                {gpt.iconName === 'Languages' && <Languages size={18} className="text-pink-400" />}
                              </div>
                              {isSelected && (
                                <span className="px-2 py-0.5 rounded-full bg-indigo-500 text-white text-[9px] font-bold uppercase tracking-wider">
                                  Active
                                </span>
                              )}
                            </div>
                            <h3 className="font-bold text-theme-text text-sm mb-1 group-hover:text-indigo-300 transition-colors">
                              {gpt.name}
                            </h3>
                            <p className="text-xs text-theme-muted line-clamp-2 mb-3">
                              {gpt.description}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-white/5 space-y-1">
                            <span className="text-[10px] text-indigo-400/80 font-bold block uppercase tracking-wider">Sample Prompt</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveGem(gpt);
                                setInput(gpt.samplePrompts?.[0] || '');
                                const inputEl = document.querySelector('textarea') || document.querySelector('input');
                                if (inputEl) inputEl.focus();
                              }}
                              className="text-[11px] text-theme-text/80 hover:text-white line-clamp-1 text-left font-medium hover:underline"
                            >
                              "{gpt.samplePrompts?.[0]}"
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="w-full text-left bg-white/5 border border-white/5 rounded-3xl p-6 space-y-4 shadow-xl backdrop-blur-xl">
                  <p className="text-sm text-theme-text font-bold flex items-center gap-2">
                    <Bot className="w-4 h-4 text-indigo-400" /> Capabilities & Multi-modal Features
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                      <h4 className="text-xs font-bold text-indigo-400">🏋️ Fitness & Wellness</h4>
                      <p className="text-[11px] text-theme-muted">Workout splits, macro counts, calorie planning, form checks.</p>
                    </div>

                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                      <h4 className="text-xs font-bold text-purple-400">📖 Storybook Creator</h4>
                      <p className="text-[11px] text-theme-muted">Craft stories with custom illustration prompts page by page.</p>
                    </div>

                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                      <h4 className="text-xs font-bold text-blue-400">⚡ Search & Live Voice</h4>
                      <p className="text-[11px] text-theme-muted">Web search grounding, voice synthesis & real-time audio interaction.</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      const inputEl = document.querySelector('textarea') || document.querySelector('input');
                      if (inputEl) inputEl.focus();
                    }}
                    className="px-8 py-3.5 glass-button-primary text-white rounded-2xl font-bold active:scale-95 transition-all text-sm flex items-center gap-2 group shadow-lg shadow-indigo-600/30"
                  >
                    Start messaging <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>
            )}
            
            {(user ? messages : demoMessages).map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id} className={`group py-1.5 ${isMobileOptimized ? 'w-full flex flex-col' : ''}`}>
                  {isMobileOptimized ? (
                    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full space-y-1`}>
                      <div className="flex items-center gap-1.5 px-1">
                        {!isUser && (
                          <div className="w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center shrink-0">
                            <Sparkles size={8} className="text-white"/>
                          </div>
                        )}
                        <span className="text-[10px] font-bold opacity-40">
                          {isUser ? (user?.displayName || 'You') : 'OmniChat'}
                        </span>
                      </div>

                      <div className={`relative px-3.5 py-2.5 rounded-2xl text-sm select-text break-words shadow-sm leading-relaxed ${
                        isUser 
                          ? 'bg-[#3b82f6]/20 border border-[#3b82f6]/30 text-white rounded-tr-sm max-w-[85%]' 
                          : 'bg-white/5 border border-white/5 text-[#ececec] rounded-tl-sm max-w-[85%]'
                      }`}>
                        {isUser && editingMessageId === msg.id ? (
                          <div className="w-full flex flex-col gap-2 p-1 min-w-[200px]">
                            <textarea
                              className="w-full min-h-[80px] bg-transparent text-sm text-white p-1 outline-none resize-y select-text font-normal placeholder-white/25 leading-relaxed"
                              value={editingMessageText}
                              onChange={(e) => setEditingMessageText(e.target.value)}
                              autoFocus
                            />
                            <div className="flex justify-end gap-1.5 pt-2 border-t border-white/5">
                              <button
                                onClick={() => setEditingMessageId(null)}
                                className="px-2.5 py-1 rounded text-[10px] font-bold text-white/50 hover:bg-white/5"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleEditPastMessage(msg.id, editingMessageText)}
                                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold text-white"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {isUser && (
                              <button
                                onClick={() => {
                                  setEditingMessageId(msg.id);
                                  setEditingMessageText(msg.content);
                                }}
                                className="absolute -left-6 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 hover:bg-white/5 rounded text-white/30 hover:text-white transition-all"
                                title="Edit prompt"
                              >
                                <Edit2 size={10} />
                              </button>
                            )}
                            <div className="prose prose-sm prose-invert select-text max-w-full">
                              <MarkdownRenderer content={msg.content} />
                            </div>
                          </>
                        )}

                        {msg.type === 'image' && msg.metadata?.imageUrl && (
                          <div className="mt-2 group/img relative inline-block max-w-full">
                            <img src={msg.metadata.imageUrl} className="rounded-xl border border-white/10 shadow-lg max-h-60 object-contain" referrerPolicy="no-referrer" />
                            <button 
                              onClick={() => { 
                                if (!user) { signInWithGoogle(); return; }
                                setEditingImage(msg.metadata!.imageUrl!); 
                                setGenerationType('edit'); 
                                setInput('Change something...'); 
                              }}
                              className="absolute bottom-2 right-2 flex items-center gap-2 px-3 py-1.5 bg-black/70 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-bold"
                            >
                               <Edit2 className="w-2.5 h-2.5" /> Edit
                            </button>
                          </div>
                        )}

                        {msg.type === 'video' && msg.metadata?.videoUrl && (
                          <div className="mt-2 group/vid relative inline-block max-w-full">
                            <video src={msg.metadata.videoUrl} controls className="rounded-xl border border-white/10 shadow-lg max-h-60" />
                            <button 
                              onClick={() => { 
                                if (!user) { signInWithGoogle(); return; }
                                setEditingVideo(msg.metadata!.videoUrl!); 
                                setGenerationType('edit_video'); 
                                setInput('Modify this video...'); 
                              }}
                              className="absolute bottom-10 right-2 flex items-center gap-2 px-3 py-1.5 bg-black/70 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-bold"
                            >
                               <Edit2 className="w-2.5 h-2.5" /> Edit
                            </button>
                          </div>
                        )}
                      </div>

                      {msg.role === 'model' && msg.type === 'text' && (
                        <div className="flex items-center gap-1.5 mt-0.5 px-1">
                          <button 
                            onClick={() => copyToClipboard(msg.content, msg.id)}
                            className="p-1 hover:bg-white/5 rounded-lg transition-colors text-white/30 hover:text-white"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? <CheckIcon size={12} className="text-green-400" /> : <Copy size={12} />}
                          </button>
                          <button 
                            onClick={() => shareMessage(msg.content)}
                            className="p-1 hover:bg-white/5 rounded-lg transition-colors text-white/30 hover:text-white"
                            title="Share"
                          >
                            <Share size={12} />
                          </button>
                          <button 
                            onClick={() => handleSpeak(msg.content, msg.id)}
                            className={`p-1 hover:bg-white/5 rounded-lg transition-colors ${activeSpeechId === msg.id ? 'text-indigo-400 animate-pulse' : 'text-white/30 hover:text-white'}`}
                            title={activeSpeechId === msg.id ? "Stop listening" : "Listen response"}
                          >
                            {activeSpeechId === msg.id ? <VolumeX size={12} /> : <Volume2 size={12} />}
                          </button>
                          <button 
                            onClick={() => handleRegenerateResponse(msg.id)}
                            className="p-1 hover:bg-white/5 rounded-lg transition-colors text-white/30 hover:text-white"
                            title="Regenerate"
                          >
                            <RotateCw size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-4 max-w-full">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1">
                        {isUser ? (
                          user?.photoURL ? <img src={user.photoURL} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" /> : <div className="w-full h-full bg-white/5 flex items-center justify-center rounded-full"><UserIcon size={14}/></div>
                        ) : (
                          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center"><Sparkles size={14} className="text-white"/></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 pt-1.5">
                        <p className="text-xs font-bold mb-1 opacity-80">{isUser ? (user?.displayName || 'You') : 'OmniChat'}</p>
                        
                        {isUser && editingMessageId === msg.id ? (
                          <div className="w-full flex flex-col gap-2 p-2 bg-white/5 border border-white/10 rounded-xl my-2 max-w-2xl">
                            <textarea
                              className="w-full min-h-[80px] bg-transparent text-sm text-white p-1 outline-none resize-y select-text font-normal placeholder-white/25 leading-relaxed"
                              value={editingMessageText}
                              onChange={(e) => setEditingMessageText(e.target.value)}
                              autoFocus
                            />
                            <div className="flex justify-end gap-1.5 pt-1.5 border-t border-white/5">
                              <button
                                onClick={() => setEditingMessageId(null)}
                                className="px-3 py-1 rounded text-xs font-semibold text-white/50 hover:bg-white/5"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleEditPastMessage(msg.id, editingMessageText)}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded"
                              >
                                Save & Submit
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="prose prose-sm select-text relative">
                            {isUser && (
                              <button
                                onClick={() => {
                                  setEditingMessageId(msg.id);
                                  setEditingMessageText(msg.content);
                                }}
                                className="absolute -left-10 top-0.5 p-1.5 bg-white/5 border border-white/5 hover:border-white/10 rounded-lg opacity-0 group-hover:opacity-100 text-white/40 hover:text-white transition-all duration-200 cursor-pointer"
                                title="Edit prompt"
                              >
                                <Edit2 size={13} />
                              </button>
                            )}
                            <MarkdownRenderer content={msg.content} />
                          </div>
                        )}

                        {msg.type === 'image' && msg.metadata?.imageUrl && (
                          <div className="mt-4 group/img relative inline-block">
                            <img src={msg.metadata.imageUrl} className="rounded-xl border border-white/10 shadow-2xl max-h-96 object-contain" referrerPolicy="no-referrer" />
                            <button 
                              onClick={() => { 
                                if (!user) { signInWithGoogle(); return; }
                                setEditingImage(msg.metadata!.imageUrl!); 
                                setGenerationType('edit'); 
                                setInput('Change something...'); 
                              }}
                              className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full text-xs font-bold opacity-0 group-hover/img:opacity-100 transition-all hover:bg-black/80"
                            >
                               <Edit2 className="w-3 h-3" /> Edit Image
                            </button>
                          </div>
                        )}

                        {msg.type === 'video' && msg.metadata?.videoUrl && (
                          <div className="mt-4 group/vid relative inline-block">
                            <video src={msg.metadata.videoUrl} controls className="rounded-xl border border-white/10 shadow-2xl max-h-96" />
                            <button 
                              onClick={() => { 
                                if (!user) { signInWithGoogle(); return; }
                                setEditingVideo(msg.metadata!.videoUrl!); 
                                setGenerationType('edit_video'); 
                                setInput('Modify this video...'); 
                              }}
                              className="absolute bottom-12 right-4 flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full text-xs font-bold opacity-0 group-hover/vid:opacity-100 transition-all hover:bg-black/80"
                            >
                               <Edit2 className="w-3 h-3" /> Edit Video
                            </button>
                          </div>
                        )}

                        {msg.role === 'model' && msg.type === 'text' && (
                          <div className="mt-4 flex items-center gap-1">
                            <button 
                              onClick={() => copyToClipboard(msg.content, msg.id)}
                              className="p-1.5 hover:bg-white/5 rounded-lg transition-colors group/btn text-white/40 hover:text-white"
                              title="Copy response"
                            >
                              {copiedId === msg.id ? <CheckIcon size={16} className="text-green-400" /> : <Copy size={16} />}
                            </button>
                            <button 
                              onClick={() => shareMessage(msg.content)}
                              className="p-1.5 hover:bg-white/5 rounded-lg transition-colors group/btn text-white/40 hover:text-white"
                              title="Share"
                            >
                              <Share size={16} />
                            </button>
                            <button 
                              onClick={() => handleSpeak(msg.content, msg.id)}
                              className={`p-1.5 hover:bg-white/5 rounded-lg transition-colors group/btn ${activeSpeechId === msg.id ? 'text-indigo-400 hover:text-indigo-300 animate-pulse' : 'text-white/40 hover:text-white'}`}
                              title={activeSpeechId === msg.id ? "Stop listening" : "Listen response"}
                            >
                              {activeSpeechId === msg.id ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                            <button 
                              onClick={() => handleRegenerateResponse(msg.id)}
                              className="p-1.5 hover:bg-white/5 rounded-lg transition-colors group/btn text-white/40 hover:text-white"
                              title="Regenerate choice"
                            >
                              <RotateCw size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
             {isGenerating && (
                <div className={`group py-2 ${isMobileOptimized ? 'w-full flex justify-start' : ''}`}>
                  {isMobileOptimized ? (
                    <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-2xl rounded-tl-none px-3.5 py-3 shadow-sm max-w-[85%]">
                      <div className="w-4.5 h-4.5 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                        <Sparkles size={10} className="text-white animate-pulse" />
                      </div>
                      <div className="flex gap-1 py-1">
                        <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4 max-w-full">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-1">
                        <Sparkles size={14} className="text-white animate-pulse"/>
                      </div>
                      <div className="flex-1 min-w-0 pt-3">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        <div className={`absolute bottom-0 left-0 w-full gpt-main transition-all duration-300 ${isMobileOptimized ? 'p-2 pb-3 mb-1' : 'p-4'}`}>
          <div className={`${isMobileOptimized ? 'max-w-full' : 'max-w-3xl mx-auto'} space-y-2 relative`}>
            {/* Floating Glass Scroll to Latest button when scrolled down */}
            <AnimatePresence>
              {isScrolled && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  className="flex justify-center -mt-10 mb-2 z-30"
                >
                  <button
                    onClick={scrollToBottom}
                    className="glass-button px-3.5 py-1.5 rounded-full text-xs font-bold text-theme-text flex items-center gap-1.5 shadow-xl border border-white/20 hover:border-white/40 backdrop-blur-2xl animate-pulse cursor-pointer"
                    title="Scroll to bottom"
                  >
                    <ChevronDown size={14} className="text-indigo-400" /> Scroll to latest
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-wrap gap-1.5 px-2">
              {activeGem && (
                <div className="glass-button bg-indigo-500/15 text-indigo-300 px-3 py-1 rounded-full text-[10px] font-bold border border-indigo-500/30 flex items-center gap-1.5 shadow-md">
                  <Sparkles size={10} className="text-indigo-400 animate-pulse" />
                  <span>GPT: {activeGem.name}</span>
                  <button 
                    onClick={() => setActiveGem(null)} 
                    className="p-0.5 hover:bg-white/20 rounded-full transition-colors text-indigo-200 hover:text-white"
                    title="Clear GPT persona"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}
              {attachedImage && (
                <div className="relative group">
                  <img src={attachedImage} className="w-12 h-12 object-cover rounded-lg border border-white/20" />
                  <button onClick={() => setAttachedImage(null)} className="absolute -top-2 -right-2 p-0.5 bg-black rounded-full border border-white/10"><X size={10}/></button>
                </div>
              )}
              {editingImage && <div className="glass-button bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full text-[10px] font-bold border border-orange-500/20 flex items-center gap-1"><Edit2 size={10}/> Editing Image</div>}
              {editingVideo && <div className="glass-button bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full text-[10px] font-bold border border-purple-500/20 flex items-center gap-1"><Edit2 size={10}/> Editing Video</div>}
              {generationType === 'video' && <div className="glass-button bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full text-[10px] font-bold border border-purple-500/20 flex items-center gap-1"><Video size={10}/> Make Video</div>}
              {generationType === 'image' && <div className="glass-button bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-[10px] font-bold border border-indigo-500/20 flex items-center gap-1"><ImageIcon size={10}/> Create Image</div>}
              {isSearchEnabled && <div className="glass-button bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-[10px] font-bold border border-blue-500/20 flex items-center gap-1"><Globe size={10}/> Search ON</div>}
              {isProMode && <div className="glass-button bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-[10px] font-bold border border-amber-500/20 flex items-center gap-1"><Zap size={10}/> Pro Mode</div>}
              {profile?.safeSearchEnabled && <div className="glass-button bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-[10px] font-bold border border-green-500/20 flex items-center gap-1"><Shield size={10}/> SafeSearch</div>}
            </div>

            <div className={`gpt-input-container glass-prompt-bar ${isScrolled ? 'scrolled' : ''} flex flex-col ${isMobileOptimized ? 'p-1 rounded-[1.5rem]' : 'p-2'}`}>
              <div className="flex items-end gap-1">
                <div className="flex items-center relative" ref={plusMenuRef}>
                   <button 
                    onClick={() => setShowPlusMenu(!showPlusMenu)}
                    className={`glass-button transition-all duration-300 ${showPlusMenu ? 'rotate-45 text-white bg-white/20 border-white/30' : 'text-theme-text'} ${isMobileOptimized ? 'p-2.5 rounded-xl' : 'p-3 rounded-xl'}`} title="Tools and attachments"
                   >
                     <Plus className="w-5 h-5" />
                   </button>

                   <AnimatePresence>
                     {showPlusMenu && (
                       <motion.div 
                         initial={{ opacity: 0, y: 10, scale: 0.95 }}
                         animate={{ opacity: 1, y: 0, scale: 1 }}
                         exit={{ opacity: 0, y: 10, scale: 0.95 }}
                         transition={{ duration: 0.12 }}
                         className="absolute bottom-full left-0 mb-3 w-64 rounded-2xl bg-theme-sidebar/90 backdrop-blur-2xl border border-white/15 shadow-[0_15px_35px_rgba(0,0,0,0.6)] p-2 z-50 flex flex-col gap-1"
                       >
                          <div className="px-3 py-2 text-[10px] font-bold text-theme-muted uppercase tracking-wider border-b border-theme-border mb-1 flex items-center justify-between">
                            <span>Tools & Attachment</span>
                            {!user && <span className="text-[9px] text-amber-400/80 normal-case lowercase font-medium">(Sign in required)</span>}
                          </div>

                          {/* 1. Upload file / image */}
                          <button 
                            onClick={() => {
                              setShowPlusMenu(false);
                              if (!user) {
                                signInWithGoogle();
                                return;
                              }
                              if (isUpgraded) {
                                fileInputRef.current?.click();
                              } else {
                                setShowUpgradeModal(true);
                              }
                            }}
                            className={`glass-button flex items-center gap-3 w-full p-2.5 rounded-xl text-left transition-all text-sm font-medium border-transparent ${
                              !user 
                                ? 'opacity-40 grayscale hover:opacity-75 bg-white/5 cursor-pointer' 
                                : 'hover:bg-white/10 text-theme-text'
                            }`}
                          >
                            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg backdrop-blur-md flex items-center justify-center">
                              {!user ? <Lock size={16} className="text-amber-400" /> : <Paperclip size={16} />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-theme-text">Attach Image/File</span>
                              <span className="text-[10px] text-theme-muted">
                                {!user ? 'Sign in required' : 'Analyze with Gemini'}
                              </span>
                            </div>
                          </button>

                          {/* 2. Create Image Toggle */}
                          <button 
                            onClick={() => {
                              setShowPlusMenu(false);
                              if (!user) {
                                signInWithGoogle();
                                return;
                              }
                              setGenerationType(prev => prev === 'image' ? 'text' : 'image');
                            }}
                            className={`glass-button flex items-center gap-3 w-full p-2.5 rounded-xl text-left transition-all text-sm font-medium border-transparent ${
                              !user 
                                ? 'opacity-40 grayscale hover:opacity-75 bg-white/5 cursor-pointer' 
                                : generationType === 'image' ? 'bg-indigo-600/20 text-indigo-400 font-bold border-indigo-500/30' : 'hover:bg-white/10 text-theme-text'
                            }`}
                          >
                            <div className={`p-2 rounded-lg backdrop-blur-md flex items-center justify-center ${!user ? 'bg-white/5 text-amber-400' : generationType === 'image' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-theme-muted'}`}>
                              {!user ? <Lock size={16} /> : <ImageIcon size={16} />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-theme-text">Create Image</span>
                              <span className="text-[10px] text-theme-muted">
                                {!user ? 'Sign in required' : 'Generate visual art'}
                              </span>
                            </div>
                            {user && generationType === 'image' && (
                              <div className="ml-auto w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                            )}
                          </button>

                          {/* 3. Make Video Toggle */}
                          <button 
                            onClick={() => {
                              setShowPlusMenu(false);
                              if (!user) {
                                signInWithGoogle();
                                return;
                              }
                              if (!isUpgraded) {
                                setShowUpgradeModal(true);
                                return;
                              }
                              setGenerationType(prev => prev === 'video' ? 'text' : 'video');
                            }}
                            className={`glass-button flex items-center gap-3 w-full p-2.5 rounded-xl text-left transition-all text-sm font-medium border-transparent ${
                              !user 
                                ? 'opacity-40 grayscale hover:opacity-75 bg-white/5 cursor-pointer' 
                                : generationType === 'video' ? 'bg-purple-600/20 text-purple-400 font-bold border-purple-500/30' : 'hover:bg-white/10 text-theme-text'
                            }`}
                          >
                            <div className={`p-2 rounded-lg backdrop-blur-md flex items-center justify-center ${!user ? 'bg-white/5 text-amber-400' : generationType === 'video' ? 'bg-purple-600 text-white' : 'bg-white/5 text-theme-muted'}`}>
                              {!user ? <Lock size={16} /> : <Video size={16} />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-theme-text">{isUpgraded ? 'Make Video' : 'Pro Video'}</span>
                              <span className="text-[10px] text-theme-muted">
                                {!user ? 'Sign in required' : 'Generate cinematic video'}
                              </span>
                            </div>
                            {user && generationType === 'video' && (
                              <div className="ml-auto w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                            )}
                          </button>

                          {/* 4. Search Toggle */}
                          <button 
                            onClick={() => {
                              setShowPlusMenu(false);
                              if (!user) {
                                signInWithGoogle();
                                return;
                              }
                              setIsSearchEnabled(!isSearchEnabled);
                            }}
                            className={`glass-button flex items-center gap-3 w-full p-2.5 rounded-xl text-left transition-all text-sm font-medium border-transparent ${
                              !user 
                                ? 'opacity-40 grayscale hover:opacity-75 bg-white/5 cursor-pointer' 
                                : isSearchEnabled ? 'bg-blue-600/20 text-blue-400 font-bold border-blue-500/30' : 'hover:bg-white/10 text-theme-text'
                            }`}
                          >
                            <div className={`p-2 rounded-lg backdrop-blur-md flex items-center justify-center ${!user ? 'bg-white/5 text-amber-400' : isSearchEnabled ? 'bg-blue-600 text-white' : 'bg-white/5 text-theme-muted'}`}>
                              {!user ? <Lock size={16} /> : <Globe size={16} />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-theme-text">Google Search</span>
                              <span className="text-[10px] text-theme-muted">
                                {!user ? 'Sign in required' : 'Grounding & facts'}
                              </span>
                            </div>
                            {user && isSearchEnabled && (
                              <div className="ml-auto w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                            )}
                          </button>

                          {/* 5. Pro Reasoning Toggle */}
                          <button 
                            onClick={() => {
                              setShowPlusMenu(false);
                              if (!user) {
                                signInWithGoogle();
                                return;
                              }
                              setIsProMode(!isProMode);
                            }}
                            className={`glass-button flex items-center gap-3 w-full p-2.5 rounded-xl text-left transition-all text-sm font-medium border-transparent ${
                              !user 
                                ? 'opacity-40 grayscale hover:opacity-75 bg-white/5 cursor-pointer' 
                                : isProMode ? 'bg-amber-600/20 text-amber-400 font-bold border-amber-500/30' : 'hover:bg-white/10 text-theme-text'
                            }`}
                          >
                            <div className={`p-2 rounded-lg backdrop-blur-md flex items-center justify-center ${!user ? 'bg-white/5 text-amber-400' : isProMode ? 'bg-amber-500 text-black' : 'bg-white/5 text-theme-muted'}`}>
                              {!user ? <Lock size={16} /> : <Zap size={16} />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-theme-text">Pro Reasoning</span>
                              <span className="text-[10px] text-theme-muted">
                                {!user ? 'Sign in required' : 'Deep analysis mode'}
                              </span>
                            </div>
                            {user && isProMode && (
                              <div className="ml-auto w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                            )}
                          </button>
                        </motion.div>
                     )}
                   </AnimatePresence>

                   <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                </div>

                <textarea
                  value={input}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInput(val);
                    const profanityPatterns = [
                      /\bf[u|*|0|v|k|x|q|w|i|a|e|c|s|t|z|y|u]*[c|k|q|x|z|u|v]+[k|q|x|z|u|v]?\b/i,
                      /fu[c|k]/i,
                      /\bs[h|*|!|1|i]t\b/i,
                      /\ba[s|$]{2,}\b/i,
                      /\bb[i|*|1|l|!]tch\b/i,
                      /\bd[a|*|4]mn\b/i,
                      /\bh[e|*|3]ll\b/i
                    ];

                    const threatPatterns = [
                      /\bi\s+(?:will|am\s+going\s+to|am\s+gonna|gonna|shall)\s+.*\b(?:kill|hurt|destroy|bomb|hack|attack|murder|injure|beat)\b/i,
                      /\bwatch\s+your\s+back\b/i,
                      /\bi\s+know\s+where\s+you\s+live\b/i,
                      /\byou\s+will\s+pay\b/i,
                      /\bi'm\s+coming\s+for\s+you\b/i
                    ];
                    
                    const cleanedText = val.toLowerCase().replace(/[^a-z0-9 ]/g, '');
                    const words = cleanedText.split(/\s+/);
                    
                    const hasViolation = profanityPatterns.some(pattern => pattern.test(val)) || 
                                        threatPatterns.some(pattern => pattern.test(val)) ||
                                        words.some(word => ['fuc', 'fck', 'shit', 'ass', 'bitch'].includes(word));
                    
                    setPromptPolicyError(hasViolation);
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' && !e.shiftKey) || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={isGenerating || isDemoLimitReached}
                  placeholder={
                    generationType === 'video' ? "Describe the video you want..." : 
                    generationType === 'image' ? "Describe the image you want..." : 
                    "Message OmniChat..."
                  }
                  className={`flex-1 bg-transparent border-none px-2 py-2.5 outline-none resize-none min-h-[44px] max-h-[160px] text-theme-text placeholder-theme-muted transition-all font-medium ${promptPolicyError ? 'text-red-400' : ''}`}
                  rows={1}
                />

                <div className="flex items-center pr-1.5 gap-1.5">
                   <button className={`glass-button text-theme-muted hover:text-theme-text rounded-xl ${isMobileOptimized ? 'hidden' : 'p-3'}`} title="Voice"><Mic size={18}/></button>
                   <button 
                    onClick={() => setShowLiveModal(true)}
                    className={`glass-button text-theme-text ${isMobileOptimized ? 'p-2 rounded-xl text-[10px]' : 'p-2.5 rounded-xl'}`}
                   >
                     <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/10 rounded-full border border-indigo-500/20 whitespace-nowrap">
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"/>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400">Voice</span>
                     </div>
                   </button>
                   <button
                    onClick={handleSend}
                    disabled={(!input.trim() && !attachedImage) || isGenerating || isDemoLimitReached}
                    className={`glass-button-primary rounded-xl transition-all ${isMobileOptimized ? 'p-2' : 'p-2.5'} disabled:opacity-20 disabled:scale-95`}
                    title="Send message"
                   >
                    <SendHorizontal size={16} />
                   </button>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-white/20 text-center pt-2">
              {isDemoLimitReached ? (
                <span className="text-indigo-400 font-bold animate-pulse cursor-pointer" onClick={signInWithGoogle}>Demo limit reached (7 messages). Sign in for unlimited access.</span>
              ) : "OmniChat can make mistakes. Check important info."}
            </div>
          </div>
        </div>
          </>
        )}
      </main>

      <AnimatePresence>{showLiveModal && <LiveModal onClose={() => setShowLiveModal(false)} />}</AnimatePresence>
      <AnimatePresence>
        {showUpgradeModal && (
          <UpgradeModal userId={user!.uid} onClose={() => setShowUpgradeModal(false)} onSuccess={() => { setIsUpgraded(true); setProfile(prev => prev ? {...prev, isUpgraded: true} : null); }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSettingsModal && (
          <SettingsModal 
            user={profile || {
              uid: '',
              displayName: 'Guest User',
              email: 'Signed Out',
              photoURL: '',
              isUpgraded: false
            }} 
            isSignedOut={!user}
            onSignIn={signInWithGoogle}
            onClose={() => setShowSettingsModal(false)} 
            onUpdate={(updatedData) => setProfile(prev => prev ? { ...prev, ...updatedData } : null)}
            currentMessages={user ? messages : demoMessages}
            conversations={conversations}
            currentChatTitle={conversations.find(c => c.id === activeId)?.title || (isDemoMode ? 'Demo Session' : 'New Chat')}
            customInstructions={customInstructions}
            onUpdateCustomInstructions={setCustomInstructions}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showGemManager && (
          <GemManager 
            onClose={() => setShowGemManager(false)} 
            onSelect={(gem) => { setActiveGem(gem); setShowGemManager(false); if (activeId) updateDoc(doc(db, 'conversations', activeId), { gemId: gem?.id || null }); }} 
            selectedGemId={activeGem?.id || null} 
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showShareModal && (
          <ShareModal content={shareContent} onClose={() => setShowShareModal(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showExportModal && (
          <ExportModal 
            messages={user ? messages : demoMessages} 
            title={conversations.find(c => c.id === activeId)?.title || 'OmniChat Conversation'}
            onClose={() => setShowExportModal(false)} 
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showShortcutsModal && (
          <KeyboardShortcutsModal onClose={() => setShowShortcutsModal(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {activeSpeechId && (
          <SpeechController
            activeSpeechId={activeSpeechId}
            isSpeechPaused={isSpeechPaused}
            speechRate={speechRate}
            speechVoice={speechVoice}
            availableVoices={availableVoices}
            onPauseResume={pauseResumeSpeech}
            onStop={stopSpeech}
            onRateChange={updateSpeechRate}
            onVoiceChange={updateSpeechVoice}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
