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
    
    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);
    
    const messagesEndRef = useRef(null);
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

    // 2. LOAD HISTORY
    useEffect(() => {
        if (user && user.email) {
            const savedSessions = localStorage.getItem(`nova_sessions_${user.email}`);
            if (savedSessions) {
                setSessions(JSON.parse(savedSessions));
            }
        }
    }, [user]);

    // 3. SAVE HISTORY
    useEffect(() => {
        if (user && user.email) {
            localStorage.setItem(`nova_sessions_${user.email}`, JSON.stringify(sessions));
        }
    }, [sessions, user]);

    // 4. AUTO SCROLL
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // --- HELPER: GET USERNAME ---
    const getUsername = () => {
        if (!user || !user.email) return 'User';
        const name = user.email.split('@')[0];
        return name.charAt(0).toUpperCase() + name.slice(1); // Capitalize first letter
    };

    // --- FILTER SESSIONS ---
    const filteredSessions = sessions.filter(session => 
        session.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // --- LOGOUT ---
    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setMessages([]); 
        setSessions([]); 
        setActiveSessionId(null);
        setSearchQuery('');
        setUser(null);
        navigate('/login');
    };

    // --- NEW CHAT ---
    const handleNewChat = () => {
        setMessages([]); 
        setActiveSessionId(null); 
        setSearchQuery('');
    };

    // --- LOAD CHAT ---
    const loadSession = (sessionId) => {
        const sessionToLoad = sessions.find(s => s.id === sessionId);
        if (sessionToLoad) {
            setMessages(sessionToLoad.messages);
            setActiveSessionId(sessionId);
        }
    };

    // --- SEND MESSAGE ---
    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userText = inputValue;
        setInputValue(''); 

        const userMessage = { role: 'user', text: userText };
        setMessages(prev => [...prev, userMessage]);
        setIsSending(true);

        try {
            const response = await fetch('http://127.0.0.1:8000/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: userText,
                    system_prompt: "You are a helpful AI assistant." 
                }),
            });

            if (!response.ok) throw new Error("Server Error");
            const data = await response.json();

            const aiMessage = { role: 'ai', text: data.response };
            setMessages(prev => [...prev, aiMessage]);

            const newHistoryItem = {
                id: Date.now(), 
                title: userText, 
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                messages: [userMessage, aiMessage]
            };

            setSessions(prev => [newHistoryItem, ...prev]);

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

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 text-gray-100 font-sans">
            
            {/* SIDEBAR */}
            <aside className="w-[260px] bg-black/20 backdrop-blur-lg flex flex-col hidden md:flex border-r border-white/5">
                <div className="p-3">
                    {/* New Chat Button */}
                    <button onClick={handleNewChat} className="flex items-center gap-3 w-full px-3 py-3 rounded-xl border border-indigo-500/50 hover:bg-indigo-500/20 transition text-sm text-left text-indigo-200 font-semibold group mb-3">
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
                            className="block w-full pl-10 pr-3 py-2 border border-white/10 rounded-lg leading-5 bg-slate-900/50 text-gray-300 placeholder-gray-500 focus:outline-none focus:bg-slate-900 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 sm:text-xs transition duration-150 ease-in-out"
                            placeholder="Search chats..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* --- HISTORY LIST --- */}
                <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-gray-700">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">History</div>
                    <div className="flex flex-col gap-2">
                        {filteredSessions.length > 0 ? (
                            filteredSessions.map((session) => (
                                <button 
                                    key={session.id} 
                                    onClick={() => loadSession(session.id)}
                                    className={`flex items-center gap-3 px-3 py-3 text-sm rounded-xl transition group overflow-hidden text-left ${activeSessionId === session.id ? 'bg-white/10 text-white shadow-inner' : 'text-gray-300 hover:bg-white/5'}`}
                                >
                                    <span className={`text-gray-500 transition ${activeSessionId === session.id ? 'text-indigo-400' : 'group-hover:text-indigo-400'}`}>💬</span>
                                    <div className="flex flex-col overflow-hidden w-full">
                                        <span className="truncate font-medium">{session.title}</span>
                                        <span className="text-[10px] text-gray-600 group-hover:text-gray-400">{session.time}</span>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="text-center text-gray-600 text-xs py-4">
                                {searchQuery ? 'No chats found' : 'No history yet'}
                            </div>
                        )}
                    </div>
                </div>

                <div className="border-t border-white/5 p-3 bg-black/10">
                    {user && (
                        <div className="flex items-center gap-3 px-3 py-3 hover:bg-white/5 rounded-xl cursor-pointer transition group" onClick={handleLogout}>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-500/20">
                                {user.email[0].toUpperCase()}
                            </div>
                            <div className="flex-1 text-sm font-medium truncate text-gray-200 group-hover:text-white">{user.email}</div>
                        </div>
                    )}
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col relative">
                {/* MOBILE HEADER */}
                <header className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-slate-900/50 backdrop-blur-md">
                    <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Nova</span>
                    <button onClick={handleLogout} className="text-sm text-red-400">Logout</button>
                </header>

                <div className="flex-1 flex flex-col p-4 overflow-y-auto w-full max-w-5xl mx-auto">
                    
                    {messages.length === 0 ? (
                        // WELCOME PAGE (EMPTY STATE)
                        <div className="flex flex-col items-center justify-center h-full space-y-8">
                            <div className="text-center">
                                {/* LOGO */}
                                <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-purple-500/40 animate-pulse">
                                    <span className="text-5xl">🛸</span>
                                </div>
                                
                                {/* STYLIZED GREETING */}
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
                                    <div className={`max-w-[80%] p-4 rounded-2xl ${
                                        msg.role === 'user' 
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