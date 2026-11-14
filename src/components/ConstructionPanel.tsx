import React from 'react';
import { GameState } from '../simulator/types';
import { ConstructionUpgradeType } from '../simulator/construction';
import { MOON_MISSION_CONFIG } from '../simulator/constants';
import { 
  Wrench, 
  Sun, 
  Sprout, 
  Droplets, 
  Shield, 
  BatteryCharging, 
  Coins, 
  Check, 
  Zap 
} from 'lucide-react';

interface ConstructionPanelProps {
  gameState: GameState;
  onPurchaseUpgrade: (type: ConstructionUpgradeType) => void;
}

export const ConstructionPanel: React.FC<ConstructionPanelProps> = ({
  gameState,
  onPurchaseUpgrade,
}) => {
  const credits = gameState.resources.credits;
  const catalog = MOON_MISSION_CONFIG.constructionCatalog;

  const upgrades = [
    {
      type: 'solar_array' as ConstructionUpgradeType,
      item: catalog.solarArray,
      currentLevel: gameState.infrastructure.solarArrays,
      currentStatLabel: `${gameState.infrastructure.solarArrays} Active Arrays`,
      icon: Sun,
      isMax: false,
    },
    {
      type: 'greenhouse' as ConstructionUpgradeType,
      item: catalog.greenhouse,
      currentLevel: gameState.infrastructure.greenhouses,
      currentStatLabel: `${gameState.infrastructure.greenhouses} Modules Online`,
      icon: Sprout,
      isMax: false,
    },
    {
      type: 'water_recycler' as ConstructionUpgradeType,
      item: catalog.waterRecycler,
      currentLevel: gameState.infrastructure.waterRecyclerLevel,
      currentStatLabel: `${Math.round(gameState.waterRecyclingEfficiency * 100)}% Recovery Rate`,
      icon: Droplets,
      isMax: gameState.waterRecyclingEfficiency >= 0.99,
    },
    {
      type: 'radiation_shelter' as ConstructionUpgradeType,
      item: catalog.radiationShelter,
      currentLevel: gameState.infrastructure.radiationShelterLevel,
      currentStatLabel: `${Math.round(gameState.shieldingPercentage * 100)}% Hull Shielding`,
      icon: Shield,
      isMax: gameState.shieldingPercentage >= 0.90,
    },
    {
      type: 'battery_upgrade' as ConstructionUpgradeType,
      item: catalog.batteryUpgrade,
      currentLevel: gameState.infrastructure.batteryUpgrades,
      currentStatLabel: `${gameState.resources.batteryCapacityKwh} kWh Capacity`,
      icon: BatteryCharging,
      isMax: false,
    },
  ];

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Outpost Construction Depot</h3>
            <span className="text-[11px] text-slate-400">Deploy modular lunar surface infrastructure</span>
          </div>
        </div>

        {/* Available Credits Badge */}
        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1.5 rounded-lg w-fit">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span className="text-xs font-bold text-yellow-300 font-mono">
            {credits} <span className="text-[10px] text-yellow-500 font-normal">Credits</span>
          </span>
        </div>
      </div>

      {/* Upgrades Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {upgrades.map(({ type, item, currentStatLabel, icon: Icon, isMax }) => {
          const canAfford = credits >= item.cost && !isMax;

          return (
            <div
              key={type}
              className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-slate-900 text-cyan-400 border border-slate-800">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{item.name}</h4>
                      <p className="text-[10px] font-mono text-cyan-400 font-medium">{currentStatLabel}</p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-yellow-400 bg-yellow-950/40 border border-yellow-800/60 px-2 py-0.5 rounded">
                    {item.cost} C
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <button
                onClick={() => onPurchaseUpgrade(type)}
                disabled={!canAfford || gameState.isMissionOver}
                className={`w-full py-1.5 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  isMax
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    : canAfford && !gameState.isMissionOver
                    ? 'bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/50 shadow-glow-cyan'
                    : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                }`}
              >
                {isMax ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Max Level</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Authorize Build ({item.cost} C)</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
