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
}

interface PolicyItem {
  id: string;
  type: 'protocol' | 'policy';
  topic: string;
  content: string;
  display_source: string;
  operator_action: string;
  urgency?: 'high' | 'medium' | 'low'; // Only for protocols
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'logs' | 'knowledge'>('logs');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  
  // --- EDITING STATE ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PolicyItem | null>(null);

  // --- FETCH DATA ---
  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin');
      const data = await res.json();
      
      // Update logs
      setLogs(data.logs || []);
      
      // Update knowledge base only if NOT editing 
      if (!editingId) {
        setPolicies(data.knowledgeBase || []);
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); 
    return () => clearInterval(interval);
  }, [editingId]);

  // --- HANDLERS ---
  const startEditing = (policy: PolicyItem) => {
    setEditingId(policy.id);
    setEditForm({ ...policy }); // Clone the object
  };

  const handleSave = async () => {
    if (!editForm) return;

    // Send the FULL object to the API
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        id: editForm.id, 
        updates: editForm 
      }),
    });

    setEditingId(null);
    setEditForm(null);
    fetchData(); 
    alert("Knowledge Base Updated & Cache Cleared!");
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Operator Dashboard</h1>
            <p className="text-sm text-slate-500">System Control Center</p>
          </div>
          
          {/* TABS */}
          <div className="flex space-x-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <button 
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'logs' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Activity Logs
            </button>
            <button 
              onClick={() => setActiveTab('knowledge')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'knowledge' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Knowledge Base
            </button>
          </div>
        </div>

        {/* --- TAB 1: LOGS --- */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-4 w-32">Time</th>
                <th className="p-4 w-24">Source</th>
                <th className="p-4 w-24">Latency</th>
                <th className="p-4">User Query</th>
                <th className="p-4">Response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-xs text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase
                      ${log.source === 'CACHE' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                      {log.source}
                    </span>
                  </td>
                  <td className="p-4 text-xs font-mono text-slate-600">
                    {Math.round(log.latencyMs)}ms
                  </td>
                  <td className="p-4 text-sm text-slate-800 font-medium">
                    "{log.query}"
                  </td>
                  <td className="p-4 text-xs text-slate-500 whitespace-pre-wrap break-words max-w-md">
                    {log.response}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {/* --- TAB 2: KNOWLEDGE BASE EDITOR --- */}
        {activeTab === 'knowledge' && (
          <div className="grid grid-cols-1 gap-6">
            {policies.map((policy) => (
              <div key={policy.id} className={`bg-white rounded-xl shadow-sm border transition-all duration-200 
                ${editingId === policy.id ? 'border-blue-500 ring-2 ring-blue-100 shadow-xl scale-[1.01] z-10' : 'border-slate-200'}`}>
                
                {/* 1. VIEW MODE */}
                {editingId !== policy.id && (
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border
                          ${policy.type === 'protocol' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {policy.type}
                        </span>
                        {policy.urgency && (
                          <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 uppercase">
                            {policy.urgency} Priority
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={() => startEditing(policy)} 
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1 rounded transition-colors"
                      >
                        Edit
                      </button>
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 mb-1">{policy.topic}</h3>
                    <p className="text-xs text-slate-400 font-mono mb-4">ID: {policy.id} • Source: {policy.display_source}</p>
                    
                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100 mb-3">
                      {policy.content}
                    </p>

                    <div className="flex items-start gap-2 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                      <span className="text-yellow-600">⚠️</span>
                      <div className="text-xs text-yellow-800">
                        <span className="font-bold">Operator Action:</span> {policy.operator_action}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. EDIT MODE (Full Form) */}
                {editingId === policy.id && editForm && (
                  <div className="p-6 bg-blue-50/30 rounded-xl">
                    <div className="flex justify-between items-center mb-6 border-b border-blue-100 pb-4">
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Editing Mode</span>
                      <span className="text-xs font-mono text-slate-400">{policy.id}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {/* Topic */}
                      <div className="col-span-2 md:col-span-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1">TOPIC</label>
                        <input 
                          className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                          value={editForm.topic}
                          onChange={(e) => setEditForm({...editForm, topic: e.target.value})}
                        />
                      </div>
                      
                      {/* Source */}
                      <div className="col-span-2 md:col-span-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1">DISPLAY SOURCE</label>
                        <input 
                          className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                          value={editForm.display_source}
                          onChange={(e) => setEditForm({...editForm, display_source: e.target.value})}
                        />
                      </div>

                      {/* Urgency (Only show for protocols) */}
                      {editForm.type === 'protocol' && (
                         <div className="col-span-2 md:col-span-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">URGENCY</label>
                          <select 
                            className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            value={editForm.urgency}
                            onChange={(e) => setEditForm({...editForm, urgency: e.target.value as any})}
                          >
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Operator Action */}
                    <div className="mb-4">
                      <label className="block text-xs font-bold text-slate-500 mb-1">OPERATOR ACTION (Internal Note)</label>
                      <input 
                        className="w-full p-2 text-sm border border-orange-200 bg-orange-50 rounded text-orange-800 focus:ring-2 focus:ring-orange-500 outline-none placeholder:text-orange-300"
                        value={editForm.operator_action}
                        onChange={(e) => setEditForm({...editForm, operator_action: e.target.value})}
                      />
                    </div>

                    {/* Main Content */}
                    <div className="mb-6">
                      <label className="block text-xs font-bold text-slate-500 mb-1">CONTENT (The Rule)</label>
                      <textarea 
                        className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px] leading-relaxed"
                        value={editForm.content}
                        onChange={(e) => setEditForm({...editForm, content: e.target.value})}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                      <button 
                        onClick={handleSave} 
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 hover:shadow-lg transition-all flex-1"
                      >
                        💾 Save Changes
                      </button>
                      <button 
                        onClick={() => { setEditingId(null); setEditForm(null); }} 
                        className="bg-white border border-slate-300 text-slate-600 px-6 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all"
                      >
                        Cancel
                      </button>
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