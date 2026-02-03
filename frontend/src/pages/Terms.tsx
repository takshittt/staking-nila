
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import StartStaking from '../components/StartStaking';

const Terms = () => {
    return (
        <div className="bg-white min-h-screen">
            <Navbar />

            <div className="pt-32 pb-20 px-6 max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 font-manrope">Terms of Service</h1>

                <div className="prose prose-lg max-w-none">
                    <p className="text-gray-600 leading-relaxed mb-6">
                        Last updated: {new Date().toLocaleDateString()}
                    </p>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">1. Agreement to Terms</h2>
                    <p className="text-gray-700 mb-6">
                        By accessing our website and using our services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
                    </p>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">2. Intellectual Property Rights</h2>
                    <p className="text-gray-700 mb-6">
                        Other than the content you own, under these Terms, MindWaveDAO and/or its licensors own all the intellectual property rights and materials contained in this Website.
                    </p>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">3. Restrictions</h2>
                    <p className="text-gray-700 mb-6">
                        You are specifically restricted from all of the following:
                        <ul className="list-disc pl-6 mt-2 space-y-2">
                            <li>Publishing any Website material in any other media;</li>
                            <li>Selling, sublicensing and/or otherwise commercializing any Website material;</li>
                            <li>Publicly performing and/or showing any Website material;</li>
                            <li>Using this Website in any way that is or may be damaging to this Website;</li>
                            <li>Using this Website in any way that impacts user access to this Website;</li>
                        </ul>
                    </p>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">4. Limitation of Liability</h2>
                    <p className="text-gray-700 mb-6">
                        In no event shall MindWaveDAO, nor any of its officers, directors and employees, be held liable for anything arising out of or in any way connected with your use of this Website whether such liability is under contract.
                    </p>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">5. Variation of Terms</h2>
                    <p className="text-gray-700 mb-6">
                        MindWaveDAO is permitted to revise these Terms at any time as it sees fit, and by using this Website you are expected to review these Terms on a regular basis.
                    </p>
                </div>
            </div>

            <StartStaking />
            <Footer />
        </div>
    );
};

export default Terms;
