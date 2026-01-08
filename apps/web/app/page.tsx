'use client';

import { useEffect, useState } from 'react';
import { StreamChat } from 'stream-chat';
import {
  Chat,
  Channel,
  Window,
  MessageList,
  MessageInput,
  ChannelHeader,
  Thread,
} from 'stream-chat-react';
import { RoomTemplate } from '@gepanda/shared';

const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY;

if (!STREAM_API_KEY) {
  throw new Error('NEXT_PUBLIC_STREAM_API_KEY environment variable is required');
}

export default function Home() {
  const [client, setClient] = useState<StreamChat | null>(null);
  const [channel, setChannel] = useState<any>(null);
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [roomTemplate, setRoomTemplate] = useState<RoomTemplate>(RoomTemplate.TRAVEL_PLANNING);
  const [inviteToken, setInviteToken] = useState('');
  const [showTripContext, setShowTripContext] = useState(false);
  const [tripContextLoading, setTripContextLoading] = useState(false);
  const [tripContext, setTripContext] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    travelers: '',
    budgetRange: '',
    interests: '',
    notes: '',
  });
  const [inviteUrl, setInviteUrl] = useState<string>('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);

  // Resolve invite token to roomId
  const resolveInviteToken = async (token: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/invites/${token}`);
      if (response.ok) {
        const data = await response.json();
        setRoomId(data.roomId);
        console.log('Room ID auto-filled from invite:', data.roomId);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Invalid token' }));
        console.error('Invalid invite token:', errorData);
        alert(`Invalid or expired invite link: ${errorData.error || 'Token not found'}`);
      }
    } catch (error) {
      console.error('Error resolving invite token:', error);
      alert('Error resolving invite token. Please check your connection.');
    }
  };

  // Handle invite token/URL input
  const handleInviteSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inviteToken.trim()) return;

    let token = inviteToken.trim();
    try {
      const url = new URL(token);
      const inviteParam = url.searchParams.get('invite');
      if (inviteParam) {
        token = inviteParam;
      }
    } catch {
      // Not a URL, assume it's just the token
    }

    resolveInviteToken(token);
  };

  // Generate invite link
  const handleGenerateInvite = async () => {
    if (!roomId) return;

    setInviteLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/rooms/${roomId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInviteUrl(data.inviteUrl);
        setShowInviteDialog(true);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to generate invite link'}`);
      }
    } catch (error) {
      console.error('Error generating invite link:', error);
      alert('Error: Failed to generate invite link');
    } finally {
      setInviteLoading(false);
    }
  };

  // Copy invite URL to clipboard
  const handleCopyInviteLink = async () => {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      alert('Invite link copied to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      // Fallback: select text
      const textArea = document.createElement('textarea');
      textArea.value = inviteUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Invite link copied to clipboard!');
    }
  };

  // Load trip context when room is joined
  const loadTripContext = async () => {
    if (!roomId) return;

    try {
      const response = await fetch(`http://localhost:3001/api/rooms/${roomId}/context`);
      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setTripContext({
            destination: result.data.destination || '',
            startDate: result.data.startDate || '',
            endDate: result.data.endDate || '',
            travelers: result.data.travelers?.toString() || '',
            budgetRange: result.data.budgetRange || '',
            interests: result.data.interests?.join(', ') || '',
            notes: result.data.notes || '',
          });
        }
      }
    } catch (error) {
      console.error('Error loading trip context:', error);
    }
  };

  const handleSaveTripContext = async () => {
    if (!roomId) return;
    
    setTripContextLoading(true);
    try {
      // Build trip context object
      const contextData: any = {};
      
      if (tripContext.destination.trim()) {
        contextData.destination = tripContext.destination.trim();
      }
      if (tripContext.startDate.trim()) {
        contextData.startDate = tripContext.startDate.trim();
      }
      if (tripContext.endDate.trim()) {
        contextData.endDate = tripContext.endDate.trim();
      }
      if (tripContext.travelers.trim()) {
        const travelersNum = parseInt(tripContext.travelers, 10);
        if (!isNaN(travelersNum) && travelersNum > 0) {
          contextData.travelers = travelersNum;
        }
      }
      if (tripContext.budgetRange.trim()) {
        contextData.budgetRange = tripContext.budgetRange.trim();
      }
      if (tripContext.interests.trim()) {
        contextData.interests = tripContext.interests
          .split(',')
          .map(i => i.trim())
          .filter(i => i.length > 0);
      }
      if (tripContext.notes.trim()) {
        contextData.notes = tripContext.notes.trim();
      }

      const response = await fetch(`http://localhost:3001/api/rooms/${roomId}/context`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: contextData }),
      });

      if (response.ok) {
        alert('Trip context saved successfully');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to save trip context'}`);
      }
    } catch (error) {
      console.error('Error saving trip context:', error);
        alert('Error: Failed to save trip context');
    } finally {
      setTripContextLoading(false);
    }
  };

  const handleJoinRoom = async (e?: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log('[Frontend] handleJoinRoom called');
    
    console.log('[Frontend] Join room button clicked');
    
    if (!roomId || !userId || !username) {
      alert('Please fill in all fields');
      setJoiningRoom(false);
      return;
    }

    console.log('[Frontend] Form validation passed, starting join process...');
    setJoiningRoom(true);
    console.log('[Frontend] Starting join room process...', { roomId, userId, username });

    // First, test backend connection
    try {
      console.log('[Frontend] Testing backend connection...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const healthCheck = await fetch('http://localhost:3001/', {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      console.log('[Frontend] Backend health check:', healthCheck.status);
    } catch (error) {
      console.error('[Frontend] Backend health check failed:', error);
      alert('Cannot connect to backend server. Please ensure the backend is running on http://localhost:3001\n\nCheck:\n1. Backend terminal shows "Server running on http://localhost:3001"\n2. No errors in backend console\n3. Try accessing http://localhost:3001 in your browser');
      setJoiningRoom(false);
      return;
    }

    try {
      console.log('[Frontend] Step 1: Getting Stream token from backend...');
      // Get Stream token from backend
      const tokenResponse = await fetch('http://localhost:3001/api/stream/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, username }),
      });

      console.log('[Frontend] Token response status:', tokenResponse.status);

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('[Frontend] Token response error:', errorText);
        throw new Error(`Failed to get Stream token: ${tokenResponse.status} ${errorText}`);
      }

      const tokenData = await tokenResponse.json();
      console.log('[Frontend] Token received:', { hasToken: !!tokenData.token, userId: tokenData.userId });
      const { token } = tokenData;

      console.log('[Frontend] Step 2: Initializing Stream Chat client...');
      // Initialize Stream Chat client
      const streamClient = StreamChat.getInstance(STREAM_API_KEY);
      console.log('[Frontend] Stream client instance created, API key:', STREAM_API_KEY ? '✓ Loaded' : '✗ NOT FOUND');
      
      console.log('[Frontend] Step 3: Connecting user to Stream...');
      console.log('[Frontend] Connection details:', { userId, username, hasToken: !!token });
      
      // Add timeout to connectUser with better error handling
      try {
        const connectPromise = streamClient.connectUser({ id: userId, name: username }, token);
        const connectTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('connectUser timed out after 15 seconds - Stream API may be unreachable')), 15000)
        );
        
        await Promise.race([connectPromise, connectTimeout]);
        console.log('[Frontend] User connected to Stream successfully');
        console.log('[Frontend] Stream client state:', { 
          userID: streamClient.userID,
          isConnected: !!streamClient.userID
        });
      } catch (connectError) {
        console.error('[Frontend] Stream connection error:', connectError);
        throw new Error(`Failed to connect to Stream Chat: ${connectError instanceof Error ? connectError.message : 'Unknown error'}`);
      }

      // Get or create channel
      const channelId = `room-${roomId}`;
      const channelType = 'messaging';
      
      console.log('[Frontend] Setting up channel:', channelId);
      
      // Create channel and add user as member (server-side with proper permissions)
      const channelSetupResponse = await fetch('http://localhost:3001/api/stream/channel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channelId, userId }),
      });

      if (!channelSetupResponse.ok) {
        const error = await channelSetupResponse.json();
        throw new Error(`Failed to setup channel: ${error.message || error.error}`);
      }

      console.log('[Frontend] Channel setup complete, creating channel instance...');
      
      // Create channel instance - Stream Chat React will handle watching
      const channelInstance = streamClient.channel(channelType, channelId);
      
      // Set client and channel immediately - Stream Chat React components will handle watching
      // This prevents hanging on watch() which can sometimes timeout
      setClient(streamClient);
      setChannel(channelInstance);
      
      // Watch in background (non-blocking) - components will handle it
      channelInstance.watch().then(() => {
        console.log('[Frontend] Channel watch complete');
      }).catch((error) => {
        console.warn('[Frontend] Channel watch error (non-critical):', error);
        // Don't throw - components might still work
      });

      // Load trip context after joining room
      loadTripContext();
    } catch (error) {
      console.error('[Frontend] ERROR joining room:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Show detailed error
      const errorDetails = `Error: ${errorMessage}\n\nTroubleshooting:\n1. Check browser console (F12) for details\n2. Check backend terminal for errors\n3. Verify backend is running: http://localhost:3001\n4. Check network tab for failed requests`;
      
      console.error('[Frontend] Full error details:', {
        error,
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      alert(errorDetails);
      
      // Clean up on error
      try {
        const currentClient = StreamChat.getInstance(STREAM_API_KEY);
        if (currentClient.userID) {
          await currentClient.disconnectUser();
          console.log('[Frontend] Disconnected client on error');
        }
      } catch (e) {
        console.error('[Frontend] Error disconnecting client:', e);
      }
    } finally {
      console.log('[Frontend] Join room process finished, resetting loading state');
      setJoiningRoom(false);
    }
  };

  // Check for invite token in URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const invite = urlParams.get('invite');
    if (invite) {
      setInviteToken(invite);
      resolveInviteToken(invite);
    }
  }, []);

  // Ensure Stream Chat styles are loaded
  useEffect(() => {
    // Force Stream Chat styles to load if they haven't already
    if (typeof window !== 'undefined' && !document.querySelector('style[data-stream-chat]')) {
      const style = document.createElement('style');
      style.setAttribute('data-stream-chat', 'true');
      style.textContent = `
        /* Ensure Stream Chat base styles */
        .str-chat * {
          box-sizing: border-box;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Listen for new messages and trigger AI if message starts with "ai"
  useEffect(() => {
    if (!channel || !client) return;

    const handleNewMessage = async (event: any) => {
      const message = event.message;
      
      // Skip if message is from AI user
      if (message.user?.id === 'gepanda-ai') {
        return;
      }

      // Check if message starts with "ai" (case-insensitive)
      const messageText = (message.text || '').trim();
      const normalizedText = messageText.toLowerCase();
      // Must start with "ai" followed by space or be exactly "ai" (to avoid matching "airplane", "airport", etc.)
      const startsWithAi = normalizedText.startsWith('ai ') || normalizedText === 'ai';
      
      console.log('[Frontend] New message received:', {
        originalText: message.text,
        trimmedText: messageText,
        normalizedText,
        startsWithAi,
        userId: message.user?.id,
      });
      
      if (startsWithAi) {
        // Extract channel ID and room ID
        const channelId = channel.id || '';
        const extractedRoomId = channelId.replace('room-', '');
        
        // Strip "ai" prefix from message before sending to AI
        const aiMessageText = messageText.replace(/^ai\s*/i, '').trim();
        
        // Call AI reply API (non-blocking)
        console.log('[Frontend] Detected AI trigger, calling API...', { original: messageText, stripped: aiMessageText });
        fetch('http://localhost:3001/api/ai/reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channelId,
            roomId: extractedRoomId,
            roomTemplate,
            userId: message.user?.id || '',
            username: message.user?.name || '',
            text: aiMessageText || messageText, // Use stripped text, fallback to original if empty
          }),
        })
        .then(async (response) => {
          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('[Frontend] AI API error:', error);
          } else {
            const data = await response.json();
            console.log('[Frontend] AI reply posted successfully:', data);
          }
        })
        .catch((error) => {
          console.error('[Frontend] Error calling AI reply API:', error);
        });
      }
    };

    // Listen for new messages
    channel.on('message.new', handleNewMessage);

    return () => {
      channel.off('message.new', handleNewMessage);
    };
  }, [channel, roomTemplate]);

  // Inject critical CSS for message styling - Enhanced
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const styleId = 'stream-chat-critical-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .str-chat__message {
            margin-bottom: 1.25rem !important;
            padding: 0.5rem 1rem !important;
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            animation: fadeIn 0.3s ease-in !important;
          }
          .str-chat__message-simple {
            display: flex !important;
            flex-direction: column !important;
            gap: 0.5rem !important;
            width: 100% !important;
            margin-bottom: 1rem !important;
            padding: 0.5rem 0 !important;
          }
          .str-chat__message-simple__inner {
            display: flex !important;
            flex-direction: row !important;
            align-items: flex-end !important;
            width: 100% !important;
            gap: 0.75rem !important;
            justify-content: flex-start !important;
          }
          .str-chat__message-simple--me .str-chat__message-simple__inner {
            flex-direction: row-reverse !important;
            justify-content: flex-end !important;
          }
          .str-chat__message-text {
            padding: 0.75rem 1rem !important;
            border-radius: 1rem !important;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%) !important;
            color: #e5e5e5 !important;
            font-size: 0.9375rem !important;
            line-height: 1.6 !important;
            border: 1px solid rgba(45, 157, 122, 0.2) !important;
            display: inline-block !important;
            max-width: 75% !important;
            word-wrap: break-word !important;
            word-break: break-word !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
            transition: all 0.2s ease !important;
          }
          .str-chat__message-text:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
            transform: translateY(-1px) !important;
          }
          .str-chat__message-simple--me .str-chat__message-text,
          .str-chat__message-simple--me .str-chat__message-inner .str-chat__message-text {
            background: linear-gradient(135deg, #1a7a5e 0%, #2d9d7a 100%) !important;
            color: #ffffff !important;
            border: 1px solid rgba(45, 157, 122, 0.4) !important;
            margin-left: auto !important;
            box-shadow: 0 4px 12px rgba(26, 122, 94, 0.4) !important;
          }
          .str-chat__message-simple--me .str-chat__message-text:hover {
            box-shadow: 0 6px 16px rgba(26, 122, 94, 0.5) !important;
            transform: translateY(-2px) !important;
          }
          .str-chat__message-simple:not(.str-chat__message-simple--me) .str-chat__message-text {
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%) !important;
            color: #e5e5e5 !important;
            border: 1px solid rgba(45, 45, 45, 0.5) !important;
            margin-right: auto !important;
          }
          .str-chat__message-simple__body {
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%) !important;
            color: #e5e5e5 !important;
            border: 1px solid rgba(45, 45, 45, 0.5) !important;
            border-radius: 1rem !important;
            padding: 0.75rem 1rem !important;
            max-width: 75% !important;
            word-wrap: break-word !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
            transition: all 0.2s ease !important;
          }
          .str-chat__message-simple__body:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
            transform: translateY(-1px) !important;
          }
          .str-chat__message-simple__body--user {
            background: linear-gradient(135deg, #1a7a5e 0%, #2d9d7a 100%) !important;
            color: #ffffff !important;
            border: 1px solid rgba(45, 157, 122, 0.4) !important;
            box-shadow: 0 4px 12px rgba(26, 122, 94, 0.4) !important;
          }
          .str-chat__message-simple__body--user:hover {
            box-shadow: 0 6px 16px rgba(26, 122, 94, 0.5) !important;
            transform: translateY(-2px) !important;
          }
          .str-chat__message-simple__avatar {
            width: 40px !important;
            height: 40px !important;
            border-radius: 50% !important;
            flex-shrink: 0 !important;
            border: 2px solid rgba(45, 157, 122, 0.3) !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
            transition: all 0.2s ease !important;
          }
          .str-chat__message-simple__avatar:hover {
            border-color: rgba(45, 157, 122, 0.6) !important;
            transform: scale(1.05) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
          }
          .str-chat__input textarea,
          .str-chat__input input,
          .str-chat__textarea {
            border: 2px solid rgba(45, 45, 45, 0.5) !important;
            border-radius: 0.75rem !important;
            padding: 0.875rem 1rem !important;
            font-size: 0.9375rem !important;
            background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%) !important;
            color: #e5e5e5 !important;
            transition: all 0.3s ease !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
          }
          .str-chat__input textarea:focus,
          .str-chat__input input:focus,
          .str-chat__textarea:focus {
            outline: none !important;
            border-color: #2d9d7a !important;
            box-shadow: 0 0 0 4px rgba(45, 157, 122, 0.2), 0 4px 12px rgba(0, 0, 0, 0.3) !important;
            background: linear-gradient(135deg,rgb(235, 30, 30) 0%, #0f0f0f 100%) !important;
            transform: translateY(-1px) !important;
          }
          .str-chat__send-button {
            background: linear-gradient(135deg, #1a7a5e 0%, #2d9d7a 100%) !important;
            color: #ffffff !important;
            border: none !important;
            border-radius: 0.75rem !important;
            padding: 0.75rem 1.5rem !important;
            font-size: 0.9375rem !important;
            font-weight: 600 !important;
            transition: all 0.3s ease !important;
            box-shadow: 0 4px 12px rgba(26, 122, 94, 0.4) !important;
            min-width: 80px !important;
          }
          .str-chat__send-button:hover {
            background: linear-gradient(135deg, #2d9d7a 0%, #1a7a5e 100%) !important;
            box-shadow: 0 6px 16px rgba(26, 122, 94, 0.5) !important;
            transform: translateY(-2px) !important;
          }
          .str-chat__send-button:active {
            background: linear-gradient(135deg, #0d4f3c 0%, #1a7a5e 100%) !important;
            transform: translateY(0) !important;
            box-shadow: 0 2px 8px rgba(26, 122, 94, 0.3) !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (client) {
        client.disconnectUser();
      }
    };
  }, [client]);

  if (!client || !channel) {
    return (
      <main style={{ 
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        overflow: 'hidden'
      }}>
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
          }}
        >
          <source src="/bgvideo.mp4" type="video/mp4" />
        </video>
        
        {/* Dark Overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          zIndex: 1,
        }} />
        
        {/* Content Container */}
        <div style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: '600px',
          color: '#e5e5e5',
          backgroundColor: 'rgba(26, 26, 26, 0.85)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '2.5rem',
          border: '1px solid rgba(45, 157, 122, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        }}>
        <h1 style={{ 
          color: '#2d9d7a', 
          marginBottom: '0.5rem',
          fontSize: '2rem',
          fontWeight: 'bold'
        }}>
          GePanda AI Group Chat
        </h1>
        <p style={{ color: '#a0a0a0', marginBottom: '2rem' }}>Join a room to start chatting</p>
        
        {joiningRoom && (
          <div style={{ 
            padding: '1rem', 
            marginBottom: '1rem', 
            backgroundColor: '#1a1a1a', 
            border: '1px solid #2d9d7a',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, color: '#2d9d7a' }}>Joining room... Please wait</p>
          </div>
        )}
        
        {/* Invite link section */}
        <div style={{ 
          marginBottom: '2rem', 
          padding: '1.5rem', 
          backgroundColor: '#1a1a1a', 
          borderRadius: '8px',
          border: '1px solid #2d2d2d'
        }}>
          <h3 style={{ 
            marginBottom: '0.75rem', 
            fontSize: '1rem',
            color: '#fbbf24',
            fontWeight: '600'
          }}>
            Or join with invite link:
          </h3>
          <form onSubmit={handleInviteSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={inviteToken}
              onChange={(e) => setInviteToken(e.target.value)}
              placeholder="Paste invite URL or token"
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid #2d2d2d',
                borderRadius: '6px',
                backgroundColor: '#0a0a0a',
                color: '#e5e5e5',
                fontSize: '0.875rem',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#fbbf24',
                color: '#000000',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.875rem',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f59e0b'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fbbf24'}
            >
              Use Invite
            </button>
          </form>
        </div>

        <form 
          onSubmit={handleJoinRoom} 
          style={{ marginTop: '1rem' }}
          noValidate
        >
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontSize: '0.875rem', fontWeight: '500' }}>
              Room ID:
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  marginTop: '0.5rem',
                  border: '1px solid #2d2d2d',
                  borderRadius: '6px',
                  backgroundColor: '#1a1a1a',
                  color: '#e5e5e5',
                  fontSize: '0.875rem',
                }}
              />
            </label>
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontSize: '0.875rem', fontWeight: '500' }}>
              User ID:
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  marginTop: '0.5rem',
                  border: '1px solid #2d2d2d',
                  borderRadius: '6px',
                  backgroundColor: '#1a1a1a',
                  color: '#e5e5e5',
                  fontSize: '0.875rem',
                }}
              />
            </label>
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontSize: '0.875rem', fontWeight: '500' }}>
              Username:
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  marginTop: '0.5rem',
                  border: '1px solid #2d2d2d',
                  borderRadius: '6px',
                  backgroundColor: '#1a1a1a',
                  color: '#e5e5e5',
                  fontSize: '0.875rem',
                }}
              />
            </label>
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontSize: '0.875rem', fontWeight: '500' }}>
              Room Template:
              <select
                value={roomTemplate}
                onChange={(e) => setRoomTemplate(e.target.value as RoomTemplate)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  marginTop: '0.5rem',
                  border: '1px solid #2d2d2d',
                  borderRadius: '6px',
                  backgroundColor: '#1a1a1a',
                  color: '#e5e5e5',
                  fontSize: '0.875rem',
                }}
              >
                <option value={RoomTemplate.TRAVEL_PLANNING}>Travel Planning</option>
                <option value={RoomTemplate.LIVE_TRIP}>Live Trip</option>
                <option value={RoomTemplate.FLIGHT_TRACKING}>Flight Tracking</option>
                <option value={RoomTemplate.FOOD_DISCOVERY}>Food Discovery</option>
                <option value={RoomTemplate.GENERAL}>General</option>
              </select>
            </label>
          </div>
          <button
            type="button"
            disabled={joiningRoom}
            onClick={async (e) => {
              console.log('[Frontend] Button clicked directly', { joiningRoom, roomId, userId, username });
              e.preventDefault();
              e.stopPropagation();
              handleJoinRoom(e);
            }}
            style={{
              width: '100%',
              padding: '0.875rem 1.5rem',
              backgroundColor: joiningRoom ? '#2d2d2d' : '#1a7a5e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: joiningRoom ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!joiningRoom) e.currentTarget.style.backgroundColor = '#2d9d7a';
            }}
            onMouseLeave={(e) => {
              if (!joiningRoom) e.currentTarget.style.backgroundColor = '#1a7a5e';
            }}
          >
            {joiningRoom ? 'Joining...' : 'Join Room'}
          </button>
        </form>
        </div>
      </main>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden', minWidth: 0 }}>
      <Chat client={client}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden', minWidth: 0, flex: 1 }}>
          {/* Trip Context Toggle and Invite Button - Enhanced */}
          <div style={{ 
            padding: '1rem 1.25rem', 
            background: 'linear-gradient(135deg, #0d4f3c 0%, #1a7a5e 100%)',
            borderBottom: '2px solid rgba(45, 157, 122, 0.4)',
        display: 'flex',
            gap: '0.75rem',
            flexShrink: 0,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
            alignItems: 'center',
            width: '100%',
            minWidth: 0
          }}>
        <button
          onClick={() => setShowTripContext(!showTripContext)}
          style={{
                padding: '0.75rem 1.5rem',
                background: showTripContext 
                  ? 'linear-gradient(135deg, #2d9d7a 0%, #1a7a5e 100%)' 
                  : 'linear-gradient(135deg, rgba(26, 26, 26, 0.8) 0%, rgba(13, 13, 13, 0.8) 100%)',
                color: showTripContext ? 'white' : '#e5e5e5',
                border: showTripContext ? 'none' : '2px solid rgba(45, 157, 122, 0.3)',
                borderRadius: '0.75rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: showTripContext 
                  ? '0 4px 12px rgba(45, 157, 122, 0.4)' 
                  : '0 2px 8px rgba(0, 0, 0, 0.2)',
              }}
              onMouseEnter={(e) => {
                if (!showTripContext) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(45, 45, 45, 0.9) 0%, rgba(26, 26, 26, 0.9) 100%)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!showTripContext) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(26, 26, 26, 0.8) 0%, rgba(13, 13, 13, 0.8) 100%)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {showTripContext ? 'Hide' : 'Show'} Trip Context
            </button>
            <button
              onClick={handleGenerateInvite}
              disabled={inviteLoading}
              style={{
                padding: '0.75rem 1.5rem',
                background: inviteLoading 
                  ? 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)' 
                  : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                color: inviteLoading ? '#a0a0a0' : '#000000',
                border: 'none',
                borderRadius: '0.75rem',
                cursor: inviteLoading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '700',
                transition: 'all 0.3s ease',
                boxShadow: inviteLoading 
                  ? '0 2px 8px rgba(0, 0, 0, 0.2)' 
                  : '0 4px 12px rgba(251, 191, 36, 0.4)',
              }}
              onMouseEnter={(e) => {
                if (!inviteLoading) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(251, 191, 36, 0.5)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!inviteLoading) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(251, 191, 36, 0.4)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {inviteLoading ? 'Generating...' : 'Invite'}
        </button>
      </div>

          {/* Invite Dialog */}
          {showInviteDialog && inviteUrl && (
        <div
          style={{
            padding: '1rem',
                backgroundColor: '#1a1a1a',
                borderBottom: '1px solid #2d9d7a',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: '600', margin: 0, color: '#fbbf24' }}>Invite Link:</h3>
                <button
                  onClick={() => setShowInviteDialog(false)}
            style={{
                    marginLeft: 'auto',
                    padding: '0.25rem 0.5rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.25rem',
                    color: '#a0a0a0',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#e5e5e5'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#a0a0a0'}
                >
                  ×
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={inviteUrl}
                  readOnly
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '1px solid #2d9d7a',
                    borderRadius: '6px',
                    backgroundColor: '#0a0a0a',
                    color: '#e5e5e5',
              fontSize: '0.875rem',
            }}
          />
          <button
                  onClick={handleCopyInviteLink}
            style={{
                    padding: '0.75rem 1.25rem',
                    backgroundColor: '#1a7a5e',
              color: 'white',
              border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2d9d7a'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a7a5e'}
                >
                  Copy Link
          </button>
              </div>
        </div>
      )}

          {showTripContext && (
      <div
        style={{
          padding: '1rem',
                backgroundColor: '#1a1a1a',
                borderBottom: '1px solid #2d2d2d',
                flexShrink: 0,
                maxHeight: '400px',
                overflowY: 'auto',
              }}
            >
              <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: '#2d9d7a', fontWeight: '600' }}>Trip Context</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: '#a0a0a0' }}>
                    Destination
                  </label>
                  <input
                    type="text"
                    value={tripContext.destination}
                    onChange={(e) => setTripContext({ ...tripContext, destination: e.target.value })}
                    placeholder="e.g., Paris, Tokyo"
              style={{
                      width: '100%',
                padding: '0.5rem',
                      border: '1px solid #2d2d2d',
                borderRadius: '4px',
                      backgroundColor: '#0a0a0a',
                      color: '#e5e5e5',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: '#a0a0a0' }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={tripContext.startDate}
                      onChange={(e) => setTripContext({ ...tripContext, startDate: e.target.value })}
                    style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #2d2d2d',
                        borderRadius: '4px',
                        backgroundColor: '#0a0a0a',
                        color: '#e5e5e5',
                        fontSize: '0.875rem',
                      }}
                    />
              </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: '#a0a0a0' }}>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={tripContext.endDate}
                      onChange={(e) => setTripContext({ ...tripContext, endDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #2d2d2d',
                        borderRadius: '4px',
                        backgroundColor: '#0a0a0a',
                        color: '#e5e5e5',
                        fontSize: '0.875rem',
                      }}
                    />
              </div>
      </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: '#a0a0a0' }}>
                      Travelers
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={tripContext.travelers}
                      onChange={(e) => setTripContext({ ...tripContext, travelers: e.target.value })}
                      placeholder="2"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #2d2d2d',
                        borderRadius: '4px',
                        backgroundColor: '#0a0a0a',
                        color: '#e5e5e5',
                        fontSize: '0.875rem',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: '#a0a0a0' }}>
                      Budget Range
                    </label>
          <input
            type="text"
                      value={tripContext.budgetRange}
                      onChange={(e) => setTripContext({ ...tripContext, budgetRange: e.target.value })}
                      placeholder="e.g., $1000-$2000"
            style={{
                        width: '100%',
              padding: '0.5rem',
                        border: '1px solid #2d2d2d',
              borderRadius: '4px',
                        backgroundColor: '#0a0a0a',
                        color: '#e5e5e5',
                        fontSize: '0.875rem',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: '#a0a0a0' }}>
                    Interests (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={tripContext.interests}
                    onChange={(e) => setTripContext({ ...tripContext, interests: e.target.value })}
                    placeholder="e.g., museums, food, nature"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #2d2d2d',
                      borderRadius: '4px',
                      backgroundColor: '#0a0a0a',
                      color: '#e5e5e5',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: '#a0a0a0' }}>
                    Notes
                  </label>
                  <textarea
                    value={tripContext.notes}
                    onChange={(e) => setTripContext({ ...tripContext, notes: e.target.value })}
                    placeholder="Additional trip notes..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #2d2d2d',
                      borderRadius: '4px',
                      backgroundColor: '#0a0a0a',
                      color: '#e5e5e5',
                      fontSize: '0.875rem',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

          <button
                onClick={handleSaveTripContext}
                disabled={tripContextLoading}
            style={{
                  marginTop: '1rem',
                  padding: '0.625rem 1.25rem',
                  backgroundColor: tripContextLoading ? '#2d2d2d' : '#1a7a5e',
                  color: tripContextLoading ? '#a0a0a0' : 'white',
              border: 'none',
                  borderRadius: '6px',
                  cursor: tripContextLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'background-color 0.2s',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  if (!tripContextLoading) e.currentTarget.style.backgroundColor = '#2d9d7a';
                }}
                onMouseLeave={(e) => {
                  if (!tripContextLoading) e.currentTarget.style.backgroundColor = '#1a7a5e';
                }}
              >
                {tripContextLoading ? 'Saving...' : 'Save Trip Context'}
          </button>
        </div>
          )}

          {/* Stream Chat UI */}
          <div style={{ 
            flex: 1, 
            minHeight: 0,
            minWidth: 0,
            overflow: 'hidden', 
            display: 'flex', 
            flexDirection: 'column',
            position: 'relative',
            width: '100%',
            height: '100%'
          }}>
            <Channel channel={channel}>
              <Window>
                <ChannelHeader />
                <MessageList />
                <MessageInput />
              </Window>
              <Thread />
            </Channel>
          </div>
        </div>
      </Chat>
    </div>
  );
}
