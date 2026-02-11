import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Mock Data for "New Features"
    const stats = [
        { label: 'Total Projects', value: '12', color: 'bg-blue-500' },
        { label: 'Pending Tasks', value: '5', color: 'bg-yellow-500' },
        { label: 'Messages', value: '9', color: 'bg-green-500' },
        { label: 'Revenue', value: '$12k', color: 'bg-purple-500' },
    ];

    const activities = [
        { id: 1, text: 'Logged in successfully', time: 'Just now' },
        { id: 2, text: 'Updated profile picture', time: '2 hours ago' },
        { id: 3, text: 'Completed project "Alpha"', time: 'Yesterday' },
    ];

    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                const response = await fetch('http://127.0.0.1:8000/users/me', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setUser(data);
                } else {
                    setError('Session expired. Please login again.');
                    handleLogout();
                }
            } catch (err) {
                console.error("Error fetching user data:", err);
                setError('Failed to load user data');
            }
        };

        fetchUserData();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tokenType');
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-gray-50">
            
            {/* Sidebar (Colorful Navigation) */}
            <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col">
                <div className="p-6">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                        NovaDash
                    </h1>
                </div>
                <nav className="flex-1 px-4 space-y-2">
                    <a href="#" className="block px-4 py-3 rounded-lg bg-indigo-600 text-white shadow-lg">Dashboard</a>
                    <a href="#" className="block px-4 py-3 rounded-lg hover:bg-slate-800 transition">Analytics</a>
                    <a href="#" className="block px-4 py-3 rounded-lg hover:bg-slate-800 transition">Settings</a>
                    <a href="#" className="block px-4 py-3 rounded-lg hover:bg-slate-800 transition">Support</a>
                </nav>
                <div className="p-4 border-t border-slate-800">
                    <button onClick={handleLogout} className="flex items-center text-slate-400 hover:text-white transition">
                        <span className="mr-2">🚪</span> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-y-auto">
                
                {/* Mobile Header */}
                <header className="bg-white shadow-sm p-4 md:hidden flex justify-between items-center">
                    <span className="font-bold text-lg text-indigo-600">NovaDash</span>
                    <button onClick={handleLogout} className="text-sm text-red-500">Logout</button>
                </header>

                <main className="p-8">
                    
                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm">
                            <p>{error}</p>
                        </div>
                    )}

                    {/* 1. Welcome Card (Gradient) */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white shadow-xl mb-8">
                        <div className="relative z-10">
                            <h2 className="text-3xl font-bold mb-2">
                                Welcome back, {user ? user.email.split('@')[0] : 'User'}! 👋
                            </h2>
                            <p className="opacity-90">
                                Here is what's happening with your projects today.
                            </p>
                            <div className="mt-6 flex space-x-4">
                                <button className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold shadow hover:bg-gray-100 transition">
                                    View Profile
                                </button>
                                <button className="bg-indigo-500 bg-opacity-40 text-white px-4 py-2 rounded-lg font-semibold hover:bg-opacity-50 transition">
                                    Edit Settings
                                </button>
                            </div>
                        </div>
                        {/* Decorative Circles */}
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-10"></div>
                        <div className="absolute bottom-0 right-20 -mb-16 w-40 h-40 rounded-full bg-white opacity-10"></div>
                    </div>

                    {/* 2. Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {stats.map((stat, index) => (
                            <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
                                    <div className={`w-3 h-3 rounded-full ${stat.color}`}></div>
                                </div>
                                <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* 3. Split Section: User Info & Activity */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* User Profile Card */}
                        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Profile Details</h3>
                            {user ? (
                                <div className="space-y-4">
                                    <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                                        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xl font-bold mr-4">
                                            {user.email[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Email Address</p>
                                            <p className="font-semibold text-gray-800">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                                        <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xl font-bold mr-4">
                                            #
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">User ID</p>
                                            <p className="font-semibold text-gray-800">{user.id}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="animate-pulse space-y-4">
                                    <div className="h-12 bg-gray-200 rounded"></div>
                                    <div className="h-12 bg-gray-200 rounded"></div>
                                </div>
                            )}
                        </div>

                        {/* Recent Activity List */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Activity</h3>
                            <ul className="space-y-4">
                                {activities.map((activity) => (
                                    <li key={activity.id} className="flex items-start">
                                        <div className="w-2 h-2 mt-2 bg-indigo-500 rounded-full mr-3"></div>
                                        <div>
                                            <p className="text-gray-800 font-medium text-sm">{activity.text}</p>
                                            <p className="text-gray-400 text-xs">{activity.time}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <button className="w-full mt-6 py-2 text-indigo-600 font-medium text-sm hover:bg-indigo-50 rounded transition">
                                View All History
                            </button>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;