
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import StartStaking from '../components/StartStaking';

const Privacy = () => {
    return (
        <div className="bg-white min-h-screen">
            <Navbar />

            <div className="pt-32 pb-20 px-6 max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 font-manrope">Privacy Policy</h1>

                <div className="prose prose-lg max-w-none">
                    <p className="text-gray-600 leading-relaxed mb-6">
                        Last updated: {new Date().toLocaleDateString()}
                    </p>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">1. Information We Collect</h2>
                    <p className="text-gray-700 mb-6">
                        We collect information you provide directly to us, such as when you create an account, connect your wallet, or participate in our staking programs.
                    </p>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">2. How We Use Your Information</h2>
                    <p className="text-gray-700 mb-6">
                        We use the information we collect to provide, maintain, and improve our services, such as to:
                        <ul className="list-disc pl-6 mt-2 space-y-2">
                            <li>Process your transactions and staking rewards;</li>
                            <li>Send you technical notices, updates, security alerts, and support messages;</li>
                            <li>Respond to your comments, questions, and requests;</li>
                        </ul>
                    </p>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">3. Sharing of Information</h2>
                    <p className="text-gray-700 mb-6">
                        We do not share your personal information with third parties except as described in this policy or with your consent. We may share information with vendors, consultants, and other service providers who need access to such information to carry out work on our behalf.
                    </p>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">4. Security</h2>
                    <p className="text-gray-700 mb-6">
                        We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.
                    </p>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">5. Changes to this Policy</h2>
                    <p className="text-gray-700 mb-6">
                        We may change this privacy policy from time to time. If we make changes, we will notify you by revising the date at the top of the policy.
                    </p>
                </div>
            </div>

            <StartStaking />
            <Footer />
        </div >
    );
};

export default Privacy;
