import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [error, setError] = useState('');
    
    // --- STATE MANAGEMENT ---
    const [messages, setMessages] = useState([]);      // Main Chat Messages
    const [history, setHistory] = useState([           // Sidebar History (Default items)
        { id: 1, text: 'Welcome to NovaDash', time: 'Just now' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);
    
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();

    // Stats Data
    const stats = [
        { label: 'Total Projects', value: '12 Active', icon: '🚀', style: 'border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20' },
        { label: 'Pending Tasks', value: '5 Urgent', icon: '⚡', style: 'border-pink-500/30 bg-pink-500/10 text-pink-300 hover:bg-pink-500/20' },
        { label: 'Unread Messages', value: '9 New', icon: '💬', style: 'border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20' },
        { label: 'Total Revenue', value: '$12,450', icon: '💰', style: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20' },
    ];

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
                    setError('Session expired.'); handleLogout();
                }
            } catch (err) { console.error(err); setError('Failed to load data'); }
        };
        fetchUserData();
    }, [navigate]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        navigate('/login');
    };

    // --- SEND FUNCTION ---
    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userText = inputValue;
        setInputValue(''); // Clear input immediately
        
        // 1. Add User Message to Chat
        const userMessage = { role: 'user', text: userText };
        setMessages(prev => [...prev, userMessage]);

        // 2. Add to Sidebar History
        const newHistoryItem = { 
            id: Date.now(), 
            text: userText, 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        };
        setHistory(prev => [newHistoryItem, ...prev]); // Add to TOP of list

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

            // 3. Add AI Response to Chat
            const aiMessage = { role: 'ai', text: data.response };
            setMessages(prev => [...prev, aiMessage]);

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
                    {/* New Chat Button: Clears the view but keeps history */}
                    <button onClick={() => setMessages([])} className="flex items-center gap-3 w-full px-3 py-3 rounded-xl border border-indigo-500/50 hover:bg-indigo-500/20 transition text-sm text-left text-indigo-200 font-semibold group">
                        <span className="text-xl group-hover:rotate-90 transition duration-300">+</span>
                        New Chat
                    </button>
                </div>

                {/* --- DYNAMIC HISTORY LIST --- */}
                <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-gray-700">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">Recent Activity</div>
                    <div className="flex flex-col gap-2">
                        {history.map((item) => (
                            <button key={item.id} className="flex items-center gap-3 px-3 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded-xl transition group overflow-hidden text-left">
                                <span className="text-gray-500 group-hover:text-indigo-400 transition">💬</span>
                                <div className="flex flex-col overflow-hidden w-full">
                                    <span className="truncate font-medium">{item.text}</span>
                                    <span className="text-[10px] text-gray-600 group-hover:text-gray-400">{item.time}</span>
                                </div>
                            </button>
                        ))}
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
                <header className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-slate-900/50 backdrop-blur-md">
                    <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">NovaDash</span>
                    <button onClick={handleLogout} className="text-sm text-red-400">Logout</button>
                </header>

                <div className="flex-1 flex flex-col p-4 overflow-y-auto w-full max-w-5xl mx-auto">
                    
                    {messages.length === 0 ? (
                        // EMPTY STATE
                        <div className="flex flex-col items-center justify-center h-full space-y-12">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-purple-500/30 animate-pulse">
                                    <span className="text-4xl">🛸</span>
                                </div>
                                <h1 className="text-5xl font-extrabold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                                    NovaDash
                                </h1>
                                <p className="text-gray-400 text-lg">Your command center for everything.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
                                {stats.map((stat, index) => (
                                    <button key={index} className={`flex flex-col items-start p-5 border rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${stat.style} backdrop-blur-sm text-left`}>
                                        <div className="flex items-center justify-between w-full mb-3">
                                            <span className="text-3xl bg-white/10 p-2 rounded-lg">{stat.icon}</span>
                                            <span className="text-xs font-bold opacity-70 uppercase tracking-widest">{stat.label}</span>
                                        </div>
                                        <span className="text-2xl font-bold text-white mb-1">{stat.value}</span>
                                    </button>
                                ))}
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
                                            {msg.role === 'user' ? 'You' : 'Nova AI'}
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
                            placeholder={isSending ? "Processing..." : "Ask NovaDash to analyze your data..."}
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