// Socket.IO event name constants
export const SOCKET_EVENTS = {
  ROOM_JOIN: 'room:join',
  ROOM_JOINED: 'room:joined',
  MESSAGE_SEND: 'message:send',
  MESSAGE_NEW: 'message:new',
  MESSAGE_EDIT: 'message:edit',
  MESSAGE_DELETE: 'message:delete',
  MESSAGE_UPDATED: 'message:updated',
  MESSAGE_DELETED: 'message:deleted',
  ROOM_MEMBERS: 'room:members',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  TYPING_USERS: 'typing:users',
  MESSAGES_LOAD_MORE: 'messages:load-more',
  MESSAGES_LOADED: 'messages:loaded',
  MESSAGE_REACTION_ADD: 'message:reaction:add',
  MESSAGE_REACTION_REMOVE: 'message:reaction:remove',
  MESSAGE_REACTION_UPDATED: 'message:reaction:updated',
} as const;

