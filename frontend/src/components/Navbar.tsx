import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center gap-3">
            <a href="/#hero" className="flex items-center gap-3">
              <img
                src="/mw-logo-dark (1).webp"
                alt="MindWaveDAO Logo"
                className="h-14 w-auto object-contain"
              />
              <span className="font-manrope text-xl tracking-tight text-gray-900">
                <span className="font-bold">MindWave</span>
                <span className="font-medium">DAO</span>
              </span>
            </a>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center gap-8 lg:gap-16">
              {['How it works', 'Rewards', 'Referral', 'FAQ'].map((item) => (
                <a
                  key={item}
                  href={`/#${item.toLowerCase().replace(/\s+/g, '-')}`}
                  className="group flex items-center gap-1 cursor-pointer text-gray-800 hover:text-red-600 transition-colors duration-200"
                >
                  <span className="font-manrope font-bold text-md">{item}</span>
                  <svg
                    className={`w-4 h-4 text-black group-hover:text-red-600 transition-colors duration-200`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M19 9l-7 7-7-7" />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Connect Wallet Button */}
          <div className="hidden md:flex items-center gap-4 shrink-0">
            <Link to="/dashboard">
              <button
                className="font-manrope font-bold text-[14px] bg-[#E31E24] text-white rounded-full hover:bg-[#c1191f] transition-all duration-200 shadow-sm hover:shadow-xl whitespace-nowrap shrink-0 flex items-center justify-center"
                style={{ padding: '12px 16px' }}
              >
                Connect Wallet
              </button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="bg-white inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 focus:outline-none"
              aria-controls="mobile-menu"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className="block h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`} id="mobile-menu">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-100">
          {['How it works', 'Rewards', 'Referral', 'FAQ'].map((item) => (
            <a
              key={item}
              href={`/#${item.toLowerCase().replace(/\s+/g, '-')}`}
              className="font-manrope block px-3 py-2 rounded-md text-lg font-bold text-gray-700 hover:text-red-600 hover:bg-gray-50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {item}
            </a>
          ))}
          <Link to="/dashboard" className="w-full">
            <button className="w-full mt-4 font-manrope font-bold bg-[#E31E24] text-white px-10 py-4 text-[17px] rounded-full hover:bg-[#c1191f] transition-all duration-200">
              Connect Wallet
            </button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;