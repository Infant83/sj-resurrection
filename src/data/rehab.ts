export const rehabHospitals = [
  { id: 'nrc', label: '국립재활원' },
  { id: 'hanyang', label: '한양대학교병원' },
  { id: 'asan', label: '서울아산병원' },
  { id: 'severance', label: '세브란스병원' },
] as const;

export const rehabPhases = [
  { id: 'outpatient-preparation', label: '외래 준비' },
  { id: 'outpatient-visit', label: '외래 진료' },
  { id: 'transfer-planning', label: '전원·입원 상담' },
  { id: 'inpatient-rehab', label: '입원 재활' },
  { id: 'follow-up', label: '재평가·후속 치료' },
] as const;

export type RehabHospitalId = typeof rehabHospitals[number]['id'];
export type RehabPhaseId = typeof rehabPhases[number]['id'];

export function rehabLabels(hospitalIds: readonly string[], phases: readonly string[]) {
  return [
    ...rehabHospitals.filter(h => hospitalIds.includes(h.id)).map(h => h.label),
    ...rehabPhases.filter(p => phases.includes(p.id)).map(p => p.label),
  ];
}
