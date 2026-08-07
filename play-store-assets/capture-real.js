// Captures REAL app screenshots from the running dev server (localhost:3001)
// Supabase is disabled — store runs from injected localStorage demo data
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = 'http://localhost:3001';
const OUT = __dirname;

// ── Demo state injected into every page ──────────────────────────────────────
function buildDemoState() {
  const now = new Date();
  const ago = (h) => new Date(now.getTime() - h * 3600000).toISOString();

  return {
    companyId: 'demo-co', authUserId: 'w1',
    isLoading: false, isOnline: true, pendingSync: 0,
    isRealtimeConnected: false, isSaving: false, savedRecently: false,
    companyName: 'BuildRight Co.', isPro: true, language: 'en', currency: 'CAD',
    industry: 'General Contracting', onboarded: true, theme: 'dark',
    companyAddress: '120 Adelaide St W, Toronto, ON', businessNumber: 'BN-884321',
    inviteCode: 'BUILDRIGHT', companyLogo: '', permissionsPin: '',
    customRoles: [],
    workers: [
      { id:'w1', name:'Sarah Ahmed',    initials:'SA', role:'Admin',           customRole:'Owner / Admin',    email:'sarah@buildright.ca',  phone:'416-555-0101', color:'#8b5cf6', projectIds:['p1','p2'], clockedIn:true,  clockInTime: ago(4.3), hourlyRate:55, certifications:[] },
      { id:'w2', name:'James Rodriguez',initials:'JR', role:'Foreman',         customRole:'Site Foreman',     email:'james@buildright.ca',  phone:'416-555-0202', color:'#f59e0b', projectIds:['p1'],       clockedIn:true,  clockInTime: ago(5.1), hourlyRate:42, certifications:[] },
      { id:'w3', name:'Marcus Chen',    initials:'MC', role:'Worker',          customRole:'Carpenter',        email:'marcus@buildright.ca', phone:'416-555-0303', color:'#3b82f6', projectIds:['p1'],       clockedIn:true,  clockInTime: ago(4.8), hourlyRate:36, certifications:[] },
      { id:'w4', name:'Sofia Kowalski', initials:'SK', role:'Worker',          customRole:'Electrician',      email:'sofia@buildright.ca',  phone:'416-555-0404', color:'#22c55e', projectIds:['p2'],       clockedIn:true,  clockInTime: ago(3.2), hourlyRate:38, certifications:[] },
      { id:'w5', name:'Derek Liu',      initials:'DL', role:'Project Manager', customRole:'Project Manager',  email:'derek@buildright.ca',  phone:'416-555-0505', color:'#f97316', projectIds:['p2'],       clockedIn:false, hourlyRate:48, certifications:[] },
      { id:'w6', name:'Tanya Novak',    initials:'TN', role:'Worker',          customRole:'Labourer',         email:'tanya@buildright.ca',  phone:'416-555-0606', color:'#ef4444', projectIds:['p1'],       clockedIn:false, hourlyRate:32, certifications:[] },
      { id:'w7', name:'Peter Kim',      initials:'PK', role:'Worker',          customRole:'Plumber',          email:'peter@buildright.ca',  phone:'416-555-0707', color:'#06b6d4', projectIds:['p2'],       clockedIn:true,  clockInTime: ago(2.9), hourlyRate:40, certifications:[] },
      { id:'w8', name:'Aisha Patel',    initials:'AP', role:'Worker',          customRole:'Safety Officer',   email:'aisha@buildright.ca',  phone:'416-555-0808', color:'#ec4899', projectIds:['p1','p2'],  clockedIn:false, hourlyRate:35, certifications:[] },
    ],
    projects: [
      { id:'p1', name:'Downtown Office Tower',    client:'Vertex Development Corp',  status:'active',    startDate:'2026-01-15T00:00:00.000Z', endDate:'2026-08-31T00:00:00.000Z', progress:68, budget:1200000, spent:816000,  address:'456 King St W, Toronto, ON',           color:'#f59e0b', managerId:'w5', workerIds:['w2','w3','w6'],
        tasks:[
          {id:'t1',projectId:'p1',name:'Foundation & Excavation',   progress:100,workerId:'w2',startDate:'2026-01-15T00:00:00.000Z',endDate:'2026-02-28T00:00:00.000Z',status:'completed'},
          {id:'t2',projectId:'p1',name:'Structural Steel Frame',    progress:100,workerId:'w2',startDate:'2026-03-01T00:00:00.000Z',endDate:'2026-04-30T00:00:00.000Z',status:'completed'},
          {id:'t3',projectId:'p1',name:'Exterior Cladding',         progress:60, workerId:'w3',startDate:'2026-05-01T00:00:00.000Z',endDate:'2026-07-15T00:00:00.000Z',status:'in-progress'},
          {id:'t4',projectId:'p1',name:'Interior Fitout',           progress:0,  workerId:'w3',startDate:'2026-07-01T00:00:00.000Z',endDate:'2026-08-20T00:00:00.000Z',status:'not-started'},
          {id:'t5',projectId:'p1',name:'Final Inspections',         progress:0,  workerId:'w2',startDate:'2026-08-21T00:00:00.000Z',endDate:'2026-08-31T00:00:00.000Z',status:'not-started'},
        ]},
      { id:'p2', name:'Harbourfront Condos Ph.2', client:'Lakeside Properties Inc.', status:'active',    startDate:'2026-03-01T00:00:00.000Z', endDate:'2027-03-15T00:00:00.000Z', progress:34, budget:890000,  spent:302600, address:'90 Harbour St, Toronto, ON',            color:'#3b82f6', managerId:'w5', workerIds:['w4','w7'],
        tasks:[
          {id:'t6',projectId:'p2',name:'Site Prep & Utilities',     progress:100,workerId:'w4',startDate:'2026-03-01T00:00:00.000Z',endDate:'2026-04-15T00:00:00.000Z',status:'completed'},
          {id:'t7',projectId:'p2',name:'Foundation Work',           progress:75, workerId:'w7',startDate:'2026-04-16T00:00:00.000Z',endDate:'2026-06-30T00:00:00.000Z',status:'in-progress'},
          {id:'t8',projectId:'p2',name:'Framing & Rough-in',        progress:10, workerId:'w4',startDate:'2026-06-01T00:00:00.000Z',endDate:'2026-09-30T00:00:00.000Z',status:'in-progress'},
        ]},
      { id:'p3', name:'Scarborough Medical Centre',client:'Ontario Health Authority', status:'upcoming',  startDate:'2026-09-01T00:00:00.000Z', endDate:'2027-12-31T00:00:00.000Z', progress:0,  budget:2100000, spent:0,      address:'3 Conlins Rd, Scarborough, ON',         color:'#8b5cf6', managerId:'w5', workerIds:[], tasks:[] },
      { id:'p4', name:'Etobicoke Warehouse Reno',  client:'Metro Logistics Ltd.',     status:'completed', startDate:'2025-08-01T00:00:00.000Z', endDate:'2026-02-28T00:00:00.000Z', progress:100,budget:430000,  spent:418000, address:'200 Humber College Blvd, Etobicoke, ON', color:'#22c55e', managerId:'w5', workerIds:[], tasks:[] },
    ],
    clockEntries: [
      {id:'ce1',workerId:'w2',projectId:'p1',clockIn:ago(5.1),clockOut:null},
      {id:'ce2',workerId:'w3',projectId:'p1',clockIn:ago(4.8),clockOut:null},
      {id:'ce3',workerId:'w4',projectId:'p2',clockIn:ago(3.2),clockOut:null},
      {id:'ce4',workerId:'w7',projectId:'p2',clockIn:ago(2.9),clockOut:null},
      {id:'ce5',workerId:'w1',projectId:'p1',clockIn:ago(4.3),clockOut:null},
      {id:'ce6',workerId:'w2',projectId:'p1',clockIn:ago(28), clockOut:ago(20)},
      {id:'ce7',workerId:'w3',projectId:'p1',clockIn:ago(28), clockOut:ago(20)},
      {id:'ce8',workerId:'w5',projectId:'p2',clockIn:ago(52), clockOut:ago(44)},
      {id:'ce9',workerId:'w6',projectId:'p1',clockIn:ago(52), clockOut:ago(44)},
      {id:'ce10',workerId:'w4',projectId:'p2',clockIn:ago(52),clockOut:ago(44)},
      {id:'ce11',workerId:'w7',projectId:'p2',clockIn:ago(76),clockOut:ago(68)},
      {id:'ce12',workerId:'w8',projectId:'p1',clockIn:ago(76),clockOut:ago(68)},
    ],
    invoices: [
      {id:'inv1',number:'INV-2024-047',clientName:'Vertex Development Corp',    clientEmail:'accounts@vertex.ca',   clientAddress:'789 Bay St, Toronto ON M5G 1N8',  issueDate:'2026-07-01T00:00:00.000Z',dueDate:'2026-07-31T00:00:00.000Z',status:'sent',    taxRate:13, items:[{description:'Site Supervision — June 2026',qty:1,rate:4500},{description:'Structural Steel Labour',qty:120,rate:42},{description:'Equipment Rental',qty:1,rate:850}],   notes:'Net 30. Thank you for your business.'},
      {id:'inv2',number:'INV-2024-046',clientName:'Lakeside Properties Inc.',   clientEmail:'ap@lakeside.ca',       clientAddress:'200 Front St W, Toronto ON',       issueDate:'2026-06-15T00:00:00.000Z',dueDate:'2026-07-15T00:00:00.000Z',status:'paid',    taxRate:13, items:[{description:'Foundation Work — Phase 1',qty:1,rate:12000},{description:'Site Prep Labour',qty:80,rate:36}],                                                                   notes:''},
      {id:'inv3',number:'INV-2024-045',clientName:'Metro Logistics Ltd.',       clientEmail:'billing@metro.ca',     clientAddress:'200 Humber College Blvd, Etobicoke',issueDate:'2026-05-01T00:00:00.000Z',dueDate:'2026-06-01T00:00:00.000Z',status:'overdue', taxRate:13, items:[{description:'Warehouse Renovation — Final Draw',qty:1,rate:28000}],                                                                                                                        notes:''},
      {id:'inv4',number:'INV-2024-044',clientName:'Ontario Health Authority',   clientEmail:'finance@oha.ca',       clientAddress:'777 Bay St, Toronto ON',           issueDate:'2026-04-01T00:00:00.000Z',dueDate:'2026-05-01T00:00:00.000Z',status:'paid',    taxRate:13, items:[{description:'Preliminary Site Assessment',qty:1,rate:8500}],                                                                                                                             notes:''},
      {id:'inv5',number:'INV-2024-043',clientName:'Vertex Development Corp',    clientEmail:'accounts@vertex.ca',   clientAddress:'789 Bay St, Toronto ON M5G 1N8',  issueDate:'2026-03-01T00:00:00.000Z',dueDate:'2026-04-01T00:00:00.000Z',status:'paid',    taxRate:13, items:[{description:'Project Mobilization',qty:1,rate:6200}],                                                                                                                                 notes:''},
    ],
    punchItems: [
      {id:'pi1',projectId:'p1',title:'Cracked concrete',       description:'Hairline crack in foundation NE corner, needs epoxy injection',status:'open',      priority:'high',   createdAt:'2026-08-01T00:00:00.000Z'},
      {id:'pi2',projectId:'p1',title:'Missing safety railing', description:'Guard rail missing on east side stairwell level 4',           status:'open',      priority:'high',   createdAt:'2026-08-03T00:00:00.000Z'},
      {id:'pi3',projectId:'p2',title:'Waterproofing gap',      description:'2" gap in waterproofing membrane near south wall',           status:'in-progress',priority:'medium', createdAt:'2026-07-28T00:00:00.000Z'},
    ],
    changeOrders: [
      {id:'co1',projectId:'p1',number:'CO-007',title:'Additional Steel Reinforcement',description:'Owner requested extra rebar in floor slabs',reason:'Design change',amount:14500,status:'pending',submittedAt:'2026-08-04T00:00:00.000Z',submittedById:'w5',createdAt:'2026-08-04T00:00:00.000Z'},
    ],
    messages: [
      {id:'m1',projectId:'p1',senderId:'w2',senderName:'James Rodriguez',senderInitials:'JR',senderColor:'#f59e0b',text:'Morning crew — steel delivery confirmed for 7am tomorrow',  timestamp:ago(2.0)},
      {id:'m2',projectId:'p1',senderId:'w1',senderName:'Sarah Ahmed',    senderInitials:'SA',senderColor:'#8b5cf6',text:'Great, make sure the crane operator is on site by 6:45',     timestamp:ago(1.8)},
      {id:'m3',projectId:'p1',senderId:'w3',senderName:'Marcus Chen',    senderInitials:'MC',senderColor:'#3b82f6',text:'I\'ll be there at 6:30 to prep the lay-down area 👍',        timestamp:ago(1.5)},
      {id:'m4',projectId:'p1',senderId:'w2',senderName:'James Rodriguez',senderInitials:'JR',senderColor:'#f59e0b',text:'Level 4 cladding looks good — inspector approved this morning',timestamp:ago(0.5)},
      {id:'m5',projectId:'p2',senderId:'w4',senderName:'Sofia Kowalski', senderInitials:'SK',senderColor:'#22c55e',text:'Electrical rough-in on unit 12 done. Ready for inspection',   timestamp:ago(1.0)},
      {id:'m6',projectId:'p2',senderId:'w7',senderName:'Peter Kim',      senderInitials:'PK',senderColor:'#06b6d4',text:'Foundation pour is set, removed forms this AM',               timestamp:ago(4.0)},
    ],
    activityFeed: [
      {id:'a1',type:'clock-in',    description:'James Rodriguez clocked in at Downtown Office Tower',workerId:'w2',timestamp:ago(5.1)},
      {id:'a2',type:'clock-in',    description:'Marcus Chen clocked in at Downtown Office Tower',    workerId:'w3',timestamp:ago(4.8)},
      {id:'a3',type:'punch-added', description:'New punch item: Missing safety railing (Level 4)',   workerId:'w2',timestamp:ago(2.0)},
      {id:'a4',type:'task-updated',description:'Foundation & Excavation marked complete',            workerId:'w2',timestamp:ago(1.0)},
      {id:'a5',type:'invoice-sent',description:'Invoice INV-2024-047 sent to Vertex Development',   workerId:'w1',timestamp:ago(0.8)},
    ],
    safetyIncidents:[], equipment:[], rfis:[], estimates:[], photos:[],
    hoursAdjustments:[], materialTypes:[], materialEntries:[], documents:[],
    dailyReports:[], blueprintPins:[], budgetLines:[],
  };
}

async function injectAndCapture(page, url) {
  await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
  await page.evaluate((state) => {
    localStorage.setItem('constra_v1', JSON.stringify(state));
  }, buildDemoState());
  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1200);
}

async function main() {
  const browser = await chromium.launch();

  const PHONE = { width: 390, height: 844, deviceScaleFactor: 3 };
  const T7    = { width: 960, height: 600,  deviceScaleFactor: 2 };
  const T10   = { width: 1280, height: 800, deviceScaleFactor: 2 };
  const FG    = { width: 1024, height: 500, deviceScaleFactor: 2 };

  const shots = [
    // Phone screenshots
    { file: 'phone1-dashboard.png',  viewport: PHONE, url: `${BASE}/dashboard` },
    { file: 'phone2-clockin.png',    viewport: PHONE, url: `${BASE}/time-tracking` },
    { file: 'phone3-messages.png',   viewport: PHONE, url: `${BASE}/messages` },
    { file: 'phone4-invoices.png',   viewport: PHONE, url: `${BASE}/invoices` },
    { file: 'phone5-projects.png',   viewport: PHONE, url: `${BASE}/projects` },
    { file: 'phone6-clockedin.png',  viewport: PHONE, url: `${BASE}/dashboard`,     workerView: true },
    { file: 'phone7-reports.png',    viewport: PHONE, url: `${BASE}/reports` },
    { file: 'phone8-crew.png',       viewport: PHONE, url: `${BASE}/crew` },
    // 7" tablet
    { file: 'tablet7-landscape.png',  viewport: T7,   url: `${BASE}/dashboard` },
    { file: 'tablet7-projects.png',   viewport: T7,   url: `${BASE}/projects` },
    // 10" tablet
    { file: 'tablet10-landscape.png', viewport: T10,  url: `${BASE}/invoices` },
    { file: 'tablet10-reports.png',   viewport: T10,  url: `${BASE}/reports` },
    // Feature graphic
    { file: 'constra-feature-graphic.png', viewport: FG, url: `${BASE}/dashboard` },
  ];

  for (const shot of shots) {
    const ctx = await browser.newContext({
      viewport: { width: shot.viewport.width, height: shot.viewport.height },
      deviceScaleFactor: shot.viewport.deviceScaleFactor,
    });
    const page = await ctx.newPage();

    // For phone6, switch auth to a Worker so we see the worker clocked-in view
    const state = buildDemoState();
    if (shot.workerView) {
      state.authUserId = 'w3'; // Marcus Chen (Worker, clocked in)
    }

    await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
    await page.evaluate((s) => {
      localStorage.setItem('constra_v1', JSON.stringify(s));
    }, state);

    try {
      await page.goto(shot.url, { waitUntil: 'networkidle', timeout: 15000 });
    } catch {
      await page.goto(shot.url, { waitUntil: 'domcontentloaded', timeout: 10000 });
    }
    await page.waitForTimeout(1500);

    const outPath = path.join(OUT, shot.file);
    await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: shot.viewport.width, height: shot.viewport.height } });
    const w = shot.viewport.width * shot.viewport.deviceScaleFactor;
    const h = shot.viewport.height * shot.viewport.deviceScaleFactor;
    console.log(`  ✓ ${shot.file}  (${w}×${h})`);
    await ctx.close();
  }

  await browser.close();
  console.log('\n✅ Done — real app screenshots saved to play-store-assets/');
}

main().catch(e => { console.error(e); process.exit(1); });
