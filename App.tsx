
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, useNavigate, Link } from 'react-router-dom';
import { Layout } from './components/Layout';
import { EscrowCard } from './components/EscrowCard';
import { Chat } from './components/Chat';
import { AppState, User, Escrow, EscrowStatus, Message } from './types';
import { APP_NAME, COMMISSION_RATE, CURRENCY } from './constants';
import { analyzeDispute } from './services/geminiService';

// --- MOCK STORAGE KEYS ---
const USERS_KEY = 'escrow_now_users';
const ESCROWS_KEY = 'escrow_now_transactions';
const AUTH_KEY = 'escrow_now_auth';

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    escrows: [],
    loading: true,
  });

  // Load initial data
  useEffect(() => {
    const savedAuth = localStorage.getItem(AUTH_KEY);
    const savedEscrows = localStorage.getItem(ESCROWS_KEY);
    
    setState(prev => ({
      ...prev,
      currentUser: savedAuth ? JSON.parse(savedAuth) : null,
      escrows: savedEscrows ? JSON.parse(savedEscrows) : [],
      loading: false
    }));
  }, []);

  // Sync escrows to localStorage
  useEffect(() => {
    if (!state.loading) {
      localStorage.setItem(ESCROWS_KEY, JSON.stringify(state.escrows));
    }
  }, [state.escrows, state.loading]);

  const handleLogin = (user: User) => {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    setState(prev => ({ ...prev, currentUser: user }));
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    setState(prev => ({ ...prev, currentUser: null }));
  };

  const updateEscrowStatus = (id: string, status: EscrowStatus) => {
    setState(prev => ({
      ...prev,
      escrows: prev.escrows.map(e => e.id === id ? { ...e, status } : e)
    }));
  };

  const addMessage = (escrowId: string, text: string) => {
    if (!state.currentUser) return;
    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: state.currentUser.id,
      text,
      timestamp: Date.now(),
    };
    setState(prev => ({
      ...prev,
      escrows: prev.escrows.map(e => e.id === escrowId ? { ...e, messages: [...e.messages, newMessage] } : e)
    }));
  };

  return (
    <HashRouter>
      <Layout user={state.currentUser} onLogout={handleLogout}>
        {state.loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        ) : !state.currentUser ? (
          <AuthView onLogin={handleLogin} />
        ) : (
          <Routes>
            <Route path="/" element={<Dashboard state={state} />} />
            <Route path="/new" element={<NewEscrow creator={state.currentUser} onCreated={(escrow) => setState(p => ({ ...p, escrows: [escrow, ...p.escrows] }))} />} />
            <Route path="/escrow/:id" element={<EscrowDetail state={state} updateStatus={updateEscrowStatus} addMessage={addMessage} />} />
          </Routes>
        )}
      </Layout>
    </HashRouter>
  );
};

// --- AUTH VIEW ---
const AuthView: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return;
    onLogin({
      id: email.toLowerCase(), // Simple ID for demo
      email: email.toLowerCase(),
      name,
      phone: '+234 800 000 0000'
    });
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-slate-800">Welcome Back</h2>
        <p className="text-slate-500 mt-2">Sign in to trade with confidence</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
          <input 
            type="text" 
            required 
            value={name} 
            onChange={e => setName(e.target.value)} 
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" 
            placeholder="John Doe"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
          <input 
            type="email" 
            required 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" 
            placeholder="john@example.com"
          />
        </div>
        <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-100">
          Enter App
        </button>
      </form>
      <p className="text-xs text-center text-slate-400 mt-6 px-4">
        By continuing, you agree to the escrow service terms and Nigerian e-commerce regulations.
      </p>
    </div>
  );
};

// --- DASHBOARD ---
const Dashboard: React.FC<{ state: AppState }> = ({ state }) => {
  const navigate = useNavigate();
  const userEscrows = state.escrows.filter(e => e.creatorId === state.currentUser?.id || e.partnerEmail === state.currentUser?.email);

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Your Transactions</h2>
          <p className="text-slate-500">Manage your active and past escrows</p>
        </div>
        <Link 
          to="/new" 
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition shadow-md"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Setup Escrow
        </Link>
      </div>

      {userEscrows.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
          </div>
          <h3 className="text-lg font-medium text-slate-700">No transactions found</h3>
          <p className="text-slate-400 mt-1 max-w-sm mx-auto">You haven't created or been invited to any escrow transactions yet.</p>
          <Link to="/new" className="text-green-600 font-semibold mt-4 inline-block hover:underline">Start one now</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userEscrows.map(e => (
            <EscrowCard 
              key={e.id} 
              escrow={e} 
              isCreator={e.creatorId === state.currentUser?.id} 
              onClick={(id) => navigate(`/escrow/${id}`)} 
            />
          ))}
        </div>
      )}

      <div className="mt-12 bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4">
        <div className="bg-blue-600 p-2 rounded-lg text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <div>
          <h4 className="font-semibold text-blue-900">How it works</h4>
          <p className="text-blue-800/80 text-sm mt-1 leading-relaxed">
            1. Setup terms & amount. <br/>
            2. Share link with the other party to accept. <br/>
            3. Funds are held securely until delivery is confirmed. <br/>
            4. Commission of {(COMMISSION_RATE * 100).toFixed(0)}% is deducted from the payout.
          </p>
        </div>
      </div>
    </div>
  );
};

// --- NEW ESCROW FORM ---
const NewEscrow: React.FC<{ creator: User, onCreated: (e: Escrow) => void }> = ({ creator, onCreated }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    partnerEmail: '',
    role: 'SELLER' as 'BUYER' | 'SELLER',
    inspectionPeriod: '3',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    const newEscrow: Escrow = {
      id: Math.random().toString(36).substr(2, 9),
      title: formData.title,
      description: formData.description,
      amount: amount,
      commission: amount * COMMISSION_RATE,
      currency: 'NGN',
      creatorId: creator.id,
      partnerEmail: formData.partnerEmail.toLowerCase(),
      creatorRole: formData.role,
      status: EscrowStatus.PENDING,
      createdAt: Date.now(),
      messages: [],
      inspectionPeriodDays: parseInt(formData.inspectionPeriod),
    };
    onCreated(newEscrow);
    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/" className="text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-6 text-sm">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        Back to Dashboard
      </Link>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-slate-800 p-6 text-white">
          <h2 className="text-xl font-bold">Create New Escrow</h2>
          <p className="text-slate-400 text-sm mt-1">Define your transaction terms clearly</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Transaction Title</label>
              <input 
                type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none" 
                placeholder="e.g. iPhone 13 Pro Max Sale"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">I am the...</label>
              <select 
                value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none"
              >
                <option value="SELLER">Seller</option>
                <option value="BUYER">Buyer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Partner Email</label>
              <input 
                type="email" required value={formData.partnerEmail} onChange={e => setFormData({...formData, partnerEmail: e.target.value})} 
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none" 
                placeholder="partner@gmail.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount ({CURRENCY})</label>
              <input 
                type="number" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} 
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none" 
                placeholder="50,000"
              />
              <p className="text-[10px] text-slate-400 mt-1">Platform fee: {CURRENCY}{(parseFloat(formData.amount || '0') * COMMISSION_RATE).toLocaleString()}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Inspection Period (Days)</label>
              <input 
                type="number" required value={formData.inspectionPeriod} onChange={e => setFormData({...formData, inspectionPeriod: e.target.value})} 
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none" 
                min="1" max="14"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Terms & Conditions</label>
              <textarea 
                required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none h-32" 
                placeholder="Detail what exactly is being sold/delivered..."
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3 rounded-xl transition shadow-lg">
              Launch Escrow
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- ESCROW DETAIL VIEW ---
const EscrowDetail: React.FC<{ 
  state: AppState, 
  updateStatus: (id: string, s: EscrowStatus) => void,
  addMessage: (id: string, t: string) => void
}> = ({ state, updateStatus, addMessage }) => {
  const { id } = useNavigate() as any; // Using a little trick as we can't use useParams with HashRouter in some setups, but let's fix it
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const escrowId = window.location.hash.split('/').pop()?.split('?')[0];
  const escrow = state.escrows.find(e => e.id === escrowId);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  if (!escrow || !state.currentUser) return <div className="text-center py-10">Escrow not found.</div>;

  const isCreator = escrow.creatorId === state.currentUser.id;
  const isBuyer = (isCreator && escrow.creatorRole === 'BUYER') || (!isCreator && escrow.creatorRole === 'SELLER');
  const isSeller = !isBuyer;

  const handleDisputeAnalysis = async () => {
    setAnalyzing(true);
    const result = await analyzeDispute(escrow);
    setAiReport(result);
    setAnalyzing(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Details */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Transaction ID: {escrow.id}</span>
              <h2 className="text-2xl font-bold text-slate-800 mt-1">{escrow.title}</h2>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-green-600">{CURRENCY}{escrow.amount.toLocaleString()}</p>
              <p className="text-xs text-slate-400">Escrow Secured</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-slate-100 mb-6">
            <div>
              <p className="text-[10px] uppercase text-slate-400 mb-1">Status</p>
              <p className="text-sm font-semibold">{escrow.status}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400 mb-1">Inspection</p>
              <p className="text-sm font-semibold">{escrow.inspectionPeriodDays} Days</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400 mb-1">Creator</p>
              <p className="text-sm font-semibold">{isCreator ? 'You' : 'Partner'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400 mb-1">Fee (Paid by {isBuyer ? 'You' : 'Buyer'})</p>
              <p className="text-sm font-semibold">{CURRENCY}{escrow.commission.toLocaleString()}</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-800 mb-2">Terms of Transaction</h4>
            <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 leading-relaxed">
              {escrow.description}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap gap-3">
            {/* Context-aware buttons */}
            {escrow.status === EscrowStatus.PENDING && !isCreator && (
              <button 
                onClick={() => updateStatus(escrow.id, EscrowStatus.ACCEPTED)}
                className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 transition"
              >
                Accept Escrow Terms
              </button>
            )}

            {escrow.status === EscrowStatus.ACCEPTED && isBuyer && (
              <button 
                onClick={() => updateStatus(escrow.id, EscrowStatus.FUNDED)}
                className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 transition"
              >
                Fund Escrow ({CURRENCY}{(escrow.amount + escrow.commission).toLocaleString()})
              </button>
            )}

            {escrow.status === EscrowStatus.FUNDED && isSeller && (
              <button 
                onClick={() => updateStatus(escrow.id, EscrowStatus.SHIPPED)}
                className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition"
              >
                Mark as Shipped
              </button>
            )}

            {escrow.status === EscrowStatus.SHIPPED && isBuyer && (
              <button 
                onClick={() => updateStatus(escrow.id, EscrowStatus.DELIVERED)}
                className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition"
              >
                Confirm Delivery
              </button>
            )}

            {escrow.status === EscrowStatus.DELIVERED && isBuyer && (
              <button 
                onClick={() => updateStatus(escrow.id, EscrowStatus.COMPLETED)}
                className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 transition"
              >
                Release Funds to Seller
              </button>
            )}

            {(escrow.status === EscrowStatus.FUNDED || escrow.status === EscrowStatus.SHIPPED || escrow.status === EscrowStatus.DELIVERED) && (
              <button 
                onClick={() => updateStatus(escrow.id, EscrowStatus.DISPUTED)}
                className="bg-white border border-red-200 text-red-600 px-6 py-2 rounded-xl font-bold hover:bg-red-50 transition"
              >
                Raise Dispute
              </button>
            )}
          </div>
        </div>

        {escrow.status === EscrowStatus.DISPUTED && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              Dispute Resolution Panel
            </h3>
            <p className="text-red-700 text-sm mt-2">This transaction is currently on hold. Use the Gemini AI Mediator below to analyze the situation based on your chat history.</p>
            
            {!aiReport ? (
              <button 
                onClick={handleDisputeAnalysis}
                disabled={analyzing}
                className="mt-4 bg-red-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-50"
              >
                {analyzing ? 'Analyzing with Gemini...' : 'Analyze with AI Mediator'}
              </button>
            ) : (
              <div className="mt-4 bg-white rounded-xl p-4 border border-red-100">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Gemini AI Recommendation
                </div>
                <div className="prose prose-sm text-slate-700 italic">
                  {aiReport}
                </div>
                <button 
                  onClick={() => setAiReport(null)}
                  className="mt-4 text-xs text-slate-400 hover:text-red-600 font-medium"
                >
                  Clear Analysis
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Column: Chat */}
      <div className="lg:col-span-1">
        <Chat 
          messages={escrow.messages} 
          currentUser={state.currentUser} 
          onSendMessage={(txt) => addMessage(escrow.id, txt)} 
        />
        <div className="mt-4 bg-slate-100 rounded-xl p-4">
          <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Safety Tips</h5>
          <ul className="text-xs text-slate-600 space-y-2">
            <li className="flex gap-2">
              <span className="text-green-600">•</span>
              Never share your password or OTP.
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">•</span>
              Always use this chat for all transaction agreements.
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">•</span>
              Confirm item quality before releasing funds.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default App;
