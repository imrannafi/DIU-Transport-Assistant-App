export enum ScheduleType {
  REGULAR = 'Regular',
  EXAM = 'Exam',
  FRIDAY = 'Friday',
  SHUTTLE = 'Shuttle',
  RAMADAN = 'Ramadan'
}

export interface BusTime {
  time: string;
  note?: string;
}

export interface Route {
  id: string;
  name: string;
  details: string;
  scheduleType: ScheduleType;
  toDSC: BusTime[];
  fromDSC: BusTime[];
  mapEmbedUrl?: string;
  fixedBus?: string;
}

export interface Reminder {
  id: string;
  routeId: string;
  routeName: string;
  busTime: string;
  minutesBefore: number;
  direction: 'TO DSC' | 'FROM DSC';
  label?: string;
}

export interface Notice {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  isPinned?: boolean;
  readMoreUrl?: string;
  timestamp?: number;
}

export interface LostFoundPost {
  id: string;
  posterId: string;
  posterName: string;
  posterPhoto: string;
  posterEmail: string;
  posterPhone: string;
  title: string;
  description: string;
  imageUrl?: string;
  status: 'lost' | 'found';
  isApproved: boolean;
  createdAt: number;
  comments?: { [id: string]: { userId: string, userName: string, userPhoto: string, text: string, createdAt: number } };
}
