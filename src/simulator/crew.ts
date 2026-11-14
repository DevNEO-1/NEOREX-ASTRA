import { CrewMember } from './types';

export interface CrewEvaluationInput {
  crew: CrewMember[];
  isBlackout: boolean;
  oxygenDeficit: boolean;
  waterDeficit: boolean;
  foodDeficit: boolean;
  radiationHealthImpact: number;
}

export interface CrewEvaluationResult {
  updatedCrew: CrewMember[];
  averageHealth: number;
  survivingCrewCount: number;
  anyCasualties: boolean;
  notes: string[];
}

/**
 * Updates crew health and psychological/physical status based on daily life support integrity.
 * Models human spaceflight physiological resilience and acute deprivation thresholds.
 */
export function evaluateCrewStatus(input: CrewEvaluationInput): CrewEvaluationResult {
  const { crew, isBlackout, oxygenDeficit, waterDeficit, foodDeficit, radiationHealthImpact } = input;
  const notes: string[] = [];

  // Calculate cumulative daily health delta
  let healthDelta = 0;

  if (oxygenDeficit) {
    healthDelta -= 40; // Hypoxia is rapidly lethal
    notes.push('HYPOXIA ALERT: Atmosphere oxygen depleted! Severe physiological damage (-40% health).');
  }

  if (waterDeficit) {
    healthDelta -= 20; // Dehydration in space causes rapid circulatory failure
    notes.push('DEHYDRATION ALERT: Zero water available! Acute cellular dehydration (-20% health).');
  }

  if (foodDeficit) {
    healthDelta -= 8; // Starvation causes metabolic stress
    notes.push('MALNUTRITION ALERT: Zero food rations! Caloric deficit (-8% health).');
  }

  if (isBlackout) {
    healthDelta -= 15; // Habitat freezing and loss of environmental circulation
    notes.push('HYPOTHERMIA ALERT: Outpost blackout. Habitat temperature dropping (-15% health).');
  }

  if (radiationHealthImpact > 0) {
    healthDelta -= radiationHealthImpact;
    notes.push(`RADIATION SICKNESS: Radiation exposure induced cellular damage (-${radiationHealthImpact}% health).`);
  }

  // If all conditions are completely nominal and no deficits, crew slowly recovers
  const allNominal = !oxygenDeficit && !waterDeficit && !foodDeficit && !isBlackout && radiationHealthImpact === 0;
  if (allNominal) {
    healthDelta += 2; // Natural rest and recuperation
  }

  let anyCasualties = false;

  const updatedCrew = crew.map(member => {
    if (member.health <= 0) {
      return {
        ...member,
        health: 0,
        status: 'incapacitated' as const,
      };
    }

    const newHealth = Math.min(100, Math.max(0, member.health + healthDelta));
    if (newHealth <= 0 && member.health > 0) {
      anyCasualties = true;
      notes.push(`CASUALTY: Astronaut ${member.name} (${member.role}) has succumbed to mission hazards.`);
    }

    let status: CrewMember['status'] = 'nominal';
    if (newHealth <= 0) {
      status = 'incapacitated';
    } else if (newHealth < 30) {
      status = 'injured';
    } else if (newHealth < 70) {
      status = 'stressed';
    }

    return {
      ...member,
      health: newHealth,
      status,
    };
  });

  const survivingCrewCount = updatedCrew.filter(c => c.health > 0).length;
  const totalHealth = updatedCrew.reduce((acc, c) => acc + c.health, 0);
  const averageHealth = updatedCrew.length > 0 ? Math.round(totalHealth / updatedCrew.length) : 0;

  if (allNominal && averageHealth < 100) {
    notes.push('Medical & ECLSS nominal: Crew recuperating (+2% health).');
  }

  return {
    updatedCrew,
    averageHealth,
    survivingCrewCount,
    anyCasualties,
    notes,
  };
}
