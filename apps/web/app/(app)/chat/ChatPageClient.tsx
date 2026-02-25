'use client';

const CHAT_INIT_STEP_TIMEOUT_MS = 15000;  // 15s per step (Stream API can be slow)
const CHAT_INIT_OVERALL_TIMEOUT_MS = 20000; // 20s hard timeout; show error instead of infinite "Connecting…"

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StreamChat } from 'stream-chat';
import { getPublicConfig, validatePublicConfig } from '../../../lib/config';
import { clearGuestUserId, isGuestUser } from '../../../lib/guestAuth';
import { useStableUserId } from '../../../lib/useStableUserId';
import { ChatInput } from '../../../components/chat/ChatInput';
import { SuggestionChips } from '../../../components/chat/SuggestionChips';
import { Avatar } from '../../../components/chat/Avatar';
import { AppNav } from '../../../components/navigation';
import { useToast } from '../../../components/ui/Toast';
import { useChatStore } from '../../../lib/chatStore';
import { Panel } from '../../../components/chat/Panel';
import { AssistantRenderer } from '../../../components/chat/AssistantRenderer';
import { safeParseAssistantContent } from '../../../lib/uiSchema';
import { CityModal } from '../../../components/chat/CityModal';
import { DatesModal } from '../../../components/chat/DatesModal';
import { BudgetModal } from '../../../components/chat/BudgetModal';

interface ChatPageProps {
  /** Pre-set message from feed "Ask Follow-up" (e.g. "Tell me more about: Explore Santorini") */
  initialFollowUpMessage?: string;
  /** Initial sessionId from URL */
  initialSessionId?: string;
}

export default function ChatPage({ initialFollowUpMessage: initialFollowUpMessageProp, initialSessionId: initialSessionIdProp }: ChatPageProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromUrlFollowUp = searchParams.get('followUp') || searchParams.get('message') || undefined;
  const fromUrlSessionId = searchParams.get('sessionId') || undefined;
  const initialFollowUpMessage = initialFollowUpMessageProp ?? fromUrlFollowUp;
  const initialSessionId = initialSessionIdProp ?? fromUrlSessionId;

  const { stableUserId, username, isReady } = useStableUserId();
  const config = getPublicConfig();
  const STREAM_API_KEY = config.streamApiKey;
  const API_URL = config.apiUrl;
  
  // Use full API URL for all fetch calls to ensure direct connection to backend
  // This avoids Next.js proxy issues and ensures CORS works correctly
  const API_BASE = API_URL;
  
  // Log API URL in development for debugging
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('[Chat] API Configuration:', {
      API_URL,
      API_BASE,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      windowLocation: window.location.origin,
    });
  }

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Core state
  const [client, setClient] = useState<StreamChat | null>(null);
  const [channel, setChannel] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [initStarted, setInitStarted] = useState(false); // true only after init effect actually starts; prevents spinner if init never ran
  const [envError, setEnvError] = useState<string | null>(() => validatePublicConfig());
  const [retryKey, setRetryKey] = useState(0); // increment to retry init without full reload
  const [apiReachable, setApiReachable] = useState<boolean | null>(null); // null = not checked yet
  const [apiCheckLoading, setApiCheckLoading] = useState(false);
  const { showToast, ToastComponent } = useToast();
  
  // Modal state
  const [activeModal, setActiveModal] = useState<'city' | 'dates' | 'budget' | null>(null);

  const checkApiManually = async () => {
    setApiCheckLoading(true);
    try {
      const res = await fetch('/api/healthz', { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      if (res.ok && data?.ok) {
        setApiReachable(true);
        showToast('API is running!', 'success');
      } else {
        setApiReachable(false);
        showToast(`API health check failed: ${data?.checks?.db === 'fail' ? 'Database not connected' : 'Server not responding'}`, 'error');
      }
    } catch (err: any) {
      setApiReachable(false);
      showToast(`Cannot reach API: ${err.message || 'Connection refused'}`, 'error');
    } finally {
      setApiCheckLoading(false);
    }
  };

  // Alias for stable identity (DO NOT swap mid-session; only changes on logout/login).
  const userId = stableUserId;

  const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Quick check if API is reachable (dev only)
  useEffect(() => {
    if (!isDev) return;
    let cancelled = false;
    
    // Try direct API URL first, then fallback to proxy
    const checkHealth = async () => {
      const healthUrls = [
        `${API_URL}/api/healthz`, // Direct API URL (preferred)
        '/api/healthz', // Next.js proxy (fallback)
      ];
      
      for (const url of healthUrls) {
        if (cancelled) return;
        try {
          const r = await fetch(url, { 
            signal: AbortSignal.timeout(3000),
            credentials: 'include',
          });
          if (cancelled) return;
          
          if (!r.ok) {
            console.warn(`[Chat] API healthz (${url}) returned non-ok:`, r.status);
            continue; // Try next URL
          }
          
          const data = await r.json();
          if (cancelled) return;
          
          if (data?.ok) {
            console.log(`[Chat] API is reachable via ${url}:`, data);
            setApiReachable(true);
            return; // Success, stop trying
          } else {
            console.warn(`[Chat] API healthz (${url}) ok=false:`, data);
            continue; // Try next URL
          }
        } catch (err) {
          if (cancelled) return;
          console.warn(`[Chat] API healthz check failed for ${url}:`, err);
          continue; // Try next URL
        }
      }
      
      // If we get here, all URLs failed
      if (!cancelled) {
        console.error('[Chat] All API healthz checks failed');
        setApiReachable(false);
      }
    };
    
    checkHealth();
    return () => { cancelled = true; };
  }, [isDev, retryKey, API_URL]);

  // Precheck logging on render
  if (typeof window !== 'undefined') {
    console.log('[Chat Precheck]', {
      hasStreamApiKey: !!STREAM_API_KEY,
      apiUrl: API_URL,
      envError: envError ?? null,
      isReady,
      userId: userId ?? null,
      username,
    });
    if (envError) {
      console.log('[Chat Precheck] envError present, validatePublicConfig:', validatePublicConfig());
    }
  }

  // Zustand chat store
  const messages = useChatStore((state) => state.messages);
  const tripState = useChatStore((state) => state.tripState);
  const addMessage = useChatStore((state) => state.addMessage);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const activePanel = useChatStore((state) => state.activePanel);
  const setActivePanel = useChatStore((state) => state.setActivePanel);
  const setResults = useChatStore((state) => state.setResults);
  const setTripState = useChatStore((state) => state.setTripState);
  const clearItinerary = useChatStore((state) => state.clearItinerary);
  const setSessionId = useChatStore((state) => state.setSessionId);
  const setLastSyncedAt = useChatStore((state) => state.setLastSyncedAt);
  const results = useChatStore((state) => state.results);
  const storedSessionId = useChatStore((state) => state.sessionId);
  const reset = useChatStore((state) => state.reset);
  
  // Scroll to bottom ref
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Track when history is loaded and chat is ready (for follow-up messages)
  const historyLoadedRef = useRef(false);
  const chatReadyRef = useRef(false);
  const initialFollowUpSentRef = useRef(false);
  
  // Create a ref to store handleSendMessage to avoid circular dependency
  const handleSendMessageRef = useRef<((text: string) => Promise<void>) | null>(null);
  
  // Handle "New chat" - clears local state and creates a new unique channel
  const handleNewChat = async () => {
    console.log('[Chat] Starting new chat');
    
    // Generate a unique sessionId for this new conversation FIRST
    // Format: ai-{userId}-{timestamp}-{random}
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const newSessionId = `ai-${userId}-${timestamp}-${random}`;
    
    // Clear channel refs to force re-initialization
    if (channelRef.current) {
      try {
        channelRef.current.off();
      } catch (e) {
        // Ignore errors
      }
      channelRef.current = null;
    }
    
    // Clear channel state to force new channel creation
    setChannel(null);
    
    // Clear local chat store (but preserve sessionId - we'll set it after)
    // Don't call reset() as it clears sessionId - manually clear what we need
    useChatStore.setState({
      messages: [],
      activePanel: 'none',
      tripState: {},
      results: {},
      lastSyncedAt: undefined,
    });
    
    // Set the new sessionId in the store FIRST
    setSessionId(newSessionId);
    
    // Update URL using pushState (same approach as conversation selection)
    // This avoids navigation that could disconnect the Stream client
    // The initialization will use the sessionId from the store (currentStoredSessionId)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('sessionId', newSessionId);
      window.history.pushState({}, '', url.toString());
    }
    
    // Trigger re-initialization - this will create the new channel
    // The useEffect will see the new sessionId in the store and create a new channel
    // We increment retryKey to force re-initialization even if other deps haven't changed
    setRetryKey((k) => k + 1);
    
    console.log('[Chat] New chat initialized with sessionId:', newSessionId);
  };
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle UI events from AssistantRenderer
  const handleUIEventCallback = useCallback(async (eventName: string, payload?: any) => {
    console.log('[UI_ACTION_CLICK]', { eventName, payload });
    
    try {
      // Handle open_modal event - open the appropriate modal
      if (eventName === 'open_modal' && payload?.modalType) {
        console.log('[UI_ACTION] Opening modal:', payload.modalType);
        setActiveModal(payload.modalType as 'city' | 'dates' | 'budget');
        return;
      }
      
      // Handle send_message event - directly send message to chat
      if (eventName === 'send_message' && payload?.message) {
        const messageToSend = payload.message;
        console.log('[UI_ACTION_SEND_MESSAGE]', messageToSend);
        
        // Use ref to call handleSendMessage if available
        if (handleSendMessageRef.current) {
          await handleSendMessageRef.current(messageToSend);
          return;
        } else {
          console.warn('[UI_ACTION] handleSendMessage not yet available, message will be lost');
          // Fallback: try to find and use the send message function
          // This should not happen in normal flow, but provides a safety net
          return;
        }
      }

      // When generating itinerary: clear previous itinerary first so old flights/hotels don't pollute
      if (eventName === 'generate_itinerary' || eventName === 'create_itinerary' || eventName === 'plan_trip') {
        clearItinerary();
      }
      const body: Record<string, unknown> = {
        name: eventName,
        payload: payload ?? {},
      };
      // Pass tripState for generate_itinerary and save_trip_profile so API can derive params
      if (eventName === 'generate_itinerary' || eventName === 'create_itinerary' || eventName === 'plan_trip' || eventName === 'save_trip_profile') {
        body.tripState = tripState && Object.keys(tripState).length > 0 ? tripState : undefined;
      }
      const response = await fetch('/api/chat/ui/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add assistant reply message
        if (data.reply) {
          const replyId = crypto.randomUUID();
          addMessage({
            id: replyId,
            role: 'assistant',
            content: data.reply,
            createdAt: Date.now(),
          });
        }
        
        // Set active panel
        if (data.panel) {
          setActivePanel(data.panel);
        }
        
        // Set results (exclude tripState - it goes to tripState store)
        if (data.data) {
          const { tripState: ts, ...rest } = data.data;
          setResults(rest);
          if (ts) setTripState(ts);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to process UI event');
      }
    } catch (error) {
      console.error('[Chat] Error handling UI event:', error);
      
      // Append error message to chat
      const errorId = crypto.randomUUID();
      addMessage({
        id: errorId,
        role: 'assistant',
        content: error instanceof Error 
          ? `I apologize, but I encountered an error: ${error.message}. Please try again.`
          : 'I apologize, but I encountered an error processing your request. Please try again.',
        createdAt: Date.now(),
      });
    }
  }, [addMessage, setActivePanel, setResults, setTripState, clearItinerary, tripState]);
  
  // Guard against StrictMode double-run for handleSendMessage
  const sendingRef = useRef<Set<string>>(new Set()); // Track clientIds being sent
  const pendingAssistantRef = useRef<Set<string>>(new Set()); // Track pending assistant message IDs
  
  // Singleton StreamChat client - created once and reused
  const streamClientRef = useRef<StreamChat | null>(null);
  const connectedUserIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const initializingRef = useRef(false);
  const initRunIdRef = useRef(0);
  const initStartedRef = useRef(false); // true only after we actually start init (setIsConnecting(true)); prevents spinner if init never ran
  const abortRef = useRef<AbortController | null>(null);
  const channelRef = useRef<any>(null);
  const messageHandlerRef = useRef<((event: any) => void) | null>(null);
  const typingStartHandlerRef = useRef<(() => void) | null>(null);
  const typingStopHandlerRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);
  // Ensure isMountedRef is set correctly on mount/unmount
  useEffect(() => {
    isMountedRef.current = true;
    console.log('[Chat] Component mounted, isMountedRef set to true');
    return () => {
      isMountedRef.current = false;
      console.log('[Chat] Component unmounting, isMountedRef set to false');
    };
  }, []);
  // Strict-mode guard: prevent connectUser running twice for same user
  const initLockRef = useRef(false);
  const initUserRef = useRef<string | null>(null);

  const withInitTimeout = useCallback(<T,>(promise: Promise<T>, label: string): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`${label} timed out after ${CHAT_INIT_STEP_TIMEOUT_MS}ms`)),
          CHAT_INIT_STEP_TIMEOUT_MS
        )
      ),
    ]);
  }, []);

  // When stableUserId changes (logout/login), reset chat state and optionally clear guest id.
  const previousStableUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (stableUserId == null) return;
    const prev = previousStableUserIdRef.current;
    if (prev !== null && prev !== stableUserId) {
      console.log('[Chat] User changed, resetting chat state', { previousUserId: prev, newUserId: stableUserId });
      if (isGuestUser(prev) && !isGuestUser(stableUserId)) {
        clearGuestUserId();
      }
      useChatStore.getState().reset();
    }
    previousStableUserIdRef.current = stableUserId;
  }, [stableUserId]);

  // When destination changes, clear previous itinerary so old flights/hotels don't pollute
  const prevDestinationRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const dest = tripState?.destination?.trim?.();
    const prev = prevDestinationRef.current;
    if (prev !== undefined && dest !== prev && dest) {
      clearItinerary();
    }
    prevDestinationRef.current = dest;
  }, [tripState?.destination, clearItinerary]);

  // AI-only chat: Always use ai-{userId} channel
  // No channel selection, no URL params, no multi-room UI

  // Sync refs to state when they're set (for React StrictMode compatibility)
  useEffect(() => {
    if (streamClientRef.current && channelRef.current && !client && !channel) {
      console.log('[Chat Sync] Syncing refs to state');
      setClient(streamClientRef.current);
      setChannel(channelRef.current);
      setIsConnecting(false);
    }
  }, [client, channel]);

  // Initialize Stream Chat - Single connectUser per stable identity; strict-mode safe; clean reconnect on userId change
  useEffect(() => {
    if (!STREAM_API_KEY || !stableUserId) {
      if (!STREAM_API_KEY && isMountedRef.current) {
        console.error('[Chat Init] Missing STREAM_API_KEY');
        setEnvError('Stream API key is not configured. Please check your environment variables.');
      }
      if (!stableUserId) console.error('[Chat Init] Missing stableUserId (isReady may be false)');
      return;
    }

    const userId = stableUserId;
    const currentInitialSessionId = initialSessionId; // Capture from props

    // Strict-mode guard: do not run init twice for the same user in parallel
    if (initLockRef.current && initUserRef.current === userId) {
      console.log('[Chat Init] Init already in progress for this user (strict-mode guard), skipping');
      return;
    }

    const existingClient = streamClientRef.current;
    const existingUserId = connectedUserIdRef.current;
    const streamClientUserId = existingClient?.userID;

    // Check if we need to create a new channel (new sessionId) or reuse existing
    // IMPORTANT: Preserve existing sessionId if we have a follow-up message (don't reset session)
    const currentStoredSessionId = useChatStore.getState().sessionId;
    const urlSessionId = initialSessionId;
    // If we have a follow-up message, prefer existing sessionId to continue conversation
    // Only use URL sessionId if explicitly provided, otherwise keep existing
    const targetSessionId = urlSessionId || (initialFollowUpMessage ? currentStoredSessionId : null) || currentStoredSessionId;
    const existingChannelId = channelRef.current?.id;
    
    // If user is already connected AND we're using the same channel, skip re-initialization
    if (existingUserId === userId && streamClientUserId === userId && channelRef.current && existingChannelId === targetSessionId) {
      console.log('[Chat Init] Already connected as same user with same channel, skipping reconnect');
      if (isMountedRef.current) {
        setClient(existingClient);
        setChannel(channelRef.current);
        setIsConnecting(false);
      }
      return;
    }
    
    // If we have a different sessionId, we need to create a new channel
    // But keep the Stream client connected (don't disconnect/reconnect)
    if (existingChannelId && existingChannelId !== targetSessionId) {
      console.log('[Chat Init] SessionId changed, will create new channel:', { existingChannelId, targetSessionId });
      // Clear the old channel ref to force new channel creation
      if (channelRef.current) {
        try {
          channelRef.current.off();
        } catch (e) {
          // Ignore errors
        }
        channelRef.current = null;
      }
      // Clear channel state but keep client connected
      setChannel(null);
    }

    if (initializingRef.current) {
      console.log('[Chat Init] Initialization already in flight, skipping');
      return;
    }

    initializingRef.current = true;
    initLockRef.current = true;
    initUserRef.current = userId;
    const runId = ++initRunIdRef.current;

    const prevAbort = abortRef.current;
    if (prevAbort) {
      console.log('[Chat Init] Aborting previous initialization');
      prevAbort.abort();
      abortRef.current = null;
    }
    const abortController = new AbortController();
    abortRef.current = abortController;
    console.log('[Chat Init] Created new AbortController, aborted:', abortController.signal.aborted);

    const isStale = () => runId !== initRunIdRef.current;
    let overallTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const clearOverallTimeout = () => {
      if (overallTimeoutId) {
        clearTimeout(overallTimeoutId);
        overallTimeoutId = null;
      }
    };
    const finishWithError = (message: string) => {
      clearOverallTimeout();
      if (isMountedRef.current) {
        setEnvError(message);
        setIsConnecting(false);
      }
      initializingRef.current = false;
      initLockRef.current = false;
    };
    const finishSilent = () => {
      clearOverallTimeout();
      if (isMountedRef.current) setIsConnecting(false);
      initializingRef.current = false;
      initLockRef.current = false;
    };

    console.log('[Chat Init] Starting initialization for userId:', userId, 'runId:', runId);

    const initializeChat = async () => {
      console.log('[Chat Init] initializeChat() called, checking preconditions...');
      const preconditions = {
        isMounted: isMountedRef.current,
        hasUserId: !!userId,
        userId,
        aborted: abortController.signal.aborted,
      };
      console.log('[Chat Init] Preconditions:', preconditions);
      // Only check userId and abortController - isMountedRef is checked before state updates
      if (!userId || abortController.signal.aborted) {
        console.error('[Chat Init] Precondition check FAILED:', preconditions);
        finishSilent();
        return;
      }
      console.log('[Chat Init] Preconditions OK, proceeding...');
      console.log('[Chat Init] Preconditions OK, setting connecting state...');
      if (isMountedRef.current) {
        setInitStarted(true);
        initStartedRef.current = true;
        setIsConnecting(true);
      }
      console.log('[Chat Init] Starting async initialization steps...');

      overallTimeoutId = setTimeout(() => {
        if (initializingRef.current && isMountedRef.current) {
          const currentClient = streamClientRef.current;
          console.error('[Chat Init] Overall timeout reached after', CHAT_INIT_OVERALL_TIMEOUT_MS, 'ms, aborting');
          console.error('[Chat Init] Current state:', {
            hasClient: !!currentClient,
            hasToken: !!tokenRef.current,
            hasChannel: !!channelRef.current,
            userId: currentClient?.userID,
            connectionID: (currentClient as any)?.connectionID,
          });
          abortController.abort();
          finishWithError(`Connection timed out (${CHAT_INIT_OVERALL_TIMEOUT_MS / 1000} seconds). Check browser console for details. API is running (test at /test-chat-api).`);
        }
      }, CHAT_INIT_OVERALL_TIMEOUT_MS);

      try {
        let streamClient = streamClientRef.current;
        if (!streamClient) {
          streamClient = StreamChat.getInstance(STREAM_API_KEY);
          streamClientRef.current = streamClient;
        }

        const currentStreamUserId = streamClient.userID;
        const connectionID = (streamClient as any).connectionID;
        const hasToken = !!tokenRef.current;
        // Check if already connected (don't require token in check, we'll refresh if needed)
        const isAlreadyConnected = currentStreamUserId === userId && connectionID != null && connectedUserIdRef.current === userId;
        
        if (isAlreadyConnected) {
          console.log('[Chat Init] Already connected as same user (connectionID exists)');
          if (!hasToken) {
            console.warn('[Chat Init] Connected but missing token, refreshing token');
            // Refresh token without disconnecting
            const tokenResponse = await withInitTimeout(
              fetch(`${API_BASE || API_URL}/api/stream/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, username }),
                credentials: 'include',
                signal: abortController.signal,
              }),
              'Token refresh'
            );
            if (!tokenResponse.ok) {
              throw new Error(`Failed to refresh Stream token: ${tokenResponse.status}`);
            }
            const tokenData = await tokenResponse.json();
            if (!tokenData.token) throw new Error('Invalid token response from server');
            tokenRef.current = tokenData.token;
            console.log('[Chat Init] Token refreshed for existing connection');
          } else {
            console.log('[Chat Init] Skipping connectUser - already connected with valid token');
          }
        } else {
          if (currentStreamUserId != null && currentStreamUserId !== userId) {
            console.log('[Chat Init] Connected to different user, disconnecting first', {
              current: currentStreamUserId,
              target: userId,
            });
            try {
              console.log('[Chat Init] Calling disconnectUser()...');
              console.time('Chat Init: disconnectUser');
              const disconnectPromise = streamClient.disconnectUser();
              const disconnectTimeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('disconnectUser timeout after 3s')), 3000)
              );
              await Promise.race([disconnectPromise, disconnectTimeout]);
              console.timeEnd('Chat Init: disconnectUser');
              console.log('[Chat Init] disconnectUser completed, waiting for userID to clear...');
              let retries = 0;
              while (streamClient.userID != null && retries < 30 && !abortController.signal.aborted) {
                await new Promise((r) => setTimeout(r, 100));
                retries++;
              }
              if (streamClient.userID && streamClient.userID !== userId) {
                console.warn('[Chat Init] Disconnect timeout, forcing userID clear');
                (streamClient as any).userID = null;
              }
              connectedUserIdRef.current = null;
              tokenRef.current = null;
              if (channelRef.current) {
                try {
                  channelRef.current.off();
                } catch (_) {}
                channelRef.current = null;
              }
              console.log('[Chat Init] Disconnect cleanup complete');
            } catch (err: any) {
              console.timeEnd('Chat Init: disconnectUser');
              console.error('[Chat Init] Error during disconnect:', err);
              // Force clear even if disconnect failed
              connectedUserIdRef.current = null;
              tokenRef.current = null;
              if (err?.message?.includes('timeout')) {
                console.warn('[Chat Init] Disconnect timed out, forcing clear');
                (streamClient as any).userID = null;
              }
            }
          }

          if (abortController.signal.aborted || isStale()) {
            finishSilent();
            return;
          }

          console.log('[Chat Init] Step 1: fetch token');
          console.time('Chat Init: token');
          let tokenResponse: Response;
          try {
            tokenResponse = await withInitTimeout(
              fetch(`${API_BASE || API_URL}/api/stream/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, username }),
                credentials: 'include',
                signal: abortController.signal,
              }),
              'Token fetch'
            );
          } catch (fetchError: any) {
            console.timeEnd('Chat Init: token');
            if (fetchError.name === 'AbortError' || isStale()) {
              finishSilent();
              return;
            }
            if (fetchError?.message?.includes('timed out')) {
              finishWithError('Timed out connecting to chat. Check API/Stream keys.');
              return;
            }
            // Provide more specific error message for fetch failures
            const errorMsg = fetchError?.message || 'Failed to fetch';
            if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
              throw new Error(`Cannot connect to API server at ${API_BASE || API_URL}. ${process.env.NODE_ENV === 'production' ? 'Check your NEXT_PUBLIC_API_URL environment variable.' : 'Make sure the API server is running.'}`);
            }
            throw fetchError;
          }
          console.timeEnd('Chat Init: token');
          console.log('[Chat Init] Token response status:', tokenResponse.status);

          if (isStale()) {
            finishSilent();
            return;
          }
          if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('[Chat Init] Token request failed:', tokenResponse.status, errorText);
            throw new Error(`Failed to get Stream token: ${tokenResponse.status} ${errorText}`);
          }
          const tokenData = await tokenResponse.json();
          if (!tokenData.token) throw new Error('Invalid token response from server');
          const { token } = tokenData;
          tokenRef.current = token;

          if (abortController.signal.aborted || isStale()) {
            finishSilent();
            return;
          }

          const hasConnection = (streamClient as any).connectionID != null;
          if (streamClient.userID === userId && hasConnection) {
            console.log('[Chat Init] Already connected to userId (connectionID exists), skipping connectUser');
            connectedUserIdRef.current = userId;
          } else {
            console.log('[Chat Init] Step 2: connectUser');
            console.log('[Chat Init] connectUser params:', { userId, username, hasToken: !!token, tokenLength: token?.length });
            console.time('Chat Init: connectUser');
            try {
              const connectPromise = streamClient.connectUser({ id: userId, name: username }, token);
              console.log('[Chat Init] connectUser promise created, waiting...');
              await withInitTimeout(connectPromise, 'connectUser');
              console.log('[Chat Init] connectUser completed successfully');
            } catch (connectErr: any) {
              console.timeEnd('Chat Init: connectUser');
              console.error('[Chat Init] connectUser error:', connectErr);
              if (connectErr?.message?.includes('timed out')) {
                finishWithError('Timed out connecting to Stream Chat. Check NEXT_PUBLIC_STREAM_API_KEY and network connection.');
                return;
              }
              throw connectErr;
            }
            console.timeEnd('Chat Init: connectUser');
            connectedUserIdRef.current = userId;
          }
        }

        if (abortController.signal.aborted || isStale()) {
          finishSilent();
          return;
        }

        console.log('[Chat Init] Step 3: fetch companion channel');
        console.time('Chat Init: companion channel');
        
        // Get sessionId from props (URL), stored state, or generate new one for new chat
        const currentStoredSessionId = useChatStore.getState().sessionId;
        // If we have a follow-up message, preserve existing sessionId to continue conversation
        // Otherwise, use URL sessionId or stored sessionId
        let sessionIdToUse = currentInitialSessionId || (initialFollowUpMessage ? currentStoredSessionId : null) || currentStoredSessionId;
        
        // If no sessionId exists, generate a new one for this conversation
        if (!sessionIdToUse) {
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(2, 9);
          sessionIdToUse = `ai-${userId}-${timestamp}-${random}`;
          // Store it in the store
          useChatStore.getState().setSessionId(sessionIdToUse);
          console.log('[Chat Init] Generated new sessionId:', sessionIdToUse);
        }
        
        let channelResponse: Response;
        try {
            channelResponse = await withInitTimeout(
              fetch(`${API_BASE || API_URL}/api/companion/channel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  userId,
                  ...(sessionIdToUse ? { sessionId: sessionIdToUse } : {})
                }),
                credentials: 'include',
                signal: abortController.signal,
              }),
              'Companion channel fetch'
            );
        } catch (fetchError: any) {
          console.timeEnd('Chat Init: companion channel');
          if (fetchError.name === 'AbortError' || isStale()) {
            finishSilent();
            return;
          }
          if (fetchError?.message?.includes('timed out')) {
            finishWithError('Timed out connecting to chat. Check API/Stream keys.');
            return;
          }
          // Provide more specific error message for fetch failures
          const errorMsg = fetchError?.message || 'Failed to fetch';
          if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('fetch failed')) {
            throw new Error(`Cannot connect to API server at ${API_BASE || API_URL}. ${process.env.NODE_ENV === 'production' ? 'Check your NEXT_PUBLIC_API_URL environment variable.' : 'Make sure the API server is running.'}`);
          }
          throw fetchError;
        }
        console.timeEnd('Chat Init: companion channel');
        console.log('[Chat Init] Companion channel response status:', channelResponse.status);

        if (isStale()) {
          finishSilent();
          return;
        }
        if (!channelResponse.ok) {
          const errorText = await channelResponse.text();
          throw new Error(`Failed to get companion channel: ${channelResponse.status} ${errorText}`);
        }
        const channelData = await channelResponse.json();
        if (!channelData.channelId) throw new Error('Invalid channel response from server');
        const channelId = channelData.channelId;
        
        // Validate channelId starts with ai-{userId} for security
        if (!channelId.startsWith(`ai-${userId}`)) {
          throw new Error(`Invalid channel ID: ${channelId} (must start with ai-${userId})`);
        }
        
        console.log('[Chat Init] Using channelId:', channelId);
        
        // IMPORTANT: Set sessionId in store BEFORE loading history (for follow-up messages)
        // This ensures history loads for the correct conversation
        setSessionId(channelId);
        
        const channelType = 'messaging';

        if (channelRef.current) {
          try {
            channelRef.current.off();
          } catch (_) {}
          messageHandlerRef.current = null;
          typingStartHandlerRef.current = null;
          typingStopHandlerRef.current = null;
        }

        if (abortController.signal.aborted || isStale()) {
          finishSilent();
          return;
        }

        const channelInstance = streamClient.channel(channelType, channelId);
        console.log('[Chat Init] Step 4: channel.watch');
        console.log('[Chat Init] channel.watch params:', { channelType, channelId, hasClient: !!streamClient, connectionID: (streamClient as any).connectionID });
        console.time('Chat Init: channel.watch');
        try {
          const watchPromise = channelInstance.watch();
          console.log('[Chat Init] channel.watch promise created, waiting...');
          await withInitTimeout(watchPromise, 'channel.watch');
          console.log('[Chat Init] channel.watch completed successfully');
        } catch (watchErr: any) {
          console.timeEnd('Chat Init: channel.watch');
          console.error('[Chat Init] channel.watch error:', watchErr);
          if (watchErr?.message?.includes('timed out')) {
            finishWithError('Timed out watching channel. Check NEXT_PUBLIC_STREAM_API_KEY and network connection.');
            return;
          }
          throw watchErr;
        }
        console.timeEnd('Chat Init: channel.watch');

        channelRef.current = channelInstance;
        setSessionId(channelId);
        console.log('[Chat Init] Channel ready, sessionId stored:', channelId);

        if (isStale()) {
          finishSilent();
          return;
        }

        // IMPORTANT: Set sessionId in store BEFORE loading history (for follow-up messages)
        // This ensures history loads for the correct conversation
        setSessionId(channelId);
        console.log('[Chat Init] Channel ready, sessionId stored:', channelId);

        const currentStore = useChatStore.getState();
        const currentStoreIds = new Set(currentStore.messages.map(m => m.id));

        // Load chat history from Postgres first, then Stream Chat (non-blocking - don't fail if it errors)
        // Use the channelId (sessionId) that was just set in the store
        const currentSessionId = useChatStore.getState().sessionId || channelId;
        
        if (currentStore.messages.length === 0) {
          console.log('[Chat Init] Step 5: Loading chat history from Postgres and Stream');
          console.time('Chat Init: loadHistory');
          
          // Load from Postgres first
          try {
            const historyResponse = await fetch(
              `${API_BASE || API_URL}/api/chat/history?userId=${userId}&conversationId=${currentSessionId}&limit=50`,
              { 
                signal: AbortSignal.timeout(5000),
                credentials: 'include',
              }
            );
            
            if (historyResponse.ok) {
              const historyData = await historyResponse.json();
              const postgresMessages = historyData.messages || [];
              
              if (postgresMessages.length > 0) {
                console.log(`[Chat Init] Loaded ${postgresMessages.length} messages from Postgres`);
                
                // Convert Postgres messages to frontend format
                postgresMessages.forEach((msg: any) => {
                  // Skip if already in store
                  if (currentStoreIds.has(msg.id)) {
                    return;
                  }

                  const frontendMessage = {
                    id: msg.id,
                    role: msg.role as 'user' | 'assistant',
                    content: msg.ui 
                      ? JSON.stringify({ text: msg.message || '', ui: msg.ui })
                      : msg.message || '',
                    createdAt: new Date(msg.createdAt).getTime(),
                    meta: msg.ui ? { ui: msg.ui } : undefined,
                  };

                  currentStore.addMessage(frontendMessage);
                  currentStoreIds.add(msg.id);
                });
              }
            }
          } catch (postgresError) {
            console.warn('[Chat Init] Failed to load history from Postgres (non-fatal):', postgresError);
          }

          // Also load from Stream Chat as fallback/supplement
          try {
            const state = await withInitTimeout(
              channelInstance.query({ messages: { limit: 50 } }),
              'channel.query'
            );
            
            if (isStale()) {
              finishSilent();
              return;
            }

            const streamMessages = (state.messages || []) as any[];
            
            if (streamMessages.length > 0) {
              // Convert Stream messages to frontend format
              streamMessages.forEach((msg: any) => {
                // Skip if already in store (from Postgres)
                if (currentStoreIds.has(msg.id)) {
                  return;
                }

                const isAI = msg.user?.id === 'gepanda_ai' || msg.user?.id === 'ai_companion';
                
                // Extract UI spec from attachments
                const uiSpec = msg.attachments?.find((att: any) => att.type === 'ui_spec')?.ui_spec;
                
                // Convert to frontend format
                const frontendMessage = {
                  id: msg.id,
                  role: isAI ? 'assistant' as const : 'user' as const,
                  content: uiSpec 
                    ? JSON.stringify({ text: msg.text || '', ui: uiSpec })
                    : msg.text || '',
                  createdAt: msg.created_at ? new Date(msg.created_at).getTime() : Date.now(),
                  meta: uiSpec ? { ui: uiSpec } : undefined,
                };

                currentStore.addMessage(frontendMessage);
              });

              console.log(`[Chat Init] Loaded ${streamMessages.length} messages from Stream history`);
            } else {
              console.log('[Chat Init] No history found in Stream (new chat)');
            }
          } catch (historyErr: any) {
            // Non-blocking: log error but don't fail initialization
            console.warn('[Chat Init] Error loading history from Stream (non-blocking):', historyErr);
            if (isDev && historyErr?.message?.includes('timed out')) {
              showToast('Could not load chat history. Starting fresh.', 'info');
            }
          }
          console.timeEnd('Chat Init: loadHistory');
          
          // Mark history as loaded (even if empty or error - chat is ready)
          historyLoadedRef.current = true;
        } else {
          console.log('[Chat Init] Store already has messages, skipping history load');
          // If store already has messages, history is effectively loaded
          historyLoadedRef.current = true;
        }

        // Create event handlers (stored in refs for cleanup)
        // Listen to message.new events for both user and assistant messages from Stream
        // Backend posts both messages to Stream, so we listen for them
        const messageHandler = (event: any) => {
          if (!isMountedRef.current) return;
          const msg = event.message;
          
          const messageId = msg.id;
          
          // Check if already in store (use getState to get current state, not closure)
          const currentStore = useChatStore.getState();
          const currentStoreIds = new Set(currentStore.messages.map(m => m.id));
          if (currentStoreIds.has(messageId)) {
            console.log('[Chat] Message already in store, skipping:', messageId);
            return; // Already in store
          }
          
          const isAI = msg.user?.id === 'gepanda_ai' || msg.user?.id === 'ai_companion';
          
          // Extract UI spec from attachments
          const uiSpec = msg.attachments?.find((att: any) => att.type === 'ui_spec')?.ui_spec;
          
          // Convert to frontend format
          const frontendMessage = {
            id: messageId,
            role: isAI ? 'assistant' as const : 'user' as const,
            content: uiSpec 
              ? JSON.stringify({ text: msg.text || '', ui: uiSpec })
              : msg.text || '',
            createdAt: msg.created_at ? new Date(msg.created_at).getTime() : Date.now(),
            meta: uiSpec ? { ui: uiSpec } : undefined,
          };
          
          // For both user and assistant messages, check if we have an optimistic message with same content
          const messageText = msg.text || '';
          const optimisticMessage = currentStore.messages.find(m => {
            const isOptimistic = m.id.startsWith('optimistic-');
            const sameRole = m.role === (isAI ? 'assistant' : 'user');
            const contentMatches = m.content === frontendMessage.content || 
              (typeof m.content === 'string' && messageText && m.content.includes(messageText.substring(0, 50)));
            return isOptimistic && sameRole && contentMatches;
          });
          
          if (optimisticMessage) {
            // Remove optimistic message before adding Stream message
            const updatedMessages = currentStore.messages.filter(m => m.id !== optimisticMessage.id);
            useChatStore.setState({ messages: updatedMessages });
            console.log(`[Chat] Removed optimistic ${isAI ? 'assistant' : 'user'} message, adding Stream message:`, messageId);
          }
          
          // Add message to store (both user and assistant messages from Stream)
          currentStore.addMessage(frontendMessage);
          
          console.log(`[Chat] Received ${isAI ? 'assistant' : 'user'} message from Stream:`, messageId);
        };

        const typingStartHandler = () => {
          if (isMountedRef.current) {
            setIsTyping(true);
          }
        };

        const typingStopHandler = () => {
          if (isMountedRef.current) {
            setIsTyping(false);
          }
        };

        // Store handlers in refs for cleanup (before registering)
        messageHandlerRef.current = messageHandler;
        typingStartHandlerRef.current = typingStartHandler;
        typingStopHandlerRef.current = typingStopHandler;

        // Ensure channel is watching for real-time events
        // This is required for message.new events to fire
        const channelState = channelInstance.state as any;
        if (!channelState?.watched) {
          console.log('[Chat Init] Channel not watched, calling watch() for real-time events');
          await channelInstance.watch();
        }
        
        // Listen for new messages (only once - handlers stored in refs)
        // Remove any existing listeners first (defensive)
        channelInstance.off('message.new', messageHandler);
        channelInstance.off('typing.start', typingStartHandler);
        channelInstance.off('typing.stop', typingStopHandler);
        
        channelInstance.on('message.new', messageHandler);
        channelInstance.on('typing.start', typingStartHandler);
        channelInstance.on('typing.stop', typingStopHandler);
        
        console.log('[Chat Init] Message handlers registered, channel watching:', channelState?.watched);

        if (isStale()) {
          finishSilent();
          return;
        }

        clearOverallTimeout();
        if (isMountedRef.current) {
          setIsConnecting(false);
          setClient(streamClient);
          setChannel(channelInstance);
          console.log('[Chat Init] Successfully initialized chat - client:', !!streamClient, 'channel:', !!channelInstance);
        }
        initializingRef.current = false;
        initLockRef.current = false;
        
        // Mark chat as ready (after history is loaded and initialization complete)
        chatReadyRef.current = true;
        console.log('[Chat Init] Initialization complete (success)');
      } catch (error) {
        clearOverallTimeout();
        console.error('[Chat Init] Error during initialization:', error);
        let msg = error instanceof Error ? error.message : 'Failed to initialize chat. Please refresh the page.';
        const isTimeout = typeof msg === 'string' && msg.includes('timed out');
        
        // Provide more helpful error messages for common issues
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch failed')) {
          const prodMessage = 'Check your NEXT_PUBLIC_API_URL environment variable in Vercel settings.';
          const devMessage = `The API server is not running. To fix:
1. Open a new terminal
2. Run: npm run dev:api
3. Wait for "Server listening on port 3001"
4. Click "Try again" below`;
          msg = `Cannot connect to API server at ${API_URL}

${process.env.NODE_ENV === 'production' ? prodMessage : devMessage}`;
        } else if (msg.includes('Cannot connect to API server')) {
          // Already has helpful message, keep it
        } else if (isTimeout) {
          msg = `Timed out connecting to chat.

Possible causes:
- API server not running (start with: npm run dev:api)
- Network issues
- Check browser console for details`;
        }
        
        if (isMountedRef.current) {
          setEnvError(`Failed to initialize chat: ${msg}`);
          setIsConnecting(false);
        }
        connectedUserIdRef.current = null;
        tokenRef.current = null;
        initializingRef.current = false;
        initLockRef.current = false;
        console.log('[Chat Init] Initialization complete (error)');
      }
    };

    initializeChat();

    // Cleanup: on unmount or when stableUserId/config change — abort, disconnect, remove listeners, reset state
    return () => {
      console.log('[Chat Init] Cleanup: aborting and disconnecting');
      
      initLockRef.current = false;
      initUserRef.current = null;

      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      initializingRef.current = false;

      const currentClient = streamClientRef.current;
      const currentUserId = connectedUserIdRef.current;
      if (currentClient && currentUserId) {
        console.log('[Chat Init] Cleanup: disconnecting user:', currentUserId);
        currentClient.disconnectUser().catch((error: any) => {
          console.warn('[Chat Init] Cleanup: error during disconnect (ignored):', error);
        });
        connectedUserIdRef.current = null;
        tokenRef.current = null;
      }

      if (channelRef.current) {
        try {
          if (messageHandlerRef.current) {
            channelRef.current.off('message.new', messageHandlerRef.current);
          }
          if (typingStartHandlerRef.current) {
            channelRef.current.off('typing.start', typingStartHandlerRef.current);
          }
          if (typingStopHandlerRef.current) {
            channelRef.current.off('typing.stop', typingStopHandlerRef.current);
          }
        } catch (_) {}
        messageHandlerRef.current = null;
        typingStartHandlerRef.current = null;
        typingStopHandlerRef.current = null;
        channelRef.current = null;
      }

      if (isMountedRef.current) {
        setInitStarted(false);
        setClient(null);
        setChannel(null);
        setIsConnecting(false);
      }
    };
  }, [stableUserId, STREAM_API_KEY, API_URL, retryKey, initialSessionId, isReady]); // retryKey lets user retry without reload

  // Client-side timeout guard: if we're stuck on "Connecting..." show timeout error (handles hung fetch / missed timeout)
  useEffect(() => {
    const effectiveClient = client || streamClientRef.current;
    const effectiveChannel = channel || channelRef.current;
    const isConnectingState = userId != null && !envError && (!effectiveClient || !effectiveChannel);

    if (!isConnectingState) return;

    const timerId = setTimeout(() => {
      console.error('[Chat] Client-side timeout guard triggered after', CHAT_INIT_OVERALL_TIMEOUT_MS, 'ms');
      console.error('[Chat] State:', {
        hasClient: !!effectiveClient,
        hasChannel: !!effectiveChannel,
        userId,
        envError,
      });
      setEnvError((prev) =>
        prev || `Connection timed out (${CHAT_INIT_OVERALL_TIMEOUT_MS / 1000} seconds). Check browser console for details. API is running (test at /test-chat-api).`
      );
      setIsConnecting(false);
    }, CHAT_INIT_OVERALL_TIMEOUT_MS);

    return () => clearTimeout(timerId);
  }, [userId, envError, client, channel, API_URL]);

  // Separate effect for component unmount cleanup (disconnect Stream user)
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // Abort any in-flight initialization
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      
      // Set initializing flag to false
      initializingRef.current = false;
      
      const currentClient = streamClientRef.current;
      const currentUserId = connectedUserIdRef.current;
      
      // Only disconnect if actually connected (avoid duplicate disconnect calls)
      if (currentClient && currentUserId && currentClient.userID === currentUserId) {
        console.log('[Chat Unmount] Disconnecting user:', currentUserId);
        // Disconnect Stream user on unmount
        currentClient.disconnectUser().catch((error: any) => {
          // Error during unmount disconnect - ignore
          console.warn('[Chat Unmount] Error during disconnect (ignored):', error);
        });
      }
      
      // Clear all refs
      connectedUserIdRef.current = null;
      tokenRef.current = null;
      if (channelRef.current) {
        try {
          channelRef.current.off();
        } catch (e) {
          // Ignore errors during cleanup
        }
        channelRef.current = null;
      }
    };
  }, []); // Empty deps = only run on mount/unmount

  const handleSendMessage = async (text: string) => {
    // Store in ref for use by handleUIEventCallback
    handleSendMessageRef.current = handleSendMessage;
    
    const trimmedText = text.trim();
    if (!trimmedText || isSending) {
      console.log('[Chat] Cannot send message:', { hasText: !!trimmedText, isSending });
      return;
    }

    // Guard against duplicate sends (check by content, not just clientId)
    const currentStore = useChatStore.getState();
    const recentUserMessage = currentStore.messages
      .filter(m => m.role === 'user')
      .slice(-1)[0];
    
    if (recentUserMessage && recentUserMessage.content === trimmedText) {
      const timeSinceLastMessage = Date.now() - recentUserMessage.createdAt;
      if (timeSinceLastMessage < 2000) { // Within 2 seconds
        console.log('[Chat] Duplicate message detected, skipping:', trimmedText.substring(0, 50));
        return;
      }
    }

    // 1) Generate clientId
    const clientId = crypto.randomUUID();
    
    // Guard against StrictMode double-run
    if (sendingRef.current.has(clientId)) {
      console.log('[Chat] Message with clientId already being sent, skipping:', clientId);
      return;
    }
    
    sendingRef.current.add(clientId);
    setIsSending(true);
    
    try {
      // 2) Add user message optimistically for immediate UI feedback
      // Backend will also post it to Stream, and we'll receive it via message.new
      // We'll deduplicate by content when Stream message arrives
      const userMessageText = text.trim();
      addMessage({
        id: `optimistic-user-${clientId}`,
        role: 'user',
        content: userMessageText,
        createdAt: Date.now(),
      });
      
      console.log('[Chat] Added user message optimistically:', clientId);
      
      // 3) POST /api/chat/respond - backend will post both user and assistant messages to Stream
      const currentChannel = channel || channelRef.current;
      const currentSessionId = currentChannel?.id || storedSessionId || '';
      
      // Ensure sessionId is stored
      if (currentSessionId && currentSessionId !== storedSessionId) {
        setSessionId(currentSessionId);
      }
      
      console.log('[Chat] Sending message to API:', {
        url: `${API_BASE || API_URL}/api/chat/respond`,
        message: text.trim(),
        sessionId: currentSessionId,
        userId,
        messageCount: messages.length,
      });
      
      const chatResponse = await fetch(`${API_BASE || API_URL}/api/chat/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: text.trim(), // The current input
          messages: messages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
          })),
          tripState: tripState && Object.keys(tripState).length > 0 ? tripState : undefined,
          sessionId: currentSessionId, // Always include sessionId for context
          userId: userId,
        }),
      });

      console.log('[Chat] API response status:', chatResponse.status, chatResponse.statusText);

      if (!chatResponse.ok) {
        // Try to parse JSON error response
        let errorMessage = 'I apologize, but I encountered an error processing your request. Please try again.';
        let errorDetails = '';
        
        try {
          const contentType = chatResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await chatResponse.json();
            console.error('[CHAT_UI_ERROR] API error (JSON):', {
              status: chatResponse.status,
              code: errorData.error?.code,
              message: errorData.error?.message,
              details: errorData.error?.details,
            });
            
            if (errorData.error) {
              errorMessage = errorData.error.message || errorMessage;
              errorDetails = errorData.error.details || '';
            } else {
              errorMessage = errorData.message || errorMessage;
            }
          } else {
            const errorText = await chatResponse.text();
            console.error('[CHAT_UI_ERROR] API error (non-JSON):', chatResponse.status, errorText);
            // If it's HTML, show a more helpful message
            if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
              errorMessage = 'The API server returned an HTML error page. Please check that the API server is running on port 3001.';
              errorDetails = 'Run: npm run dev:api';
            } else {
              errorText ? errorMessage = errorText : errorMessage;
            }
          }
        } catch (parseError) {
          console.error('[CHAT_UI_ERROR] Failed to parse error response:', parseError);
          // Fall back to default error message
        }
        
        // Add error message with details if available
        const errorId = crypto.randomUUID();
        const fullErrorMessage = errorDetails 
          ? `${errorMessage}\n\n${errorDetails}`
          : errorMessage;
        
        addMessage({
          id: errorId,
          role: 'assistant',
          content: fullErrorMessage,
          createdAt: Date.now(),
        });
        
        showToast(errorMessage, 'error');
        return;
      }

      // 4) Handle response {reply, panel, data, ui}
      const data = await chatResponse.json();
      console.log('[Chat] AI response received:', {
        hasReply: !!data.reply,
        hasPanel: !!data.panel,
        hasData: !!data.data,
        hasUI: !!data.ui,
        replyLength: data.reply?.length || 0,
        replyPreview: data.reply ? data.reply.substring(0, 100) : 'NO REPLY',
        textLength: data.text?.length || 0,
      });
      
      // Build assistant message content
      // If UI exists, store as JSON string; otherwise use plain text
      let assistantContent: string;
      if (data.ui) {
        // Store as JSON with text and ui fields
        assistantContent = JSON.stringify({
          text: data.reply || data.text || 'Here\'s what I found:',
          ui: data.ui,
        });
      } else {
        assistantContent = data.reply || data.text || 'I received your message.';
        console.log('[Chat] Assistant content (plain text):', assistantContent.substring(0, 200));
      }
      
      // Save session data to backend after successful response (non-blocking)
      // This ensures sessionId is tracked, though tripState/results are in sessionStorage
      if (currentSessionId && userId) {
        fetch(`${API_BASE || API_URL}/api/chat/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId,
          },
          credentials: 'include',
          body: JSON.stringify({
            sessionId: currentSessionId,
            tripState: tripState && Object.keys(tripState).length > 0 ? tripState : undefined,
            results: results && Object.keys(results).length > 0 ? results : undefined,
          }),
        }).catch((syncError) => {
          // Non-critical error, log but don't block
          console.warn('[Chat] Failed to sync session data:', syncError);
        });
        setLastSyncedAt(Date.now());
      }
      
      // Add assistant message immediately for UI feedback
      // Backend also posts it to Stream, and we'll receive it via message.new
      // When Stream message arrives, we'll remove the optimistic one to avoid duplicates
      const assistantId = `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const replyText = data.reply || data.text || '';
      
      if (!pendingAssistantRef.current.has(assistantId)) {
        pendingAssistantRef.current.add(assistantId);
        addMessage({
          id: assistantId,
          role: 'assistant',
          content: assistantContent,
          createdAt: Date.now(),
          meta: data.ui ? { ui: data.ui } : undefined,
        });
        console.log('[Chat] Added assistant message optimistically:', assistantId);
        
        // Remove optimistic message when Stream message arrives (within 5 seconds)
        const removeOptimisticTimeout = setTimeout(() => {
          const currentStore = useChatStore.getState();
          // Find Stream message with matching content
          const streamMessage = currentStore.messages.find(m => 
            m.role === 'assistant' && 
            m.id !== assistantId &&
            (m.content === assistantContent || 
             (typeof m.content === 'string' && m.content.includes(replyText.substring(0, 50))))
          );
          if (streamMessage) {
            // Remove optimistic message, keep Stream one
            const updatedMessages = currentStore.messages.filter(m => m.id !== assistantId);
            useChatStore.setState({ messages: updatedMessages });
            console.log('[Chat] Removed optimistic message, using Stream message:', streamMessage.id);
          } else {
            console.log('[Chat] Stream message not received, keeping optimistic message');
          }
          pendingAssistantRef.current.delete(assistantId);
        }, 5000);
        
        // Store timeout for cleanup if needed
        (window as any).__optimisticTimeout = removeOptimisticTimeout;
      }
      
      // Handle panel
      if (data.panel) {
        console.log('[Chat] Setting active panel:', data.panel);
        setActivePanel(data.panel);
      }
      
      // Handle data
      if (data.data) {
        console.log('[Chat] Setting results data:', Object.keys(data.data));
        setResults(data.data);
      }
    } catch (error) {
      console.error('[Chat] Error sending message:', error);
      if (error instanceof Error) {
        showToast(`Failed to send message: ${error.message}`, 'error');
      } else {
        showToast('Failed to send message. Please try again.', 'error');
      }
    } finally {
      sendingRef.current.delete(clientId);
      setIsSending(false);
    }
  };

  // Auto-send follow-up message when opened from feed "Ask Follow-up" link
  // Flow: open chat → load history → inject follow-up message → call AI
  useEffect(() => {
    if (!initialFollowUpMessage?.trim() || initialFollowUpSentRef.current) return;
    
    const effectiveChannel = channel || channelRef.current;
    const effectiveClient = client || streamClientRef.current;
    
    // Wait for: client ready, channel ready, not connecting, and history loaded
    if (!effectiveClient || !effectiveChannel || isConnecting || !historyLoadedRef.current || !chatReadyRef.current) {
      return;
    }

    console.log('[Chat Follow-up] Sending follow-up message after history loaded:', initialFollowUpMessage.trim());
    initialFollowUpSentRef.current = true;
    handleSendMessage(initialFollowUpMessage.trim());
    
    // Clear URL so refreshing doesn't re-send
    if (typeof window !== 'undefined' && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete('followUp');
      url.searchParams.delete('message');
      window.history.replaceState({}, '', url.pathname + (url.search || ''));
    }
  }, [initialFollowUpMessage, client, channel, isConnecting, handleSendMessage]);

  const effectiveClient = client || streamClientRef.current;
  const effectiveChannel = channel || channelRef.current;
  const showConnectingSpinner = initStarted && (isConnecting || !effectiveClient || !effectiveChannel);

  const prodApiMessage = 'Chat needs the API server configured. Check NEXT_PUBLIC_API_URL in Vercel environment variables.';
  const devApiMessage = `Chat needs the API server running on ${API_URL}. 

To start it:
1. Open a NEW terminal window
2. Navigate to: ${typeof window !== 'undefined' ? window.location.origin.replace(/:\d+$/, '') : 'project folder'}
3. Run: npm run dev:api

Or run both servers at once from repo root:
npm run dev
Then click "Try again" below.`;
  const DEV_API_MESSAGE = process.env.NODE_ENV === 'production' ? prodApiMessage : devApiMessage;

  if (envError) {
    const handleRetry = () => {
      setEnvError(null);
      setRetryKey((k) => k + 1);
    };
    return (
      <>
        {isDev && apiReachable === false && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
            background: '#dc2626', color: '#fff', padding: '12px 24px', textAlign: 'center', fontSize: '0.95rem', fontWeight: 600,
          }}>
            {DEV_API_MESSAGE}
          </div>
        )}
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--gp-bg)',
          padding: 24,
          gap: 16,
          maxWidth: 480,
          margin: '0 auto',
        }}>
          <div style={{ color: 'var(--gp-text)', marginBottom: 8, fontWeight: 600 }}>{envError}</div>
          <p style={{ color: 'var(--gp-text)', fontSize: '1rem', margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
            {DEV_API_MESSAGE}
          </p>
          <p style={{ color: 'var(--gp-muted)', fontSize: '0.875rem', margin: 0 }}>
            Then click <strong>Try again</strong> below.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {isDev && (
              <button
                type="button"
                onClick={checkApiManually}
                disabled={apiCheckLoading}
                style={{ padding: '10px 20px', cursor: apiCheckLoading ? 'not-allowed' : 'pointer', opacity: apiCheckLoading ? 0.6 : 1 }}
              >
                {apiCheckLoading ? 'Checking...' : 'Check API'}
              </button>
            )}
            <button
              type="button"
              onClick={handleRetry}
              style={{ padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ padding: '10px 20px', cursor: 'pointer' }}
            >
              Refresh page
            </button>
          </div>
          {isDev && (
            <p style={{ color: 'var(--gp-muted)', fontSize: '0.75rem', margin: '8px 0 0', textAlign: 'center' }}>
              Check your terminal running <code style={{ background: 'var(--gp-surface)', padding: '2px 6px' }}>npm run dev</code> - look for &quot;Server listening on port 3001&quot; or any errors.
            </p>
          )}
        </div>
      </>
    );
  }

  if (userId === null) {
    return (
      <>
        {isDev && apiReachable === false && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
            background: '#dc2626', color: '#fff', padding: '12px 24px', textAlign: 'center', fontSize: '0.95rem', fontWeight: 600,
          }}>
            {DEV_API_MESSAGE}
          </div>
        )}
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--gp-bg)',
          gap: 12,
        }}>
          <div style={{ color: 'var(--gp-text)' }}>Loading...</div>
          {isDev && (
            <p style={{ color: 'var(--gp-muted)', fontSize: '0.875rem', margin: 0 }}>
              If this doesn&apos;t finish, start the API: <code style={{ background: 'var(--gp-surface)', padding: '2px 6px' }}>npm run dev:api</code> in another terminal.
            </p>
          )}
        </div>
      </>
    );
  }

  if (showConnectingSpinner) {
    if (!isConnecting && streamClientRef.current && channelRef.current && (!client || !channel)) {
      setClient(streamClientRef.current);
      setChannel(channelRef.current);
    }
    return (
      <>
        {isDev && apiReachable === false && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
            background: '#dc2626', color: '#fff', padding: '12px 24px', textAlign: 'center', fontSize: '0.95rem', fontWeight: 600,
          }}>
            {DEV_API_MESSAGE}
          </div>
        )}
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--gp-bg)',
          padding: 24,
          gap: 12,
        }}>
          <div style={{ color: 'var(--gp-text)', fontWeight: 500 }}>Connecting to chat...</div>
          <div style={{ color: 'var(--gp-muted)', fontSize: '0.875rem', textAlign: 'center', maxWidth: 360 }}>
            {isDev && apiReachable === false
              ? DEV_API_MESSAGE
              : 'If this takes more than 10 seconds, start the API: npm run dev:api in another terminal. Or test at /dev.'}
          </div>
        </div>
      </>
    );
  }

  if (!effectiveClient || !effectiveChannel) {
    return (
      <>
        {isDev && apiReachable === false && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
            background: '#dc2626', color: '#fff', padding: '12px 24px', textAlign: 'center', fontSize: '0.95rem', fontWeight: 600,
          }}>
            {DEV_API_MESSAGE}
          </div>
        )}
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--gp-bg)',
          padding: 24,
          gap: 12,
        }}>
          <div style={{ color: 'var(--gp-text)', fontWeight: 500 }}>Connecting to chat...</div>
          <div style={{ color: 'var(--gp-muted)', fontSize: '0.875rem', textAlign: 'center', maxWidth: 360 }}>
            {isDev && apiReachable === false ? DEV_API_MESSAGE : 'If this takes more than 10 seconds, start the API: npm run dev:api. Or test at /dev.'}
          </div>
        </div>
      </>
    );
  }

  // Determine if we should show panel (only if panel has content AND is not 'none')
  const hasPanelContent = activePanel !== 'none' && (
    results.itinerary ||
    (results.hotels && results.hotels.length > 0) ||
    (results.flights && results.flights.length > 0) ||
    Object.keys(results).length > 0
  );
  const showPanel = hasPanelContent;
  const showChat = activePanel === 'none' || !isMobile;
  
  // Check if this is a guest demo channel (has demo messages from assistant)
  // Only match assistant messages, not user messages (user messages shouldn't trigger welcome screen)
  const isGuestDemoChannel = messages.length > 0 && messages.some(msg => {
    if (msg.role !== 'assistant') return false; // Only check assistant messages
    const content = msg.content.toLowerCase();
    return content.includes('sample itinerary') ||
           (content.includes('welcome') && content.length > 100);
  });
  
  // Show welcome screen ONLY if no messages (not based on demo channel check)
  const showWelcomeScreen = messages.length === 0;
  
  // Debug logging
  if (typeof window !== 'undefined' && messages.length > 0) {
    console.log('[Chat UI] Render state:', {
      messageCount: messages.length,
      showWelcomeScreen,
      isGuestDemoChannel,
      showPanel,
      activePanel,
      hasPanelContent,
      lastMessage: messages[messages.length - 1]?.content?.substring(0, 100),
    });
  }

  return (
    <div className={`min-h-screen flex flex-col bg-gp-bg text-gp-text ${isMobile ? 'pb-32' : 'pb-0'}`}>
      {/* Desktop Top Nav */}
      {!isMobile && <AppNav isMobile={false} />}

      {/* Mobile: Top Tabs / Segmented Control */}
      {isMobile && (
        <div className="sticky top-0 z-20 bg-gp-surface border-b border-gp-border">
          <div className="flex">
            <button
              onClick={() => setActivePanel('none')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                activePanel === 'none'
                  ? 'bg-gp-primary text-black'
                  : 'bg-gp-surface text-gp-text hover:bg-gp-hover'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => {
                // Switch to first available panel or default to trip
                if (results.itinerary) {
                  setActivePanel('itinerary');
                } else if (results.hotels && results.hotels.length > 0) {
                  setActivePanel('hotels');
                } else if (results.flights && results.flights.length > 0) {
                  setActivePanel('flights');
                } else {
                  setActivePanel('trip');
                }
              }}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                activePanel !== 'none'
                  ? 'bg-gp-primary text-black'
                  : 'bg-gp-surface text-gp-text hover:bg-gp-hover'
              }`}
            >
              Plan/Results
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex overflow-hidden ${showPanel && !isMobile ? '' : ''}`}>
        {/* Desktop: Single Column (full width) or Split Layout (if panel has content) */}
        {!isMobile ? (
          <>
            {/* Chat Column - Full width if no panel, otherwise split */}
            <div className={`flex flex-col bg-gp-surface ${showPanel ? 'w-[40%] border-r border-gp-border' : 'w-full'}`}>
              {/* Chat Header */}
              <header className="flex-shrink-0 p-4 md:p-6 border-b border-gp-border bg-gp-surface flex items-center gap-4">
                <Avatar isTyping={isTyping} size="medium" />
                <div className="flex-1">
                  <h1 className="text-xl font-semibold text-gp-text m-0">GePanda AI</h1>
                  <p className="text-sm text-gp-muted m-0">
                    {isTyping ? 'Typing...' : 'Your travel companion'}
                  </p>
                </div>
                {/* New Chat Button */}
                {!showWelcomeScreen && (
                  <button
                    onClick={handleNewChat}
                    className="px-4 py-2 text-sm font-medium text-gp-text hover:text-gp-primary border border-gp-border rounded-lg hover:bg-gp-hover transition-colors"
                    title="Start a new chat"
                  >
                    New Chat
                  </button>
                )}
              </header>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto flex flex-col p-4 md:p-6 space-y-4">
                {showWelcomeScreen ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-gp-muted px-4">
                    <div className="mb-6">
                      <Avatar size="large" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gp-text mb-2">Welcome to GePanda AI</h2>
                    <p className="text-gp-muted mb-8 max-w-md">
                      Your AI travel companion. Ask me anything about planning your trip, finding flights, booking hotels, or getting travel recommendations!
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex items-start gap-3 ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <div className="flex-shrink-0 mt-1">
                            <Avatar size="small" />
                          </div>
                        )}
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                            message.role === 'user'
                              ? 'bg-gp-primary text-black'
                              : 'bg-gp-surface border border-gp-border text-gp-text'
                          }`}
                        >
                          {message.role === 'user' ? (
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          ) : (
                            <AssistantRenderer
                              message={{
                                ...message,
                                meta: {
                                  userId,
                                  sessionId: (channel || channelRef.current)?.id || storedSessionId || '',
                                },
                              }}
                              onEvent={handleUIEventCallback}
                            />
                          )}
                        </div>
                        {message.role === 'user' && (
                          <div className="flex-shrink-0 mt-1">
                            <Avatar size="small" />
                          </div>
                        )}
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <Avatar size="small" isTyping={true} />
                        </div>
                        <div className="bg-gp-surface border border-gp-border rounded-2xl px-4 py-3">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-gp-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-gp-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-gp-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Suggestions */}
              {showWelcomeScreen && (
                <div className="p-4 md:p-6 border-t border-gp-border">
                  <p className="text-xs text-gp-muted mb-2 font-medium">Quick actions</p>
                  <SuggestionChips
                    suggestions={[
                      { text: 'Shop with AI', onClick: () => handleSendMessage('I want to shop with AI. Help me find and buy something.') },
                      { text: 'Buy eSIM', onClick: () => handleSendMessage('I need an eSIM for my trip. Recommend a plan and help me buy it.') },
                      { text: 'Plan a Trip', onClick: () => handleSendMessage('I want to plan a trip. Help me with destination, dates, and bookings.') },
                      { text: 'Track My Order', onClick: () => handleSendMessage('I want to check my order status or track my shipment.') },
                    ]}
                    visible={true}
                    isMobile={false}
                  />
                </div>
              )}
            </div>

            {/* Panel Column (60%) - Only show if panel has content */}
            {showPanel && (
              <div className="w-[60%] flex flex-col">
                <Panel isMobile={false} />
              </div>
            )}
          </>
        ) : (
          /* Mobile: Single Column with Conditional Rendering */
          <>
            {showChat && (
              <div className="w-full flex flex-col bg-gp-surface">
                {/* Chat Header */}
                <header className="flex-shrink-0 p-4 border-b border-gp-border bg-gp-surface flex items-center gap-3">
                  <Avatar isTyping={isTyping} size="small" />
                  <div className="flex-1">
                    <h1 className="text-lg font-semibold text-gp-text m-0">GePanda AI</h1>
                    <p className="text-xs text-gp-muted m-0">
                      {isTyping ? 'Typing...' : 'Your travel companion'}
                    </p>
                  </div>
                  {/* New Chat Button */}
                  {!showWelcomeScreen && (
                    <button
                      onClick={handleNewChat}
                      className="px-3 py-1.5 text-xs font-medium text-gp-text hover:text-gp-primary border border-gp-border rounded-lg hover:bg-gp-hover transition-colors"
                      title="Start a new chat"
                    >
                      New
                    </button>
                  )}
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto flex flex-col p-4 space-y-4">
                  {showWelcomeScreen ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-gp-muted px-4">
                      <div className="mb-4">
                        <Avatar size="large" />
                      </div>
                      <h2 className="text-xl font-semibold text-gp-text mb-2">Welcome to GePanda AI</h2>
                      <p className="text-gp-muted mb-6 text-sm">
                        Your AI travel companion. Ask me anything about planning your trip!
                      </p>
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex items-start gap-3 ${
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {message.role === 'assistant' && (
                            <div className="flex-shrink-0 mt-1">
                              <Avatar size="small" />
                            </div>
                          )}
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                              message.role === 'user'
                                ? 'bg-gp-primary text-black'
                                : 'bg-gp-surface border border-gp-border text-gp-text'
                            }`}
                          >
                            {message.role === 'user' ? (
                              <p className="whitespace-pre-wrap">{message.content}</p>
                            ) : (
                              <AssistantRenderer
                                message={{
                                  ...message,
                                  meta: {
                                    userId,
                                    sessionId: (channel || channelRef.current)?.id || storedSessionId || '',
                                  },
                                }}
                                onEvent={handleUIEventCallback}
                              />
                            )}
                          </div>
                          {message.role === 'user' && (
                            <div className="flex-shrink-0 mt-1">
                              <Avatar size="small" />
                            </div>
                          )}
                        </div>
                      ))}
                      {isTyping && (
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            <Avatar size="small" isTyping={true} />
                          </div>
                          <div className="bg-gp-surface border border-gp-border rounded-2xl px-4 py-3">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-gp-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 bg-gp-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-2 h-2 bg-gp-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Suggestions */}
                {showWelcomeScreen && (
                  <div className="p-4 border-t border-gp-border">
                    <p className="text-xs text-gp-muted mb-2 font-medium">Quick actions</p>
                    <SuggestionChips
                      suggestions={[
                        { text: 'Shop with AI', onClick: () => handleSendMessage('I want to shop with AI. Help me find and buy something.') },
                        { text: 'Buy eSIM', onClick: () => handleSendMessage('I need an eSIM for my trip. Recommend a plan and help me buy it.') },
                        { text: 'Plan a Trip', onClick: () => handleSendMessage('I want to plan a trip. Help me with destination, dates, and bookings.') },
                        { text: 'Track My Order', onClick: () => handleSendMessage('I want to check my order status or track my shipment.') },
                      ]}
                      visible={true}
                      isMobile={true}
                    />
                  </div>
                )}
              </div>
            )}

            {showPanel && (
              <div className="w-full flex flex-col">
                <Panel isMobile={true} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Fixed Chat Input at Bottom */}
      <div className={`${isMobile ? 'fixed bottom-20' : 'relative'} left-0 right-0 bg-gp-surface border-t border-gp-border z-10`}>
        <div className="p-4 md:p-6">
          <ChatInput
            onSend={handleSendMessage}
            disabled={isConnecting || isSending}
            isMobile={isMobile}
          />
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      {isMobile && <AppNav isMobile={true} />}

      {/* Toast Notifications */}
      {ToastComponent}

      {/* Modals */}
      <CityModal
        isOpen={activeModal === 'city'}
        onClose={() => {
          console.log('[MODAL] Closing city modal');
          setActiveModal(null);
        }}
        onSubmit={(city) => {
          console.log('[MODAL] City submitted:', city);
          const message = `City: ${city}`;
          if (handleSendMessageRef.current) {
            handleSendMessageRef.current(message);
          }
          setActiveModal(null);
        }}
      />
      <DatesModal
        isOpen={activeModal === 'dates'}
        onClose={() => {
          console.log('[MODAL] Closing dates modal');
          setActiveModal(null);
        }}
        onSubmit={(startDate, endDate) => {
          console.log('[MODAL] Dates submitted:', { startDate, endDate });
          const message = `Dates: ${startDate} - ${endDate}`;
          if (handleSendMessageRef.current) {
            handleSendMessageRef.current(message);
          }
          setActiveModal(null);
        }}
      />
      <BudgetModal
        isOpen={activeModal === 'budget'}
        onClose={() => {
          console.log('[MODAL] Closing budget modal');
          setActiveModal(null);
        }}
        onSubmit={(amount, currency) => {
          console.log('[MODAL] Budget submitted:', { amount, currency });
          const currencySymbols: Record<string, string> = {
            USD: '$',
            EUR: '€',
            GBP: '£',
            JPY: '¥',
            CNY: '¥',
            AUD: 'A$',
            CAD: 'C$',
            CHF: 'CHF',
          };
          const symbol = currencySymbols[currency] || currency;
          const message = `Budget: ${symbol}${amount} per night`;
          if (handleSendMessageRef.current) {
            handleSendMessageRef.current(message);
          }
          setActiveModal(null);
        }}
      />
    </div>
  );
}

