import React, { useState, useMemo, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- Comprehensive Region List (200+ Regions) ---
const GLOBAL_REGIONS = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia - NSW", "Australia - Queensland", "Australia - Victoria", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil - Amazonas", "Brazil - Bahia", "Brazil - Sao Paulo", "Bulgaria", "Burkina Faso", "Burundi",
  "Cambodia", "Cameroon", "Canada - Alberta", "Canada - BC", "Canada - Ontario", "Canada - Quebec", "Cape Verde", "Central African Republic", "Chad", "Chile", "China - Guangdong", "China - Sichuan", "China - Tibet", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France - Brittany", "France - Paris", "Gabon", "Gambia", "Georgia", "Germany - Bavaria", "Germany - Berlin", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guyana",
  "Haiti", "Honduras", "Hungary", "Iceland", "India - Kerala", "India - Maharashtra", "India - Punjab", "Indonesia - Bali", "Indonesia - Jakarta", "Iran", "Iraq", "Ireland", "Israel", "Italy - Sicily", "Italy - Tuscany", "Ivory Coast", "Jamaica", "Japan - Hokkaido", "Japan - Kyoto", "Japan - Tokyo", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Mauritania", "Mauritius", "Mexico - Jalisco", "Mexico - Mexico City", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia - Moscow", "Russia - Siberia", "Rwanda",
  "Samoa", "San Marino", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "Spain - Catalonia", "Spain - Madrid", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom - Scotland", "United Kingdom - Wales", "Uruguay",
  "USA - Alabama", "USA - Alaska", "USA - Arizona", "USA - Arkansas", "USA - California", "USA - Colorado", "USA - Connecticut", "USA - Delaware", "USA - Florida", "USA - Georgia", "USA - Hawaii", "USA - Idaho", "USA - Illinois", "USA - Indiana", "USA - Iowa", "USA - Kansas", "USA - Kentucky", "USA - Louisiana", "USA - Maine", "USA - Maryland", "USA - Massachusetts", "USA - Michigan", "USA - Minnesota", "USA - Mississippi", "USA - Missouri", "USA - Montana", "USA - Nebraska", "USA - Nevada", "USA - New Hampshire", "USA - New Jersey", "USA - New Mexico", "USA - New York", "USA - North Carolina", "USA - North Dakota", "USA - Ohio", "USA - Oklahoma", "USA - Oregon", "USA - Pennsylvania", "USA - Rhode Island", "USA - South Carolina", "USA - South Dakota", "USA - Tennessee", "USA - Texas", "USA - Utah", "USA - Vermont", "USA - Virginia", "USA - Washington", "USA - West Virginia", "USA - Wisconsin", "USA - Wyoming",
  "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam - Hanoi", "Vietnam - Saigon", "Yemen", "Zambia", "Zimbabwe"
];

// --- Archetype List for entropy injection ---
const RANDOM_ARCHETYPES = [
  "Traditional Artisan", "Digital Nomad", "Off-grid Specialist", "Obscure Academic", "Niche Hobbyist", "Civic Leader", "Night-shift Worker", "Hidden Talent", "Cultural Preservationist", "Practical Problem Solver", "Aspiring Visionary", "Grounded Professional"
];

// --- Helper: Deep Shuffle ---
const shuffle = <T,>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// --- Types ---
interface Persona {
  id: string;
  fullName: string;
  dateOfBirth: string;
  age: number;
  gender: 'Male' | 'Female' | 'Non-binary' | 'Other';
  region: string; 
  occupation: string;
  biography: string; // Detailed bio if isDetailed is true
  shortBiography: string; // Initial bio
  interests: string[];
  personalityTraits: string[];
  ethnicity: string;
  primaryLanguage: string;
  isDetailed?: boolean;
}

interface User {
  username: string;
  joinedAt: string;
}

// --- App Component ---
const App = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInput, setAuthInput] = useState('');

  // App State
  const [loading, setLoading] = useState(false);
  const [expandingIds, setExpandingIds] = useState<Set<string>>(new Set());
  const [currentlyExpandedIds, setCurrentlyExpandedIds] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<Persona[]>([]);
  const [savedArchive, setSavedArchive] = useState<Persona[]>([]);
  const [view, setView] = useState<'stream' | 'archive'>('stream');
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Persona | null>(null);

  // Filters State
  const [filterQuery, setFilterQuery] = useState('');
  const [filterRegion, setFilterRegion] = useState('All');
  const [filterGender, setFilterGender] = useState('All');

  // Initialization
  useEffect(() => {
    const savedUser = localStorage.getItem('persona_user');
    const savedProfiles = localStorage.getItem('persona_archive');
    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedProfiles) setSavedArchive(JSON.parse(savedProfiles));
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authInput.trim()) return;
    const newUser = { username: authInput, joinedAt: new Date().toISOString() };
    setUser(newUser);
    localStorage.setItem('persona_user', JSON.stringify(newUser));
    setIsAuthModalOpen(false);
    setAuthInput('');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('persona_user');
    setView('stream');
  };

  const generatePersona = async () => {
    setLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const randomSeed = Math.random().toString(36).substring(7);
      const randomArchetype = RANDOM_ARCHETYPES[Math.floor(Math.random() * RANDOM_ARCHETYPES.length)];
      
      let selectedRegion = filterRegion;
      if (selectedRegion === 'All') {
        const shuffled = shuffle(GLOBAL_REGIONS);
        selectedRegion = shuffled[0];
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a completely UNIQUE and realistic human persona for a simulation.
        STRICT DIVERSITY PROTOCOL:
        1. REGION: The persona MUST be from: "${selectedRegion}".
        2. ARCHETYPE: Use the spirit of a "${randomArchetype}" but keep it grounded.
        3. OCCUPATION: Avoid generic software engineers or CEOs. Use specific, niche roles.
        4. INTERESTS: Must be ultra-specific.
        5. PERSONALITY: Use nuanced traits.
        6. REPETITION: Do not use common name tropes. Seed: ${randomSeed}.
        7. BIOGRAPHY: 2 sentences focusing on a specific recent life event related to their occupation or region.`,
        config: {
          temperature: 1.0,
          topP: 0.95,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              fullName: { type: Type.STRING },
              dateOfBirth: { type: Type.STRING },
              age: { type: Type.INTEGER },
              gender: { type: Type.STRING, enum: ['Male', 'Female', 'Non-binary', 'Other'] },
              region: { type: Type.STRING },
              occupation: { type: Type.STRING },
              biography: { type: Type.STRING },
              interests: { type: Type.ARRAY, items: { type: Type.STRING } },
              personalityTraits: { type: Type.ARRAY, items: { type: Type.STRING } },
              ethnicity: { type: Type.STRING },
              primaryLanguage: { type: Type.STRING }
            },
            required: ["fullName", "dateOfBirth", "age", "gender", "region", "occupation", "biography", "interests", "personalityTraits", "ethnicity", "primaryLanguage"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      const newPersona: Persona = { 
        ...data, 
        id: crypto.randomUUID(), 
        isDetailed: false,
        shortBiography: data.biography 
      };
      setHistory(prev => [newPersona, ...prev]);
    } catch (err) {
      setError("Neural link failed to synthesize a new identity.");
    } finally {
      setLoading(false);
    }
  };

  const expandBiography = async (persona: Persona) => {
    if (expandingIds.has(persona.id)) return;
    
    if (persona.isDetailed) {
      setCurrentlyExpandedIds(prev => {
        const next = new Set(prev);
        if (next.has(persona.id)) next.delete(persona.id);
        else next.add(persona.id);
        return next;
      });
      return;
    }

    setExpandingIds(prev => new Set(prev).add(persona.id));
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Expand the biography of this persona into a deep, soulful, 3-paragraph narrative.
        Persona Details: ${persona.fullName}, ${persona.age} year old ${persona.gender} ${persona.occupation} from ${persona.region}.
        Ethnicity: ${persona.ethnicity} | Personality: ${persona.personalityTraits.join(', ')} | Interests: ${persona.interests.join(', ')}.

        REQUIREMENTS FOR EXPANSION:
        1. Paragraph 1: Roots & Heritage.
        2. Paragraph 2: Motivation & Conflict.
        3. Paragraph 3: The Horizon.`,
        config: { temperature: 0.9 }
      });

      const detailedBio = response.text || persona.biography;
      const updateList = (list: Persona[]) => 
        list.map(p => p.id === persona.id ? { ...p, biography: detailedBio, isDetailed: true } : p);

      setHistory(prev => updateList(prev));
      const updatedArchive = updateList(savedArchive);
      setSavedArchive(updatedArchive);
      localStorage.setItem('persona_archive', JSON.stringify(updatedArchive));
      setCurrentlyExpandedIds(prev => new Set(prev).add(persona.id));
    } catch (err) {
      console.error("Expansion failed", err);
    } finally {
      setExpandingIds(prev => {
        const next = new Set(prev);
        next.delete(persona.id);
        return next;
      });
    }
  };

  const saveToArchive = (persona: Persona) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (savedArchive.find(p => p.id === persona.id)) return;
    const newArchive = [persona, ...savedArchive];
    setSavedArchive(newArchive);
    localStorage.setItem('persona_archive', JSON.stringify(newArchive));
  };

  const removeFromArchive = (id: string) => {
    const newArchive = savedArchive.filter(p => p.id !== id);
    setSavedArchive(newArchive);
    localStorage.setItem('persona_archive', JSON.stringify(newArchive));
  };

  const startEditing = (p: Persona) => {
    setEditingId(p.id);
    setEditForm({ ...p });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEdits = () => {
    if (!editForm) return;
    const updateList = (list: Persona[]) => 
      list.map(p => p.id === editForm.id ? editForm : p);

    setHistory(prev => updateList(prev));
    const updatedArchive = updateList(savedArchive);
    setSavedArchive(updatedArchive);
    localStorage.setItem('persona_archive', JSON.stringify(updatedArchive));
    setEditingId(null);
    setEditForm(null);
  };

  const copyProfile = (persona: Persona) => {
    const text = JSON.stringify(persona, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(persona.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const activeList = view === 'stream' ? history : savedArchive;
  const filteredList = useMemo(() => {
    return activeList.filter(p => {
      const matchesQuery = !filterQuery || 
        p.fullName.toLowerCase().includes(filterQuery.toLowerCase()) ||
        p.occupation.toLowerCase().includes(filterQuery.toLowerCase()) ||
        p.region.toLowerCase().includes(filterQuery.toLowerCase());
      const matchesRegion = filterRegion === 'All' || p.region === filterRegion;
      const matchesGender = filterGender === 'All' || p.gender === filterGender;
      return matchesQuery && matchesRegion && matchesGender;
    });
  }, [activeList, filterQuery, filterRegion, filterGender]);

  const regionOptions = useMemo(() => [...GLOBAL_REGIONS].sort(), []);

  return (
    <div className="min-h-screen bg-[#050507] text-slate-200 font-['Inter'] flex flex-col md:flex-row">
      <aside className="w-full md:w-64 glass border-b md:border-b-0 md:border-r border-white/5 p-6 flex flex-col gap-8 z-20">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-black gradient-text tracking-tighter">RANDOM PROFILES</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold text-wrap">Neural Engine v5.5</p>
        </div>
        <nav className="flex flex-col gap-2">
          <button onClick={() => setView('stream')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${view === 'stream' ? 'bg-indigo-600 text-white neon-glow' : 'hover:bg-white/5 text-slate-400'}`}>
            <i className="fa-solid fa-bolt-lightning w-5"></i> Global Stream
          </button>
          <button onClick={() => setView('archive')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${view === 'archive' ? 'bg-indigo-600 text-white neon-glow' : 'hover:bg-white/5 text-slate-400'}`}>
            <i className="fa-solid fa-box-archive w-5"></i> Your Archive
            {savedArchive.length > 0 && <span className="ml-auto bg-white/10 px-2 py-0.5 rounded-full text-[10px]">{savedArchive.length}</span>}
          </button>
        </nav>
        <div className="mt-auto pt-6 border-t border-white/5">
          {user ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-xs font-bold shadow-lg">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold truncate text-white">{user.username}</p>
                  <p className="text-[10px] text-green-400 uppercase font-bold">Authenticated</p>
                </div>
              </div>
              <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-red-400 transition-colors text-left flex items-center gap-2">
                <i className="fa-solid fa-right-from-bracket"></i> Sign Out
              </button>
            </div>
          ) : (
            <button onClick={() => setIsAuthModalOpen(true)} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition-all border border-white/5">Sign In to Archive</button>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-30 glass border-b border-white/5 p-4 md:p-6 flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full max-w-xl flex flex-col md:flex-row gap-2">
            <div className="relative flex-1 group">
              <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
              <input type="text" placeholder="Filter identities..." value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm outline-none text-white focus:border-indigo-500/50" />
            </div>
            <div className="flex gap-2">
              <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} className="bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm outline-none text-white">
                <option value="All">All Regions</option>
                {regionOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)} className="bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm outline-none text-white">
                <option value="All">Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          {view === 'stream' && (
            <button onClick={generatePersona} disabled={loading} className="w-full lg:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all neon-glow flex items-center justify-center gap-2">
              {loading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-plus-circle"></i>}
              {loading ? 'Synthesizing...' : 'New Synthesis'}
            </button>
          )}
        </header>

        <section className="p-4 md:p-8 flex-1 overflow-y-auto space-y-6">
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex items-center gap-3"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}
          {filteredList.length === 0 ? (
            <div className="h-[60vh] flex flex-col items-center justify-center text-slate-600 opacity-40 text-center px-6">
              <i className="fa-solid fa-fingerprint text-6xl mb-4"></i>
              <p className="text-xl font-medium">No results found in the current parameters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-12">
              {filteredList.map((p) => {
                const isEditing = editingId === p.id;
                const isExpanded = currentlyExpandedIds.has(p.id);
                return (
                  <div key={p.id} className="glass rounded-3xl p-6 md:p-8 flex flex-col gap-6 animate-fade-in relative border border-white/5 hover:border-indigo-500/20 shadow-xl">
                    {!isEditing && (
                      <div className="absolute top-6 right-6 flex gap-2">
                        <button onClick={() => startEditing(p)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center"><i className="fa-solid fa-pen"></i></button>
                        <button onClick={() => copyProfile(p)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${copiedId === p.id ? 'bg-green-500 text-white' : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'}`}><i className={`fa-solid ${copiedId === p.id ? 'fa-check' : 'fa-code'}`}></i></button>
                        {view === 'stream' ? (
                          <button onClick={() => saveToArchive(p)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${savedArchive.some(s => s.id === p.id) ? 'bg-indigo-600 text-white' : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'}`}><i className="fa-solid fa-bookmark"></i></button>
                        ) : (
                          <button onClick={() => removeFromArchive(p.id)} className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center"><i className="fa-solid fa-trash-can"></i></button>
                        )}
                      </div>
                    )}
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center"><h3 className="text-indigo-400 font-bold">Edit Persona</h3><div className="flex gap-2"><button onClick={cancelEditing} className="px-3 py-1 bg-white/5 rounded text-xs">Cancel</button><button onClick={saveEdits} className="px-3 py-1 bg-indigo-600 rounded text-xs">Save</button></div></div>
                        <input value={editForm?.fullName} onChange={e => setEditForm(prev => prev ? {...prev, fullName: e.target.value} : null)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm" />
                        <input value={editForm?.occupation} onChange={e => setEditForm(prev => prev ? {...prev, occupation: e.target.value} : null)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm" />
                        <textarea rows={4} value={editForm?.biography} onChange={e => setEditForm(prev => prev ? {...prev, biography: e.target.value} : null)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm resize-none" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-6">
                          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                            <i className={`fa-solid ${p.gender === 'Female' ? 'fa-user-nurse' : 'fa-user-tie'} text-3xl text-indigo-400/50`}></i>
                          </div>
                          <div className="flex-1 min-w-0 pr-12">
                            <h2 className="text-2xl font-bold truncate text-white">{p.fullName}</h2>
                            <p className="text-indigo-400 text-sm font-semibold">{p.occupation}</p>
                            <p className="text-slate-500 text-xs mt-1">{p.age}y • {p.gender} • {p.region}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <p className={`text-sm text-slate-400 leading-relaxed italic border-l-2 border-indigo-500/30 pl-4 whitespace-pre-wrap ${expandingIds.has(p.id) ? 'opacity-30 blur-sm' : ''}`}>
                            {isExpanded ? p.biography : p.shortBiography}
                          </p>
                          {expandingIds.has(p.id) && <div className="absolute inset-0 flex items-center justify-center"><i className="fa-solid fa-wand-magic-sparkles text-indigo-500 animate-pulse text-xl"></i></div>}
                          <button onClick={() => expandBiography(p)} className="mt-3 text-[10px] font-bold text-indigo-400 uppercase tracking-widest hover:text-indigo-300">
                            <i className="fa-solid fa-sparkles mr-1"></i> {p.isDetailed ? (isExpanded ? 'Show Less' : 'Show Full Dossier') : 'Deepen Identity'}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-black/20 p-3 rounded-xl border border-white/5"><p className="text-[9px] uppercase font-black text-slate-600 mb-1">Interests</p><div className="flex flex-wrap gap-1">{p.interests.map(i => <span key={i} className="text-[10px] bg-cyan-500/5 text-cyan-400 px-2 rounded border border-cyan-500/10">{i}</span>)}</div></div>
                          <div className="bg-black/20 p-3 rounded-xl border border-white/5"><p className="text-[9px] uppercase font-black text-slate-600 mb-1">Traits</p><div className="flex flex-wrap gap-1">{p.personalityTraits.map(t => <span key={t} className="text-[10px] bg-indigo-500/5 text-indigo-400 px-2 rounded border border-indigo-500/10">{t}</span>)}</div></div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md glass p-8 rounded-3xl border border-white/10 shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Initialize Neural Profile</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <input autoFocus value={authInput} onChange={(e) => setAuthInput(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-indigo-500 text-white" placeholder="Username..." />
              <button className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all neon-glow">Establish Connection</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) createRoot(rootElement).render(<App />);