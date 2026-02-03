import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import StartStaking from '../components/StartStaking';

const Cookies = () => {
    return (
        <div className="bg-white min-h-screen">
            <Navbar />

            <div className="pt-32 pb-20 px-6 max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 font-manrope">Cookies Policy</h1>

                <div className="prose prose-lg max-w-none">
                    <p className="text-gray-600 leading-relaxed mb-6">
                        Last updated: {new Date().toLocaleDateString()}
                    </p>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">1. What Are Cookies</h2>
                    <p className="text-gray-700 mb-6">
                        Cookies are small text files that are stored on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and to provide information to the owners of the site.
                    </p>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">2. How We Use Cookies</h2>
                    <p className="text-gray-700 mb-6">
                        We use cookies for the following purposes:
                        <ul className="list-disc pl-6 mt-2 space-y-2">
                            <li><strong>Essential Cookies:</strong> These are necessary for the website to function properly.</li>
                            <li><strong>Analytics Cookies:</strong> These allow us to recognize and count the number of visitors and to see how visitors move around our website when they are using it.</li>
                            <li><strong>Functionality Cookies:</strong> These are used to recognize you when you return to our website.</li>
                        </ul>
                    </p>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">3. Managing Cookies</h2>
                    <p className="text-gray-700 mb-6">
                        Most web browsers allow you to control cookies through their settings preferences. However, if you limit the ability of websites to set cookies, you may worsen your overall user experience, since it will no longer be personalized to you.
                    </p>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">4. Contact Us</h2>
                    <p className="text-gray-700 mb-6">
                        If you have any questions about our use of cookies, please contact us.
                    </p>
                </div>
            </div>

            <StartStaking />
            <Footer />
        </div>
    );
};

export default Cookies;
