export type TrainingVideo = {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  url?: string; // optional: fallback to youtubeId when not provided
  topics: string[];
  source: string;
  level: "intro" | "intermediate" | "advanced";
};

export const trainingVideos: TrainingVideo[] = [
  {
    id: "flagger-basics-1",
    title: "Work Zone Safety - Flagging Basics",
    description:
      "Foundational flagger techniques and positioning for safe temporary traffic control in short-term work zones.",
    youtubeId: "AZwl4L8JMlE",
    topics: ["flagging", "work zone basics", "temporary traffic control", "MUTCD"],
    source: "SafetyVideos / YouTube",
    level: "intro",
  },
  {
    id: "flagger-exercise-cdot",
    title: "Basic Work Zone Flagger Exercise (CDOT)",
    description:
      "Colorado DOT scenario-based exercise demonstrating correct STOP / SLOW paddle use and communication in active work zones.",
    youtubeId: "-MTCadQ8iIE",
    topics: ["flagging", "CDOT", "hands-on scenarios"],
    source: "Colorado DOT / YouTube",
    level: "intermediate",
  },
  {
    id: "flagger-training-cdot",
    title: "Work Zone Flagger Training",
    description:
      "Detailed training on proper flagger signals, positioning, and hazard awareness for two-lane flagging operations.",
    youtubeId: "ErsYn1muk78",
    topics: ["flagging", "signal paddles", "lane control"],
    source: "Colorado DOT / YouTube",
    level: "intro",
  },
  {
    id: "two-lane-work-zone",
    title: "Two Lane Work Zone Safety",
    description:
      "Two-lane work zone setup and flagger coordination, including tapers, advance warning, and pilot vehicle operations.",
    youtubeId: "Ydjfx7QBMao",
    topics: ["two-lane operations", "flagging", "temporary traffic control"],
    source: "VTrans / Vermont AOT",
    level: "intermediate",
  },
  {
    id: "wz-traffic-control-inspection",
    title: "Work Zone Traffic Control Inspection",
    description:
      "How to inspect work zone traffic control layouts for MUTCD compliance, visibility, and worker protection.",
    youtubeId: "GAaLyDtFfBM",
    topics: ["inspection", "MUTCD", "temporary traffic control"],
    source: "DOT Training / YouTube",
    level: "intermediate",
  },
  {
    id: "wz-traffic-control-reviews",
    title: "Work Zone Traffic Control Reviews",
    description:
      "High-level overview of temporary traffic control plan reviews and field checks to keep crews and road users safe.",
    youtubeId: "wSvCXCaUU8U",
    topics: ["temporary traffic control", "plan review", "FHWA"],
    source: "FHWA / YouTube",
    level: "intro",
  },
  {
    id: "setting-up-safe-work-zone",
    title: "Setting Up a Safe Work Zone - Road Crew Safety",
    description:
      "Step-by-step work zone setup best practices, including buffer space, taper lengths, and worker safety strategies.",
    youtubeId: "QsSqSmUTawo",
    topics: ["work zone setup", "buffer space", "cones & signs"],
    source: "Road Crew Safety / YouTube",
    level: "intro",
  },
  {
    id: "paving-safety-iowa-dot",
    title: "Paving Safety - Hazards of Paving Operations",
    description:
      "Common hazards of paving with asphalt and concrete, plus controls for workers near pavers, rollers, and trucks.",
    youtubeId: "GAo13jpISrs",
    topics: ["paver safety", "equipment", "hot mix asphalt"],
    source: "Iowa DOT / YouTube",
    level: "intermediate",
  },
  {
    id: "asphalt-paver-machine-safety",
    title: "Asphalt Paving Machine Safety",
    description:
      "Safe operation and spotter communication for asphalt pavers, focusing on pinch points, backing hazards, and visibility.",
    youtubeId: "042YQWY877c",
    topics: ["paver safety", "equipment", "spotter communication"],
    source: "GotSafety / YouTube",
    level: "intermediate",
  },
  {
    id: "asphalt-paving-operations",
    title: "Asphalt Paving Operation - Positions and Equipment",
    description:
      "End-to-end look at a paving crew: roles, equipment, and safety responsibilities from prep to final pass.",
    youtubeId: "j463RFDu24M",
    topics: ["paving operations", "crew roles", "equipment"],
    source: "Training Video / YouTube",
    level: "intro",
  },
  {
    id: "work-zone-safety-training",
    title: "Work Zone Safety Training - Construction Hazards",
    description:
      "Broad work zone safety course covering struck-by hazards, exposure risks, and traffic separation strategies.",
    youtubeId: "bsuqZ8DkSCc",
    topics: ["hazards", "PPE", "struck-by prevention"],
    source: "SafetyVideos.com / YouTube",
    level: "intro",
  },
  {
    id: "wz-safety-intro",
    title: "Work Zone Safety - Introduction",
    description:
      "Introductory module explaining why work zone safety matters, key terminology, and high-level MUTCD guidance.",
    youtubeId: "oQ7lgod-4LU",
    topics: ["work zone overview", "MUTCD", "terminology"],
    source: "SafetyVideos.com / YouTube",
    level: "intro",
  },
  {
    id: "night-work-lighting-strategies",
    title: "Night Work Safety - Lighting Strategies",
    description:
      "How to set up night work lighting to avoid glare and maintain visibility for workers and drivers.",
    youtubeId: "d327xVAjDl8",
    topics: ["night_work", "visibility", "lighting", "safety"],
    source: "DOT Training / YouTube",
    level: "intermediate",
  },
  {
    id: "night-work-traffic-control",
    title: "Night Work Safety - Traffic Control & Spotting",
    description:
      "Night work traffic control considerations, spotter communication, and safe movement around equipment.",
    youtubeId: "EtqLyUjtUAk",
    topics: ["night_work", "traffic_control", "spotter", "safety"],
    source: "SafetyVideos / YouTube",
    level: "intermediate",
  },
  {
    id: "wz-fundamentals-overview",
    title: "Work Zone Safety Fundamentals - Overview",
    description: "Core principles for work zone setup, visibility, and driver/worker separation.",
    youtubeId: "fOsu-X0hDHY",
    topics: ["work_zone_fundamentals", "safety", "overview"],
    source: "FHWA / YouTube",
    level: "intro",
  },
  {
    id: "wz-fundamentals-traffic-control",
    title: "Work Zone Fundamentals - Traffic Control Devices",
    description: "Placement and use of traffic control devices to guide motorists safely through work areas.",
    youtubeId: "hZ2BM1tklrk",
    topics: ["work_zone_fundamentals", "traffic_control", "devices"],
    source: "DOT Training / YouTube",
    level: "intro",
  },
  {
    id: "wz-fundamentals-hazards",
    title: "Work Zone Fundamentals - Hazard Awareness",
    description: "Common hazards, struck-by prevention, and safe practices for crews in active work zones.",
    youtubeId: "cIWcqiw1NTo",
    topics: ["work_zone_fundamentals", "hazards", "safety"],
    source: "DOT Training / YouTube",
    level: "intro",
  },
  {
    id: "wz-fundamentals-setup",
    title: "Work Zone Fundamentals - Setup & Tapers",
    description: "Setting up tapers, buffers, and channelization to protect workers and road users.",
    youtubeId: "zVlfMZU--5U",
    topics: ["work_zone_fundamentals", "setup", "tapers", "safety"],
    source: "DOT Training / YouTube",
    level: "intro",
  },
  {
    id: "ppe-overview-basics",
    title: "PPE Overview for Construction Safety",
    description: "Essential PPE for construction sites: helmets, vests, eye/ear protection, gloves, and footwear.",
    youtubeId: "QEB7wE-YFXg",
    topics: ["ppe", "safety", "jobsite"],
    source: "OSHA Training / YouTube",
    level: "intro",
  },
  {
    id: "ppe-inspection-fit",
    title: "PPE Inspection and Fit",
    description: "How to inspect and properly fit PPE to maintain protection in active work zones.",
    youtubeId: "LL1e55Dnd_g",
    topics: ["ppe", "inspection", "fit", "safety"],
    source: "SafetyVideos / YouTube",
    level: "intro",
  },
  {
    id: "jobsite-safety-briefing",
    title: "Jobsite Safety Briefing - PPE and Site Controls",
    description: "Daily safety briefing covering PPE checks, site hazards, and safe movement around equipment.",
    youtubeId: "BpG5HaCK4yQ",
    topics: ["ppe", "jobsite", "briefing", "safety"],
    source: "Construction Safety / YouTube",
    level: "intro",
  },
  {
    id: "dvir-pretrip-inspection",
    title: "DVIR Pre-Trip Inspection Walkthrough",
    description: "Daily Vehicle Inspection Report essentials: walkaround, critical systems, and documentation steps.",
    youtubeId: "E4Ucx5hd7Zw",
    topics: ["dvir", "inspection", "equipment", "safety"],
    source: "DOT Training / YouTube",
    level: "intro",
  },
  {
    id: "harassment-prevention-overview",
    title: "Workplace Harassment Prevention Overview",
    description: "Core principles of a respectful workplace, recognizing harassment, and reporting pathways.",
    youtubeId: "497RHaz_ajg",
    topics: ["harassment", "conduct", "workplace"],
    source: "Compliance Training / YouTube",
    level: "intro",
  },
  {
    id: "harassment-how-to-respond",
    title: "How to Respond to Workplace Harassment",
    description: "Steps to take when harassment occurs, documentation, and escalation protocols.",
    youtubeId: "497RHaz_ajg",
    topics: ["harassment", "reporting", "workplace"],
    source: "Compliance Training / YouTube",
    level: "intro",
  },
  {
    id: "cdl-prep-overview",
    title: "CDL Prep – Vehicle Inspection and Road Test Tips",
    description:
      "Walkthrough of pre-trip inspection points and road test best practices to prepare for the CDL exam.",
    youtubeId: "jV5fAu0WSbY",
    topics: ["cdl", "driving", "inspection", "safety"],
    source: "CDL Training / YouTube",
    level: "intro",
  },
  {
    id: "pmt-project-management-overview",
    title: "Project Management Technician Overview",
    description: "Key responsibilities for PMT: planning, documentation, and field coordination essentials.",
    youtubeId: "WcPxHUh2WmQ",
    topics: ["pmt", "leadership", "documentation", "planning"],
    source: "DOT Training / YouTube",
    level: "intro",
  },
];
export default trainingVideos;
