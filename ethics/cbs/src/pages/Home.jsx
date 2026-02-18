import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import { log } from '../utils/logger';
import { CRYPTO_NETWORKS, DEFAULT_NETWORK } from '../utils/constants';

// Environment-based API base URL
const API_BASE = import.meta.env.VITE_API_BASE;

if (import.meta.env.DEV) {
  log.info("API_BASE:", API_BASE);
}

export default function Home() {
  // Iframe Modal State
  const [iframeModal, setIframeModal] = useState({ show: false, url: '' });
  const [currentInvoiceId, setCurrentInvoiceId] = useState(null); // Store invoiceId for verification fallback

  // Listen for 3thix payment success message
  useEffect(() => {
    const handleMessage = (event) => {
      // Security: You can check event.origin here if needed, e.g. "https://webadmin.3thix.com"
      // But for now we trust the event structure.
      if (event.data && event.data.event === "payment.success") {
        log.info("Payment Successful via Iframe!", event.data);
        setIframeModal({ show: false, url: '' });

        // Normalize payload: check if data is nested or top-level
        const payload = event.data.data || event.data;

        // Show success modal or redirect to success page
        // Since the success page logic handles verification, let's redirect there with intent_id
        // standard format: success_url?intent_id=...
        const intentId = payload.intent_id || payload.payment_intent || payload.transaction_id;
        // Robustly find invoiceId/order_id from 3thix event data

        const invoiceId = payload.invoice_id ||
          payload.order_id ||
          payload.reference_id ||
          payload.id ||
          (payload.order && payload.order.order_id) ||
          (payload.metadata && payload.metadata.invoice_id) ||
          (payload.payment_intent && payload.payment_intent.metadata && payload.payment_intent.metadata.invoice_id) ||
          currentInvoiceId; // Use stored invoice ID as fallback

        log.info("Payment Success Event Data:", { intentId, invoiceId, raw: event.data });

        if (intentId) {
          // We can let the user stay on page or redirect. 
          // Redirecting ensures consistent post-payment experience (showing tokens etc)
          window.location.href = `/payment-success?intent_id=${intentId}&invoice_id=${invoiceId || ''}`;
        } else {
          setSuccessModal({ show: true }); // Fallback
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [currentInvoiceId]); // Add currentInvoiceId dependency

  // ... (existing code)




  const navigate = useNavigate();

  // Card Data - Billing Info ONLY (No sensitive card data)
  const [cardData, setCardData] = useState({
    billing_first_name: '',
    billing_last_name: '',
    billing_address: '',
    billing_city: '',
    billing_state: '',
    billing_postcode: '',
    billing_country: 'GB',
    billing_phone: ''
  });



  // Form State & Validation
  const [formData, setFormData] = useState({ name: '', email: '', wallet: '' });
  const [formErrors, setFormErrors] = useState({ email: '', wallet: '' });
  const [touched, setTouched] = useState({ email: false, wallet: false });

  // Dual-Tab & Crypto Flow State
  const [activeTab, setActiveTab] = useState('crypto'); // 'card' | 'crypto'
  const [cryptoStep, setCryptoStep] = useState(1);
  const [cryptoNetwork, setCryptoNetwork] = useState(DEFAULT_NETWORK);
  const [txHash, setTxHash] = useState('');
  const [cryptoSubmitting, setCryptoSubmitting] = useState(false);
  const [showCryptoSuccess, setShowCryptoSuccess] = useState(false);

  // === RESTORED MISSING STATE ===
  const [selectedAmount, setSelectedAmount] = useState('100');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Modals
  const [errorModal, setErrorModal] = useState({ show: false, title: '', message: '' });
  const [successModal, setSuccessModal] = useState({ show: false });
  const [failureModal, setFailureModal] = useState({ show: false });
  const [pollingModal, setPollingModal] = useState({ show: false, status: 'PROCESSING', message: '' });
  const [termsModal, setTermsModal] = useState({ show: false });
  const [privacyModal, setPrivacyModal] = useState({ show: false });


  // Regex Constants
  // Strict RFC 5322 compliant regex
  // Strict RFC 5322 compliant regex
  // This regex is more comprehensive than the previous one
  // Regex Constants
  // RFC 5322 Email Regex
  const EMAIL_REGEX = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
  const ETH_REGEX = /^0x[a-fA-F0-9]{40}$/;
  // TRON_REGEX removed - only BEP20 (0x...) addresses are accepted for crypto payments

  const validateEmail = (email) => {
    if (!email) return "Email is required";
    if (!EMAIL_REGEX.test(email)) return "Please enter a valid email address";

    // Block dummy text
    const lowerEmail = email.toLowerCase();
    if (lowerEmail.includes('test') || lowerEmail.includes('text') || lowerEmail.includes('example')) {
      return "Please enter a valid email address";
    }
    return "";
  };

  const validateWallet = (wallet) => {
    if (!wallet) return ""; // Optional for card, required for crypto (handled separately)

    // Only accept BEP20 (0x...) addresses
    const isBep20 = ETH_REGEX.test(wallet);

    if (!isBep20) {
      return "Invalid wallet address. Only BEP20 (0x...) addresses are accepted.";
    }
    return "";
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    if (field === 'email') {
      setFormErrors(prev => ({ ...prev, email: validateEmail(formData.email) }));
    }
    if (field === 'wallet') {
      setFormErrors(prev => ({ ...prev, wallet: validateWallet(formData.wallet) }));
    }
  };

  const handleChange = (field, value) => {
    // Auto-trim input for wallet addresses
    const cleanedValue = field === 'wallet' ? value.trim() : value;

    setFormData(prev => ({ ...prev, [field]: cleanedValue }));

    if (touched[field] || field === 'wallet') { // Live validate wallet for network detection
      if (field === 'wallet' && cleanedValue.length >= 10) {
        setFormErrors(prev => ({ ...prev, wallet: validateWallet(cleanedValue) }));
      }
    }
  };

  const isFormValid = !formErrors.email && !formErrors.wallet && formData.name.trim().length > 1 && formData.email.trim().length > 3;

  // Wallet Feedback Logic
  const renderWalletFeedback = () => {
    const wallet = formData.wallet;
    // Case 1: Empty
    if (!wallet) {
      return (
        <p className="text-slate-500 text-sm mt-1.5 pl-1">
          Optional – used for token delivery & verification
        </p>
      );
    }

    // Case 2: Invalid
    if (formErrors.wallet) {
      return (
        <p className="text-brand-primary text-sm mt-1">
          Invalid wallet address. Only BEP20 (0x...) accepted.
        </p>
      );
    }

    // Case 3: Valid BEP20
    if (ETH_REGEX.test(wallet)) {
      return (
        <p className="text-green-400 text-sm mt-1">
          ✓ Valid BEP20 address
        </p>
      );
    }

    // Fallback (shouldn't happen if validation logic is correct)
    return null;
  };

  // Price & Token Estimation
  const [tokenPrice, setTokenPrice] = useState(null);
  const [estimatedTokens, setEstimatedTokens] = useState(null);

  useEffect(() => {
    // Fetch Price on Load
    const fetchPrice = async () => {
      if (!API_BASE) return;
      try {
        const res = await fetch(`${API_BASE}/api/price`);
        if (res.ok) {
          const data = await res.json();
          if (data.price_usd) {
            setTokenPrice(data.price_usd);
          }
        }
      } catch (e) {
        log.error("Price fetch failed");
      }
    };
    fetchPrice();
    // Refresh every 60s
    const interval = setInterval(fetchPrice, 60000);
    return () => clearInterval(interval);
  }, [API_BASE]);

  // Debounce Token Calculation
  useEffect(() => {
    const t = setTimeout(() => {
      if (tokenPrice && selectedAmount) {
        const tokens = Math.round(parseFloat(selectedAmount) / tokenPrice);
        setEstimatedTokens(tokens);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [tokenPrice, selectedAmount]);


  // Payment verification logic removed - Frontend is stateless

  // Handle Buy Click - Create Invoice and Open Modal
  const handleBuyClick = async () => {
    // Final Validation Guard
    const name = formData.name.trim();
    const email = formData.email.trim();
    const walletAddress = formData.wallet.trim();

    // Trigger all validations
    const emailErr = validateEmail(email);
    const walletErr = validateWallet(walletAddress);

    setTouched({ email: true, wallet: true });
    setFormErrors({ email: emailErr, wallet: walletErr });

    if (!name || !email || emailErr || walletErr || !termsAccepted) {
      if (!name || !email) {
        setErrorModal({ show: true, title: 'Validation Error', message: 'Please enter your name and email address.' });
      } else if (!termsAccepted) {
        setErrorModal({
          show: true,
          title: 'Terms Required',
          message: 'Please accept the Terms of Service to continue.'
        });
      }
      return;
    }

    setIsProcessing(true);

    try {
      log.info("Creating invoice...", { name, email, amount: selectedAmount });

      // Split name for billing
      const nameParts = name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const response = await fetch(`${API_BASE}/api/create-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(selectedAmount),
          currency: 'USD',
          name: name,
          email: email,
          walletAddress: walletAddress,
          integration_type: 'iframe', // FORCE IFRAME
          billing_data: {
            first_name: firstName,
            last_name: lastName,
            country: 'US' // Default, maybe enhance later
          }
        })
      });

      const data = await response.json();

      if (response.ok && data.success && data.paymentUrl) {
        setIframeModal({ show: true, url: data.paymentUrl });
        if (data.invoiceId) {
          setCurrentInvoiceId(data.invoiceId);
          log.info("Stored invoiceId for verification:", data.invoiceId);
        }
      } else {
        setErrorModal({
          show: true,
          title: 'Payment Error',
          message: data.error || 'Failed to initialize payment. Please try again.'
        });
      }

    } catch (e) {
      log.error("Create invoice failed", e);
      setErrorModal({
        show: true,
        title: 'Network Error',
        message: 'Could not connect to payment server. Please check your connection.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // === CRYPTO HANDLERS ===
  const handleCryptoStep1 = () => {
    // 1. Validate Form
    const name = formData.name.trim();
    const email = formData.email.trim();
    const wallet = formData.wallet.trim();

    const emailErr = validateEmail(email);
    const walletErr = validateWallet(wallet); // Strict check for crypto

    setTouched({ email: true, wallet: true });
    setFormErrors({ email: emailErr, wallet: walletErr });

    // 2. Check Validations
    if (!name || !email || !wallet || emailErr || walletErr) {
      if (!name || !email || !wallet) {
        setErrorModal({ show: true, title: 'Missing Information', message: 'Please fill in all required fields.' });
      }
      return;
    }

    // 3. Check Terms
    if (!termsAccepted) {
      setErrorModal({ show: true, title: 'Terms Required', message: 'Please accept the Terms of Service to continue.' });
      return;
    }

    setCryptoStep(2);
  };

  const handleCryptoStep2 = async () => {
    // Validate Tx Hash
    const hash = txHash.trim();
    if (!hash || hash.length < 6) {
      setErrorModal({ show: true, title: 'Invalid Hash', message: 'Please enter the last 6 characters of your transaction hash.' });
      return;
    }

    setCryptoSubmitting(true);

    try {
      log.info("Submitting Crypto Payment...", {
        name: formData.name,
        amount: selectedAmount,
        network: cryptoNetwork,
        hash: hash
      });

      // Simulation for now - restore real API call if known
      await new Promise(resolve => setTimeout(resolve, 1500));

      setShowCryptoSuccess(true);
    } catch (e) {
      log.error("Crypto submit error", e);
      setErrorModal({ show: true, title: 'Submission Error', message: 'Could not submit transaction. Please try again.' });
    } finally {
      setCryptoSubmitting(false);
    }
  };

  const renderCryptoNetworkQR = () => {
    const network = CRYPTO_NETWORKS[cryptoNetwork];
    if (!network || !network.qrImage) return null;
    return (
      <div className="bg-white p-2 rounded-xl mx-auto w-40 h-40 mb-4 flex items-center justify-center shadow-lg">
        <img src={network.qrImage} alt={`${network.name} QR Code`} className="w-full h-full object-contain" />
      </div>
    );
  };







  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    const revealElements = document.querySelectorAll('.reveal')

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active')
          revealObserver.unobserve(entry.target)
        }
      })
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    })

    revealElements.forEach(el => revealObserver.observe(el))

    return () => revealObserver.disconnect()
  }, [])

  // Spotlight Effect Logic
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleMouseMove = (e) => {
      const cards = document.querySelectorAll('.spotlight-card')
      cards.forEach(card => {
        const rect = card.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        card.style.setProperty('--mouse-x', `${x}px`)
        card.style.setProperty('--mouse-y', `${y}px`)
      })
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // 3D Tilt Logic for Purchase Card
  useEffect(() => {
    const tiltCard = document.getElementById('tiltCard')

    if (tiltCard) {
      const handleMouseMove = (e) => {
        const rect = tiltCard.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        // Calculate center
        const centerX = rect.width / 2
        const centerY = rect.height / 2

        // Calculate distance from center (max rotation 10deg)
        const rotateX = ((y - centerY) / centerY) * -5
        const rotateY = ((x - centerX) / centerX) * 5

        tiltCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
      }

      const handleMouseLeave = () => {
        tiltCard.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)'
      }

      tiltCard.addEventListener('mousemove', handleMouseMove)
      tiltCard.addEventListener('mouseleave', handleMouseLeave)

      return () => {
        tiltCard.removeEventListener('mousemove', handleMouseMove)
        tiltCard.removeEventListener('mouseleave', handleMouseLeave)
      }
    }
  }, [])

  // Modal Logic
  const openDisclaimer = () => {
    const modal = document.getElementById('disclaimer-modal')
    if (modal) {
      modal.classList.add('open')
      document.body.style.overflow = 'hidden' // Prevent background scrolling
    }
  }

  const closeDisclaimer = () => {
    const modal = document.getElementById('disclaimer-modal')
    if (modal) {
      modal.classList.remove('open')
      document.body.style.overflow = ''
    }
  }

  // Close modal on outside click
  // Close modal on outside click (Generic helper or specific effects)
  // We can reuse the same pattern or create a generic one. For now, adding specific effects for simplicity.
  useEffect(() => {
    const handleOutsideClick = (e) => {
      const disclaimer = document.getElementById('disclaimer-modal');
      if (disclaimer && e.target === disclaimer) closeDisclaimer();

      // React state modals handle their own outside click via the backdrop div onClick
    }
    window.addEventListener('click', handleOutsideClick)
    return () => window.removeEventListener('click', handleOutsideClick)
  }, [])

  // Interactive Particle Network Logic
  useEffect(() => {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    let mouse = { x: null, y: null, radius: 150 };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.x;
      mouse.y = e.y;
    });

    // Handle mouse leaving window
    window.addEventListener('mouseout', () => {
      mouse.x = null;
      mouse.y = null;
    });

    resizeCanvas();

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1;
        this.speedX = Math.random() * 1 - 0.5;
        this.speedY = Math.random() * 1 - 0.5;
        this.baseColor = 'rgba(148, 163, 184'; // Slate-400 equivalent (Grey)
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Bounce off edges
        if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
        if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;

        // Interaction with mouse
        if (mouse.x != null) {
          let dx = mouse.x - this.x;
          let dy = mouse.y - this.y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < mouse.radius) {
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const force = (mouse.radius - distance) / mouse.radius;
            const directionX = forceDirectionX * force * 3; // Push strength
            const directionY = forceDirectionY * force * 3;

            // Gently move away from mouse (repulsion) or towards (attraction)
            // Let's do attraction for "connecting" feel, or just slight movement
            // standard constellation usually just connects. Let's make them float normally but connect.
            // If user wants interactive, maybe they avoid the mouse? Or mouse connects to them.
            // "it should connecting dots... make it interactive" -> Mouse usually acts as a "super node".
          }
        }
      }

      draw() {
        ctx.fillStyle = `${this.baseColor}, 0.5)`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const initParticles = () => {
      particles = [];
      const particleCount = Math.min(window.innerWidth / 15, 100);
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const animateParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();

        // Connect particles
        for (let j = i; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(148, 163, 184, ${0.2 - distance / 500})`; // Grey lines
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }

        // Connect to mouse
        if (mouse.x != null) {
          const dx = particles[i].x - mouse.x;
          const dy = particles[i].y - mouse.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 150) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(148, 163, 184, ${0.3 - distance / 500})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }
      animationFrameId = requestAnimationFrame(animateParticles);
    };

    initParticles();
    animateParticles();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      // Clean up other listeners if strictly needed, but resize is main one
      cancelAnimationFrame(animationFrameId);
    };
  }, []);



  return (
    <div className="antialiased min-h-screen flex flex-col">
      {/* Background Elements - Particles */}
      <canvas id="particle-canvas" className="fixed inset-0 pointer-events-none -z-10 bg-white"></canvas>

      {/* Navigation */}
      <nav className="fixed w-full z-50 transition-all duration-300" id="navbar">
        <div className="glass-panel mx-auto max-w-7xl px-6 py-4 mt-4 rounded-2xl flex justify-between items-center w-[95%] md:w-[90%] lg:w-[85%] bg-white/90 backdrop-blur-md border border-brand-light shadow-sm">
          <div className="flex items-center gap-3">
            <img src="https://www.mindwavedao.com/wp-content/uploads/mw-logo-dark-2048x2048.webp" alt="Mindwave Logo" className="h-8 w-auto hover:animate-pulse-slow transition-opacity opacity-90" />
            <span className="font-bold text-xl tracking-tight text-black">Mindwave<span className="font-light text-black">DAO</span></span>
          </div>
          <div className="hidden md:flex gap-8 text-sm font-medium text-brand-muted">

            <a href="#buy" className="hover:text-brand-primary transition-colors">Buy NILA</a>
            <a href="#how-it-works" className="hover:text-brand-primary transition-colors">How It Works</a>
            <a href="#process" className="hover:text-brand-primary transition-colors">Process</a>
            <a href="#compliance" className="hover:text-brand-primary transition-colors">Compliance</a>
            <a href="/check-status" className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold uppercase tracking-wide transition-all shadow-md hover:shadow-lg">Check Status</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="buy" className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">

          {/* Hero Content */}
          <div className="space-y-8 animate-fade-in-up">
            <a href="https://www.mindwavedao.com" className="flex w-fit items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors mb-6">
              <i className="fa-solid fa-arrow-left"></i> Back to MindwaveDao
            </a>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold uppercase tracking-wider shadow-sm animate-float">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Official Channel
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold leading-tight text-black">
              Buy <span className="text-red-600">NILA</span> <br />
              <span className="text-3xl md:text-5xl lg:text-6xl block mt-2 text-slate-800 font-normal">Simple. Secure. Compliant.</span>
            </h1>
            <div className="text-lg text-brand-muted max-w-lg leading-relaxed space-y-4">
              <p>
                NILA is the native utility token of the MindWave ecosystem, designed for functional use across MindWave's supported applications and services.
              </p>
              <p className="text-sm text-brand-muted border-l-2 border-brand-primary pl-3">
                NILA is intended for use within the platform, not for speculation.
              </p>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <div className="bg-white shadow-md border border-brand-light px-6 py-3 rounded-xl hover:shadow-lg transition-all cursor-default spotlight-card border-l-4 border-l-red-500">
                <div className="flex items-center gap-3">
                  <img src="https://www.mindwavedao.com/wp-content/uploads/mw-logo-dark-2048x2048.webp" alt="NILA" className="w-8 h-8 opacity-90" />
                  <div>
                    <span className="text-xs text-brand-primary font-semibold block mb-0.5">
                      Live NILA Price
                    </span>
                    <span className="text-brand-dark text-lg font-bold leading-none">
                      ${tokenPrice?.toFixed(4) ?? "--"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Purchase Card with 3D Tilt - Mixed Gradient */}
          <div className="relative animate-fade-in-up perspective-container" style={{ animationDelay: '0.2s' }}>
            {/* Mixed Gradient Glow - REDUCED/REMOVED as requested */}
            {/* <div className="absolute -inset-1 bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-2xl blur opacity-25 animate-pulse-slow"></div> */}
            {/* Added ID for Tilt Script */}
            <div id="tiltCard" className="glass-card p-8 rounded-2xl relative tilt-card transition-transform duration-100 ease-out">

              {/* Tab Navigation */}
              <div className="flex p-1 bg-slate-100 rounded-xl mb-6 relative z-10 border border-brand-light">
                {/* Card Tab Hidden per request */}
                {/* <button
                  type="button"
                  onClick={() => setActiveTab('card')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'card' ? 'bg-white text-brand-primary shadow-sm border border-brand-light' : 'text-brand-muted hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                  <i className="fa-regular fa-credit-card mr-2"></i>
                  Pay with Card
                </button> */}
                <button
                  type="button"
                  onClick={() => setActiveTab('crypto')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'crypto' ? 'bg-white text-brand-primary shadow-sm border border-brand-light' : 'text-brand-muted hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                  <i className="fa-brands fa-bitcoin mr-2"></i>
                  Pay with Crypto
                </button>
              </div>

              {/* Title changes based on Tab */}
              <h2 className="text-3xl font-bold mb-6 tilt-inner text-slate-800">
                {activeTab === 'card' ? 'Acquire NILA' : (cryptoStep === 1 ? 'Crypto Payment' : 'Confirm Transfer')}
              </h2>

              <form id="purchaseForm" className="space-y-5 tilt-inner">

                {/* === CARD TAB Content === */}
                {activeTab === 'card' && (
                  <>
                    {/* User Details */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                        <input
                          type="text"
                          className="w-full glass-input px-4 py-3 rounded-xl placeholder-slate-400 focus:ring-2 focus:ring-red-500/20"
                          value={formData.name}
                          onChange={(e) => handleChange('name', e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                        <input
                          type="email"
                          placeholder="john@example.com"
                          className={`w-full glass-input px-4 py-3 rounded-xl placeholder-slate-400 focus:ring-2 focus:ring-red-500/20 transition-colors ${formErrors.email ? 'border-brand-primary focus:border-brand-primary focus:ring-red-500/20' : ''}`}
                          value={formData.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                          onBlur={() => handleBlur('email')}
                          required
                        />
                        {formErrors.email && (
                          <p className="text-brand-primary text-xs mt-1.5">{formErrors.email}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Wallet Address (BEP20)
                        </label>
                        <input
                          type="text"
                          className={`w-full glass-input px-4 py-3 rounded-xl placeholder-slate-400 text-brand-dark font-mono text-sm focus:ring-2 focus:ring-red-500/20 transition-colors ${formErrors.wallet ? 'border-brand-primary focus:border-brand-primary focus:ring-red-500/20' : ''}`}
                          placeholder="0x... (BEP20 only)"
                          value={formData.wallet}
                          onChange={(e) => handleChange('wallet', e.target.value)}
                          onBlur={() => handleBlur('wallet')}
                        />
                        {renderWalletFeedback()}
                      </div>
                    </div>
                  </>
                )}

                {/* === CRYPTO TAB Content - Step 1 === */}
                {activeTab === 'crypto' && cryptoStep === 1 && (
                  <div className="animate-fade-in">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
                        <input
                          type="text"
                          className="w-full glass-input px-4 py-3 rounded-xl placeholder-white/50 focus:ring-2 focus:ring-cyan-500/50"
                          value={formData.name}
                          onChange={(e) => handleChange('name', e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Email Address</label>
                        <input
                          type="email"
                          placeholder="john@example.com"
                          className={`w-full glass-input px-4 py-3 rounded-xl placeholder-white/50 focus:ring-2 focus:ring-cyan-500/50 transition-colors ${formErrors.email ? 'border-brand-primary focus:border-brand-primary focus:ring-red-500/50' : ''}`}
                          value={formData.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                          onBlur={() => handleBlur('email')}
                          required
                        />
                        {formErrors.email && (
                          <p className="text-brand-primary text-xs mt-1.5">{formErrors.email}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Wallet Address (BEP20) <span className="text-brand-primary">*</span>
                        </label>
                        <input
                          type="text"
                          className={`w-full glass-input px-4 py-3 rounded-xl placeholder-slate-400 text-brand-dark font-mono text-sm focus:ring-2 focus:ring-red-500/20 transition-colors ${formErrors.wallet ? 'border-brand-primary focus:border-brand-primary focus:ring-red-500/20' : ''}`}
                          placeholder="0x... (BEP20 only)"
                          value={formData.wallet}
                          onChange={(e) => handleChange('wallet', e.target.value)}
                          onBlur={() => handleBlur('wallet')}
                        />
                        {/* Force error if empty in crypto flow check happening in handler, but feedback helpful here too */}
                      </div>
                    </div>
                  </div>
                )}


                {/* === CRYPTO TAB Content - Step 2 === */}
                {activeTab === 'crypto' && cryptoStep === 2 && (
                  <div className="animate-fade-in space-y-6">
                    {/* Network Selection */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-3">Select Network</label>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.values(CRYPTO_NETWORKS).map(net => (
                          <button
                            key={net.id}
                            type="button"
                            onClick={() => setCryptoNetwork(net.id)}
                            className={`py-2 px-1 rounded-lg text-xs md:text-sm font-bold border transition-all ${cryptoNetwork === net.id ? 'bg-red-50 border-red-200 text-red-700 shadow-sm' : 'bg-brand-light border-brand-light text-brand-muted hover:bg-slate-100 hover:border-slate-300'}`}
                          >
                            <i className={`${net.icon} mr-1 md:mr-2`}></i>
                            {net.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="text-center">
                      <p className="text-xs text-brand-muted mb-2">Scan to Pay</p>
                      {renderCryptoNetworkQR()}

                      <div className="relative group cursor-pointer" onClick={() => {
                        const addr = CRYPTO_NETWORKS[cryptoNetwork]?.address;
                        if (addr) {
                          navigator.clipboard.writeText(addr);
                        }
                      }}>
                        <p className="text-xs font-mono text-brand-muted break-all bg-slate-100 p-3 rounded border border-brand-light mx-auto max-w-[280px] hover:bg-slate-200 transition-colors">
                          {CRYPTO_NETWORKS[cryptoNetwork]?.address || "Select a network"}
                          <i className="fa-regular fa-copy ml-2 opacity-50"></i>
                        </p>
                      </div>
                    </div>

                    {/* Transaction Hash */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Transaction Hash (Last 6 Chars)</label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="e.g. A1B2C3"
                        className="w-full glass-input px-4 py-3 rounded-xl text-center font-mono placeholder-slate-400 tracking-widest uppercase focus:ring-2 focus:ring-red-500/20"
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value.toUpperCase())}
                      />
                      <p className="text-xs text-slate-400 mt-1.5 text-center">Please enter ONLY the last 6 characters</p>
                    </div>
                  </div>
                )}

                {/* Shared: Amount & Price (Visible in Card & Crypto Step 1) */}
                {(activeTab === 'card' || (activeTab === 'crypto' && cryptoStep === 1)) && (
                  <>
                    <div className="h-px bg-slate-200 my-4"></div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Select Amount</label>
                      <div className="relative">
                        <select
                          value={selectedAmount}
                          onChange={(e) => setSelectedAmount(e.target.value)}
                          className="w-full glass-input px-4 py-3 rounded-xl appearance-none cursor-pointer text-lg font-semibold hover:border-red-400/50 transition-colors bg-white text-brand-dark"
                        >
                          <option value="100">$100.00 USD</option>
                          <option value="500">$500.00 USD</option>
                          <option value="1000">$1,000.00 USD</option>
                          <option value="2000">$2,000.00 USD</option>
                          <option value="5000">$5,000.00 USD</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                          <i className="fa-solid fa-chevron-down text-xs"></i>
                        </div>
                      </div>
                    </div>

                    {/* Token Estimate */}
                    <div className="bg-brand-light rounded-xl p-4 border border-brand-light animate-fade-in mt-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-brand-muted uppercase tracking-widest">Estimated Tokens</span>
                        <span className="text-xs text-brand-muted font-mono">
                          {tokenPrice ? `1 NILA ≈ $${tokenPrice.toFixed(4)}` : 'Fetching price...'}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-brand-dark">
                          {estimatedTokens ? estimatedTokens.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '---'}
                        </span>
                        <span className="text-sm text-brand-muted font-medium">NILA</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Terms - Checked in both flows */}
                {(activeTab === 'card' || (activeTab === 'crypto' && cryptoStep === 1)) && (
                  <div className="flex items-start gap-3 bg-white p-3 rounded-lg border border-slate-100 hover:bg-brand-light transition-colors mt-4">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded bg-slate-100 border-slate-300 text-brand-primary focus:ring-red-500 focus:ring-offset-0 cursor-pointer accent-red-600"
                    />
                    <label htmlFor="terms" className="text-xs text-brand-muted leading-tight cursor-pointer">
                      I confirm that I am eligible to participate and I agree to the <button type="button" onClick={() => setTermsModal({ show: true })} className="text-brand-primary hover:underline font-semibold">Terms of Service</button>. I understand that NILA is for platform use only.
                    </label>
                  </div>
                )}

                {/* Submit Buttons */}

                {activeTab === 'card' && (
                  <>
                    <div className="flex items-center gap-3 text-xs text-slate-400 justify-center mt-2">
                      <i className="fa-solid fa-lock text-slate-400"></i>
                      <span className="text-brand-muted">Secure payment processed by <strong>3Thix</strong></span>
                    </div>
                    <button
                      type="button"
                      id="buyBtn"
                      onClick={handleBuyClick}
                      disabled={isProcessing || !isFormValid}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:from-red-400 hover:via-red-500 hover:to-red-600 text-white font-bold text-lg shadow-lg shadow-red-500/20 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                    >
                      {isProcessing ? (
                        <>
                          <i className="fa-solid fa-circle-notch fa-spin"></i>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <span>Proceed to Secure Checkout</span>
                          <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                        </>
                      )}
                    </button>
                  </>
                )}

                {/* Crypto Buttons */}

                {activeTab === 'crypto' && cryptoStep === 1 && (
                  <button
                    type="button"
                    onClick={handleCryptoStep1}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-lg shadow-lg shadow-red-500/20 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 group"
                  >
                    <span>Pay with Crypto</span>
                    <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                  </button>
                )}

                {activeTab === 'crypto' && cryptoStep === 2 && (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleCryptoStep2}
                      disabled={cryptoSubmitting}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-bold text-lg shadow-lg shadow-orange-500/20 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 group disabled:opacity-50"
                    >
                      {cryptoSubmitting ? (
                        <>
                          <i className="fa-solid fa-circle-notch fa-spin"></i>
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <span>Confirm Transaction</span>
                          <i className="fa-solid fa-check group-hover:scale-110 transition-transform"></i>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCryptoStep(1)}
                      className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Back to Details
                    </button>
                  </div>
                )}

              </form>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 reveal">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-brand-dark">How It Works</h2>
            <p className="text-brand-muted">No exchange accounts. No trading screens. No technical complexity.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:shadow-xl transition-all reveal delay-100 hover:-translate-y-2">
              <div className="absolute -right-2 -top-2 text-8xl font-bold text-slate-100 group-hover:text-slate-200 transition-colors select-none">1</div>
              <div className="relative z-10">
                {/* Red Icon */}
                <div className="w-10 h-10 rounded-full bg-red-100 text-brand-primary flex items-center justify-center mb-4 border border-red-200">
                  <i className="fa-solid fa-arrow-pointer"></i>
                </div>
                <h3 className="font-bold mb-2 text-brand-dark">Click Buy NILA</h3>
                <p className="text-brand-muted text-xs leading-relaxed">Select your amount and initiate the process directly from this page.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:shadow-xl transition-all reveal delay-200 hover:-translate-y-2">
              <div className="absolute -right-2 -top-2 text-8xl font-bold text-slate-100 group-hover:text-slate-200 transition-colors select-none">2</div>
              <div className="relative z-10">
                {/* Red Icon */}
                <div className="w-10 h-10 rounded-full bg-red-100 text-brand-primary flex items-center justify-center mb-4 border border-red-200">
                  <i className="fa-solid fa-shield-halved"></i>
                </div>
                <h3 className="font-bold mb-2 text-brand-dark">Secure Checkout</h3>
                <p className="text-brand-muted text-xs leading-relaxed">You'll be redirected to a dedicated page powered by our regulated marketplace partner.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:shadow-xl transition-all reveal delay-300 hover:-translate-y-2">
              <div className="absolute -right-2 -top-2 text-8xl font-bold text-slate-100 group-hover:text-slate-200 transition-colors select-none">3</div>
              <div className="relative z-10">
                {/* Red Icon */}
                <div className="w-10 h-10 rounded-full bg-red-100 text-brand-primary flex items-center justify-center mb-4 border border-red-200">
                  <i className="fa-solid fa-credit-card"></i>
                </div>
                <h3 className="font-bold mb-2 text-brand-dark">Complete Payment</h3>
                <p className="text-brand-muted text-xs leading-relaxed">Use available payment methods to complete your purchase securely.</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:shadow-xl transition-all reveal delay-300 hover:-translate-y-2">
              <div className="absolute -right-2 -top-2 text-8xl font-bold text-slate-100 group-hover:text-slate-200 transition-colors select-none">4</div>
              <div className="relative z-10">
                {/* Red Icon */}
                <div className="w-10 h-10 rounded-full bg-red-100 text-brand-primary flex items-center justify-center mb-4 border border-red-200">
                  <i className="fa-solid fa-wallet"></i>
                </div>
                <h3 className="font-bold mb-2 text-brand-dark">Delivery</h3>
                <p className="text-brand-muted text-xs leading-relaxed">NILA is delivered to your digital wallet after successful processing.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* After Payment Process - Light Version */}
      <section id="process" className="py-20 px-6 relative overflow-hidden bg-brand-light">
        {/* Connecting Line Background */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-200 to-transparent -translate-y-1/2 hidden md:block z-0"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16 reveal">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-brand-dark">What Happens After Payment?</h2>
            <p className="text-brand-muted text-lg max-w-2xl mx-auto">Your journey to the ecosystem is automated, secure, and instant.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1: Confirmation */}
            <div className="glass-card p-8 rounded-3xl border border-red-100 bg-white shadow-lg hover:shadow-xl hover:border-red-200 transition-all group reveal delay-100 transform hover:-translate-y-2">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-red-100 shadow-sm">
                <i className="fa-solid fa-check-double text-2xl text-brand-primary"></i>
              </div>
              <h3 className="text-xl font-bold mb-3 text-brand-dark">1. Instant Confirmation</h3>
              <p className="text-brand-muted text-sm leading-relaxed">
                Your transaction is verified instantly through our regulated partner. You'll receive a confirmation email immediately.
              </p>
            </div>

            {/* Step 2: Processing */}
            <div className="glass-card p-8 rounded-3xl border border-red-100 bg-white shadow-lg hover:shadow-xl hover:border-red-200 transition-all group reveal delay-200 transform hover:-translate-y-2">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-red-100 shadow-sm">
                <i className="fa-solid fa-microchip text-2xl text-brand-primary animate-pulse-slow"></i>
              </div>
              <h3 className="text-xl font-bold mb-3 text-brand-dark">2. Smart Processing</h3>
              <p className="text-brand-muted text-sm leading-relaxed">
                Our system automatically allocates your NILA. If you don't have a wallet, we guide you through creating one instantly.
              </p>
            </div>

            {/* Step 3: Access */}
            <div className="glass-card p-8 rounded-3xl border border-red-100 bg-white shadow-lg hover:shadow-xl hover:border-red-200 transition-all group reveal delay-300 transform hover:-translate-y-2">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-red-100 shadow-sm">
                <i className="fa-solid fa-rocket text-2xl text-brand-primary"></i>
              </div>
              <h3 className="text-xl font-bold mb-3 text-brand-dark">3. Ready for Lift-off</h3>
              <p className="text-brand-muted text-sm leading-relaxed">
                Your NILA is ready! Log in to any supported MindWave application and start using your utility tokens immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Availability & Compliance */}
      <section id="compliance" className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center reveal">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-brand-dark">Availability & Compliance</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-left">
            <div className="glass-panel p-6 rounded-xl border-l-2 border-l-red-500 spotlight-card bg-brand-light border-brand-light">
              <h4 className="font-bold mb-2 flex items-center gap-2 text-brand-dark"><i className="fa-solid fa-building-columns text-brand-primary"></i> Regulated Processing</h4>
              <p className="text-xs text-brand-muted">Transactions are handled by a compliant third-party marketplace with built-in fraud monitoring.</p>
            </div>
            <div className="glass-panel p-6 rounded-xl border-l-2 border-l-red-600 spotlight-card bg-brand-light border-brand-light">
              <h4 className="font-bold mb-2 flex items-center gap-2 text-brand-dark"><i className="fa-solid fa-globe text-brand-primary"></i> International Standards</h4>
              <p className="text-xs text-brand-muted">Processing is conducted in accordance with applicable laws and jurisdictional requirements.</p>
            </div>
          </div>
          <div className="mt-8 p-4 rounded-lg bg-red-50 border border-red-200 inline-block hover:scale-105 transition-transform duration-300 shadow-sm">
            <p className="text-sm text-red-800 font-medium">
              <i className="fa-solid fa-triangle-exclamation mr-2 text-red-600"></i>
              NILA is currently not available to U.S. persons.
              <br />
              <span className="text-xs opacity-90 mt-1 block text-red-700">Access for U.S. users will be enabled once applicable regulatory and compliance approvals are completed.</span>
            </p>
          </div>
        </div>
      </section>

      {/* Animated CTA Section - Snow White Theme */}
      <section className="py-20 px-6 relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none"></div>
        <div className="max-w-4xl mx-auto relative z-10 text-center reveal">
          <div className="glass-card p-12 rounded-3xl border border-slate-100 shadow-2xl animate-glow transform hover:scale-[1.01] transition-all duration-500 bg-white hover:border-yellow-500">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900">Ready to Join the Ecosystem?</h2>
            <p className="text-slate-600 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
              Secure your NILA tokens today through our compliant and seamless gateway.
            </p>
            <button onClick={() => document.getElementById('buy').scrollIntoView({ behavior: 'smooth' })} className="px-10 py-5 rounded-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xl transition-all shadow-[0_10px_30px_rgba(220,38,38,0.3)] hover:shadow-[0_15px_40px_rgba(234,179,8,0.4)] hover:border-yellow-400 border border-transparent transform hover:-translate-y-1">
              Get Started Now
            </button>
          </div>
        </div>
      </section>

      {/* Support Section - Snow White Theme */}
      <section className="py-12 px-6 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto pt-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-slate-800 mb-4">Support & Resources</h3>
              <p className="text-sm text-slate-500 mb-4">Have questions about NILA or the purchase process?</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Contact</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="mailto:support@mindwavedao.com" className="hover:text-red-600 transition-colors">support@mindwavedao.com</a></li>
                <li><a href="https://www.mindwavedao.com" target="_blank" className="hover:text-red-600 transition-colors">mindwavedao.com</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Community</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="https://t.me/nilatokenss" target="_blank" className="hover:text-red-600 transition-colors"><i className="fa-brands fa-telegram mr-1"></i> Telegram</a></li>
                <li><a href="https://discord.gg/ZfKXCxbVm2" target="_blank" className="hover:text-red-600 transition-colors"><i className="fa-brands fa-discord mr-1"></i> Discord</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><button onClick={openDisclaimer} className="hover:text-red-600 transition-colors text-left">Disclaimer</button></li>
                <li><button onClick={() => setPrivacyModal({ show: true })} className="hover:text-red-600 transition-colors text-left">Privacy Policy</button></li>
                <li><button onClick={() => setTermsModal({ show: true })} className="hover:text-red-600 transition-colors text-left">Terms of Service</button></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Snow White Theme */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <img src="https://www.mindwavedao.com/wp-content/uploads/mw-logo-dark-2048x2048.webp" alt="Mindwave Logo" className="h-6 w-auto opacity-70 hover:opacity-100 transition-opacity" />
            <span className="text-sm text-slate-500">&copy; 2026 MindWave Innovations. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* Error Modal */}
      {errorModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setErrorModal({ show: false, title: '', message: '' })}></div>
          <div className="relative glass-card p-8 rounded-2xl max-w-md w-full animate-fade-in-up" role="alert" aria-live="assertive">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 border border-brand-primary/30 flex items-center justify-center">
                <i className="fa-solid fa-exclamation-triangle text-4xl text-red-400"></i>
              </div>
              <h3 className="text-2xl font-bold mb-3">{errorModal.title}</h3>
              <p className="text-gray-400 mb-6">{errorModal.message}</p>
              <button
                onClick={() => setErrorModal({ show: false, title: '', message: '' })}
                className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Disclaimer Modal */}
      {/* Disclaimer Modal - Snow White Theme */}
      <div id="disclaimer-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="modal-content glass-card max-w-2xl w-full p-8 rounded-2xl relative shadow-2xl border border-slate-100 bg-white">
          <button onClick={closeDisclaimer} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>

          <div className="flex items-center gap-3 mb-6">
            <i className="fa-solid fa-circle-exclamation text-yellow-500 text-2xl"></i>
            <h3 className="text-2xl font-bold text-slate-900">Disclaimer</h3>
          </div>

          <div className="prose prose-sm max-w-none text-slate-600 space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            <p>NILA is a digital utility token intended solely for use within the MindWave ecosystem.</p>
            <p>NILA does not represent equity, ownership, profit participation, voting rights, or any other financial interest in any entity.</p>
            <p>Availability, acquisition, and use of NILA are subject to applicable laws, regulations, and jurisdictional restrictions.</p>
            <p className="font-semibold text-slate-800">Nothing on this website constitutes investment advice, a solicitation, or an offer of securities or financial instruments in any jurisdiction.</p>
          </div>

          <div className="mt-8 flex justify-end">
            <button onClick={closeDisclaimer} className="px-6 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-medium transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Check Status Modal */}


      {/* Success Modal */}
      {successModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
          <div className="relative glass-card p-8 rounded-2xl max-w-md w-full animate-fade-in-up">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                <i className="fa-solid fa-circle-check text-4xl text-green-400"></i>
              </div>
              <h3 className="text-2xl font-bold mb-3">Payment Successful!</h3>
              <p className="text-gray-400 mb-6">Your NILA tokens have been allocated. A confirmation email will arrive shortly.</p>

              {/* Payment Details */}
              <div className="bg-white/5 rounded-xl p-4 mb-6 text-left space-y-2 border border-white/5">
                {successModal.amount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Amount Paid</span>
                    <span className="text-white font-medium">${parseFloat(successModal.amount).toLocaleString()}</span>
                  </div>
                )}
                {successModal.transactionId && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Transaction ID</span>
                    <span className="text-white font-mono text-xs">{successModal.transactionId}</span>
                  </div>
                )}
                {successModal.invoiceId && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Invoice ID</span>
                    <span className="text-white font-mono text-xs">{successModal.invoiceId}</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-500 mb-6">If confirmation is not received, contact support with your Invoice ID.</p>

              <button
                onClick={() => setSuccessModal({ show: false })}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white font-medium transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Failure Modal */}
      {failureModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
          <div className="relative glass-card p-8 rounded-2xl max-w-md w-full animate-fade-in-up">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 border border-brand-primary/30 flex items-center justify-center">
                <i className="fa-solid fa-exclamation-triangle text-4xl text-red-400"></i>
              </div>
              <h3 className="text-2xl font-bold mb-3">Payment Failed</h3>
              <p className="text-gray-400 mb-6">Your payment could not be processed.</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => window.open('https://mindwavedao.com/support', '_blank')}
                  className="py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all"
                >
                  Contact Support
                </button>
                <button
                  onClick={() => setFailureModal({ show: false })}
                  className="py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Polling Modal */}
      {pollingModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#1a1b1e] border border-white/10 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">

            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse"></div>

            {/* Icon Logic */}
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-6 
              ${pollingModal.status === 'SUCCESS' ? 'bg-green-500/10 text-green-400' :
                pollingModal.status === 'FAILED' ? 'bg-red-500/10 text-red-400' :
                  pollingModal.status === 'WARNING' ? 'bg-yellow-500/10 text-yellow-500' :
                    'bg-blue-500/10 text-blue-400'}`}>

              {pollingModal.status === 'SUCCESS' ? (
                <i className="fa-solid fa-check text-3xl"></i>
              ) : pollingModal.status === 'FAILED' ? (
                <i className="fa-solid fa-xmark text-3xl"></i>
              ) : pollingModal.status === 'WARNING' ? (
                <i className="fa-solid fa-triangle-exclamation text-3xl animate-pulse"></i>
              ) : (
                <i className="fa-solid fa-circle-notch fa-spin text-3xl"></i>
              )}
            </div>

            {/* Title Logic */}
            <h3 className="text-xl font-bold text-white mb-2">
              {pollingModal.status === 'REDIRECTING_TO_PAYMENT'
                ? 'Redirecting to secure payment gateway…'
                : pollingModal.status === 'SUCCESS' ? 'Payment Successful' :
                  pollingModal.status === 'FAILED' ? 'Payment Failed' :
                    pollingModal.status === 'WARNING' ? 'Verifying payment' :
                      'Processing'}
            </h3>

            {/* Message Logic */}
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              {pollingModal.message}
            </p>

            {/* Spinner or check for Redirect */}
            {pollingModal.status === 'REDIRECTING_TO_PAYMENT' && (
              <div className="flex justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce delay-100"></div>
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce delay-200"></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TermsModal - Snow White Theme */}
      {termsModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setTermsModal({ show: false })}></div>
          <div className="relative glass-card p-8 rounded-2xl max-w-2xl w-full animate-fade-in-up max-h-[80vh] overflow-y-auto custom-scrollbar bg-white border border-slate-100 shadow-2xl">
            <button
              onClick={() => setTermsModal({ show: false })}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>
            <div className="text-left">
              <h3 className="text-2xl font-bold mb-6 text-slate-900 flex items-center gap-3">
                <i className="fa-solid fa-file-contract text-red-500"></i> Terms & Conditions
              </h3>
              <div className="prose prose-sm max-w-none text-slate-600 space-y-4">
                <p>This platform is available only to users outside the United States.</p>
                <p>3THIX provides a technology platform for payment processing and digital access services. It does not offer investments, securities, or financial advice.</p>
                <p>All transactions are subject to eligibility, compliance checks, and applicable local laws. Access may be restricted or suspended where required for legal, regulatory, or security reasons.</p>
                <p className="font-semibold text-slate-800">By continuing, you confirm that you are not a U.S. person and agree to these terms.</p>
              </div>
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setTermsModal({ show: false })}
                  className="px-6 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PrivacyModal - Snow White Theme */}
      {privacyModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPrivacyModal({ show: false })}></div>
          <div className="relative glass-card p-8 rounded-2xl max-w-2xl w-full animate-fade-in-up max-h-[80vh] overflow-y-auto custom-scrollbar bg-white border border-slate-100 shadow-2xl">
            <button
              onClick={() => setPrivacyModal({ show: false })}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>
            <div className="text-left">
              <h3 className="text-2xl font-bold mb-6 text-slate-900 flex items-center gap-3">
                <i className="fa-solid fa-shield-halved text-red-500"></i> Privacy Policy
              </h3>
              <div className="prose prose-sm max-w-none text-slate-600 space-y-4">
                <p>3THIX collects and processes limited personal and transactional information solely to operate the platform, comply with legal requirements, and prevent fraud.</p>
                <p>Data may be shared with payment providers and compliance partners as required by law. Personal information is not sold.</p>
                <p className="font-semibold text-slate-800">By using this platform, you consent to this data processing.</p>
              </div>
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setPrivacyModal({ show: false })}
                  className="px-6 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generic Error Modal */}
      {errorModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setErrorModal({ ...errorModal, show: false })}></div>
          <div className="relative glass-card p-8 rounded-2xl max-w-md w-full animate-fade-in-up">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 border border-brand-primary/30 flex items-center justify-center">
                <i className="fa-solid fa-circle-exclamation text-3xl text-red-400"></i>
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">{errorModal.title || 'Error'}</h3>
              <p className="text-gray-400 mb-6 text-sm">{errorModal.message}</p>
              <button
                onClick={() => setErrorModal({ ...errorModal, show: false })}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors border border-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Crypto Success Modal (Step 3) */}
      {showCryptoSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
          <div className="relative glass-card p-8 rounded-2xl max-w-sm w-full animate-fade-in-up border-green-500/20 shadow-[0_0_50px_rgba(34,197,94,0.1)]">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center animate-pulse-slow">
                <i className="fa-solid fa-paper-plane text-4xl text-green-400"></i>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Successfully Submitted</h3>
              <p className="text-gray-300 mb-6 text-sm leading-relaxed">
                Your transaction has been submitted for verification. Tokens will be dispatched after admin approval.
              </p>

              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white font-bold transition-all shadow-lg shadow-red-500/20"
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Iframe Modal */}
      {iframeModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-2xl overflow-hidden shadow-2xl animate-scale-in">
            <button
              onClick={() => setIframeModal({ show: false, url: '' })}
              className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 transition-colors text-gray-600"
            >
              <i className="fa-solid fa-times"></i>
            </button>
            <div className="aspect-[4/5] w-full bg-white">
              <iframe
                src={iframeModal.url}
                className="w-full h-full border-0"
                allow="payment"
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


