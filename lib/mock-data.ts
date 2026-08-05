export type GpsLocation = {
  lat: number;
  lng: number;
  accuracy: number; // metres
};

// Background verification flag attached to a clock entry
export type VerificationFlag = {
  type: "impossible-travel" | "off-site" | "multiple-devices" | "suspicious-gps" | "duplicate-image";
  severity: "low" | "medium" | "high";
  note: string;
  detectedAt: Date;
};

export type WorkerCertification = {
  id: string;
  name: string;
  issuedDate?: Date;
  expiryDate?: Date;
};

export type Worker = {
  id: string;
  name: string;
  initials: string;
  role: "Admin" | "Project Manager" | "Foreman" | "Worker";
  customRole: string;
  email: string;
  phone: string;
  color: string;
  photo?: string;
  projectIds: string[];
  clockedIn: boolean;
  clockInTime?: Date;
  clockInGps?: GpsLocation;
  hourlyRate: number;
  certifications?: WorkerCertification[];
  deviceHistory?: Array<{ ua: string; firstSeen: Date; lastSeen: Date }>;
  /** Explicit page hrefs this worker can access. undefined = use role defaults. */
  grantedPages?: string[];
};

export type Task = {
  id: string;
  projectId: string;
  name: string;
  progress: number;
  workerId: string;
  startDate: Date;
  endDate: Date;
  status: "not-started" | "in-progress" | "completed" | "delayed";
  dependsOn?: string; // predecessor task id (finish-to-start)
};

export type BlueprintPin = {
  id: string;
  documentId: string;
  page: number;
  x: number; // 0—1 fraction of page width
  y: number; // 0—1 fraction of page height
  type: "issue" | "info" | "safety" | "rfi";
  note: string;
  resolved: boolean;
  createdAt: Date;
  createdBy?: string;
};

export type BudgetLineCategory = "labour" | "materials" | "subcontractor" | "equipment" | "general" | "other";

export type BudgetLine = {
  id: string;
  projectId: string;
  code: string;
  description: string;
  category: BudgetLineCategory;
  budgeted: number;
  actual: number;
  createdAt: Date;
};

export type Project = {
  id: string;
  name: string;
  client: string;
  status: "active" | "upcoming" | "completed";
  startDate: Date;
  endDate: Date;
  progress: number;
  budget: number;
  spent: number;
  committed?: number;  // total contracted/committed costs
  forecast?: number;   // projected final cost at completion
  address: string;
  gps?: GpsLocation;
  color: string;
  managerId: string;
  workerIds: string[];
  tasks: Task[];
  pendingApproval?: boolean;
  createdBy?: string;
};

export type ClockEntry = {
  id: string;
  workerId: string;
  projectId: string;
  clockIn: Date;
  clockOut?: Date;
  clockInPhoto?: string;       // dataUrl from live camera capture
  gps?: GpsLocation;           // GPS at clock-in moment
  deviceInfo?: string;         // navigator.userAgent slice
  verificationFlags?: VerificationFlag[];
};

export type PunchItem = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: "open" | "in-progress" | "resolved";
  priority: "low" | "medium" | "high";
  assignedToId?: string;
  createdAt: Date;
  dueDate?: Date;
  location?: string;
};

export type SafetyIncident = {
  id: string;
  projectId: string;
  type: "near-miss" | "injury" | "property-damage" | "environmental";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  reportedById: string;
  date: Date;
  injuredId?: string;
  reportedToOSHA: boolean;
  actionTaken: string;
};

export type Equipment = {
  id: string;
  name: string;
  type: string;
  status: "available" | "in-use" | "maintenance" | "off-site";
  projectId?: string;
  lastService: Date;
  nextService: Date;
  certExpiry?: Date;
  dailyRate: number;
};

export type RFI = {
  id: string;
  projectId: string;
  number: string;
  subject: string;
  question: string;
  submittedById: string;
  assignedToId: string;
  status: "open" | "answered" | "closed";
  priority: "routine" | "urgent" | "critical";
  createdAt: Date;
  dueDate: Date;
  answer?: string;
};

export type Invoice = {
  id: string;
  number: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  issueDate: Date;
  dueDate: Date;
  status: "draft" | "sent" | "paid" | "overdue";
  items: { description: string; qty: number; rate: number }[];
  taxRate: number;
  notes?: string;
};

export type Estimate = {
  id: string;
  number: string;
  projectName: string;
  clientName: string;
  clientEmail: string;
  issueDate: Date;
  validUntil: Date;
  status: "draft" | "sent" | "accepted" | "declined";
  items: { description: string; qty: number; rate: number; category: string }[];
  taxRate: number;
  notes?: string;
};

export type PhotoEntry = {
  id: string;
  projectId: string;
  caption: string;
  uploadedById: string;
  uploadedAt: Date;
  tags: string[];
  gradient: string;
  url?: string;
  gps?: GpsLocation;           // GPS where photo was taken
};

export type DailyReport = {
  id: string;
  projectId: string;
  date: Date;
  weather: string;
  temperatureF: number;
  crewCount: number;
  crewOnSite: string[];
  workCompleted: string;
  delays: string;
  materialsUsed: string;
  visitorLog: string;
  notes: string;
  submittedById: string;
  createdAt: Date;
};

export type ChangeOrder = {
  id: string;
  projectId: string;
  number: string;
  title: string;
  description: string;
  reason: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "void";
  submittedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  submittedById: string;
  createdAt: Date;
};


export type ActivityEvent = {
  id: string;
  type: "clock-in" | "clock-out" | "punch-added" | "rfi-submitted" | "invoice-sent" | "task-updated" | "photo-uploaded";
  description: string;
  workerId: string;
  timestamp: Date;
};

export type MaterialType = {
  id: string;
  name: string;
  unit: string;
  trade: string;
  useCount: number;
  isCustom?: boolean;
};

export type MaterialEntry = {
  id: string;
  projectId: string;
  materialTypeId: string;
  materialName: string;
  unit: string;
  trade: string;
  quantity: number;
  type: "delivery" | "usage";
  date: Date;
  note?: string;
};

export type DocumentVersion = {
  versionedAt: Date;
  uploadedById: string;
  sizeBytes: number;
  dataUrl?: string;
  note?: string;
};

export type ProjectDocument = {
  id: string;
  projectId: string;
  name: string;
  category: "blueprint" | "permit" | "contract" | "inspection" | "safety" | "other";
  uploadedAt: Date;
  uploadedById: string;
  sizeBytes: number;
  dataUrl?: string;
  publicUrl?: string; // Supabase Storage public URL (used for blueprints)
  versions?: DocumentVersion[];
};

export type Message = {
  id: string;
  projectId: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  senderColor: string;
  text: string;
  timestamp: Date;
  attachmentName?: string;
  attachmentData?: string;
};


export const TRADE_MATERIALS: Record<string, Array<{ name: string; unit: string }>> = {
  "Framing": [
    { name: "2Ã—4 Lumber", unit: "pieces" },
    { name: "2Ã—6 Lumber", unit: "pieces" },
    { name: "2Ã—8 Lumber", unit: "pieces" },
    { name: "2Ã—10 Lumber", unit: "pieces" },
    { name: "2Ã—12 Lumber", unit: "pieces" },
    { name: "OSB Sheathing 4Ã—8", unit: "sheets" },
    { name: "Plywood 3/4\" 4Ã—8", unit: "sheets" },
    { name: "LVL Beam", unit: "linear ft" },
    { name: "Rim Board", unit: "linear ft" },
    { name: "Joist Hanger", unit: "pieces" },
    { name: "Hurricane Strap", unit: "pieces" },
    { name: "Framing Nails 3\"", unit: "lbs" },
    { name: "Structural Screws 3\"", unit: "lbs" },
    { name: "Post Anchor", unit: "pieces" },
    { name: "Beam Hanger", unit: "pieces" },
  ],
  "Drywall": [
    { name: "Drywall 1/2\" 4Ã—8", unit: "sheets" },
    { name: "Drywall 5/8\" 4Ã—8", unit: "sheets" },
    { name: "Drywall 1/4\" 4Ã—8", unit: "sheets" },
    { name: "Cement Board 4Ã—8", unit: "sheets" },
    { name: "Joint Compound", unit: "buckets" },
    { name: "Drywall Tape", unit: "rolls" },
    { name: "Paper Tape", unit: "rolls" },
    { name: "Corner Bead Metal", unit: "pieces" },
    { name: "Corner Bead Vinyl", unit: "pieces" },
    { name: "Drywall Screws 1-5/8\"", unit: "lbs" },
    { name: "Drywall Screws 3\"", unit: "lbs" },
    { name: "Drywall Nails", unit: "lbs" },
    { name: "Sanding Screen 120-grit", unit: "sheets" },
    { name: "Primer — Drywall", unit: "gallons" },
  ],
  "Concrete": [
    { name: "Concrete Mix 80lb", unit: "bags" },
    { name: "Concrete Mix 60lb", unit: "bags" },
    { name: "Ready-Mix Concrete", unit: "yards" },
    { name: "Rebar #3", unit: "pieces" },
    { name: "Rebar #4", unit: "pieces" },
    { name: "Rebar #5", unit: "pieces" },
    { name: "Wire Mesh 6Ã—6", unit: "rolls" },
    { name: "Vapor Barrier 6mil", unit: "rolls" },
    { name: "Form Boards 2Ã—10", unit: "pieces" },
    { name: "Form Stakes", unit: "pieces" },
    { name: "Tie Wire", unit: "rolls" },
    { name: "Expansion Joint", unit: "linear ft" },
    { name: "Concrete Sealer", unit: "gallons" },
    { name: "Concrete Accelerator", unit: "gallons" },
    { name: "Fiber Mesh", unit: "bags" },
  ],
  "Roofing": [
    { name: "Asphalt Shingles 3-Tab", unit: "bundles" },
    { name: "Architectural Shingles", unit: "bundles" },
    { name: "Ridge Cap Shingles", unit: "bundles" },
    { name: "Ice & Water Shield", unit: "rolls" },
    { name: "Roofing Felt 15lb", unit: "rolls" },
    { name: "Roofing Felt 30lb", unit: "rolls" },
    { name: "Synthetic Underlayment", unit: "rolls" },
    { name: "Drip Edge 10ft", unit: "pieces" },
    { name: "Step Flashing", unit: "pieces" },
    { name: "Pipe Boot Flashing", unit: "pieces" },
    { name: "Roofing Nails 1-3/4\"", unit: "lbs" },
    { name: "Roof Deck Plywood 1/2\"", unit: "sheets" },
    { name: "Roofing Staples", unit: "boxes" },
    { name: "Roof Cement", unit: "gallons" },
    { name: "Attic Vent", unit: "pieces" },
  ],
  "Electrical": [
    { name: "14/2 Romex NM-B", unit: "rolls" },
    { name: "12/2 Romex NM-B", unit: "rolls" },
    { name: "12/3 Romex NM-B", unit: "rolls" },
    { name: "10/2 Romex NM-B", unit: "rolls" },
    { name: "10/3 Romex NM-B", unit: "rolls" },
    { name: "EMT Conduit 1/2\" 10ft", unit: "sticks" },
    { name: "EMT Conduit 3/4\" 10ft", unit: "sticks" },
    { name: "PVC Conduit 1/2\" 10ft", unit: "sticks" },
    { name: "PVC Conduit 3/4\" 10ft", unit: "sticks" },
    { name: "Wire Connectors (Marrette)", unit: "boxes" },
    { name: "Single Gang Box", unit: "pieces" },
    { name: "Double Gang Box", unit: "pieces" },
    { name: "4\" Square Box", unit: "pieces" },
    { name: "200A Panel Box", unit: "pieces" },
    { name: "Breaker 15A Single Pole", unit: "pieces" },
    { name: "Breaker 20A Single Pole", unit: "pieces" },
    { name: "Breaker 20A Double Pole", unit: "pieces" },
    { name: "Breaker 30A Double Pole", unit: "pieces" },
    { name: "GFCI Outlet 20A", unit: "pieces" },
    { name: "AFCI Outlet", unit: "pieces" },
    { name: "Duplex Outlet 15A", unit: "pieces" },
    { name: "Switch Single Pole", unit: "pieces" },
  ],
  "Plumbing": [
    { name: "PEX-A 1/2\" Pipe", unit: "rolls" },
    { name: "PEX-A 3/4\" Pipe", unit: "rolls" },
    { name: "PEX-B 1/2\" Pipe", unit: "rolls" },
    { name: "Copper Pipe 1/2\" Type-L", unit: "sticks" },
    { name: "Copper Pipe 3/4\" Type-L", unit: "sticks" },
    { name: "Copper Pipe 1\" Type-L", unit: "sticks" },
    { name: "ABS Pipe 3\"", unit: "sticks" },
    { name: "ABS Pipe 4\"", unit: "sticks" },
    { name: "PVC Pipe 3\" Schedule 40", unit: "sticks" },
    { name: "PVC Pipe 4\" Schedule 40", unit: "sticks" },
    { name: "SharkBite Coupling 1/2\"", unit: "pieces" },
    { name: "SharkBite Coupling 3/4\"", unit: "pieces" },
    { name: "SharkBite Elbow 1/2\"", unit: "pieces" },
    { name: "P-Trap 1-1/2\"", unit: "pieces" },
    { name: "Ball Valve 1/2\"", unit: "pieces" },
    { name: "Ball Valve 3/4\"", unit: "pieces" },
    { name: "Water Heater 40gal Gas", unit: "pieces" },
    { name: "Water Heater 50gal Gas", unit: "pieces" },
    { name: "Solder", unit: "rolls" },
    { name: "Flux", unit: "cans" },
    { name: "Teflon Tape", unit: "rolls" },
  ],
  "Insulation": [
    { name: "Batt Insulation R-13 15\"", unit: "bags" },
    { name: "Batt Insulation R-19 23\"", unit: "bags" },
    { name: "Batt Insulation R-21 15\"", unit: "bags" },
    { name: "Batt Insulation R-30 15\"", unit: "bags" },
    { name: "Rigid Foam 1\" 4Ã—8 R-5", unit: "sheets" },
    { name: "Rigid Foam 2\" 4Ã—8 R-10", unit: "sheets" },
    { name: "Rigid Foam 3\" 4Ã—8 R-15", unit: "sheets" },
    { name: "Spray Foam Can (12oz)", unit: "cans" },
    { name: "Spray Foam Can (24oz)", unit: "cans" },
    { name: "House Wrap Tyvek", unit: "rolls" },
    { name: "Vapour Barrier 6mil", unit: "rolls" },
    { name: "Acoustical Insulation R-14", unit: "bags" },
    { name: "Blown-In Cellulose", unit: "bags" },
  ],
  "Flooring": [
    { name: "Hardwood Flooring 3/4\"", unit: "sq ft" },
    { name: "Engineered Hardwood", unit: "sq ft" },
    { name: "LVP Flooring", unit: "sq ft" },
    { name: "Laminate Flooring", unit: "sq ft" },
    { name: "Porcelain Tile 12Ã—12", unit: "sq ft" },
    { name: "Porcelain Tile 24Ã—24", unit: "sq ft" },
    { name: "Ceramic Tile 12Ã—12", unit: "sq ft" },
    { name: "Carpet", unit: "sq yd" },
    { name: "Carpet Pad", unit: "sq yd" },
    { name: "Cork Underlayment", unit: "rolls" },
    { name: "Foam Underlayment", unit: "rolls" },
    { name: "Floor Leveler 50lb", unit: "bags" },
    { name: "Thinset 50lb", unit: "bags" },
    { name: "Grout Unsanded", unit: "bags" },
    { name: "Grout Sanded", unit: "bags" },
    { name: "Tile Spacers 3/16\"", unit: "bags" },
    { name: "Transition Strip", unit: "pieces" },
    { name: "Quarter Round Moulding", unit: "linear ft" },
    { name: "Flooring Nails 2\"", unit: "boxes" },
  ],
  "Painting": [
    { name: "Interior Paint", unit: "gallons" },
    { name: "Exterior Paint", unit: "gallons" },
    { name: "Interior Primer", unit: "gallons" },
    { name: "Exterior Primer", unit: "gallons" },
    { name: "Ceiling Paint", unit: "gallons" },
    { name: "Trim Paint", unit: "gallons" },
    { name: "Concrete Paint", unit: "gallons" },
    { name: "Paint Roller 9\"", unit: "pieces" },
    { name: "Roller Cover 3/8\" Nap", unit: "pieces" },
    { name: "Roller Cover 1/2\" Nap", unit: "pieces" },
    { name: "Roller Cover 3/4\" Nap", unit: "pieces" },
    { name: "Brush 2\"", unit: "pieces" },
    { name: "Brush 3\"", unit: "pieces" },
    { name: "Brush Angle 2.5\"", unit: "pieces" },
    { name: "Painter's Tape 2\"", unit: "rolls" },
    { name: "Painter's Tape 1\"", unit: "rolls" },
    { name: "Drop Cloth Canvas", unit: "pieces" },
    { name: "Plastic Sheeting", unit: "rolls" },
    { name: "Caulk Paintable", unit: "tubes" },
    { name: "Caulk Silicone", unit: "tubes" },
    { name: "Wood Filler", unit: "tubs" },
    { name: "Sandpaper 80-grit", unit: "sheets" },
    { name: "Sandpaper 120-grit", unit: "sheets" },
    { name: "Sandpaper 220-grit", unit: "sheets" },
  ],
  "HVAC": [
    { name: "Flex Duct 6\"", unit: "rolls" },
    { name: "Flex Duct 8\"", unit: "rolls" },
    { name: "Flex Duct 10\"", unit: "rolls" },
    { name: "Sheet Metal Duct 6Ã—10", unit: "pieces" },
    { name: "Sheet Metal Duct 8Ã—12", unit: "pieces" },
    { name: "Sheet Metal Duct 10Ã—14", unit: "pieces" },
    { name: "Round Duct 6\"", unit: "pieces" },
    { name: "Register 4Ã—10", unit: "pieces" },
    { name: "Register 6Ã—10", unit: "pieces" },
    { name: "Register 6Ã—12", unit: "pieces" },
    { name: "Return Air Grille", unit: "pieces" },
    { name: "Air Filter 16Ã—20Ã—1", unit: "pieces" },
    { name: "Air Filter 20Ã—25Ã—1", unit: "pieces" },
    { name: "Gas Furnace 80k BTU", unit: "pieces" },
    { name: "Gas Furnace 100k BTU", unit: "pieces" },
    { name: "AC Condenser 2-ton", unit: "pieces" },
    { name: "AC Condenser 3-ton", unit: "pieces" },
    { name: "Air Handler", unit: "pieces" },
    { name: "Refrigerant R-410A", unit: "lbs" },
    { name: "Foil Tape", unit: "rolls" },
    { name: "Mastic Sealant", unit: "gallons" },
    { name: "Duct Insulation Wrap", unit: "rolls" },
    { name: "Thermostat", unit: "pieces" },
    { name: "Condensate Drain Line 3/4\"", unit: "rolls" },
  ],
  "Masonry": [
    { name: "Brick Standard", unit: "pieces" },
    { name: "Brick Veneer", unit: "sq ft" },
    { name: "CMU Block 8Ã—8Ã—16", unit: "pieces" },
    { name: "CMU Block 8Ã—8Ã—8", unit: "pieces" },
    { name: "Mortar Mix Type-S 80lb", unit: "bags" },
    { name: "Mortar Mix Type-N 80lb", unit: "bags" },
    { name: "Sand", unit: "tons" },
    { name: "Stone Veneer", unit: "sq ft" },
    { name: "Masonry Ties", unit: "boxes" },
    { name: "Masonry Anchor 1/4\"", unit: "boxes" },
    { name: "Waterproofing Sealer", unit: "gallons" },
    { name: "Grout Non-Shrink", unit: "bags" },
    { name: "Rebar Chair", unit: "pieces" },
  ],
  "Steel / Structural": [
    { name: "Steel Stud 3-5/8\" 25ga", unit: "pieces" },
    { name: "Steel Stud 3-5/8\" 20ga", unit: "pieces" },
    { name: "Steel Stud 6\" 25ga", unit: "pieces" },
    { name: "Steel Stud 6\" 20ga", unit: "pieces" },
    { name: "Steel Track 3-5/8\"", unit: "pieces" },
    { name: "Steel Track 6\"", unit: "pieces" },
    { name: "Steel Beam W4Ã—13", unit: "linear ft" },
    { name: "Steel Beam W6Ã—9", unit: "linear ft" },
    { name: "Steel Beam W8Ã—10", unit: "linear ft" },
    { name: "Steel Angle 2Ã—2Ã—1/8\"", unit: "linear ft" },
    { name: "Structural Screws 1-1/4\"", unit: "boxes" },
    { name: "Structural Screws 2-1/2\"", unit: "boxes" },
    { name: "Anchor Bolt 1/2\"", unit: "pieces" },
    { name: "Anchor Bolt 3/4\"", unit: "pieces" },
    { name: "Weld Rod 6011", unit: "boxes" },
  ],
  "Siding": [
    { name: "Vinyl Siding", unit: "squares" },
    { name: "Hardie Board 8-1/4\"", unit: "pieces" },
    { name: "Hardie Board 12\"", unit: "pieces" },
    { name: "Cedar Bevel 1/2Ã—6\"", unit: "linear ft" },
    { name: "Cedar Bevel 3/4Ã—8\"", unit: "linear ft" },
    { name: "Steel Siding", unit: "squares" },
    { name: "Building Paper 15lb", unit: "rolls" },
    { name: "Housewrap Tyvek", unit: "rolls" },
    { name: "J-Channel 12ft", unit: "pieces" },
    { name: "Outside Corner Post", unit: "pieces" },
    { name: "Starter Strip", unit: "pieces" },
    { name: "Siding Nails 2\"", unit: "lbs" },
    { name: "Flashing Tape 4\"", unit: "rolls" },
  ],
  "Windows & Doors": [
    { name: "Window — Casement", unit: "pieces" },
    { name: "Window — Double Hung", unit: "pieces" },
    { name: "Window — Awning", unit: "pieces" },
    { name: "Sliding Glass Door", unit: "pieces" },
    { name: "Exterior Door Fiberglass", unit: "pieces" },
    { name: "Exterior Door Steel", unit: "pieces" },
    { name: "Interior Door Pre-hung", unit: "pieces" },
    { name: "Bifold Door", unit: "pieces" },
    { name: "Door Hinge Set", unit: "pieces" },
    { name: "Door Hardware Set", unit: "pieces" },
    { name: "Door Lockset", unit: "pieces" },
    { name: "Deadbolt", unit: "pieces" },
    { name: "Foam Sealant 12oz", unit: "cans" },
    { name: "Flashing Tape 4\"", unit: "rolls" },
    { name: "Window/Door Casing", unit: "linear ft" },
    { name: "Window Sill", unit: "pieces" },
    { name: "Shims", unit: "packs" },
  ],
  "Landscaping / Site Work": [
    { name: "Topsoil", unit: "yards" },
    { name: "Gravel 3/4\"", unit: "tons" },
    { name: "Crushed Stone", unit: "tons" },
    { name: "Sand Fill", unit: "tons" },
    { name: "Sod", unit: "sq ft" },
    { name: "Mulch", unit: "yards" },
    { name: "Drainage Pipe 4\" Perforated", unit: "linear ft" },
    { name: "Filter Fabric", unit: "rolls" },
    { name: "Erosion Control Blanket", unit: "rolls" },
    { name: "Concrete Curb", unit: "linear ft" },
    { name: "Interlocking Brick", unit: "sq ft" },
    { name: "Retaining Wall Block", unit: "pieces" },
  ],
  "Civil / Utilities": [
    { name: "Water Main Pipe 6\" DI", unit: "linear ft" },
    { name: "Water Main Pipe 8\" DI", unit: "linear ft" },
    { name: "Water Main Pipe 12\" DI", unit: "linear ft" },
    { name: "Sewer Pipe 8\" PVC SDR35", unit: "linear ft" },
    { name: "Sewer Pipe 10\" PVC SDR35", unit: "linear ft" },
    { name: "Sewer Pipe 12\" PVC SDR35", unit: "linear ft" },
    { name: "Storm Drain Pipe 12\" HDPE", unit: "linear ft" },
    { name: "Storm Drain Pipe 18\" HDPE", unit: "linear ft" },
    { name: "Storm Drain Pipe 24\" HDPE", unit: "linear ft" },
    { name: "Manhole Frame & Cover", unit: "pieces" },
    { name: "Manhole Precast 4ft", unit: "pieces" },
    { name: "Catch Basin", unit: "pieces" },
    { name: "Gate Valve 6\"", unit: "pieces" },
    { name: "Gate Valve 8\"", unit: "pieces" },
    { name: "Fire Hydrant Assembly", unit: "pieces" },
    { name: "Pipe Bedding Sand", unit: "tons" },
    { name: "Trench Backfill Granular", unit: "tons" },
    { name: "Corrugated Steel Pipe 24\"", unit: "linear ft" },
    { name: "Geotextile Fabric", unit: "rolls" },
    { name: "Tracer Wire 12ga", unit: "rolls" },
    { name: "Warning Tape - Water", unit: "rolls" },
    { name: "Warning Tape - Sewer", unit: "rolls" },
    { name: "Curb Stop / Corporation Stop", unit: "pieces" },
    { name: "Service Saddle 1\"", unit: "pieces" },
  ],
  "Excavation": [
    { name: "Structural Fill", unit: "tons" },
    { name: "Granular A Base", unit: "tons" },
    { name: "Granular B Subbase", unit: "tons" },
    { name: "Clear Stone 3/4\"", unit: "tons" },
    { name: "HL3 Asphalt (Binder)", unit: "tons" },
    { name: "HL4 Asphalt (Surface)", unit: "tons" },
    { name: "Asphalt Tack Coat", unit: "litres" },
    { name: "Concrete Sidewalk Mix", unit: "yards" },
    { name: "Road Base Gravel", unit: "tons" },
    { name: "Silt Fence", unit: "linear ft" },
    { name: "Erosion Control Sock", unit: "linear ft" },
    { name: "Dewatering Pump Rental", unit: "days" },
    { name: "Shoring Panel 4x8", unit: "pieces" },
    { name: "Trench Box", unit: "days" },
    { name: "Orange Construction Fence", unit: "rolls" },
    { name: "Construction Signs", unit: "pieces" },
    { name: "Concrete Barrier (Jersey)", unit: "linear ft" },
  ],
  "Demolition": [
    { name: "Dumpster Bin 14yd", unit: "bins" },
    { name: "Dumpster Bin 20yd", unit: "bins" },
    { name: "Dumpster Bin 40yd", unit: "bins" },
    { name: "Asbestos Abatement Bags", unit: "bags" },
    { name: "Poly Sheeting 6mil", unit: "rolls" },
    { name: "Respirator Half-Face", unit: "pieces" },
    { name: "Respirator P100 Cartridges", unit: "pairs" },
    { name: "Tyvek Coverall", unit: "pieces" },
    { name: "Concrete Saw Blade 14\"", unit: "pieces" },
    { name: "Reciprocating Saw Blades", unit: "packs" },
    { name: "Demolition Nails / Screws", unit: "lbs" },
    { name: "Safety Barricade Tape", unit: "rolls" },
    { name: "Temporary Shoring Post", unit: "pieces" },
    { name: "Lead Paint Test Kit", unit: "kits" },
  ],
};

export type HoursAdjustment = {
  id: string;
  workerId: string;
  adminId: string;
  adminName: string;
  deltaHours: number;
  reason: string;
  createdAt: Date;
};
