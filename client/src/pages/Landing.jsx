import React from 'react';
import { Link } from 'react-router-dom';
import { Hammer, Truck, Shield, Clock } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-inter selection:bg-amber-500 selection:text-slate-900">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500 p-2 rounded-lg">
                <Hammer className="w-6 h-6 text-slate-900" />
              </div>
              <span className="text-xl md:text-2xl font-outfit font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                Sri Venkata Krishna
              </span>
            </div>
            <div className="flex gap-4 items-center">
              <Link to="/customer/login" className="text-sm font-medium text-slate-300 hover:text-amber-500 transition-colors hidden sm:block">
                Customer Login
              </Link>
              <Link to="/login" className="px-6 py-2 rounded-lg text-sm font-medium border border-slate-700 hover:border-amber-500 hover:text-amber-500 transition-all duration-300">
                Staff Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h1 className="text-5xl md:text-7xl font-outfit font-bold leading-tight">
              Precision <span className="text-amber-500">Engineering</span> & Excavation
            </h1>
            <p className="text-lg text-slate-400 max-w-xl leading-relaxed">
              Professional excavation, advanced welding, cutting, and demolition services. 
              We deliver industrial-grade solutions with uncompromising quality and safety.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link to="/customer/signup" className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                Submit Work Request
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 to-transparent rounded-2xl blur-2xl"></div>
            <img 
              src="/images/hero_real.jpg" 
              alt="Excavation Work" 
              className="relative rounded-2xl shadow-2xl border border-slate-800 object-cover h-[500px] w-full"
            />
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-outfit font-bold mb-4">Our Core Services</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Comprehensive heavy-duty solutions for construction and industrial needs.</p>
          </div>
          <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8">
            {[
              { title: 'Excavation', desc: 'Heavy earthmoving and site preparation.', icon: Truck },
              { title: 'Welding', desc: 'Industrial arc and gas welding services.', icon: Hammer },
              { title: 'Cutting', desc: 'Precision metal cutting and fabrication.', icon: Shield },
            ].map((s, i) => (
              <div key={i} className="bg-slate-800 p-8 rounded-2xl border border-slate-700 hover:border-amber-500 transition-colors group">
                <div className="bg-slate-900 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <s.icon className="w-7 h-7 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold mb-3">{s.title}</h3>
                <p className="text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-outfit font-bold mb-12 text-center">Facility & Operations</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <img src="/images/facility1.jpg" alt="Welding inside" className="rounded-2xl border border-slate-800 w-full h-[400px] object-cover hover:opacity-90 transition-opacity" />
            <img src="/images/facility2.jpg" alt="Workshop exterior" className="rounded-2xl border border-slate-800 w-full h-[400px] object-cover hover:opacity-90 transition-opacity" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-12 border-t border-slate-900 text-center text-slate-500">
        <p>© {new Date().getFullYear()} Sri Venkata Krishna Engineering Works. All rights reserved.</p>
        <div className="mt-4 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6 text-sm">
          <p>Mobile: <a href="tel:9573744819" className="text-amber-500 hover:text-amber-400 transition-colors">9573744819</a></p>
          <p>WhatsApp: <a href="https://wa.me/916281365760" target="_blank" rel="noreferrer" className="text-green-500 hover:text-green-400 transition-colors">6281365760</a></p>
        </div>
      </footer>
    </div>
  );
}
