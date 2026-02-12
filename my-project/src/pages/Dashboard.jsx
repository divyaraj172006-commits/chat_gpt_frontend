import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [error, setError] = useState('');

    // --- STATE MANAGEMENT ---
    const [messages, setMessages] = useState([]);       // Current active chat view
    const [sessions, setSessions] = useState([]);       // Sidebar List
    const [searchQuery, setSearchQuery] = useState(''); // Search Filter State
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [menuOpenId, setMenuOpenId] = useState(null);

    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);

    const messagesEndRef = useRef(null);
    const menuRef = useRef(null);
    const navigate = useNavigate();

    // 1. FETCH USER DETAILS
    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) { navigate('/login'); return; }
            try {
                const response = await fetch('http://127.0.0.1:8000/users/me', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                });
                if (response.ok) {
                    const data = await response.json();
                    setUser(data);
                    fetchSessions(token); // Load sessions after user is confirmed
                } else {
                    handleLogout();
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load data');
            }
        };
        fetchUserData();
    }, [navigate]);

    // 2. FETCH SESSIONS FROM BACKEND
    const fetchSessions = async (token = localStorage.getItem('accessToken')) => {
        try {
            const response = await fetch('http://127.0.0.1:8000/chats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSessions(data);
            }
        } catch (error) {
            console.error("Failed to fetch sessions:", error);
        }
    };

    // 3. LOAD CHAT MESSAGES
    const loadSession = async (sessionId) => {
        const token = localStorage.getItem('accessToken');
        setActiveSessionId(sessionId);
        try {
            // Optimistic update from local state if available, but better to fetch fresh
            const response = await fetch(`http://127.0.0.1:8000/chats/${sessionId}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                // Map backend messages to UI format
                const formattedMessages = data.map(msg => ({
                    role: msg.role,
                    text: msg.content
                }));
                setMessages(formattedMessages);
            }
        } catch (error) {
            console.error("Failed to load messages:", error);
        }
    };

    // 4. AUTO SCROLL
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // 5. CLICK OUTSIDE MENU
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpenId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // --- HELPER: GET USERNAME ---
    const getUsername = () => {
        if (!user || !user.email) return 'User';
        const name = user.email.split('@')[0];
        return name.charAt(0).toUpperCase() + name.slice(1);
    };

    const getUserInitial = () => {
        if (!user || !user.email) return 'U';
        return user.email[0].toUpperCase();
    };

    // --- FILTER & SORT SESSIONS ---
    const filteredSessions = sessions
        .filter(session => session.title.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            if (a.is_pinned === b.is_pinned) return new Date(b.created_at) - new Date(a.created_at);
            return a.is_pinned ? -1 : 1;
        });

    // --- LOGOUT ---
    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setMessages([]);
        setSessions([]);
        setActiveSessionId(null);
        setMenuOpenId(null);
        setSearchQuery('');
        setUser(null);
        navigate('/login');
    };

    // --- NEW CHAT ---
    const handleNewChat = () => {
        setMessages([]);
        setActiveSessionId(null);
        setMenuOpenId(null);
        setSearchQuery('');
    };

    // --- DELETE CHAT SESSION ---
    const handleDeleteSession = async (e, sessionId) => {
        e.stopPropagation();
        const token = localStorage.getItem('accessToken');
        try {
            const response = await fetch(`http://127.0.0.1:8000/chats/${sessionId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setSessions(prev => prev.filter(s => s.id !== sessionId));
                if (activeSessionId === sessionId) {
                    handleNewChat();
                }
            }
        } catch (error) {
            console.error("Failed to delete session:", error);
        }
        setMenuOpenId(null);
    };

    // --- PIN CHAT SESSION ---
    const handlePinSession = async (e, sessionId) => {
        e.stopPropagation();
        const token = localStorage.getItem('accessToken');
        try {
            const response = await fetch(`http://127.0.0.1:8000/chats/${sessionId}/pin`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const updatedSession = await response.json();
                setSessions(prev => prev.map(s => s.id === sessionId ? updatedSession : s));
            }
        } catch (error) {
            console.error("Failed to pin session:", error);
        }
        setMenuOpenId(null);
    };

    // --- TOGGLE MENU ---
    const toggleMenu = (e, sessionId) => {
        e.stopPropagation();
        setMenuOpenId(menuOpenId === sessionId ? null : sessionId);
    };

    // --- SEND MESSAGE ---
    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userText = inputValue;
        setInputValue('');
        const token = localStorage.getItem('accessToken');

        // Optimistic UI update
        const userMessage = { role: 'user', text: userText };
        setMessages(prev => [...prev, userMessage]);
        setIsSending(true);

        try {
            let sessionId = activeSessionId;

            // If no active session, create one first
            if (!sessionId) {
                const createResponse = await fetch('http://127.0.0.1:8000/chats', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!createResponse.ok) throw new Error("Failed to create session");
                const newSession = await createResponse.json();
                sessionId = newSession.id;
                setActiveSessionId(sessionId);
                // Add to sidebar immediately
                setSessions(prev => [newSession, ...prev]);
            }

            // Send message to the session
            const response = await fetch(`http://127.0.0.1:8000/chats/${sessionId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    content: userText,
                    role: "user" // Required by schema
                }),
            });

            if (!response.ok) throw new Error("Server Error");
            const data = await response.json();

            // data is the AI message response object
            const aiMessage = { role: 'ai', text: data.content };
            setMessages(prev => [...prev, aiMessage]);

            // Refresh sessions to update title/last message time if needed
            // For now, let's just re-fetch sessions to keep it synced or manually update if we care about title
            fetchSessions(token);

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'ai', text: "⚠️ Error: Could not connect to AI backend." }]);
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSend();
    };

    // Format Date helper
    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 text-gray-100 font-sans">

            {/* SIDEBAR */}
            <aside className="w-[260px] bg-black/20 backdrop-blur-lg flex flex-col hidden md:flex border-r border-white/5">
                <div className="p-4">
                    {/* New Chat Button */}
                    <button onClick={handleNewChat} className="flex items-center gap-3 w-full px-3 py-3 rounded-xl border border-indigo-500/50 hover:bg-indigo-500/20 transition text-sm text-left text-indigo-200 font-semibold group mb-4 shadow-lg shadow-indigo-500/10">
                        <span className="text-xl group-hover:rotate-90 transition duration-300">+</span>
                        New Chat
                    </button>

                    {/* SEARCH BAR */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-gray-500 group-focus-within:text-indigo-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2.5 border border-white/10 rounded-lg leading-5 bg-slate-900/50 text-gray-300 placeholder-gray-500 focus:outline-none focus:bg-slate-900 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 sm:text-xs transition duration-150 ease-in-out"
                            placeholder="Search chats..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* --- HISTORY LIST --- */}
                <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-gray-700" ref={menuRef}>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">History</div>
                    <div className="flex flex-col gap-2">
                        {filteredSessions.length > 0 ? (
                            filteredSessions.map((session) => (
                                <div
                                    key={session.id}
                                    onClick={() => loadSession(session.id)}
                                    className={`group relative flex items-center gap-3 px-3 py-3 text-sm rounded-xl transition cursor-pointer ${activeSessionId === session.id ? 'bg-white/10 text-white shadow-inner' : 'text-gray-300 hover:bg-white/5'}`}
                                >
                                    <span className={`text-gray-500 transition ${activeSessionId === session.id ? 'text-indigo-400' : 'group-hover:text-indigo-400'}`}>
                                        {session.is_pinned ? '📌' : '💬'}
                                    </span>

                                    <div className="flex flex-col overflow-hidden w-full mr-6">
                                        <span className="truncate font-medium flex items-center gap-1">
                                            {session.title}
                                        </span>
                                        <span className="text-[10px] text-gray-600 group-hover:text-gray-400">{formatTime(session.created_at)}</span>
                                    </div>

                                    {/* MENU DOTS BUTTON */}
                                    <button
                                        onClick={(e) => toggleMenu(e, session.id)}
                                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-all ${menuOpenId === session.id ? 'opacity-100 bg-white/10 text-white' : 'opacity-0 group-hover:opacity-100'}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                            <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
                                        </svg>
                                    </button>

                                    {/* DROPDOWN MENU */}
                                    {menuOpenId === session.id && (
                                        <div className="absolute right-0 top-full mt-1 w-32 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden backdrop-blur-md">
                                            <button
                                                onClick={(e) => handlePinSession(e, session.id)}
                                                className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-2"
                                            >
                                                <span>{session.is_pinned ? 'Unpin' : 'Pin'}</span>
                                            </button>
                                            <div className="border-t border-white/5"></div>
                                            <button
                                                onClick={(e) => handleDeleteSession(e, session.id)}
                                                className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2"
                                            >
                                                <span>Delete</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-gray-600 text-xs py-4">
                                {searchQuery ? 'No chats found' : 'No history yet'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer removed: User profile moved to top header */}
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col relative bg-slate-900/50">

                {/* --- NEW DASHBOARD HEADER --- */}
                <header className="flex items-center justify-between px-6 py-4 bg-slate-900/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        {/* Mobile Logo (Visible only on small screens) */}
                        <div className="md:hidden font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 text-xl">
                            Nova
                        </div>
                        {/* Desktop Context Title */}
                        <h2 className="hidden md:block text-lg font-semibold text-gray-200">
                            {activeSessionId ? 'Chat Session' : 'Dashboard'}
                        </h2>
                    </div>

                    {/* RIGHT SIDE: User Profile & Actions */}
                    <div className="flex items-center gap-4">
                        {user && (
                            <div className="flex items-center gap-3 pl-3 pr-1 py-1 bg-white/5 rounded-full border border-white/5 hover:bg-white/10 transition group cursor-default">
                                <span className="text-sm font-medium text-gray-200 group-hover:text-white transition">
                                    {getUsername()}
                                </span>
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-purple-500/20">
                                    {getUserInitial()}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleLogout}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all"
                            title="Logout"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                        </button>
                    </div>
                </header>

                <div className="flex-1 flex flex-col p-4 overflow-y-auto w-full max-w-5xl mx-auto scrollbar-hide">
                    {messages.length === 0 ? (
                        // WELCOME PAGE
                        <div className="flex flex-col items-center justify-center h-full space-y-8">
                            <div className="text-center">
                                <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-purple-500/40 animate-pulse">
                                    <span className="text-5xl">🛸</span>
                                </div>
                                <h2 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
                                    <span className="text-gray-200">Hi, </span>
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-yellow-400">
                                        {getUsername()}
                                    </span>
                                    <span className="ml-2 animate-bounce inline-block">👋</span>
                                    <span className="ml-2 text-red-500 drop-shadow-lg">❤️</span>
                                </h2>

                                <h1 className="text-6xl md:text-7xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 tracking-tighter drop-shadow-2xl">
                                    NOVA
                                </h1>
                                <p className="text-gray-400 text-lg md:text-xl font-light">Your intelligent AI companion.</p>
                            </div>
                        </div>
                    ) : (
                        // CHAT INTERFACE
                        <div className="flex flex-col space-y-6 pb-4">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user'
                                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-none shadow-lg shadow-purple-500/20'
                                            : 'bg-white/10 border border-white/10 text-gray-100 rounded-bl-none backdrop-blur-md'
                                        }`}>
                                        <div className="flex items-center gap-2 mb-1 opacity-50 text-xs uppercase font-bold tracking-wider">
                                            {msg.role === 'user' ? 'You' : 'Nova'}
                                        </div>
                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                    </div>
                                </div>
                            ))}
                            {isSending && (
                                <div className="flex justify-start animate-pulse">
                                    <div className="bg-white/5 border border-white/5 p-4 rounded-2xl rounded-bl-none text-gray-400 text-sm">
                                        Thinking...
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* INPUT AREA */}
                <div className="w-full p-4 md:p-6 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
                    <div className="max-w-3xl mx-auto relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                        <input
                            type="text"
                            placeholder={isSending ? "Processing..." : "Ask Nova..."}
                            disabled={isSending}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="relative w-full bg-slate-900/90 text-white rounded-2xl shadow-2xl border border-white/10 pl-5 pr-14 py-4 focus:outline-none focus:border-purple-500/50 placeholder-gray-500 transition-all disabled:opacity-50"
                        />
                        <button
                            onClick={handleSend}
                            disabled={isSending}
                            className={`absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-200 hover:scale-105 active:scale-95 ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1.2em" width="1.2em" xmlns="http://www.w3.org/2000/svg"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </div>
                </div>

            </main>
        </div>
    );
};

export default Dashboard;