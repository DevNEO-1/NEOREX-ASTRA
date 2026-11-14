import React, { useState } from 'react';
import scientificReferencesData from '../data/scientificReferences.json';
import { ScientificReference } from '../simulator/types';
import { BookOpen, ExternalLink, ShieldCheck, AlertCircle, X, Search } from 'lucide-react';

interface ScientificResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScientificResearchModal: React.FC<ScientificResearchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isOpen) return null;

  const references: ScientificReference[] = scientificReferencesData as ScientificReference[];

  const categories = ['all', 'Life Support', 'Power Systems', 'Radiation', 'Lunar Environment', 'Mars ECLSS'];

  const filteredReferences = references.filter(ref => {
    const matchesCategory = selectedCategory === 'all' || ref.category === selectedCategory;
    const matchesSearch = 
      ref.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.measuredFact.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.authorOrMission.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white">NASA Scientific Knowledge Base & Verification</h2>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                Verified
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Comparative matrix: Measured NASA aerospace facts vs. educational simulation assumptions
            </p>
          </div>
        </div>

        {/* Disclaimer Alert */}
        <div className="mb-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-200">Scientific Responsibility Disclosure: </strong>
            This educational simulator was developed for the NASA Space Apps Challenge 2026. All biological mass balances and energy figures are grounded in verified NASA technical publications (BVAD, Artemis Plan, DRA 5.0). Numerical values have been simplified for educational clarity and should not be used as operational flight safety systems. No official NASA endorsement is claimed or implied.
          </p>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search NASA publications, ECLSS data, or mission facts..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {cat === 'all' ? 'All Sources' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* References List */}
        <div className="space-y-4">
          {filteredReferences.map(ref => (
            <div
              key={ref.id}
              className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                    {ref.category} • {ref.authorOrMission}
                  </span>
                  <h3 className="text-xs font-bold text-white mt-0.5">{ref.title}</h3>
                </div>

                <a
                  href={ref.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1 shrink-0 w-fit"
                >
                  <span>Official Document</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Side by side comparison: Measured Fact vs Game Assumption */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800/80">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Measured Scientific Fact</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {ref.measuredFact}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Educational Simulator Implementation</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {ref.gameAssumption}
                  </p>
                </div>
              </div>

              {/* Simplification rationale */}
              <div className="mt-2 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">Engineering Rationale: </span>
                <span>{ref.simplificationRationale}</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
