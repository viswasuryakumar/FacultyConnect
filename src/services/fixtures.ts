import { addDateDays, localDate, localToUtc } from '../domain/availability';
import type { AppState, Availability, Booking, MeetingNote, Profile } from '../domain/types';

const zone = 'America/Los_Angeles';
export const PREVIEW_IDENTITIES = {
  student: 'student-viswa',
  professor: 'prof-sarah',
  admin: 'admin-jordan',
} as const;

function availability(professorId: string, automatic = false): Availability {
  const hours = [
    { start: '09:00', end: '12:00' },
    { start: '13:00', end: '17:00' },
  ];
  return {
    professorId,
    timeZone: zone,
    weekly: {
      0: [],
      1: structuredClone(hours),
      2: structuredClone(hours),
      3: structuredClone(hours),
      4: structuredClone(hours),
      5: structuredClone(hours),
      6: [],
    },
    overrides: [],
    exceptions: [],
    rules: {
      approval: automatic ? 'automatic' : 'manual',
      windowDays: 60,
      noticeHours: 2,
      dailyCap: null,
      holdPending: false,
    },
  };
}

export function createFixtures(at: Date): AppState {
  const profiles: Profile[] = [
    {
      id: 'student-viswa',
      name: 'Viswa Surya',
      email: 'viswa.surya@example.edu',
      role: 'student',
      university: 'Eastbridge University',
      department: 'Computer Science',
      timeZone: zone,
      interests: ['Machine learning', 'Computer Science'],
      bio: 'Computer science student exploring machine learning and research opportunities.',
      notificationPreferences: { meetingReminders: true, bookingUpdates: true },
    },
    {
      id: 'student-amina',
      name: 'Amina Hassan',
      email: 'amina.hassan@example.edu',
      role: 'student',
      university: 'Eastbridge University',
      department: 'Data Science',
      timeZone: zone,
      interests: ['Machine Learning', 'Data Science'],
    },
    {
      id: 'student-daniel',
      name: 'Daniel Kim',
      email: 'daniel.kim@example.edu',
      role: 'student',
      university: 'Eastbridge University',
      department: 'Computer Science',
      timeZone: zone,
      interests: ['Artificial Intelligence'],
    },
    {
      id: 'student-emma',
      name: 'Sofia Lopez',
      email: 'sofia.lopez@example.edu',
      role: 'student',
      university: 'University of Washington',
      department: 'Psychology',
      timeZone: 'America/New_York',
      interests: ['Cognitive Science'],
    },
    {
      id: 'student-priya',
      name: 'Priya Nair',
      email: 'priya.nair@example.edu',
      role: 'student',
      university: 'Northgate University',
      department: 'Cognitive Science',
      timeZone: 'America/Chicago',
      interests: ['Human-centered AI', 'Cognitive Science'],
    },
    {
      id: 'student-marcus',
      name: 'Marcus Lee',
      email: 'marcus.lee@example.edu',
      role: 'student',
      university: 'Eastbridge University',
      department: 'Computer Science',
      timeZone: zone,
      interests: ['Machine learning', 'Software engineering'],
    },
    {
      id: 'prof-sarah',
      name: 'Dr. Sarah Chen',
      role: 'professor',
      university: 'Eastbridge University',
      department: 'Computer Science',
      academicRole: 'Associate Professor',
      timeZone: zone,
      interests: ['Human-centered AI', 'Machine learning', 'Responsible technology'],
      expertise: ['Machine learning', 'Python', 'Research'],
      subjects: ['Machine learning', 'Python programming', 'Artificial intelligence'],
      bio: 'I study how artificial intelligence can help people solve meaningful problems. My research brings together machine learning, human-computer interaction, and responsible technology. I enjoy helping students find their research direction and turn early ideas into thoughtful projects.',
      education:
        'Ph.D. in Computer Science, Riverton University\nM.S. in Computer Science, Eastbridge University',
      languages: ['English', 'Spanish'],
      rating: 4.9,
      reviewCount: 24,
      notificationPreferences: { meetingReminders: true, bookingUpdates: true },
    },
    {
      id: 'prof-alex',
      name: 'Dr. Alex Patel',
      role: 'professor',
      university: 'Riverton University',
      department: 'Statistics & Data Science',
      academicRole: 'Professor',
      timeZone: zone,
      interests: ['Statistics', 'Data analysis'],
      expertise: ['Statistics', 'Data analysis', 'Research'],
      subjects: ['Statistics', 'Data analysis', 'Research methods'],
      bio: 'I help students turn complex data into clear, useful findings. My research explores statistical methods, thoughtful experiment design, and practical data analysis.',
      education: 'Ph.D. in Statistics, Riverton University',
      languages: ['English'],
      rating: 4.8,
      reviewCount: 18,
    },
    {
      id: 'prof-maya',
      name: 'Dr. Maya Rivera',
      role: 'professor',
      university: 'Eastbridge University',
      department: 'Psychology',
      academicRole: 'Assistant Professor',
      timeZone: zone,
      interests: ['Research design', 'AI', 'Learning sciences'],
      expertise: ['Research design', 'AI', 'Education'],
      subjects: ['Research methods', 'Cognitive science', 'Learning sciences'],
      bio: 'I research how people learn, make decisions, and collaborate. I support students interested in cognitive science, interdisciplinary research, and graduate study.',
      education: 'Ph.D. in Psychology, University of Michigan',
      languages: ['English', 'Hindi'],
      rating: 4.9,
      reviewCount: 31,
    },
    {
      id: 'admin-jordan',
      name: 'Jordan Taylor',
      role: 'admin',
      university: 'FacultyConnect',
      department: 'Faculty Support',
      timeZone: zone,
      interests: [],
    },
  ];
  const weekdays = (direction: 1 | -1, count: number): string[] => {
    const dates: string[] = [];
    for (let offset = direction; dates.length < count; offset += direction) {
      const date = addDateDays(localDate(at, zone), offset);
      const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
      if (weekday > 0 && weekday < 6) dates.push(date);
    }
    return dates;
  };
  const upcomingDates = weekdays(1, 6);
  /** pastDates[0] is the most recent weekday before today. */
  const pastDates = weekdays(-1, 12);
  const meeting = (
    id: string,
    studentId: string,
    professorId: string,
    date: string,
    time: string,
    status: Booking['status'],
    topic: string,
    linkState: Booking['linkState'] = 'not_requested',
    extra: Partial<Pick<Booking, 'meetingType' | 'context' | 'reason'>> = {},
  ): Booking => {
    const start = localToUtc(date, time, zone)!;
    return {
      id,
      studentId,
      professorId,
      start,
      end: new Date(Date.parse(start) + 30 * 60_000).toISOString(),
      status,
      meetingType:
        professorId === 'prof-alex'
          ? 'Coursework question'
          : professorId === 'prof-maya'
            ? 'Research discussion'
            : 'Project guidance',
      topic,
      context:
        'I would love to discuss my current interests and get your perspective on useful next steps.',
      linkState,
      bookedTimeZone: zone,
      ...extra,
    };
  };
  const bookings = [
    meeting(
      'meeting-next',
      'student-viswa',
      'prof-sarah',
      upcomingDates[0],
      '10:00',
      'confirmed',
      'Exploring AI research opportunities',
      'ready',
    ),
    meeting(
      'meeting-pending',
      'student-viswa',
      'prof-sarah',
      upcomingDates[1],
      '14:00',
      'pending',
      'Guidance on my capstone project',
    ),
    meeting(
      'meeting-amina',
      'student-amina',
      'prof-sarah',
      upcomingDates[0],
      '11:00',
      'pending',
      'Machine learning research direction',
    ),
    meeting(
      'meeting-daniel',
      'student-daniel',
      'prof-sarah',
      upcomingDates[1],
      '10:30',
      'confirmed',
      'Preparing a graduate research proposal',
      'preparing',
    ),
    meeting(
      'meeting-emma',
      'student-emma',
      'prof-sarah',
      upcomingDates[2],
      '15:00',
      'confirmed',
      'Human-centered AI and cognitive science',
      'failed',
    ),
    meeting(
      'meeting-alex',
      'student-viswa',
      'prof-alex',
      upcomingDates[2],
      '11:00',
      'confirmed',
      'Understanding statistical research',
      'ready',
    ),
    meeting(
      'meeting-declined',
      'student-viswa',
      'prof-maya',
      upcomingDates[3],
      '13:00',
      'declined',
      'Interdisciplinary research ideas',
    ),
    meeting(
      'meeting-cancelled',
      'student-viswa',
      'prof-alex',
      upcomingDates[4],
      '15:00',
      'cancelled',
      'Project planning conversation',
      'not_requested',
      {
        reason:
          'My midterm exam was moved to the same afternoon. I will book a new time next week.',
      },
    ),
    meeting(
      'meeting-completed',
      'student-viswa',
      'prof-maya',
      pastDates[2],
      '14:00',
      'completed',
      'Choosing a research direction',
      'ready',
      {
        context:
          'I am interested in both cognitive science and machine learning and am unsure which direction suits a first research project.',
      },
    ),
    // Professor-facing history: completed meetings with shared notes.
    meeting(
      'meeting-sarah-viswa-past',
      'student-viswa',
      'prof-sarah',
      pastDates[8],
      '11:00',
      'completed',
      'Getting started with machine learning research',
      'ready',
      {
        meetingType: 'Research discussion',
        context:
          'I have finished an introductory ML course and want to understand how undergraduates usually get involved in research, and which skills I should build first.',
      },
    ),
    meeting(
      'meeting-sarah-amina-past',
      'student-amina',
      'prof-sarah',
      pastDates[1],
      '15:00',
      'completed',
      'Feedback on my course project proposal',
      'ready',
      {
        meetingType: 'Project feedback',
        context:
          'My proposal predicts student course dropout from enrolment data. I would like feedback on scope and on whether my evaluation plan is realistic.',
      },
    ),
    meeting(
      'meeting-sarah-daniel-past',
      'student-daniel',
      'prof-sarah',
      pastDates[11],
      '10:00',
      'completed',
      'Graduate school application advice',
      'ready',
      {
        meetingType: 'Career guidance',
        context:
          'I am applying to M.S. programmes in AI this cycle and would like advice on my statement of purpose and on choosing recommenders.',
      },
    ),
    // Additional requests waiting for the professor.
    meeting(
      'meeting-priya-pending',
      'student-priya',
      'prof-sarah',
      upcomingDates[3],
      '09:30',
      'pending',
      'Summer research internship in human-centered AI',
      'not_requested',
      {
        meetingType: 'Research opportunity',
        context:
          'I am a cognitive science student at Northgate University. I read your paper on explainable recommendations and would love to learn whether your lab takes visiting summer students.',
      },
    ),
    meeting(
      'meeting-marcus-pending',
      'student-marcus',
      'prof-sarah',
      upcomingDates[4],
      '13:30',
      'pending',
      'Choosing between machine learning electives',
      'not_requested',
      {
        meetingType: 'Course advice',
        context:
          'Next term I can take either Deep Learning or Probabilistic Graphical Models. I would like advice on which fits better with a career in applied ML.',
      },
    ),
    meeting(
      'meeting-sarah-declined',
      'student-marcus',
      'prof-sarah',
      upcomingDates[2],
      '16:00',
      'declined',
      'Help debugging my homework code',
      'not_requested',
      {
        meetingType: 'Coursework question',
        reason:
          'Homework questions are best handled by the course teaching assistants during office hours. I am happy to meet about broader ML topics.',
      },
    ),
    // A confirmed meeting where the professor has proposed a new time.
    meeting(
      'meeting-reschedule',
      'student-viswa',
      'prof-maya',
      upcomingDates[4],
      '10:00',
      'confirmed',
      'Designing a small user study',
      'ready',
      {
        meetingType: 'Research discussion',
        context:
          'Following our last conversation, I drafted a short survey and would like to check whether a small user study is a sensible next step.',
      },
    ),
  ];
  bookings.find((booking) => booking.id === 'meeting-declined')!.reason =
    'I am unable to meet at this time. Please choose another available date.';
  const rescheduleStart = localToUtc(upcomingDates[5], '11:00', zone)!;
  bookings.find((booking) => booking.id === 'meeting-reschedule')!.reschedule = {
    start: rescheduleStart,
    end: new Date(Date.parse(rescheduleStart) + 30 * 60_000).toISOString(),
    proposedBy: 'prof-maya',
  };
  const byId = Object.fromEntries(bookings.map((booking) => [booking.id, booking]));
  /** Builds a notes thread whose messages fall inside the meeting window. */
  const thread = (
    bookingId: string,
    messages: [authorId: string, minute: number, body: string][],
  ) =>
    messages.map(([authorId, minute, body], index) => {
      const id = `note-${bookingId}-${index + 1}`;
      const note: MeetingNote = {
        id,
        bookingId,
        authorId,
        body,
        createdAt: new Date(Date.parse(byId[bookingId].start) + minute * 60_000).toISOString(),
      };
      return [id, note] as const;
    });
  const notes: Record<string, MeetingNote> = Object.fromEntries([
    [
      'note-completed-example',
      {
        id: 'note-completed-example',
        bookingId: 'meeting-completed',
        authorId: 'prof-maya',
        body: 'Next steps: narrow your research question, compare two approaches, and share a short outline before our next conversation.',
        createdAt: new Date(
          Date.parse(byId['meeting-completed'].start) + 15 * 60_000,
        ).toISOString(),
      },
    ],
    ...thread('meeting-completed', [
      [
        'student-viswa',
        22,
        'Thank you! I will compare a survey-based study with a small classification experiment and send the outline by Friday.',
      ],
      [
        'prof-maya',
        27,
        'Sounds good. Keep the outline to one page: question, method, what success looks like.',
      ],
    ]),
    ...thread('meeting-sarah-viswa-past', [
      [
        'prof-sarah',
        4,
        'Welcome! To start, here are the two skills I would build first: comfortable Python with NumPy/pandas, and reading one paper a week critically.',
      ],
      [
        'student-viswa',
        9,
        'That helps. Could you suggest a first paper that is approachable for an undergraduate?',
      ],
      [
        'prof-sarah',
        12,
        'Try a survey paper on explainable machine learning. Read the introduction and conclusion first, then pick one method to reproduce on a small dataset.',
      ],
      [
        'student-viswa',
        20,
        'I will reproduce one method on a public dataset and write a half-page summary of what I learned.',
      ],
      [
        'prof-sarah',
        26,
        'Action items:\n1. Read the survey and pick one method\n2. Reproduce it on a small public dataset\n3. Book a follow-up and bring your half-page summary',
      ],
    ]),
    ...thread('meeting-sarah-amina-past', [
      [
        'prof-sarah',
        6,
        'Your question is strong. I would narrow it to one course and one term so the data is consistent.',
      ],
      ['student-amina', 14, 'Should I still compare logistic regression with a tree-based model?'],
      [
        'prof-sarah',
        18,
        'Yes — and report recall for the dropout class, not only accuracy. The classes will be imbalanced.',
      ],
      [
        'student-amina',
        25,
        'Got it. I will revise the evaluation section and send the updated proposal next week.',
      ],
    ]),
    ...thread('meeting-sarah-daniel-past', [
      [
        'student-daniel',
        5,
        'I have drafts for two programmes. My statement currently starts with my coursework.',
      ],
      [
        'prof-sarah',
        11,
        'Open with the problem that motivates you instead, then show the project where you worked on it. Coursework can follow briefly.',
      ],
      [
        'prof-sarah',
        24,
        'For recommenders, choose people who have seen your work directly. Send each of them your CV and a short summary at least four weeks before the deadline.',
      ],
    ]),
  ]);
  const schedules = profiles
    .filter((profile) => profile.role === 'professor')
    .map((profile) => ({
      ...availability(profile.id, profile.id === 'prof-alex'),
      timeZone: profile.timeZone,
    }));
  return {
    profiles: Object.fromEntries(profiles.map((profile) => [profile.id, profile])),
    bookings: Object.fromEntries(bookings.map((booking) => [booking.id, booking])),
    availability: Object.fromEntries(schedules.map((schedule) => [schedule.professorId, schedule])),
    notifications: [
      {
        id: 'notification-confirmed',
        userId: 'student-viswa',
        bookingId: 'meeting-next',
        title: 'Dr. Sarah Chen confirmed your meeting',
        read: false,
        createdAt: at.toISOString(),
      },
      {
        id: 'notification-request',
        userId: 'prof-sarah',
        bookingId: 'meeting-amina',
        title: 'Amina Hassan sent a meeting request',
        read: false,
        createdAt: at.toISOString(),
      },
      {
        id: 'notification-request-priya',
        userId: 'prof-sarah',
        bookingId: 'meeting-priya-pending',
        title: 'Priya Nair sent a meeting request',
        read: false,
        createdAt: new Date(at.getTime() - 3 * 3_600_000).toISOString(),
      },
      {
        id: 'notification-reschedule',
        userId: 'student-viswa',
        bookingId: 'meeting-reschedule',
        title: 'Dr. Maya Rivera proposed a new meeting time',
        read: false,
        createdAt: new Date(at.getTime() - 2 * 3_600_000).toISOString(),
      },
    ],
    notes,
    noteDrafts: {},
    conversationRecords: {
      'meeting-sarah-viswa-past': {
        bookingId: 'meeting-sarah-viswa-past',
        status: 'ready',
        source: 'sample',
        createdAt: new Date(
          Date.parse(byId['meeting-sarah-viswa-past'].end) + 20 * 60_000,
        ).toISOString(),
        summary:
          'The student and professor discussed how undergraduates get started in machine learning research. They agreed on two foundation skills (Python data tooling and regular paper reading) and a concrete first project: reproduce one explainability method from a survey paper on a small public dataset, then book a follow-up with a half-page summary.',
        transcript: [
          {
            speakerId: 'student-viswa',
            offsetSeconds: 15,
            text: 'Thank you for meeting with me. I have finished an intro ML course and I am not sure how to take the next step into research.',
          },
          {
            speakerId: 'prof-sarah',
            offsetSeconds: 38,
            text: 'That is a great place to start. Most students begin by reproducing an existing result before proposing their own.',
          },
          {
            speakerId: 'student-viswa',
            offsetSeconds: 312,
            text: 'Which skills should I focus on first?',
          },
          {
            speakerId: 'prof-sarah',
            offsetSeconds: 330,
            text: 'Be comfortable with Python and pandas, and practise reading one paper a week critically.',
          },
          {
            speakerId: 'prof-sarah',
            offsetSeconds: 1540,
            text: 'Let us meet again once you have the reproduction working. Bring a short summary of what surprised you.',
          },
        ],
      },
    },
    saved: ['prof-sarah', 'prof-maya', 'prof-alex'],
    session: { role: 'student', userId: 'student-viswa' },
    facultyAccess: {
      'prof-sarah': 'approved',
      'prof-alex': 'pending',
      'prof-maya': 'approved',
    },
  };
}
