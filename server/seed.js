// Loads realistic sample data. Run with: npm run seed
// WARNING: wipes the existing ClubHub collections first.
const { connectDB, disconnectDB } = require('./config/db');
const Club = require('./models/Club');
const Member = require('./models/Member');
const Event = require('./models/Event');
const Registration = require('./models/Registration');
const Announcement = require('./models/Announcement');
const JoinRequest = require('./models/JoinRequest');
const User = require('./models/User');
const { hashPassword } = require('./utils/password');

const DEMO_PASSWORD = 'clubhub123';

function day(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function ago(days) {
  return new Date(Date.now() - days * 86400000);
}

const STUDENTS = [
  ['Ananya Sharma', '1RV24MC001'], ['Rahul Verma', '1RV24MC014'], ['Meera Pillai', '1RV24MC022'],
  ['Karthik Reddy', '1RV24MC030'], ['Sneha Joshi', '1RV24MC041'], ['Arjun Das', '1RV24MC052'],
  ['Priya Menon', '1RV24MC063'], ['Vikram Singh', '1RV24MC074'], ['Divya Nair', '1RV24MC081'],
  ['Rohan Kulkarni', '1RV24MC087'], ['Ishita Bose', '1RV24MC093'], ['Aditya Rao', '1RV24MC099'],
  ['Kavya Hegde', '1RV24MC105'], ['Nikhil Jain', '1RV24MC112'], ['Pooja Shetty', '1RV24MC118'],
  ['Siddharth Iyer', '1RV24MC124'], ['Tanvi Desai', '1RV24MC131'], ['Manoj Gowda', '1RV24MC137'],
];

function emailFor(name) {
  return `${name.split(' ')[0].toLowerCase()}.${name.split(' ')[1].toLowerCase()}@rvce.edu.in`;
}

async function seed() {
  await connectDB();
  const MODELS = [Club, Member, Event, Registration, Announcement, JoinRequest, User];
  await Promise.all(MODELS.map((M) => M.deleteMany({})));
  await Promise.all(MODELS.map((M) => M.syncIndexes()));

  const [debate, ecell, coding, music, sports, nss] = await Club.insertMany([
    { name: 'debate society', category: 'Literary', coordinator: 'Dr. Anitha Rao', email: 'debate@rvce.edu.in', foundedYear: 2009, description: 'Weekly parliamentary debates, MUN preparation and the annual inter-college Vaad-Vivaad.' },
    { name: 'E-Cell', category: 'Entrepreneurship', coordinator: 'Prof. Suresh Iyer', email: 'ecell@rvce.edu.in', foundedYear: 2014, description: 'Founder talks, pitch nights and a semester-long incubation track for student startups.' },
    { name: 'coding club', category: 'Technical', coordinator: 'Dr. Mohammed Khan', email: 'codeclub@rvce.edu.in', foundedYear: 2012, description: 'Competitive programming practice, open-source sprints and the 24-hour campus hackathon.' },
    { name: 'music club', category: 'Cultural', coordinator: 'Prof. Rekha Nair', email: 'music@rvce.edu.in', foundedYear: 2006, isActive: false, description: 'Band practice and open-mic evenings. On a break this semester while the practice room is renovated.' },
    { name: 'sports committee', category: 'Sports', coordinator: 'Mr. Praveen Kumar', email: 'sports@rvce.edu.in', foundedYear: 2001, description: 'Inter-department leagues for cricket, football and basketball, plus fitness sessions.' },
    { name: 'NSS unit', category: 'Social Service', coordinator: 'Dr. Lakshmi Prasad', email: 'nss@rvce.edu.in', foundedYear: 2004, description: 'Village outreach camps, blood donation drives and weekend teaching at government schools.' },
  ]);

  const roster = [
    [debate, [[0, 'President'], [1, 'Secretary'], [2], [9], [12]]],
    [ecell, [[3, 'President'], [4, 'Treasurer'], [10], [13]]],
    [coding, [[5, 'President'], [6, 'Vice President'], [11, 'Secretary'], [13], [15], [16]]],
    [music, [[7, 'President'], [8]]],
    [sports, [[17, 'President'], [14, 'Secretary'], [5]]],
    [nss, [[8, 'President'], [2, 'Treasurer'], [16]]],
  ];
  const members = [];
  roster.forEach(([club, list]) => {
    list.forEach(([i, role = 'Member'], n) => {
      const [name, usn] = STUDENTS[i];
      members.push({ name, usn, email: emailFor(name), role, club: club._id, joinedOn: day(-200 + n * 17) });
    });
  });
  await Member.insertMany(members);

  const events = await Event.insertMany([
    { title: 'Inter-College Vaad-Vivaad', club: debate._id, date: day(9), time: '10:00', venue: 'Main Auditorium', capacity: 120, budget: 18000, description: 'Teams of two from colleges across Bengaluru. Motion released 30 minutes before each round.' },
    { title: 'Pitch Night #7', club: ecell._id, date: day(4), time: '17:30', venue: 'Seminar Hall 2', capacity: 60, budget: 8500, description: 'Five student teams pitch to alumni founders. Audience vote decides the people\'s choice award.' },
    { title: 'CodeSprint 24h', club: coding._id, date: day(20), time: '09:00', venue: 'CSE Lab Block', capacity: 8, budget: 25000, description: 'Overnight hackathon. Teams of up to four. Dinner and breakfast provided.' },
    { title: 'Git & GitHub for Beginners', club: coding._id, date: day(-12), time: '14:00', venue: 'Lab 3', capacity: 40, budget: 1200, status: 'Completed', description: 'Hands-on workshop: commits, branches, pull requests.' },
    { title: 'Startup Founders Panel', club: ecell._id, date: day(-25), time: '15:00', venue: 'Seminar Hall 1', capacity: 80, budget: 6000, status: 'Completed' },
    { title: 'Monsoon Open Mic', club: music._id, date: day(-60), time: '18:00', venue: 'Amphitheatre', capacity: 100, status: 'Cancelled', description: 'Called off due to rain.' },
    { title: 'Inter-Department Cricket League', club: sports._id, date: day(13), time: '07:30', venue: 'College Ground', capacity: 200, budget: 15000 },
    { title: 'Blood Donation Drive', club: nss._id, date: day(6), time: '09:30', venue: 'Health Centre', capacity: 150, budget: 3000, description: 'In partnership with the Rotary blood bank. Bring a photo ID.' },
    { title: 'Weekend Teaching: Govt. School, Kengeri', club: nss._id, date: day(-5), time: '09:00', venue: 'Kengeri', capacity: 20, budget: 1500, status: 'Completed' },
  ]);
  const [vaad, pitch, sprint, git, panel, , cricket, blood, teaching] = events;

  const regs = [];
  // registrations trickle in over the days before an event (never in the future)
  const register = (event, idxs, attended = []) => idxs.forEach((i, n) => {
    const [name, usn] = STUDENTS[i];
    const eventDay = new Date(`${event.date}T09:00:00`);
    const when = new Date(Math.min(Date.now() - (n + 1) * 3600000, eventDay - (idxs.length - n) * 86400000));
    regs.push({ event: event._id, name, usn, email: emailFor(name), attended: attended.includes(i), createdAt: when });
  });
  register(vaad, [0, 1, 2, 9, 12, 14]);
  register(pitch, [3, 4, 10, 13, 6, 11, 15]);
  register(sprint, [5, 6, 11, 13, 15, 16, 7]);
  register(git, [5, 6, 11, 13, 15, 16, 0, 9, 17, 4], [5, 6, 11, 13, 15, 0, 17]);
  register(panel, [3, 4, 10, 13, 1, 12, 14, 7], [3, 4, 10, 13, 12]);
  register(cricket, [17, 14, 5, 9, 12]);
  register(blood, [8, 2, 16, 0, 1, 3]);
  register(teaching, [8, 2, 16, 14], [8, 2, 16]);
  await Registration.insertMany(regs);

  await Announcement.insertMany([
    { club: debate._id, title: 'Vaad-Vivaad registrations close Friday', body: 'Teams of two only. One team per department gets a reserved slot; the rest are first come, first served.', pinned: true, createdAt: ago(1) },
    { club: coding._id, title: 'CodeSprint team formation', body: 'Looking for teammates? Drop your name in the #codesprint channel. Solo entries will be grouped on the day.', createdAt: ago(2) },
    { club: ecell._id, title: 'Pitch Night: final five announced', body: 'Congratulations to the five teams selected for Pitch Night #7. Slides due by Wednesday 6 pm.', pinned: true, createdAt: ago(3) },
    { club: nss._id, title: 'Volunteers needed for the blood drive', body: 'We need 12 volunteers for registration and refreshments. Two-hour shifts, certificates provided.', createdAt: ago(4) },
    { club: sports._id, title: 'Cricket league fixtures are out', body: 'Fixtures are on the sports notice board outside the gym. Captains, confirm your squad of 15 by Monday.', createdAt: ago(6) },
    { club: music._id, title: 'Practice room closed for renovation', body: 'The music room will be closed until next semester. Instruments have been moved to storage in Block C.', createdAt: ago(20) },
  ]);

  await JoinRequest.insertMany([
    { club: coding._id, name: 'Harsha Vardhan', usn: '1RV24MC142', email: 'harsha.vardhan@rvce.edu.in', message: 'I practise on Codeforces and would love to help with the hackathon.', createdAt: ago(1) },
    { club: debate._id, name: 'Neha Kapoor', usn: '1RV24MC148', email: 'neha.kapoor@rvce.edu.in', message: 'Did MUN in school, want to get back into debating.', createdAt: ago(2) },
    { club: nss._id, name: 'Aman Gupta', usn: '1RV24MC153', message: 'Available on weekends for the teaching programme.', createdAt: ago(3) },
    { club: ecell._id, name: 'Shreya Patil', usn: '1RV24MC159', email: 'shreya.patil@rvce.edu.in', message: 'Working on a campus food-delivery idea.', status: 'Approved', decidedAt: ago(5), createdAt: ago(8) },
    { club: sports._id, name: 'Varun Reddy', usn: '1RV24MC164', message: 'Football.', status: 'Rejected', decidedAt: ago(9), createdAt: ago(10) },
  ]);
  await Member.create({ name: 'Shreya Patil', usn: '1RV24MC159', email: 'shreya.patil@rvce.edu.in', club: ecell._id, joinedOn: day(-5) });

  // demo accounts, all with the same password
  const accounts = [
    { name: 'Student Activities Office', email: 'admin@rvce.edu.in', role: 'admin' },
    { name: 'Arjun Das', email: 'arjun.das@rvce.edu.in', usn: '1RV24MC052', role: 'lead', leadClub: coding._id },
    { name: 'Ananya Sharma', email: 'ananya.sharma@rvce.edu.in', usn: '1RV24MC001', role: 'lead', leadClub: debate._id },
    { name: 'Priya Menon', email: 'priya.menon@rvce.edu.in', usn: '1RV24MC063', role: 'student' },
    { name: 'Harsha Vardhan', email: 'harsha.vardhan@rvce.edu.in', usn: '1RV24MC142', role: 'student' },
  ];
  for (const account of accounts) {
    await User.create({ ...account, passwordHash: await hashPassword(DEMO_PASSWORD) });
  }

  const counts = await Promise.all(MODELS.map((M) => M.countDocuments()));
  console.log(`Seeded ${counts[0]} clubs, ${counts[1]} members, ${counts[2]} events, ${counts[3]} registrations, ${counts[4]} notices, ${counts[5]} join requests, ${counts[6]} user accounts.`);
  console.log(`Demo logins (password "${DEMO_PASSWORD}"):`);
  accounts.forEach((a) => console.log(`  ${a.role.padEnd(8)} ${a.email}`));
  await disconnectDB();
}

seed().catch(async (err) => {
  console.error('Seeding failed:', err.message);
  await disconnectDB();
  process.exit(1);
});
