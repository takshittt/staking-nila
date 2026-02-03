import React from 'react';
import { Link } from 'react-router-dom';
import ParticlesBackground from './ParticlesBackground';

const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-white overflow-hidden pt-20">

      <ParticlesBackground />

      {/* Hero Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-4xl">

          {/* Main Heading */}
          <h1 className="font-manrope font-bold text-6xl sm:text-7xl md:text-8xl text-black leading-[1.1] mb-8 tracking-tight">
            <span className="text-red-600">Stake</span> NILA
            <br />
            Earn Consistently.
            <br />
            Get Rewarded.
          </h1>

          {/* Subheading */}
          <p className="font-manrope text-lg sm:text-xl text-gray-500 max-w-2xl leading-relaxed font-normal !mt-5">
            Stake your NILA tokens directly from your wallet and earn guaranteed APY,
            instant 5% cashback, and monthly rewards — all secured on-chain.
          </p>

          {/* CTA Button */}
          <div className="flex flex-col font-semibold sm:flex-row gap-4 items-start !mt-5">
            <Link to="/dashboard">
              <button
                className="font-manrope text-[16px] bg-[#E31E24] text-white rounded-full hover:bg-[#c1191f] transition-all duration-200 shadow-sm hover:shadow-xl whitespace-nowrap shrink-0 flex items-center justify-center"
                style={{ padding: '10px 12px' }}
              >
                Start Staking
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Gradient Overlay for subtle depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/50 pointer-events-none"></div>
    </section>
  );
};

export default HeroSection;