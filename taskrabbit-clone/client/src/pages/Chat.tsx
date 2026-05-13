import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Send, Loader2, MessageSquare, Check, CheckCheck } from 'lucide-react';
import { useAppSelector } from '../app/hooks';
import {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useCreateConversationMutation,
  useMarkAsReadMutation,
} from '../features/chat/chatApi';
import { getSocket } from '../lib/socket';
import { IConversation, IMessage, IUser } from '../types';

// ── helpers ──────────────────────────────────────────────────────────────────

function avatar(user: IUser | string | undefined): string {
  if (!user || typeof user === 'string') return '';
  return (user as IUser).avatar ?? '';
}

function name(user: IUser | string | undefined): string {
  if (!user || typeof user === 'string') return 'User';
  return (user as IUser).name ?? 'User';
}

function initials(n: string) {
  return n.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ user, size = 'md' }: { user: IUser | string | undefined; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm';
  const src = avatar(user);
  const n = name(user);
  if (src) return <img src={src} alt={n} className={`${sz} rounded-full object-cover flex-shrink-0`} />;
  return (
    <div className={`${sz} rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center flex-shrink-0`}>
      {initials(n)}
    </div>
  );
}

// ── ConversationItem ─────────────────────────────────────────────────────────

function ConversationItem({
  conv,
  active,
  myId,
  onClick,
  online,
}: {
  conv: IConversation;
  active: boolean;
  myId: string;
  onClick: () => void;
  online: string[];
}) {
  const other = conv.participants.find((p) => String((p as IUser)._id) !== myId);
  const otherId = other ? String((other as IUser)._id) : '';
  const unread = conv.unreadCount?.[myId] ?? 0;
  const isOnline = online.includes(otherId);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${active ? 'bg-primary-50 border-r-2 border-primary-600' : ''}`}
    >
      <div className="relative flex-shrink-0">
        <Avatar user={other} size="md" />
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between">
          <p className={`text-sm truncate ${active ? 'font-semibold text-primary-700' : 'font-medium text-gray-900'}`}>
            {name(other)}
          </p>
          {conv.lastMessage && (
            <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{fmtTime(conv.lastMessage.createdAt)}</span>
          )}
        </div>
        <p className="text-xs text-gray-400 truncate">
          {conv.lastMessage?.content ?? 'No messages yet'}
        </p>
      </div>
      {unread > 0 && (
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}

// ── MessageBubble ─────────────────────────────────────────────────────────────

function MessageBubble({ msg, isMe }: { msg: IMessage; isMe: boolean }) {
  if (msg.messageType === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{msg.content}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isMe && <Avatar user={msg.senderId} size="sm" />}
      <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        {msg.attachments?.length > 0 && (
          <div className="grid grid-cols-2 gap-1 mb-1">
            {msg.attachments.map((url, i) => (
              <img key={i} src={url} alt="attachment" className="rounded-lg object-cover w-full max-h-40" />
            ))}
          </div>
        )}
        {msg.content && (
          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'}`}>
            {msg.content}
          </div>
        )}
        <div className={`flex items-center gap-1 text-xs text-gray-400 ${isMe ? 'flex-row-reverse' : ''}`}>
          <span>{fmtTime(msg.createdAt)}</span>
          {isMe && (
            msg.readBy.length > 1
              ? <CheckCheck className="w-3 h-3 text-primary-400" />
              : <Check className="w-3 h-3" />
          )}
        </div>
      </div>
    </div>
  );
}

// ── DateDivider ───────────────────────────────────────────────────────────────

function DateDivider({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs text-gray-400 font-medium">{fmtDate(date)}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

// ── Main Chat Page ─────────────────────────────────────────────────────────────

export default function Chat() {
  const { user } = useAppSelector((s) => s.auth);
  const myId = user?._id ?? '';
  const [searchParams, setSearchParams] = useSearchParams();
  const taskIdParam = searchParams.get('taskId');

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], refetch: refetchConvs } = useGetConversationsQuery();
  const { data: msgData, isFetching: loadingMsgs } = useGetMessagesQuery(
    { conversationId: activeConvId! },
    { skip: !activeConvId }
  );
  const [createConv] = useCreateConversationMutation();
  const [markAsRead] = useMarkAsReadMutation();

  // Bootstrap: if taskId param provided, open or create conversation
  useEffect(() => {
    if (!taskIdParam) return;
    const existing = conversations.find((c) => {
      const tid = typeof c.taskId === 'string' ? c.taskId : (c.taskId as { _id: string })._id;
      return tid === taskIdParam;
    });
    if (existing) {
      setActiveConvId(existing._id);
      setSearchParams({});
    } else {
      createConv({ taskId: taskIdParam }).then((res) => {
        if ('data' in res && res.data) {
          setActiveConvId(res.data._id);
          refetchConvs();
        }
        setSearchParams({});
      });
    }
  }, [taskIdParam, conversations]);

  // Load messages from REST when conversation changes
  useEffect(() => {
    if (!msgData) return;
    setMessages(msgData.messages);
  }, [msgData]);

  // Socket setup
  useEffect(() => {
    const socket = getSocket();

    socket.on('online:list', (list: string[]) => setOnlineUsers(list));
    socket.on('user:online', ({ userId }: { userId: string }) =>
      setOnlineUsers((prev) => [...new Set([...prev, userId])])
    );
    socket.on('user:offline', ({ userId }: { userId: string }) =>
      setOnlineUsers((prev) => prev.filter((id) => id !== userId))
    );

    socket.on('message:new', (msg: IMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      refetchConvs();
    });

    socket.on('typing:start', ({ userId: uid, conversationId: cid }: { userId: string; conversationId: string }) => {
      if (cid === activeConvId) setTypingUsers((prev) => new Set([...prev, uid]));
    });
    socket.on('typing:stop', ({ userId: uid, conversationId: cid }: { userId: string; conversationId: string }) => {
      if (cid === activeConvId) setTypingUsers((prev) => { const n = new Set(prev); n.delete(uid); return n; });
    });
    socket.on('messages:read', ({ conversationId: cid }: { conversationId: string }) => {
      if (cid === activeConvId) {
        setMessages((prev) =>
          prev.map((m) => (m.readBy.includes(myId) ? m : { ...m, readBy: [...m.readBy, myId] }))
        );
      }
    });

    return () => {
      socket.off('online:list');
      socket.off('user:online');
      socket.off('user:offline');
      socket.off('message:new');
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('messages:read');
    };
  }, [activeConvId, myId]);

  // Join/leave conversation room
  useEffect(() => {
    const socket = getSocket();
    if (!activeConvId) return;
    socket.emit('join:conversation', activeConvId);
    markAsRead(activeConvId);
    return () => { socket.emit('leave:conversation', activeConvId); };
  }, [activeConvId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!input.trim() || !activeConvId || sending) return;
    const socket = getSocket();
    setSending(true);
    socket.emit('message:send', { conversationId: activeConvId, content: input.trim() });
    setInput('');
    setSending(false);
    socket.emit('typing:stop', activeConvId);
  }, [input, activeConvId, sending]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (!activeConvId) return;
    const socket = getSocket();
    socket.emit('typing:start', activeConvId);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socket.emit('typing:stop', activeConvId), 2000);
  };

  // Group messages by date
  const grouped: { date: string; msgs: IMessage[] }[] = [];
  for (const msg of messages) {
    const d = new Date(msg.createdAt).toDateString();
    const last = grouped[grouped.length - 1];
    if (last?.date === d) last.msgs.push(msg);
    else grouped.push({ date: d, msgs: [msg] });
  }

  const activeConv = conversations.find((c) => c._id === activeConvId);
  const otherParticipant = activeConv?.participants.find((p) => String((p as IUser)._id) !== myId);

  return (
    <>
      <Helmet><title>Messages | NeighbourWork</title></Helmet>
      <div className="h-[calc(100vh-64px)] flex bg-gray-50">

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
          <div className="px-4 py-4 border-b border-gray-200">
            <h2 className="font-bold text-gray-900 text-lg">Messages</h2>
            <p className="text-xs text-gray-400 mt-0.5">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
                <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-1">They appear when you accept a task or book a tasker</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <ConversationItem
                  key={conv._id}
                  conv={conv}
                  active={conv._id === activeConvId}
                  myId={myId}
                  online={onlineUsers}
                  onClick={() => setActiveConvId(conv._id)}
                />
              ))
            )}
          </div>
        </aside>

        {/* ── Main panel ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {!activeConvId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <MessageSquare className="w-14 h-14 mb-4 opacity-20" />
              <p className="font-medium text-gray-500">Select a conversation</p>
              <p className="text-sm mt-1">Choose from the list on the left</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3 flex-shrink-0">
                <div className="relative">
                  <Avatar user={otherParticipant} size="md" />
                  {otherParticipant && onlineUsers.includes(String((otherParticipant as IUser)._id)) && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{name(otherParticipant)}</p>
                  <p className="text-xs text-gray-400">
                    {otherParticipant && onlineUsers.includes(String((otherParticipant as IUser)._id)) ? (
                      <span className="text-green-500">Online</span>
                    ) : 'Offline'}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gray-50">
                {loadingMsgs ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                  </div>
                ) : (
                  grouped.map(({ date, msgs }) => (
                    <div key={date}>
                      <DateDivider date={msgs[0].createdAt} />
                      <div className="space-y-2">
                        {msgs.map((msg) => (
                          <MessageBubble key={msg._id} msg={msg} isMe={String(typeof msg.senderId === 'string' ? msg.senderId : (msg.senderId as IUser)._id) === myId} />
                        ))}
                      </div>
                    </div>
                  ))
                )}

                {typingUsers.size > 0 && (
                  <div className="flex items-center gap-2 pl-2">
                    <div className="flex gap-1 bg-white border border-gray-200 rounded-2xl px-3 py-2">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-gray-400">typing…</span>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0">
                <div className="flex items-end gap-3">
                  <textarea
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message…"
                    rows={1}
                    className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 max-h-32"
                    style={{ minHeight: '44px' }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className="flex items-center justify-center w-11 h-11 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white rounded-xl transition-colors flex-shrink-0"
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5 ml-1">Press Enter to send · Shift+Enter for new line</p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
