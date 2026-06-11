import { format, startOfWeek, addDays } from 'date-fns';
import { Patient, Week, Visit, WeekPatient, NVAEntry } from '../types';

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function seedData(): {
  patients: Patient[];
  weeks: Week[];
  visits: Visit[];
  nvaEntries: NVAEntry[];
} {
  const patients: Patient[] = [
    {
      id: 'p1',
      name: 'Margaret Johnson',
      phoneNumber: '(615) 555-0101',
      address: '4521 Elmwood Drive, Nashville, TN 37209',
      lat: 36.15,
      lng: -86.77,
      amPmPreference: 'AM',
      contactPreference: 'TEXT',
      defaultWeeklyVisits: 3,
      defaultVisitDuration: 45,
      pointValue: 1.0,
      notes: 'Gate code: 4421',
      archived: false,
    },
    {
      id: 'p2',
      name: 'Robert Smith',
      phoneNumber: '(615) 555-0102',
      address: '892 Maple Ave, Brentwood, TN 37027',
      lat: 36.03,
      lng: -86.78,
      amPmPreference: 'EITHER',
      contactPreference: 'CALL',
      defaultWeeklyVisits: 2,
      defaultVisitDuration: 60,
      pointValue: 1.0,
      notes: '',
      archived: false,
    },
    {
      id: 'p3',
      name: 'Dorothy Williams',
      phoneNumber: '(615) 555-0103',
      address: '1204 Oak Street, Franklin, TN 37064',
      lat: 35.92,
      lng: -86.87,
      amPmPreference: 'PM',
      contactPreference: 'BOTH',
      defaultWeeklyVisits: 3,
      defaultVisitDuration: 45,
      pointValue: 1.0,
      notes: 'Park in back, ring doorbell twice',
      archived: false,
    },
    {
      id: 'p4',
      name: 'James Brown',
      phoneNumber: '(615) 555-0104',
      address: '3301 Hillside Blvd, Nashville, TN 37211',
      lat: 36.12,
      lng: -86.82,
      amPmPreference: 'AM',
      contactPreference: 'TEXT',
      defaultWeeklyVisits: 2,
      defaultVisitDuration: 45,
      pointValue: 1.0,
      notes: '',
      archived: false,
    },
    {
      id: 'p5',
      name: 'Patricia Davis',
      phoneNumber: '(615) 555-0105',
      address: '756 Cherry Lane, Hendersonville, TN 37075',
      lat: 36.31,
      lng: -86.61,
      amPmPreference: 'EITHER',
      contactPreference: 'BOTH',
      defaultWeeklyVisits: 1,
      defaultVisitDuration: 90,
      pointValue: 1.5,
      notes: '',
      archived: false,
    },
    {
      id: 'p6',
      name: 'Charles Wilson',
      phoneNumber: '(615) 555-0106',
      address: '2108 Pine Road, Goodlettsville, TN 37072',
      lat: 36.32,
      lng: -86.71,
      amPmPreference: 'PM',
      contactPreference: 'CALL',
      defaultWeeklyVisits: 3,
      defaultVisitDuration: 45,
      pointValue: 1.0,
      notes: '',
      archived: false,
    },
    {
      id: 'p7',
      name: 'Barbara Moore',
      phoneNumber: '(615) 555-0107',
      address: '445 Sunset Blvd, Nashville, TN 37206',
      lat: 36.17,
      lng: -86.79,
      amPmPreference: 'AM',
      contactPreference: 'TEXT',
      defaultWeeklyVisits: 2,
      defaultVisitDuration: 45,
      pointValue: 1.0,
      notes: '',
      archived: false,
    },
    {
      id: 'p8',
      name: 'Thomas Taylor',
      phoneNumber: '(615) 555-0108',
      address: '1887 River Road, Hermitage, TN 37076',
      lat: 36.19,
      lng: -86.61,
      amPmPreference: 'EITHER',
      contactPreference: 'BOTH',
      defaultWeeklyVisits: 3,
      defaultVisitDuration: 60,
      pointValue: 1.0,
      notes: 'Dog is friendly, enter through side gate',
      archived: false,
    },
    {
      id: 'p9',
      name: 'Sandra Anderson',
      phoneNumber: '(615) 555-0109',
      address: '3092 Churchview Ave, Nashville, TN 37214',
      lat: 36.09,
      lng: -86.75,
      amPmPreference: 'PM',
      contactPreference: 'TEXT',
      defaultWeeklyVisits: 2,
      defaultVisitDuration: 45,
      pointValue: 1.0,
      notes: '',
      archived: false,
    },
    {
      id: 'p10',
      name: 'William Jackson',
      phoneNumber: '(615) 555-0110',
      address: '612 Eastview Dr, Madison, TN 37115',
      lat: 36.26,
      lng: -86.72,
      amPmPreference: 'AM',
      contactPreference: 'CALL',
      defaultWeeklyVisits: 3,
      defaultVisitDuration: 45,
      pointValue: 1.0,
      notes: '',
      archived: false,
    },
    {
      id: 'p11',
      name: 'Linda Harris',
      phoneNumber: '(615) 555-0111',
      address: '2445 Westbrook Ct, Antioch, TN 37013',
      lat: 36.06,
      lng: -86.67,
      amPmPreference: 'EITHER',
      contactPreference: 'BOTH',
      defaultWeeklyVisits: 1,
      defaultVisitDuration: 75,
      pointValue: 1.5,
      notes: '',
      archived: false,
    },
    {
      id: 'p12',
      name: 'Michael Martinez',
      phoneNumber: '(615) 555-0112',
      address: '901 Valley View, Mount Juliet, TN 37122',
      lat: 36.20,
      lng: -86.52,
      amPmPreference: 'PM',
      contactPreference: 'TEXT',
      defaultWeeklyVisits: 2,
      defaultVisitDuration: 45,
      pointValue: 1.0,
      notes: '',
      archived: false,
    },
  ];

  // Find Monday of current week
  const today = new Date();
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  const weekStartDate = format(monday, 'yyyy-MM-dd');
  const weekId = 'week-seed-1';

  const weekPatients: WeekPatient[] = patients.map((p) => ({
    patientId: p.id,
    requiredVisits: p.defaultWeeklyVisits,
  }));

  const week: Week = {
    id: weekId,
    startDate: weekStartDate,
    patients: weekPatients,
  };

  // Create visits spread across Mon-Fri
  const dates = Array.from({ length: 5 }, (_, i) =>
    format(addDays(monday, i), 'yyyy-MM-dd')
  );

  const visits: Visit[] = [];

  function addVisit(
    patientId: string,
    dateIdx: number,
    timeBlock: 'AM' | 'PM',
    duration: number,
    status: Visit['status'] = 'SCHEDULED',
    confirmationStatus: Visit['confirmationStatus'] = 'PENDING',
    pinned = false
  ) {
    visits.push({
      id: makeId(),
      weekId,
      patientId,
      date: dates[dateIdx],
      timeBlock,
      estimatedDuration: duration,
      status,
      pinned,
      confirmationStatus,
    });
  }

  // ── Monday: all done ──────────────────────────────────────
  addVisit('p1',  0, 'AM', 45, 'COMPLETED', 'CONFIRMED');  // Margaret Johnson
  addVisit('p4',  0, 'AM', 45, 'COMPLETED', 'CONFIRMED');  // James Brown
  addVisit('p10', 0, 'AM', 45, 'COMPLETED', 'CONFIRMED');  // William Jackson
  addVisit('p3',  0, 'PM', 45, 'COMPLETED', 'CONFIRMED');  // Dorothy Williams
  addVisit('p6',  0, 'PM', 45, 'COMPLETED', 'CONFIRMED');  // Charles Wilson
  addVisit('p8',  0, 'AM', 60, 'COMPLETED', 'CONFIRMED');  // Thomas Taylor

  // ── Tuesday: all done ─────────────────────────────────────
  addVisit('p2',  1, 'AM', 60, 'COMPLETED', 'CONFIRMED');  // Robert Smith
  addVisit('p7',  1, 'AM', 45, 'COMPLETED', 'CONFIRMED');  // Barbara Moore
  addVisit('p1',  1, 'AM', 45, 'COMPLETED', 'CONFIRMED');  // Margaret Johnson
  addVisit('p9',  1, 'PM', 45, 'COMPLETED', 'CONFIRMED');  // Sandra Anderson
  addVisit('p12', 1, 'PM', 45, 'COMPLETED', 'CONFIRMED');  // Michael Martinez

  // ── Wednesday: all done ───────────────────────────────────
  addVisit('p5',  2, 'AM', 90, 'COMPLETED', 'CONFIRMED');  // Patricia Davis (1.5 pts)
  addVisit('p10', 2, 'AM', 45, 'COMPLETED', 'CONFIRMED');  // William Jackson
  addVisit('p8',  2, 'AM', 60, 'COMPLETED', 'CONFIRMED');  // Thomas Taylor
  addVisit('p3',  2, 'PM', 45, 'COMPLETED', 'CONFIRMED');  // Dorothy Williams
  addVisit('p6',  2, 'PM', 45, 'COMPLETED', 'CONFIRMED');  // Charles Wilson

  // ── Thursday (today): confirmed & ready to go ─────────────
  addVisit('p4',  3, 'AM', 45, 'SCHEDULED', 'CONFIRMED', true);  // James Brown – pinned (requested this slot)
  addVisit('p7',  3, 'AM', 45, 'SCHEDULED', 'CONFIRMED');         // Barbara Moore
  addVisit('p2',  3, 'PM', 60, 'SCHEDULED', 'SENT');              // Robert Smith
  addVisit('p9',  3, 'PM', 45, 'SCHEDULED', 'SENT');              // Sandra Anderson
  addVisit('p11', 3, 'PM', 75, 'SCHEDULED', 'PENDING');           // Linda Harris (1.5 pts)

  // ── Friday: scheduled, confirmations pending ──────────────
  addVisit('p1',  4, 'AM', 45, 'SCHEDULED', 'PENDING');   // Margaret Johnson
  addVisit('p10', 4, 'AM', 45, 'SCHEDULED', 'PENDING');   // William Jackson
  addVisit('p8',  4, 'AM', 60, 'SCHEDULED', 'PENDING');   // Thomas Taylor
  addVisit('p3',  4, 'PM', 45, 'SCHEDULED', 'PENDING');   // Dorothy Williams
  addVisit('p6',  4, 'PM', 45, 'SCHEDULED', 'PENDING');   // Charles Wilson
  addVisit('p12', 4, 'PM', 45, 'SCHEDULED', 'PENDING');   // Michael Martinez

  const nvaEntries: NVAEntry[] = [
    {
      id: makeId(),
      date: dates[0],
      description: 'Team meeting / care coordination',
      hours: 1.0,
      hourlyRate: 25,
    },
    {
      id: makeId(),
      date: dates[1],
      description: 'In-service training',
      hours: 2.0,
      hourlyRate: 25,
    },
    {
      id: makeId(),
      date: dates[2],
      description: 'SOC documentation — Patricia Davis',
      hours: 1.5,
      hourlyRate: 25,
    },
  ];

  return { patients, weeks: [week], visits, nvaEntries };
}
