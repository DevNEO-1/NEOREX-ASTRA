import { GameState, MissionScore } from './types';

/**
 * Calculates end-of-mission performance score and evaluates Mars campaign unlock criteria.
 */
export function calculateMissionScore(state: GameState): MissionScore {
  const summaryFeedback: string[] = [];

  // 1. Crew Survival Score (Max 40 points)
  const survivingCrew = state.crew.filter(c => c.health > 0).length;
  const initialCrewCount = 4;
  const crewRatio = survivingCrew / initialCrewCount;
  
  const avgHealth = state.crew.length > 0
    ? state.crew.reduce((acc, c) => acc + c.health, 0) / state.crew.length
    : 0;

  // 25 points for survival ratio + 15 points scaled by average health
  const crewSurvivalScore = Math.round((crewRatio * 25) + ((avgHealth / 100) * 15));

  if (survivingCrew === initialCrewCount) {
    summaryFeedback.push(`Flawless crew safety: All ${initialCrewCount} astronauts survived with ${Math.round(avgHealth)}% average health.`);
  } else {
    summaryFeedback.push(`Crew casualties suffered: ${survivingCrew}/${initialCrewCount} astronauts survived.`);
  }

  // 2. Resource Efficiency Score (Max 30 points)
  // Check reserve margins:
  // Water > 100 L, Oxygen > 50 kg, Food > 30 kg, Battery > 100 kWh
  let resourcePoints = 0;
  if (state.resources.oxygenKg >= 40) resourcePoints += 8;
  else if (state.resources.oxygenKg > 0) resourcePoints += 4;

  if (state.resources.waterLitres >= 150) resourcePoints += 8;
  else if (state.resources.waterLitres > 0) resourcePoints += 4;

  if (state.resources.foodKg >= 50) resourcePoints += 7;
  else if (state.resources.foodKg > 0) resourcePoints += 3;

  if (state.resources.batteryKwh >= 100) resourcePoints += 7;
  else if (state.resources.batteryKwh > 0) resourcePoints += 3;

  const resourceEfficiencyScore = Math.min(30, resourcePoints);

  if (resourceEfficiencyScore >= 24) {
    summaryFeedback.push('Superior resource logistics: Maintained healthy safety buffers across all life support consumables.');
  } else {
    summaryFeedback.push('Tight resource margins: Outpost experienced near-critical supply depletions.');
  }

  // 3. Engineering Objectives Score (Max 30 points)
  const completedObjectives = state.objectives.filter(o => o.achieved).length;
  const totalObjectives = state.objectives.length || 1;
  const engineeringObjectivesScore = Math.round((completedObjectives / totalObjectives) * 30);

  summaryFeedback.push(`Engineering Milestones: Completed ${completedObjectives} of ${totalObjectives} primary technical directives.`);

  // Total Score (0 - 100)
  const totalScore = Math.min(100, Math.max(0, crewSurvivalScore + resourceEfficiencyScore + engineeringObjectivesScore));

  // Determine Grade
  let grade: MissionScore['grade'] = 'F';
  if (totalScore >= 90) grade = 'S';
  else if (totalScore >= 80) grade = 'A';
  else if (totalScore >= 70) grade = 'B';
  else if (totalScore >= 60) grade = 'C';
  else if (totalScore >= 50) grade = 'D';

  // Mars Unlock Eligibility Checklist:
  // - 30 lunar days survived
  // - Crew health at least 70%
  // - Three engineering objectives completed
  // - Mission score at least 70/100
  const survived30Days = state.day >= state.totalDays && survivingCrew > 0;
  const healthRequirementMet = avgHealth >= 70;
  const objectivesRequirementMet = completedObjectives >= 3;
  const scoreRequirementMet = totalScore >= 70;

  const isMarsEligible = survived30Days && healthRequirementMet && objectivesRequirementMet && scoreRequirementMet;

  if (isMarsEligible) {
    summaryFeedback.push('MISSION ACCOMPLISHED: Exceptional commander leadership. Unlocked Mars Expedition Campaign (Ares Outpost Prime)!');
  } else {
    const missing: string[] = [];
    if (!survived30Days) missing.push('Survive full 30 days');
    if (!healthRequirementMet) missing.push(`Average crew health >= 70% (Actual: ${Math.round(avgHealth)}%)`);
    if (!objectivesRequirementMet) missing.push(`Complete at least 3 objectives (Actual: ${completedObjectives})`);
    if (!scoreRequirementMet) missing.push(`Total score >= 70 (Actual: ${totalScore})`);
    summaryFeedback.push(`Mars Expedition Locked: Requirements pending: ${missing.join(', ')}.`);
  }

  return {
    totalScore,
    crewSurvivalScore,
    resourceEfficiencyScore,
    engineeringObjectivesScore,
    grade,
    isMarsEligible,
    summaryFeedback,
  };
}
