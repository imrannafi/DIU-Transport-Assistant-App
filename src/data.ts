import { ScheduleType, Route, Notice } from './types';

export const ROUTES: Route[] = [
  {
    id: 'R1',
    name: 'Dhanmondi <> DSC',
    scheduleType: ScheduleType.REGULAR,
    details: 'Dhanmondi - Sobhanbag <> Shyamoli Square <> Technical Mor > Majar Road Gabtoli <> Konabari Bus Stop <> Eastern Housing<> Rupnagar <> Birulia Bus Stand <> Daffodil Smart City',
    toDSC: [{ time: '7:00 AM' }, { time: '10:00 AM' }, { time: '2:30 PM' }],
    fromDSC: [{ time: '1:30 PM' }, { time: '4:20 PM' }, { time: '6:10 PM' }, { time: '8:10 PM' }],
    mapEmbedUrl: 'https://www.google.com/maps/d/embed?mid=1J8QtXb3iMgXJTsECsIzdzu3mIgDio5Al'
  },
  {
    id: 'R2',
    name: 'Uttara-Rajlokkhi <> DSC',
    scheduleType: ScheduleType.REGULAR,
    details: 'Uttara - Rajlokkhi <> House building <> Grand Zamzam Tower <> Diyabari Bridge <> Beribadh <> Birulia <> Khagan <> Daffodil Smart City',
    toDSC: [{ time: '7:00 AM' }, { time: '10:00 AM' }, { time: '2:15 PM' }],
    fromDSC: [{ time: '1:30 PM' }, { time: '4:20 PM' }, { time: '6:10 PM' }, { time: '8:10 PM' }],
    mapEmbedUrl: 'https://www.google.com/maps/d/embed?mid=1YTQpHTyhpAzWyOlZ_oMgDEm-fu_VnQES'
  },
  {
    id: 'R3',
    name: 'Tongi College gate <> DSC',
    scheduleType: ScheduleType.REGULAR,
    details: 'Tongi College Gate Bus Stand <> Kamarpara <> Dhour <> Birulia <> Daffodil Smart City',
    toDSC: [{ time: '7:00 AM' }, { time: '10:00 AM' }, { time: '2:15 PM' }],
    fromDSC: [{ time: '1:30 PM' }, { time: '4:20 PM' }, { time: '6:10 PM' }],
    mapEmbedUrl: 'https://www.google.com/maps/d/embed?mid=1AuQcyjHn3A-x52EJ3J-nJQka_BsLOzm-'
  },
  {
    id: 'R4',
    name: 'ECB Chattor <> Mirpur <> DSC',
    scheduleType: ScheduleType.REGULAR,
    details: 'ECB Chattor <> Kalshi Mor <> Mirpur 12 <> Mirpur 10 <> Mirpur 02 <> Mirpur 01 - Sony Cinema Hall <> Commerce College <> Gudaraghat <> Beribadh <> Estern Housing <> Birulia <> Akran <> Daffodil Smart City',
    toDSC: [{ time: '7:00 AM' }, { time: '10:00 AM' }, { time: '2:15 PM' }],
    fromDSC: [{ time: '1:30 PM' }, { time: '4:20 PM' }, { time: '6:10 PM' }],
    mapEmbedUrl: 'https://www.google.com/maps/d/embed?mid=1SlQHi4xKjh-9CFPXBxfv1y_8hsGIaFcF'
  },
  {
    id: 'R5',
    name: 'Konabari Pukur Par <> Zirabo <> DSC',
    scheduleType: ScheduleType.REGULAR,
    details: 'Konabari Pukur Par <> Norshingpur <> Ghosbag > Zirabo <> Ashulia Bazar <> Paragram <> Daffodil Smart City',
    toDSC: [{ time: '7:00 AM' }],
    fromDSC: [{ time: '4:20 PM' }],
    mapEmbedUrl: 'https://www.google.com/maps/d/embed?mid=1OB1OO-9bw8vFNii2KuX7ANNAH_xGwu0'
  },
  {
    id: 'R6',
    name: 'Baipail <> Nabinagar <> C&B <> DSC',
    scheduleType: ScheduleType.REGULAR,
    details: 'Baipail <> Palli Bidyut <> Nabinagar <> Bismail <> Prantik <> JU <> C&B <> Kolma <> Charabag <> Kumkumari <> Daffodil Smart City',
    toDSC: [{ time: '7:00 AM' }, { time: '10:00 AM' }],
    fromDSC: [{ time: '1:30 PM' }, { time: '4:20 PM' }, { time: '6:10 PM' }],
    mapEmbedUrl: 'https://www.google.com/maps/d/embed?mid=1XietwmoLEeJXNAzzXF751LD_090ntWK1'
  },
  {
    id: 'R7',
    name: 'Dhamrai Bus Stand <> Nabinagar <> C&B <> DSC',
    scheduleType: ScheduleType.REGULAR,
    details: 'Dhamrai Bus Stand <> Kohinur Market <> Gonosastho <> Nabinagar <> Bismail <> Prantik <> JU <> C&B <> Kolma <> Charabag <> Kumkumari <> Daffodil Smart City',
    toDSC: [{ time: '7:00 AM' }, { time: '10:00 AM' }],
    fromDSC: [{ time: '1:30 PM' }, { time: '4:20 PM' }],
    mapEmbedUrl: 'https://www.google.com/maps/d/embed?mid=15m39L6BaqZP1VB6TTZNZU9vtGieKVK4R'
  },
  {
    id: 'R8',
    name: 'Savar <> C&B <> DSC',
    scheduleType: ScheduleType.REGULAR,
    details: 'Savar Bus Stand <> Radio Colony <> C&B <> Kolma <> Charabag <> Kumkumari <> Daffodil Smart City',
    toDSC: [{ time: '7:00 AM' }, { time: '10:00 AM' }],
    fromDSC: [{ time: '1:30 PM' }, { time: '4:20 PM' }, { time: '6:10 PM' }],
    mapEmbedUrl: 'https://www.google.com/maps/d/embed?mid=1v1Z7DQkLmmntU3XQwDjy_989Dmxx6Beo'
  },
  {
    id: 'R11',
    name: 'Tongi Station <> DSC',
    scheduleType: ScheduleType.SHUTTLE,
    details: 'Tongi Station <> Kamar Para <> Dhour <> Birulia <> Daffodil Smart City',
    toDSC: [{ time: '7:00 AM' }, { time: '8:30 AM' }, { time: '10:00 AM' }, { time: '12:00 PM' }],
    fromDSC: [{ time: '11:15 AM' }, { time: '1:30 PM' }, { time: '4:20 PM' }, { time: '6:10 PM' }],
    mapEmbedUrl: 'https://www.google.com/maps/d/embed?mid=1AuQcyjHn3A-x52EJ3J-nJQka_BsLOzm-'
  }
];

export const NOTICES: Notice[] = [
  {
    id: 'n1',
    title: 'Holy Ramadan Schedule 2025',
    description: 'The transport schedule has been revised for the month of Holy Ramadan. Please check the "Ramadan" tab for updated timings.',
    date: 'February 28, 2025',
    time: '10:00 AM',
    isPinned: true
  }
];
