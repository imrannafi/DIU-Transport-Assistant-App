
export interface RamadanInfo {
  year: number;
  startDate: string; // DD/MM/YYYY
  eidDate: string;   // DD/MM/YYYY (Approximate)
}

// Precise Ramadan dates (Start and approx Eid-ul-Fitr)
const RAMADAN_DATA: RamadanInfo[] = [
  { year: 2025, startDate: '01/03/2025', eidDate: '31/03/2025' },
  { year: 2026, startDate: '18/02/2026', eidDate: '20/03/2026' },
  { year: 2027, startDate: '09/03/2027', eidDate: '08/04/2027' },
  { year: 2028, startDate: '26/01/2028', eidDate: '25/02/2028' },
  { year: 2029, startDate: '15/01/2029', eidDate: '14/02/2029' },
  { year: 2030, startDate: '05/01/2030', eidDate: '04/02/2030' },
];

export function getActiveRamadanInfo(): RamadanInfo {
  const now = new Date();
  
  for (const info of RAMADAN_DATA) {
    const [eDay, eMonth, eYear] = info.eidDate.split('/').map(Number);
    const eid = new Date(eYear, eMonth - 1, eDay);
    
    // We switch to the next year's schedule 1 day after Eid
    const switchDate = new Date(eid);
    switchDate.setDate(switchDate.getDate() + 1);

    if (now <= switchDate) {
      return info;
    }
  }
  
  return RAMADAN_DATA[RAMADAN_DATA.length - 1];
}
