import React from 'react';

// --- Types & Interfaces ---
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  color: string;
}

// --- Sub-Components ---
const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, color }) => (
  <div className="flex flex-col items-center text-center p-6 group">
    <div className={`w-14 h-14 ${color} rounded-full flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform`}>
      <span className="text-2xl">{icon}</span>
    </div>
    <h3 className="text-xl font-bold mb-3">{title}</h3>
    <p className="text-gray-500 leading-relaxed text-sm">
      Planning ahead is a key factor when creating an employee work schedule important for business.
    </p>
  </div>
);

// --- Main Page Component ---
const Home: React.FC = () => {
  return (
    <div className="font-sans text-slate-900 selection:bg-blue-100">
      
      {/* SECTION 1: HERO */}
      <section className="bg-[#2563eb] text-white px-6 md:px-20 pt-16 pb-32">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-left duration-700">
            <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">
              Engage Your <br /> Customers With <br /> Real-Time Chat
            </h1>
            <p className="text-blue-100 text-lg max-w-md leading-relaxed">
              NexusChat is a complete customer service platform that connects with your visitors in real-time to convert leads.
            </p>
            <div className="relative max-w-md bg-white rounded-full p-1.5 flex items-center shadow-2xl focus-within:ring-4 ring-blue-400/30 transition-all">
              <input 
                type="email" 
                placeholder="Enter your email here" 
                className="flex-grow px-6 py-3 text-gray-800 bg-transparent outline-none w-full" 
              />
              <button className="bg-[#bef264] text-black font-bold px-6 py-3 rounded-full hover:brightness-105 active:scale-95 transition whitespace-nowrap">
                Get Started Free
              </button>
            </div>
          </div>
          
          <div className="relative flex justify-center">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-blue-400/50 rotate-2 hover:rotate-0 transition-all duration-700 max-w-md">
              <img 
                src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=800" 
                alt="Support Agent" 
                className="w-full object-cover aspect-[4/5]" 
              />
              <div className="absolute bottom-10 right-6 space-y-3 drop-shadow-lg">
                <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl rounded-tr-none text-sm animate-bounce">Hi Kamrul</div>
                <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl rounded-tr-none text-sm">How can I help you today?</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: FEATURES */}
      <section id="features" className="bg-white py-24 px-6">
        <div className="max-w-6xl mx-auto text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
            Contains Modern Features For <br className="hidden md:block" /> Better Experience
          </h2>
        </div>
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12">
          <FeatureCard title="Easily Extensible" color="bg-blue-100 text-blue-600" icon="🔗" />
          <FeatureCard title="Live Visitors List" color="bg-green-100 text-green-600" icon="📋" />
          <FeatureCard title="Record & Keep Private" color="bg-purple-100 text-purple-600" icon="🔒" />
        </div>
      </section>

      {/* SECTION 3: DASHBOARD ROW */}
      <section id="solutions" className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-20 items-center">
          <div className="bg-slate-100 p-6 rounded-3xl shadow-inner border border-slate-200 order-2 md:order-1">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden p-8 border border-slate-200">
               <div className="flex gap-2 mb-8">
                 <div className="w-3 h-3 rounded-full bg-red-400" />
                 <div className="w-3 h-3 rounded-full bg-yellow-400" />
                 <div className="w-3 h-3 rounded-full bg-green-400" />
               </div>
               <div className="space-y-6">
                 {[1, 2].map((i) => (
                   <div key={i} className="flex gap-4 items-center">
                     <div className="w-12 h-12 rounded-full bg-slate-100 animate-pulse" />
                     <div className="flex-1 space-y-2">
                       <div className="h-3 bg-slate-100 w-3/4 rounded" />
                       <div className="h-2 bg-slate-50 w-1/2 rounded" />
                     </div>
                   </div>
                 ))}
                 <div className="h-40 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                    Nexus Dashboard Preview
                 </div>
               </div>
            </div>
          </div>
          <div className="space-y-8 order-1 md:order-2">
            <h2 className="text-4xl md:text-5xl font-bold leading-tight">Use NexusChat as your one <br /> chat support solution</h2>
            <p className="text-gray-500 text-lg">For customers looking for a complete help desk solution, we provide a modern, pre-built chat support agent and admin dashboard.</p>
            <button className="bg-[#bef264] px-10 py-4 rounded-full font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">Explore more</button>
          </div>
        </div>
      </section>

      {/* FOOTER - CTA SECTION */}
      <footer className="bg-black text-white pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center border-b border-gray-800 pb-20 mb-20 gap-8">
            <h2 className="text-4xl md:text-6xl font-bold leading-tight">Its easy to get <br /> started for business</h2>
            <div className="flex gap-4">
              <button className="px-8 py-4 rounded-full border border-white/30 hover:bg-white hover:text-black transition-colors font-medium">Explore more</button>
              <button className="px-8 py-4 rounded-full bg-[#bef264] text-black font-bold hover:brightness-110 transition-all">Get Started Free</button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-12 gap-x-8">
            <div className="col-span-2 space-y-6">
              <div className="text-2xl font-bold flex items-center gap-2">
                <span className="text-[#bef264]">⚡</span> NexusChat
              </div>
              <p className="text-gray-400">Get in touch</p>
              <a href="mailto:hello_nexus@gmail.com" className="text-xl md:text-2xl font-semibold hover:text-[#bef264] transition-colors">hello_nexus@gmail.com</a>
              <div className="flex gap-4 pt-4">
                {['📸', '🐦', '💼', '🎥'].map((icon, i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center cursor-pointer hover:bg-white hover:text-black transition-all">
                    {icon}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-lg">Product</h4>
              <ul className="space-y-4 text-gray-400">
                <li><a href="#" className="hover:text-white transition">Chat Support</a></li>
                <li><a href="#" className="hover:text-white transition">Notifications</a></li>
                <li><a href="#" className="hover:text-white transition">Unified Inbox</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-lg">Company</h4>
              <ul className="space-y-4 text-gray-400">
                <li><a href="#" className="hover:text-white transition">About Us</a></li>
                <li><a href="#" className="hover:text-white transition">Careers</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center mt-24 pt-8 border-t border-zinc-900 text-gray-500 text-sm">
            <p>Copyrights © 2026 NexusChat. Built with TypeScript & React.</p>
            <div className="flex gap-8 mt-4 md:mt-0">
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;