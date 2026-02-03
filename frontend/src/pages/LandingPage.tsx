import { Navbar, HeroSection, HowItWorks, LandingRewards, LandingReferral, FAQ, StartStaking, Footer } from '../components'

function LandingPage() {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />
            <div id="hero">
                <HeroSection />
            </div>
            <div id="how-it-works">
                <HowItWorks />
            </div>
            <div id="rewards">
                <LandingRewards />
            </div>
            <div id="referral">
                <LandingReferral />
            </div>
            <div id="faq">
                <FAQ />
            </div>
            <StartStaking />
            <Footer />
        </div>
    )
}

export default LandingPage
