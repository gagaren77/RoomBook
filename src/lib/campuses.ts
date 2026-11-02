/**
 * The college's campuses (https://mccollege.edu/locations/).
 * `code` is the CampusID value used in the schedule spreadsheet.
 */
export const CAMPUSES = [
  {
    code: 'LaSalle',
    name: 'Chicago Main Campus',
    address: '203 N LaSalle St #1400',
    city: 'Chicago',
    state: 'IL',
    zipCode: '60601',
    phone: '312-236-9000',
    timeZone: 'America/Chicago',
  },
  {
    code: 'Chicago',
    name: 'Chicago Downtown Campus',
    address: '100 S Wacker Dr LL1-50',
    city: 'Chicago',
    state: 'IL',
    zipCode: '60606',
    phone: '312-236-9000',
    timeZone: 'America/Chicago',
  },
  {
    code: 'Naperville',
    name: 'Naperville Campus',
    address: '200 E 5th Ave #128',
    city: 'Naperville',
    state: 'IL',
    zipCode: '60563',
    phone: '312-236-9000',
    timeZone: 'America/Chicago',
  },
  {
    code: 'EvergreenPark',
    name: 'Evergreen Park Campus',
    address: '9730 S Western Ave',
    city: 'Evergreen Park',
    state: 'IL',
    zipCode: '60805',
    phone: '312-236-9000',
    timeZone: 'America/Chicago',
  },
  {
    code: 'Cleveland',
    name: 'Cleveland Campus',
    address: '7261 Engle Rd',
    city: 'Middleburg Heights',
    state: 'OH',
    zipCode: '44130',
    phone: '216-270-5080',
    timeZone: 'America/New_York',
  },
  {
    code: 'Columbus',
    name: 'Columbus Campus',
    address: '2780 Airport Dr',
    city: 'Columbus',
    state: 'OH',
    zipCode: '43219',
    phone: '614-300-5710',
    timeZone: 'America/New_York',
  },
] as const;

type CampusClient = {
  campus: {
    findFirst: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
  };
};

/** Create any of the campuses above that are missing (matched by code). Existing rows are left as edited. */
export async function ensureCampuses(prisma: CampusClient) {
  for (const c of CAMPUSES) {
    const existing = await prisma.campus.findFirst({ where: { code: c.code } });
    if (!existing) await prisma.campus.create({ data: { ...c } });
  }
}
