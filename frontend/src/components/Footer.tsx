import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
    return (
        <footer className="bg-[#050505] pt-16 pb-8 border-t border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
                    {/* Brand Column */}
                    <div className="md:col-span-1">
                        <a href="/#hero" className="flex items-center gap-3 mb-6">
                            <img
                                src="/nila-logo-alt-2.png"
                                alt="MindWaveDAO Logo"
                                className="h-10 w-auto"
                            />
                            <span className="font-manrope text-xl tracking-tight text-white">
                                <span className="font-bold">MindWave</span>
                                <span className="font-medium">DAO</span>
                            </span>
                        </a>
                        <p className="font-manrope text-gray-400 text-sm leading-relaxed mb-6">
                            The next generation of financial infrastructure. Regulated, secure, and AI-driven.
                        </p>
                        {/* Social Links */}
                        <div className="flex gap-4">
                            {[
                                { name: 'twitter', link: 'https://x.com/nilatoken' },
                                { name: 'discord', link: 'https://discord.com/invite/ZfKXCxbVm2' },
                                { name: 'telegram', link: 'https://t.me/nilatokenss' }
                            ].map((social) => (
                                <a
                                    key={social.name}
                                    href={social.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-full bg-[#1A1A1A] hover:bg-red-600 flex items-center justify-center transition-all duration-200 group hover:-translate-y-1"
                                >
                                    {social.name === 'twitter' && (
                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                    )}
                                    {social.name === 'discord' && (
                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" /></svg>
                                    )}
                                    {social.name === 'telegram' && (
                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.963 8.16l-1.865 9.07c-.126.565-.456.702-.916.438l-2.5-1.85-1.205 1.161c-.133.134-.244.246-.5.246l.178-2.545 4.634-4.187c.202-.18-.044-.28-.312-.1l-5.727 3.606-2.46-.768c-.534-.167-.545-.534.112-.79l9.613-3.705c.445-.164.834.1.646.825z" /></svg>
                                    )}
                                </a>
                            ))}
                        </div>
                    </div>



                    {/* Contract Column */}
                    <div className="md:col-span-2">
                        <h3 className="font-manrope font-bold text-white text-lg mb-6">Smart Contract</h3>
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10 group hover:border-white/20 transition-all">
                            <p className="font-manrope text-xs text-gray-500 mb-2 uppercase tracking-wider">NILA Token Address</p>
                            <div className="flex items-center justify-between gap-4">
                                <code className="font-mono text-gray-300 text-sm break-all">
                                    0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0
                                </code>
                                <button className="text-gray-400 hover:text-white transition-colors" title="Copy Address">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="font-manrope text-sm text-gray-500">
                        © 2026 MindWaveDAO. All rights reserved.
                    </p>
                    <div className="flex gap-6">
                        <Link to="/terms" className="font-manrope text-sm text-gray-500 hover:text-white transition-colors">Terms</Link>
                        <Link to="/privacy" className="font-manrope text-sm text-gray-500 hover:text-white transition-colors">Privacy</Link>
                        <Link to="/cookies" className="font-manrope text-sm text-gray-500 hover:text-white transition-colors">Cookies</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
