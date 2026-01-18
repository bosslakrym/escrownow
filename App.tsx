
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate, Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, addDoc } from 'firebase/firestore';
import { db } from './services/firebase';
import { Layout } from './components/Layout';
import { EscrowCard } from './components/EscrowCard';
import { Chat } from './components/Chat';
import { AppState, User, Escrow, EscrowStatus, Message } from './types';
import { APP_NAME, COMMISSION_RATE, CURRENCY } from './constants';
import { analyzeDispute } from './services/geminiService';

const AUTH_KEY = 'escrow_now_auth';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    escrows: [],
    loading: true,
  });

  useEffect(() => {
    const savedAuth = localStorage.getItem(AUTH_KEY);
    if (savedAuth) {
      setState(prev => ({ ...prev, currentUser: JSON.parse(savedAuth) }));
    } else {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    if (!state.currentUser) return;

    const email = state.currentUser.email;
    const q = query(
      collection(db, "escrows"),
      where("involvedParties", "array-contains", email)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const escrows: Escrow[] = [];
      querySnapshot.forEach((doc) => {
        escrows.push({ id: doc.id, ...doc.data() } as Escrow);
      });
      escrows.sort((a, b) => b.createdAt - a.createdAt);
      setState(prev => ({ ...prev, escrows, loading: false }));
    }, (error) => {
      console.error("Firestore Error:", error);
      setState(prev => ({ ...prev, loading: false }));
    });

    return () => unsubscribe();
  }, [state.currentUser]);

  const handleLogin = (user: User) => {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    setState(prev => ({ ...prev, currentUser: user }));
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    setState(prev => ({ ...prev, currentUser: null }));
  };

  const updateEscrowStatus = async (id: string, status: EscrowStatus) => {
    try {
      const escrowRef = doc(db, "escrows", id);
      await updateDoc(escrowRef, { status });
    } catch (e) {
      console.error("Update Status Error:", e);
    }
  };

  const addMessage = async (escrowId: string, text: string) => {
    if (!state.currentUser) return;
    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: state.currentUser.id,
      text,
      timestamp: Date.now(),
    };
    try {
      const escrowRef = doc(db, "escrows", escrowId);
      await updateDoc(escrowRef, {
        messages: arrayUnion(newMessage)
      });
    } catch (e) {
      console.error("Message Error:", e);
    }
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
            <Route path="/new" element={<NewEscrow creator={state.currentUser} />} />
            <Route path="/escrow/:id" element={<EscrowDetail state={state} updateStatus={updateEscrowStatus} addMessage={addMessage} />} />
          </Routes>
        )}
      </Layout>
    </HashRouter>
  );
};

const AuthView: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return;
    onLogin({
      id: email.toLowerCase(),
      email: email.toLowerCase(),
      name,
      phone: '+234'
    });
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-slate-800">{APP_NAME}</h2>
        <p className="text-slate-500 mt-2">Nigerian Secure Trading Platform</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
          <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none" placeholder="Business Name or Individual" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none" placeholder="email@example.com" />
        </div>
        <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg">
          Start Trading
        </button>
      </form>
    </div>
  );
};

const Dashboard: React.FC<{ state: AppState }> = ({ state }) => {
  const navigate = useNavigate();
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Your Transactions</h2>
          <p className="text-slate-500">Managing {state.escrows.length} active agreements</p>
        </div>
        <Link to="/new" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md transition-all">Setup Escrow</Link>
      </div>

      {state.escrows.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h3 className="text-lg font-medium text-slate-700">No active escrows</h3>
          <p className="text-slate-400 mb-6">Create a new agreement to start trading securely.</p>
          <Link to="/new" className="text-green-600 font-semibold hover:underline">Start your first transaction &rarr;</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {state.escrows.map(e => (
            <EscrowCard key={e.id} escrow={e} isCreator={e.creatorId === state.currentUser?.id} onClick={(id) => navigate(`/escrow/${id}`)} />
          ))}
        </div>
      )}
    </div>
  );
};

const NewEscrow: React.FC<{ creator: User }> = ({ creator }) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', amount: '', partnerEmail: '', role: 'SELLER' as 'BUYER' | 'SELLER' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    const amount = parseFloat(formData.amount);
    const newEscrow = {
      title: formData.title,
      description: formData.description,
      amount: amount,
      commission: amount * COMMISSION_RATE,
      currency: 'NGN',
      creatorId: creator.id,
      partnerEmail: formData.partnerEmail.toLowerCase(),
      involvedParties: [creator.email, formData.partnerEmail.toLowerCase()],
      creatorRole: formData.role,
      status: EscrowStatus.PENDING,
      createdAt: Date.now(),
      messages: [],
      inspectionPeriodDays: 3,
    };
    
    try {
      await addDoc(collection(db, "escrows"), newEscrow);
      navigate('/');
    } catch (err) {
      console.error("Save Error:", err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">New Escrow Agreement</h2>
        <p className="text-slate-500">Define your terms and invite your trading partner.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Transaction Title</label>
          <input type="text" placeholder="e.g. Purchase of iPhone 15 Pro" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Your Role</label>
            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
              <option value="SELLER">I am Seller</option>
              <option value="BUYER">I am Buyer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount (NGN)</label>
            <input type="number" placeholder="0.00" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Partner Email Address</label>
          <input type="email" placeholder="partner@example.com" required value={formData.partnerEmail} onChange={e => setFormData({...formData, partnerEmail: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
          <p className="text-[10px] text-slate-400 mt-1 uppercase">They will see this transaction in their dashboard once created.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Terms & Delivery Conditions</label>
          <textarea placeholder="Specify what must happen for funds to be released..." required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg h-32 focus:ring-2 focus:ring-green-500 outline-none"></textarea>
        </div>
        <button 
          type="submit" 
          disabled={isSubmitting}
          className={`w-full bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`}
        >
          {isSubmitting ? 'Creating...' : 'Create Escrow Agreement'}
        </button>
      </form>
    </div>
  );
};

const EscrowDetail: React.FC<{ state: AppState, updateStatus: (id: string, s: EscrowStatus) => void, addMessage: (id: string, t: string) => void }> = ({ state, updateStatus, addMessage }) => {
  const navigate = useNavigate();
  const escrowId = window.location.hash.split('/').pop()?.split('?')[0];
  const escrow = state.escrows.find(e => e.id === escrowId);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  if (!escrow || !state.currentUser) return <div className="text-center py-20 font-medium text-slate-500">Escrow not found or loading...</div>;

  const isBuyer = (escrow.creatorId === state.currentUser.id && escrow.creatorRole === 'BUYER') || (escrow.creatorId !== state.currentUser.id && escrow.creatorRole === 'SELLER');
  const isSeller = !isBuyer;

  return (
    <div className="max-w-6xl mx-auto">
      <button onClick={() => navigate('/')} className="mb-6 text-sm text-slate-500 hover:text-green-600 flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
        Back to Dashboard
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded bg-slate-100 text-slate-600 font-bold mb-2 inline-block`}>Status: {escrow.status}</span>
                <h2 className="text-3xl font-bold text-slate-800">{escrow.title}</h2>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-green-600">{CURRENCY}{escrow.amount.toLocaleString()}</span>
                <p className="text-[10px] text-slate-400 mt-1 uppercase">Total Escrow Value</p>
              </div>
            </div>
            
            <div className="prose prose-slate max-w-none bg-slate-50 p-6 rounded-xl border border-slate-100 mb-8">
              <h4 className="text-sm font-bold uppercase text-slate-400 mb-2">Agreed Terms</h4>
              <p className="text-slate-700 whitespace-pre-wrap">{escrow.description}</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {escrow.status === EscrowStatus.PENDING && escrow.creatorId !== state.currentUser.id && (
                <button onClick={() => updateStatus(escrow.id, EscrowStatus.ACCEPTED)} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-green-700 transition-all">Accept Agreement</button>
              )}
              {escrow.status === EscrowStatus.ACCEPTED && isBuyer && (
                <button onClick={() => updateStatus(escrow.id, EscrowStatus.FUNDED)} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-green-700 transition-all">Make Payment</button>
              )}
              {escrow.status === EscrowStatus.FUNDED && isSeller && (
                <button onClick={() => updateStatus(escrow.id, EscrowStatus.SHIPPED)} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all">Confirm Shipment</button>
              )}
              {escrow.status === EscrowStatus.SHIPPED && isBuyer && (
                <button onClick={() => updateStatus(escrow.id, EscrowStatus.COMPLETED)} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-green-700 transition-all">Release Funds to Seller</button>
              )}
              {(escrow.status === EscrowStatus.FUNDED || escrow.status === EscrowStatus.SHIPPED) && (
                <button onClick={() => updateStatus(escrow.id, EscrowStatus.DISPUTED)} className="border border-red-200 text-red-600 px-8 py-3 rounded-xl font-bold hover:bg-red-50 transition-all">Flag a Dispute</button>
              )}
            </div>

            {escrow.status === EscrowStatus.DISPUTED && (
              <div className="mt-8 p-6 bg-red-50 rounded-2xl border border-red-100">
                <div className="flex items-center gap-3 mb-4 text-red-800">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                  <h4 className="font-bold text-lg">AI Dispute Mediation Active</h4>
                </div>
                <p className="text-sm text-red-700 mb-4">Our Gemini AI mediator is monitoring this transaction to help reach a resolution.</p>
                <button 
                  onClick={async () => { 
                    setAnalyzing(true); 
                    const report = await analyzeDispute(escrow); 
                    setAiReport(report); 
                    setAnalyzing(false); 
                  }} 
                  disabled={analyzing}
                  className="bg-white text-red-600 border border-red-200 px-6 py-2 rounded-lg font-bold shadow-sm hover:bg-red-50 transition-all flex items-center gap-2"
                >
                  {analyzing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                      Mediating Dispute...
                    </>
                  ) : 'Generate AI Resolution Report'}
                </button>
                {aiReport && (
                  <div className="mt-6 p-6 bg-white rounded-xl border border-red-100 shadow-sm animate-fade-in">
                    <h5 className="font-bold text-slate-800 mb-3 border-b pb-2">Mediator Recommendation</h5>
                    <div className="text-slate-600 text-sm italic leading-relaxed whitespace-pre-wrap">{aiReport}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <Chat messages={escrow.messages} currentUser={state.currentUser} onSendMessage={(txt) => addMessage(escrow.id, txt)} />
          <div className="mt-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
            <p className="text-[10px] text-blue-700 uppercase font-bold mb-1">Escrow Protocol</p>
            <p className="text-xs text-blue-600 leading-tight">Payments are held in a secure vault. Funds only release when the buyer confirms receipt or the inspection period expires.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
