import React, { useState } from 'react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Hammer, LogOut, Upload, Send, CheckCircle2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

const services = [
  { id: 1, title: 'Excavation Work', images: ['/images/excavation1.jpg', '/images/excavation2.jpg'], desc: 'Professional excavation services for construction and land clearing projects' },
  { id: 2, title: 'Lathe Machine', image: '/images/lathe.jpg', desc: 'Precision turning, threading, boring, shaft machining, pin and bush manufacturing, and repair of excavator and industrial machinery components' },
  { id: 3, title: 'Grinding', image: '/images/grinding.jpg', desc: 'Our workshop offers precision grinding services for shafts, pins, bushes, and machine components, ensuring smooth finishes and accurate dimensions. We help restore worn parts and improve the performance and lifespan of heavy equipment' },
  { id: 4, title: 'Welding and Gas Cutting Services', image: '/images/welding.jpg', desc: 'We offer high-quality welding and precision gas cutting services for fabrication, repair, and maintenance of heavy equipment and metal structures' },
  { id: 5, title: 'Track Services', image: '/images/track.jpg', desc: 'Track replacement, repair and maintenance for all vehicle types' },
  { id: 6, title: 'New Buckets', image: '/images/bucket.jpg', desc: 'We design and manufacture durable, custom-built excavator buckets to meet diverse excavation and material-handling requirements' }
];

export default function CustomerDashboard() {
  const { currentCustomer, customerLogout } = useCustomerAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: currentCustomer?.name || '',
    phone: currentCustomer?.phone || '',
    location: '',
    workDescription: '',
    preferredDate: ''
  });

  const handleLogout = async () => {
    await customerLogout();
    navigate('/');
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentCustomer) {
      toast.error('You must be logged in to submit a request');
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, 'workRequests'), {
        customerName: formData.name,
        phone: formData.phone,
        location: formData.location,
        workDescription: formData.workDescription,
        preferredDate: formData.preferredDate,
        customerId: currentCustomer.uid,
        customerEmail: currentCustomer.email,
        status: 'pending',
        read: false,
        createdAt: serverTimestamp()
      });
      setSuccess(true);
      toast.success('Work request submitted successfully!');
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit work request');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccess(false);
    setFormData(prev => ({
      ...prev,
      location: '',
      workDescription: '',
      preferredDate: ''
    }));
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-inter pb-20">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              <div className="bg-amber-500 p-2 rounded-xl flex items-center justify-center w-12 h-12">
                <span className="text-2xl font-bold text-slate-900 font-outfit">W</span>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-outfit font-bold">Workshop Portal</h1>
                <p className="text-sm text-slate-400 hidden sm:block">Welcome, {currentCustomer?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-16">
        
        {/* SECTION A — OUR SERVICES */}
        <section>
          <div className="mb-8">
            <h2 className="text-3xl font-outfit font-bold mb-2">Our Services</h2>
            <p className="text-slate-400">Explore the professional services we offer.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map(service => (
              <div key={service.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-6 flex flex-col hover:border-amber-500/50 transition-colors group">
                {service.images && service.images.length > 0 ? (
                  <div className="w-full h-48 rounded-xl overflow-hidden mb-4 border-2 border-slate-700 group-hover:border-amber-500/50 transition-colors flex">
                    {service.images.map((img, idx) => (
                      <div key={idx} className="flex-1 h-full border-r last:border-r-0 border-slate-700">
                        <img src={img} alt={`${service.title} ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : service.image ? (
                  <div className="w-full h-48 rounded-xl overflow-hidden mb-4 border-2 border-slate-700 group-hover:border-amber-500/50 transition-colors">
                    <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-48 bg-slate-700 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-amber-500/40 mb-4 group-hover:border-amber-500/80 transition-colors">
                    <Upload className="w-8 h-8 text-amber-500/60 mb-2" />
                    <p className="text-slate-500 text-xs">Service Image</p>
                  </div>
                )}
                <h3 className="text-xl font-bold mb-2 text-amber-500">{service.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{service.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION B — SUBMIT WORK REQUEST FORM */}
        <section className="bg-slate-800 rounded-2xl border border-slate-700 p-8">
          <div className="mb-8 border-b border-slate-700 pb-6">
            <h2 className="text-3xl font-outfit font-bold mb-2">Submit Work Request</h2>
            <p className="text-slate-400">Provide details about your project and we'll get back to you to confirm your appointment.</p>
          </div>

          {success ? (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
              </div>
              <h3 className="text-3xl font-outfit font-bold mb-4">Request Submitted!</h3>
              <p className="text-slate-400 text-lg mb-8 max-w-md">We will contact you shortly to confirm your appointment and provide an estimate.</p>
              <button
                onClick={handleReset}
                className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl font-semibold transition-all shadow-lg"
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Your Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all outline-none"
                    placeholder="Full Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all outline-none"
                    placeholder="Phone Number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Your Location</label>
                <input
                  type="text"
                  name="location"
                  required
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all outline-none"
                  placeholder="Your area / address in Vijayawada"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Work Description</label>
                <textarea
                  name="workDescription"
                  required
                  rows={4}
                  value={formData.workDescription}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all outline-none resize-none"
                  placeholder="Describe the work needed in detail..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Preferred Date</label>
                <input
                  type="date"
                  name="preferredDate"
                  required
                  min={todayStr}
                  value={formData.preferredDate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all outline-none [color-scheme:dark]"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-4 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    'Submitting...'
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Submit Work Request
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
