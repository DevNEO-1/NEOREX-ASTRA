import React from 'react';
import { GameState } from '../simulator/types';
import { ConstructionUpgradeType } from '../simulator/construction';
import { MOON_MISSION_CONFIG } from '../simulator/constants';
import { audioSystem } from '../utils/audioSystem';
import { 
  X, 
  Wrench, 
  Zap, 
  Droplets, 
  Sprout, 
  Shield, 
  BatteryCharging, 
  Check, 
  Activity, 
  Power,
  Compass
} from 'lucide-react';

export type InspectableBuildingType = 
  | 'habitat'
  | 'solar'
  | 'greenhouse'
  | 'battery'
  | 'shelter'
  | 'water'
  | 'lander'
  | 'rover';

interface BuildingInspectorModalProps {
  buildingType: InspectableBuildingType | null;
  gameState: GameState;
  onClose: () => void;
  onPurchaseUpgrade: (type: ConstructionUpgradeType) => void;
  onToggleControl: (control: 'electrolysis' | 'greenhouses' | 'emergencyRationing', value?: boolean) => void;
}

export const BuildingInspectorModal: React.FC<BuildingInspectorModalProps> = ({
  buildingType,
  gameState,
  onClose,
  onPurchaseUpgrade,
  onToggleControl,
}) => {
  if (!buildingType) return null;

  const catalog = MOON_MISSION_CONFIG.constructionCatalog;
  const credits = gameState.resources.credits;
  const isNight = !gameState.isDaylight;

  const handleUpgradeClick = (type: ConstructionUpgradeType) => {
    audioSystem.playUpgradeChime();
    onPurchaseUpgrade(type);
  };

  const handleToggleClick = (control: 'electrolysis' | 'greenhouses' | 'emergencyRationing', value?: boolean) => {
    audioSystem.playClick();
    onToggleControl(control, value);
  };

  const getBuildingDetails = () => {
    switch (buildingType) {
      case 'habitat':
        return {
          title: 'Command Habitat Dome (Artemis Hub)',
          category: 'Command & Avionics',
          icon: Wrench,
          color: 'text-cyan-400',
          borderColor: 'border-cyan-500/40',
          bgColor: 'bg-cyan-500/10',
          description: 'Primary pressurized geodesic habitat with environmental control, avionics, communications dish, and astronaut living quarters.',
          metrics: [
            { label: 'Avionics Base Power Load', value: gameState.infrastructure.emergencyPowerRationing ? '26.4 kWh/day (-25%)' : '35.2 kWh/day', status: 'Active' },
            { label: 'Atmospheric Pressure', value: '101.3 kPa (Nominal N₂/O₂)', status: 'Nominal' },
            { label: 'Interior Thermal Envelope', value: '21.5°C', status: 'Regulated' },
            { label: 'Crew Occupancy', value: `${gameState.crew.filter(c => c.health > 0).length} / 4 Astronauts`, status: 'Active' },
          ],
          control: {
            label: 'Emergency Power Rationing (-25% Load)',
            isActive: gameState.infrastructure.emergencyPowerRationing,
            onToggle: () => handleToggleClick('emergencyRationing'),
            buttonText: gameState.infrastructure.emergencyPowerRationing ? 'Disable Rationing' : 'Enable Emergency Rationing',
          },
        };

      case 'solar':
        const solarUpgrade = catalog.solarArray;
        const canAffordSolar = credits >= solarUpgrade.cost;
        return {
          title: 'Photovoltaic Solar Array Wings',
          category: 'Primary Energy Generation',
          icon: Zap,
          color: 'text-amber-400',
          borderColor: 'border-amber-500/40',
          bgColor: 'bg-amber-500/10',
          description: 'Gallium arsenide high-efficiency solar panels equipped with dual-axis sun-tracking gimbals.',
          metrics: [
            { label: 'Installed Wings', value: `${gameState.infrastructure.solarArrays} Active Arrays`, status: 'Online' },
            { label: 'Daylight Generation', value: `${45 + (gameState.infrastructure.solarArrays - 1) * 15} kWh/day`, status: isNight ? 'Dormant (Night)' : 'Active' },
            { label: 'Sunlight Status', value: isNight ? 'Total Lunar Night (0 kWh)' : 'Direct Sunlight (100%)', status: isNight ? 'Standby' : 'Optimal' },
            { label: 'Next Upgrade Output', value: `+${solarUpgrade.generationBoostKwh} kWh/day`, status: 'Available' },
          ],
          upgrade: {
            type: 'solar_array' as ConstructionUpgradeType,
            cost: solarUpgrade.cost,
            canAfford: canAffordSolar,
            name: solarUpgrade.name,
            isMax: false,
          },
        };

      case 'greenhouse':
        const ghUpgrade = catalog.greenhouse;
        const canAffordGH = credits >= ghUpgrade.cost;
        return {
          title: 'Hydroponic Agriculture Chambers',
          category: 'Biomass & Food Production',
          icon: Sprout,
          color: 'text-emerald-400',
          borderColor: 'border-emerald-500/40',
          bgColor: 'bg-emerald-500/10',
          description: 'Controlled environment agricultural modules providing fresh crops (lettuce, dwarf wheat, radishes) via aeroponics/hydroponics.',
          metrics: [
            { label: 'Constructed Modules', value: `${gameState.infrastructure.greenhouses} Modules`, status: 'Commissioned' },
            { label: 'Active Operational Bays', value: `${gameState.infrastructure.activeGreenhouses} Modules`, status: gameState.infrastructure.activeGreenhouses > 0 ? 'Growing' : 'Standby' },
            { label: 'Daily Food Production', value: `+${gameState.infrastructure.activeGreenhouses * 4} kg/day`, status: 'Fresh Biomass' },
            { label: 'Resource Consumption', value: `${gameState.infrastructure.activeGreenhouses * 16} L Water • ${gameState.infrastructure.activeGreenhouses * 6} kWh Power`, status: 'Daily Load' },
          ],
          upgrade: {
            type: 'greenhouse' as ConstructionUpgradeType,
            cost: ghUpgrade.cost,
            canAfford: canAffordGH,
            name: ghUpgrade.name,
            isMax: false,
          },
          control: gameState.infrastructure.greenhouses > 0 ? {
            label: 'Agricultural Standby (Load Shedding)',
            isActive: gameState.infrastructure.activeGreenhouses > 0,
            onToggle: () => handleToggleClick('greenhouses'),
            buttonText: gameState.infrastructure.activeGreenhouses > 0 ? 'Pause Farming (Save Water/Power)' : 'Resume Hydroponics',
          } : undefined,
        };

      case 'battery':
        const battUpgrade = catalog.batteryUpgrade;
        const canAffordBatt = credits >= battUpgrade.cost;
        const chargePercent = Math.round((gameState.resources.batteryKwh / gameState.resources.batteryCapacityKwh) * 100);
        return {
          title: 'Cryo-Battery Energy Storage Vault',
          category: 'Secondary Energy Reserves',
          icon: BatteryCharging,
          color: 'text-amber-400',
          borderColor: 'border-amber-500/40',
          bgColor: 'bg-amber-500/10',
          description: 'Solid-state secondary energy cells engineered with vacuum jacket thermal heaters to withstand -130°C lunar nights.',
          metrics: [
            { label: 'Current Charge', value: `${gameState.resources.batteryKwh.toFixed(1)} kWh (${chargePercent}%)`, status: chargePercent < 25 ? 'Low' : 'Nominal' },
            { label: 'Storage Capacity', value: `${gameState.resources.batteryCapacityKwh} kWh`, status: 'Max Limit' },
            { label: 'Installed Upgrades', value: `${gameState.infrastructure.batteryUpgrades} Additional Banks`, status: 'Online' },
            { label: 'Next Upgrade Bonus', value: `+${battUpgrade.capacityBoostKwh} kWh Storage`, status: 'Available' },
          ],
          upgrade: {
            type: 'battery_upgrade' as ConstructionUpgradeType,
            cost: battUpgrade.cost,
            canAfford: canAffordBatt,
            name: battUpgrade.name,
            isMax: false,
          },
        };

      case 'shelter':
        const shelterUpgrade = catalog.radiationShelter;
        const canAffordShelter = credits >= shelterUpgrade.cost;
        const isMaxShelter = gameState.shieldingPercentage >= 0.90;
        return {
          title: 'Sintered Regolith Radiation Vault',
          category: 'Radiation & Storm Protection',
          icon: Shield,
          color: 'text-purple-400',
          borderColor: 'border-purple-500/40',
          bgColor: 'bg-purple-500/10',
          description: 'Heavy underground storm shelter reinforced with microwave-sintered lunar regolith bricks to attenuate GCR and Solar Particle Events.',
          metrics: [
            { label: 'Current Shielding Rating', value: `${Math.round(gameState.shieldingPercentage * 100)}% Hull Attenuation`, status: 'Protected' },
            { label: 'Structural Reinforcements', value: `Level ${gameState.infrastructure.radiationShelterLevel}`, status: 'Intact' },
            { label: 'Solar Storm Defense', value: 'High Proton Deflection', status: 'Ready' },
            { label: 'Max Structural Rating', value: '90% Theoretical Limit', status: isMaxShelter ? 'Max Reached' : 'Upgradeable' },
          ],
          upgrade: {
            type: 'radiation_shelter' as ConstructionUpgradeType,
            cost: shelterUpgrade.cost,
            canAfford: canAffordShelter,
            name: shelterUpgrade.name,
            isMax: isMaxShelter,
          },
        };

      case 'water':
        const waterUpgrade = catalog.waterRecycler;
        const canAffordWater = credits >= waterUpgrade.cost;
        const isMaxWater = gameState.waterRecyclingEfficiency >= 0.99;
        return {
          title: 'ECLSS Catalytic Water Distillation Unit',
          category: 'Closed-Loop Hydrology & O₂ Electrolysis',
          icon: Droplets,
          color: 'text-blue-400',
          borderColor: 'border-blue-500/40',
          bgColor: 'bg-blue-500/10',
          description: 'Catalytic vacuum distillation and multi-filtration processor recovering cabin moisture, hygiene graywater, and urine.',
          metrics: [
            { label: 'Recovery Efficiency', value: `${Math.round(gameState.waterRecyclingEfficiency * 100)}% Closed-Loop`, status: 'Operating' },
            { label: 'O₂ Electrolysis Generator', value: gameState.infrastructure.activeLifeSupportO2 ? 'Generating (3.2 kg O₂/day)' : 'Standby (Load-Shed)', status: gameState.infrastructure.activeLifeSupportO2 ? 'Active' : 'Off' },
            { label: 'Electrolysis Water Demand', value: '3.6 L/day', status: 'Stoichiometric' },
            { label: 'Electrolysis Power Demand', value: '19.2 kWh/day', status: 'Cell Load' },
          ],
          upgrade: {
            type: 'water_recycler' as ConstructionUpgradeType,
            cost: waterUpgrade.cost,
            canAfford: canAffordWater,
            name: waterUpgrade.name,
            isMax: isMaxWater,
          },
          control: {
            label: 'Oxygen Electrolysis Override',
            isActive: gameState.infrastructure.activeLifeSupportO2,
            onToggle: () => handleToggleClick('electrolysis'),
            buttonText: gameState.infrastructure.activeLifeSupportO2 ? 'Shed O₂ Electrolysis Load' : 'Engage O₂ Electrolysis',
          },
        };

      case 'rover':
        const isMoonRover = gameState.campaign === 'moon';
        return {
          title: isMoonRover ? 'Lunar Roving Vehicle (LRV-Ares)' : 'Mars Exploration Rover (Perseverance Spec)',
          category: 'Surface Exploration & Reconnaissance',
          icon: Compass,
          color: 'text-amber-400',
          borderColor: 'border-amber-500/40',
          bgColor: 'bg-amber-500/10',
          description: isMoonRover
            ? 'Electric exploration rover equipped with a 6-wheel rocker-bogie chassis, panoramic mastcam, and regolith core sampling drill.'
            : 'Autonomous Martian rover engineered with MMRTG thermoelectric nuclear power, robotic arm spectrometer, and auto-navigation optics.',
          metrics: [
            { label: 'Mobility Suspension', value: '6-Wheel Rocker-Bogie', status: 'Operational' },
            { label: 'Power Source', value: isMoonRover ? 'High-Density Li-Ion & Solar Deck' : 'MMRTG Nuclear Thermoelectric', status: 'Optimal' },
            { label: 'Simulated Traverse Estimate', value: `~${(gameState.day * 2.4).toFixed(1)} km (Simulated Reconnaissance)`, status: 'Estimated' },
            { label: 'Avionics Link', value: 'Deep Space Network Ground Relay', status: 'Connected' },
          ],
        };

      case 'lander':
      default:
        return {
          title: 'Artemis Surface Descent Spacecraft',
          category: 'Landing & Surface Logistics',
          icon: Activity,
          color: 'text-slate-300',
          borderColor: 'border-slate-500/40',
          bgColor: 'bg-slate-500/10',
          description: 'Human Landing System (HLS) spacecraft. Delivered the initial crew and cargo depot to the rim of Shackleton Crater.',
          metrics: [
            { label: 'Descent Stage Status', value: 'Safely Anchored on Pad', status: 'Nominal' },
            { label: 'Ascent Stage Propellant', value: 'Cryo-Preserved (Return Flight)', status: 'Safe' },
            { label: 'Avionics Telemetry Link', value: 'Direct Lunar Ground Relay', status: 'Connected' },
            { label: 'Payload Bay Supplies', value: 'Transferred to Surface Habitat', status: 'Complete' },
          ],
        };
    }
  };

  const details = getBuildingDetails();
  const Icon = details.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
      <div className={`bg-slate-900 border ${details.borderColor} rounded-2xl max-w-xl w-full p-6 shadow-2xl relative overflow-hidden`}>
        
        {/* Holographic Glowing Header Accent */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-amber-500`} />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title Header */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
          <div className={`p-2.5 rounded-xl ${details.bgColor} border ${details.borderColor} ${details.color}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
              3D OUTPOST SYSTEM TELEMETRY • {details.category}
            </span>
            <h2 className="text-base font-extrabold text-white">{details.title}</h2>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          {details.description}
        </p>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {details.metrics.map((metric, idx) => (
            <div key={idx} className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">{metric.label}</span>
                <span className="text-xs font-mono font-bold text-slate-200">{metric.value}</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-cyan-400 border border-cyan-800/60">
                {metric.status}
              </span>
            </div>
          ))}
        </div>

        {/* Action Controls & Upgrade Authorization */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          
          {/* Toggle Control if present */}
          {details.control && (
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-white">{details.control.label}</h4>
                <span className="text-[10px] text-slate-400">Manage real-time electrical & hydrology loads</span>
              </div>
              <button
                onClick={details.control.onToggle}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  details.control.isActive
                    ? 'bg-amber-500 text-slate-950 shadow-glow-amber'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{details.control.buttonText}</span>
              </button>
            </div>
          )}

          {/* Upgrade Button if present */}
          {details.upgrade && (
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-white">Authorize Commissioning</h4>
                  <span className="text-[10px] font-mono font-bold text-yellow-400 bg-yellow-950/40 border border-yellow-800 px-1.5 py-0.5 rounded">
                    {details.upgrade.cost} Credits
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">Available: {credits} Credits</span>
              </div>

              <button
                onClick={() => details.upgrade && handleUpgradeClick(details.upgrade.type)}
                disabled={!details.upgrade.canAfford || details.upgrade.isMax || gameState.isMissionOver}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  details.upgrade.isMax
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    : details.upgrade.canAfford && !gameState.isMissionOver
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-glow-cyan'
                    : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'
                }`}
              >
                {details.upgrade.isMax ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Maxed</span>
                  </>
                ) : (
                  <>
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Build Upgrade</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
