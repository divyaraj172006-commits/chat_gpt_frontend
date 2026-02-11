import React, { useState } from 'react';

const Signup = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const [message, setMessage] = useState(""); // To show success/error messages

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("Signing up...");

        try {
            // This is the part that sends data to FastAPI
            const response = await fetch('http://127.0.0.1:8000/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage("✅ Signup Successful! Check your database.");
                console.log("Success:", data);
            } else {
                setMessage(`❌ Error: ${data.detail || "Signup failed"}`);
                console.error("Error:", data);
            }
        } catch (error) {
            setMessage("❌ Network Error. Is backend running?");
            console.error("Fetch error:", error);
        }
    };

    return (
        <div className="flex min-h-[80vh] items-center justify-center bg-gray-100 px-4">
            <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-lg">
                <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">
                    Create Account
                </h2>

                {/* Message Display Area */}
                {message && (
                    <div className={`mb-4 p-2 text-center text-sm rounded ${message.includes("Error") || message.includes("Network") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm outline-none transition"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm outline-none transition"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-blue-500 transition-colors duration-200"
                    >
                        Sign Up
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Signup;