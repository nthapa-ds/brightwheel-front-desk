'use client';

import { useEffect, useState } from 'react';

// --- TYPES ---
interface LogEntry {
  id: string;
  timestamp: string;
  query: string;
  response: string;
  latencyMs: number;
  source: 'CACHE' | 'AI' | 'ERROR';
  category?: 'MATCH' | 'GAP' | 'UNRELATED';
}

interface PolicyItem {
  id: string;
  type: 'protocol' | 'policy';
  topic: string;
  content: string;
  display_source: string;
  operator_action: string;
  urgency?: 'high' | 'medium' | 'low';
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'logs' | 'knowledge'>('logs');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PolicyItem | null>(null);

  // --- FETCH DATA ---
  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin');
      const data = await res.json();
      setLogs(data.logs || []);
      if (!editingId) setPolicies(data.knowledgeBase || []);
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      if (!document.hidden && !editingId) fetchData();
    }, 20000); 
    return () => clearInterval(interval);
  }, [editingId]);

  // --- HANDLERS ---
  const handleAddPolicy = () => {
    setActiveTab('knowledge');
    const newId = `policy-${Date.now()}`;
    const newPolicy: PolicyItem = {
      id: newId,
      type: 'policy',
      topic: "New Policy Subject",
      content: "Enter official rule details...",
      display_source: "Manual Entry",
      operator_action: "Provide helpful details",
      urgency: 'low'
    };
    setPolicies([newPolicy, ...policies]);
    setEditingId(newId);
    setEditForm(newPolicy);
  };

  const handleSave = async () => {
    if (!editForm) return;
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editForm.id, updates: editForm }),
    });
    setEditingId(null);
    setEditForm(null);
    fetchData(); 
    alert("Knowledge Base Updated!");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this policy?")) return;
    await fetch('/api/admin', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchData();
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Operator Dashboard</h1>
            <p className="text-sm text-slate-500">System Control & Policy Alignment</p>
          </div>
          
          <div className="flex gap-3 items-center">
            <button 
              onClick={handleAddPolicy}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all active:scale-95"
            >
              + Add Policy
            </button>

            <div className="flex space-x-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'logs' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>Logs</button>
                <button onClick={() => setActiveTab('knowledge')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'knowledge' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>Knowledge</button>
            </div>
          </div>
        </div>

        {/* --- TAB 1: LOGS --- */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-4 w-24">Time</th>
                  <th className="p-4 w-28">Status</th>
                  <th className="p-4 w-20">Latency</th>
                  <th className="p-4 w-1/4">User Query</th>
                  <th className="p-4 w-1/2">AI Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors align-top">
                    <td className="p-4 text-[10px] text-slate-400 font-mono whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-4">
                      {log.category === 'MATCH' && <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">✅ Match</span>}
                      {log.category === 'GAP' && <span className="inline-block bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">⚠️ Data Gap</span>}
                      {log.category === 'UNRELATED' && <span className="inline-block bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">🚫 Unrelated</span>}
                    </td>
                    <td className="p-4 text-[10px] font-mono text-slate-400">
                      {Math.round(log.latencyMs)}ms
                    </td>
                    <td className="p-4 text-sm text-slate-700 font-medium">
                      "{log.query}"
                    </td>
                    <td className="p-4 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap break-words border-l border-slate-50">
                      {log.response}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* --- TAB 2: KNOWLEDGE BASE --- */}
        {activeTab === 'knowledge' && (
          <div className="grid grid-cols-1 gap-6">
            {policies.map((policy) => (
              <div key={policy.id} className={`bg-white rounded-xl shadow-sm border transition-all duration-200 
                ${editingId === policy.id ? 'border-blue-500 ring-2 ring-blue-100 shadow-lg scale-[1.01] z-10' : 'border-slate-200'}`}>
                
                {editingId !== policy.id && (
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border
                          ${policy.type === 'protocol' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          {policy.type}
                        </span>
                        {policy.urgency && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 uppercase italic">{policy.urgency} Priority</span>}
                      </div>
                      <div className="flex gap-4">
                        <button onClick={() => {setEditingId(policy.id); setEditForm({...policy});}} className="text-xs font-bold text-blue-600 hover:underline">Edit</button>
                        <button onClick={() => handleDelete(policy.id)} className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors">Delete</button>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">{policy.topic}</h3>
                    <p className="text-[10px] text-slate-400 font-mono mb-4 uppercase tracking-tighter">Source: {policy.display_source}</p>
                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100 mb-4 whitespace-pre-wrap">{policy.content}</p>
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-start gap-3">
                      <span className="text-amber-600 text-sm">💡</span>
                      <div className="text-[11px] text-amber-900 leading-snug"><span className="font-bold uppercase italic mr-1">AI Instruction:</span> {policy.operator_action}</div>
                    </div>
                  </div>
                )}

                {editingId === policy.id && editForm && (
                  <div className="p-6 bg-blue-50/20 rounded-xl space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Topic</label><input className="w-full p-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" value={editForm.topic} onChange={(e) => setEditForm({...editForm, topic: e.target.value})}/></div>
                      <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Source Name</label><input className="w-full p-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" value={editForm.display_source} onChange={(e) => setEditForm({...editForm, display_source: e.target.value})}/></div>
                    </div>
                    <div><label className="block text-[10px] font-bold text-orange-600/70 uppercase mb-1 italic">Operator Action (AI Guardrail)</label><input className="w-full p-2 text-sm border border-orange-100 bg-orange-50/50 rounded-md text-orange-900 focus:ring-2 focus:ring-orange-200 outline-none" value={editForm.operator_action} onChange={(e) => setEditForm({...editForm, operator_action: e.target.value})}/></div>
                    <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Policy Content (Grounding Data)</label><textarea className="w-full p-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[140px] leading-relaxed" value={editForm.content} onChange={(e) => setEditForm({...editForm, content: e.target.value})}/></div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={handleSave} className="bg-blue-600 text-white px-8 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-all flex-1">💾 Save Changes</button>
                      <button onClick={() => { setEditingId(null); setEditForm(null); }} className="bg-white border border-slate-200 text-slate-500 px-8 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}