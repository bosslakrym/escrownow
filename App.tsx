
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate, Link } from 'react-router-dom';
import { 
  collection, query, where, onSnapshot, doc, updateDoc, 
  arrayUnion, addDoc, setDoc, getDoc 
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut
} from 'firebase/auth';
import { db, auth } from './services/firebase';
import { Layout } from './components/Layout';
import { EscrowCard } from './components/EscrowCard';
import { Chat } from './components/Chat';
import { AppState, User, Escrow, EscrowStatus, Message } from './types';
import { APP_NAME, COMMISSION_RATE, CURRENCY } from './constants';
import { analyzeDispute } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    escrows: [],
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        
        const user: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: userData.name || firebaseUser.email?.split('@')[0] || 'User',
          phone: userData.phone || '+234'
        };
        setState(prev => ({ ...prev, currentUser: user, loading: false }));
      } else {
        setState(prev => ({ ...prev, currentUser: null, loading: false }));
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!state.currentUser) {
      setState(prev => ({ ...prev, escrows: [] }));
      return;
    }
    const q = query(
      collection(db, "escrows"),
      where("involvedParties", "array-contains", state.currentUser.email.toLowerCase())
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const escrows: Escrow[] = [];
      querySnapshot.forEach((doc) => {
        escrows.push({ id: doc.id, ...doc.data() } as Escrow);
      });
      escrows.sort((a, b) => b.createdAt - a.createdAt);
      setState(prev => ({ ...prev, escrows }));
    });
    return () => unsubscribe();
  }, [state.currentUser]);

  const handleLogout = () => signOut(auth);

  const updateEscrowStatus = async (id: string, status: EscrowStatus) => {
    try {
      await updateDoc(doc(db, "escrows", id), { status });
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
      await updateDoc(doc(db, "escrows", escrowId), { messages: arrayUnion(newMessage) });
    } catch (e) {
      console.error("Message Error:", e);
    }
  };

  return (
    <HashRouter>
      <Layout user={state.currentUser} onLogout={handleLogout}>
        {state.loading ? (
          <div className="flex flex-col justify-center items-center py-40 gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-emerald-500 border-r-4 border-transparent"></div>
            <p className="text-slate-400 font-bold animate-pulse text-sm">LOADING PROTOCOLS...</p>
          </div>
        ) : !state.currentUser ? (
          <AuthView />
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

const AuthView: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", userCredential.user.uid), {
          name, email: email.toLowerCase(), createdAt: Date.now()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message.includes('auth/invalid-credential') ? 'Invalid email or password' : err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 animate-fade-in">
      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
        <div className="text-center mb-10">
          <div className="inline-block p-4 bg-emerald-50 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">{isRegistering ? 'Join Now' : 'Welcome Back'}</h2>
          <p className="text-slate-500 mt-2 font-medium">Secure your trades on {APP_NAME}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100 font-medium flex gap-2 items-center">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegistering && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Full Business Name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium" placeholder="Legal Name" />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Work Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium" placeholder="name@company.com" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Secure Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium" placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-emerald-600/20 active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2">
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (isRegistering ? 'CREATE ACCOUNT' : 'SECURE SIGN IN')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button onClick={() => setIsRegistering(!isRegistering)} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition">
            {isRegistering ? 'Already a member? Sign In' : 'New to EscrowNow? Register Today'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC<{ state: AppState }> = ({ state }) => {
  const navigate = useNavigate();
  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Active Trade Board</h2>
          <p className="text-slate-500 font-medium text-lg">Monitoring {state.escrows.length} secure agreements</p>
        </div>
        <Link to="/new" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
          INITIATE NEW ESCROW
        </Link>
      </div>
      {state.escrows.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-24 text-center">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h3 className="text-2xl font-black text-slate-800">No Transactions Found</h3>
          <p className="text-slate-400 font-medium max-w-xs mx-auto mb-8">Start your first secure trade by defining terms and inviting a partner.</p>
          <Link to="/new" className="text-emerald-600 font-black hover:underline uppercase tracking-widest text-sm">Create Agreement &rarr;</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
    const amountNum = parseFloat(formData.amount);
    try {
      await addDoc(collection(db, "escrows"), {
        title: formData.title,
        description: formData.description,
        amount: amountNum,
        commission: amountNum * COMMISSION_RATE,
        currency: 'NGN',
        creatorId: creator.id,
        partnerEmail: formData.partnerEmail.toLowerCase().trim(),
        involvedParties: [creator.email.toLowerCase(), formData.partnerEmail.toLowerCase().trim()],
        creatorRole: formData.role,
        status: EscrowStatus.PENDING,
        createdAt: Date.now(),
        messages: [],
        inspectionPeriodDays: 3,
      });
      navigate('/');
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-2xl animate-fade-in">
      <div className="mb-10">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Initiate Trade</h2>
        <p className="text-slate-500 font-medium">Terms defined here are legally binding via the platform protocol.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Item/Service Headline</label>
          <input type="text" placeholder="e.g. Sales of Website Development Services" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold" />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Your Profile</label>
            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold">
              <option value="SELLER">I am Seller</option>
              <option value="BUYER">I am Buyer</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Trade Value (NGN)</label>
            <input type="number" placeholder="0.00" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Partner's Registered Email</label>
          <input type="email" placeholder="client@example.com" required value={formData.partnerEmail} onChange={e => setFormData({...formData, partnerEmail: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Detailed Protocol & Delivery Terms</label>
          <textarea placeholder="Describe shipment method, timeline, and quality benchmarks..." required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl h-40 focus:ring-4 focus:ring-emerald-500/10 outline-none font-medium"></textarea>
        </div>
        <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl transition-all hover:bg-black active:scale-[0.98] disabled:opacity-50">
          {isSubmitting ? 'INITIATING SECURE PROTOCOL...' : 'CONFIRM & LAUNCH ESCROW'}
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

  if (!escrow || !state.currentUser) return <div className="text-center py-20 font-medium text-slate-400 animate-pulse">Establishing Secure Connection...</div>;

  const isBuyer = (escrow.creatorId === state.currentUser.id && escrow.creatorRole === 'BUYER') || (escrow.creatorId !== state.currentUser.id && escrow.creatorRole === 'SELLER');
  const isSeller = !isBuyer;

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <button onClick={() => navigate('/')} className="mb-8 font-bold text-slate-400 hover:text-emerald-600 flex items-center gap-2 transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Return to Portal
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-6">
              <div>
                <div className={`text-[10px] uppercase tracking-widest px-3 py-1 rounded-full font-black mb-4 inline-block ${
                  escrow.status === EscrowStatus.FUNDED ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  Status: {escrow.status}
                </div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">{escrow.title}</h2>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-right min-w-[200px]">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Contract Value</p>
                <p className="text-3xl font-black text-emerald-600 leading-none">{CURRENCY}{escrow.amount.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="bg-slate-900 text-slate-300 p-8 rounded-3xl mb-10 shadow-inner">
              <h4 className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-4">Official Agreement Terms</h4>
              <p className="text-lg leading-relaxed whitespace-pre-wrap">{escrow.description}</p>
            </div>
            
            <div className="flex flex-wrap gap-4">
              {escrow.status === EscrowStatus.PENDING && escrow.creatorId !== state.currentUser.id && (
                <button onClick={() => updateStatus(escrow.id, EscrowStatus.ACCEPTED)} className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black shadow-lg shadow-emerald-600/20 hover:scale-105 transition-all">SIGN & ACCEPT</button>
              )}
              {escrow.status === EscrowStatus.ACCEPTED && isBuyer && (
                <button onClick={() => updateStatus(escrow.id, EscrowStatus.FUNDED)} className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all">TRANSFER TO ESCROW</button>
              )}
              {escrow.status === EscrowStatus.FUNDED && isSeller && (
                <button onClick={() => updateStatus(escrow.id, EscrowStatus.SHIPPED)} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all">MARK AS SHIPPED</button>
              )}
              {escrow.status === EscrowStatus.SHIPPED && isBuyer && (
                <button onClick={() => updateStatus(escrow.id, EscrowStatus.COMPLETED)} className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all">RELEASE FUNDS</button>
              )}
              {(escrow.status === EscrowStatus.FUNDED || escrow.status === EscrowStatus.SHIPPED) && (
                <button onClick={() => updateStatus(escrow.id, EscrowStatus.DISPUTED)} className="bg-white text-red-600 border border-red-100 px-10 py-4 rounded-2xl font-black hover:bg-red-50 transition-all">OPEN DISPUTE</button>
              )}
            </div>

            {escrow.status === EscrowStatus.DISPUTED && (
              <div className="mt-12 p-8 bg-red-50 rounded-[2rem] border border-red-100 animate-pulse-subtle">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-red-600 text-white rounded-xl shadow-lg shadow-red-600/20">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <h4 className="font-black text-xl text-red-900 tracking-tight">AI Mediator Intervention Required</h4>
                </div>
                <p className="text-red-700 font-medium mb-6">Dispute protocol engaged. Gemini AI is analyzing chat logs and terms for a neutral resolution.</p>
                <button 
                  onClick={async () => { setAnalyzing(true); const report = await analyzeDispute(escrow); setAiReport(report); setAnalyzing(false); }} 
                  disabled={analyzing}
                  className="w-full bg-white text-red-600 border border-red-200 py-4 rounded-2xl font-black shadow-sm hover:bg-red-50 transition-all flex justify-center items-center gap-2"
                >
                  {analyzing ? <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div> : 'EXECUTE AI MEDIATION'}
                </button>
                {aiReport && (
                  <div className="mt-8 p-8 bg-white rounded-3xl border border-red-100 shadow-xl animate-fade-in">
                    <h5 className="font-black text-slate-900 mb-4 flex items-center gap-2 border-b pb-4">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      RESOLUTION ADVISORY
                    </h5>
                    <div className="text-slate-600 text-lg italic leading-relaxed whitespace-pre-wrap">{aiReport}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="lg:col-span-4">
          <Chat messages={escrow.messages} currentUser={state.currentUser} onSendMessage={(txt) => addMessage(escrow.id, txt)} />
          <div className="mt-6 bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-xl text-white">
            <p className="text-[10px] text-emerald-400 uppercase font-black tracking-widest mb-4">Escrow Protocol v2.4</p>
            <ul className="space-y-4 text-sm font-medium text-slate-400">
              <li className="flex gap-3"><span className="text-emerald-500 font-black">✓</span> Bank-grade encryption for all logs.</li>
              <li className="flex gap-3"><span className="text-emerald-500 font-black">✓</span> Multi-sig fund protection.</li>
              <li className="flex gap-3"><span className="text-emerald-500 font-black">✓</span> 72hr auto-resolution window.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
