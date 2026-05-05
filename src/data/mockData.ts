export const workOrders = [
  { id: '1', title: 'Highway 101 Resurfacing', location: 'Mile Marker 45-48', status: 'in-progress' as const, assignee: 'Mike Johnson', assigneeImage: 'https://d64gsuwffb70l.cloudfront.net/691a85289eef33309c99fc8f_1763346076891_2423ff27.webp', dueDate: '2025-11-20', priority: 'high' as const },
  { id: '2', title: 'Bridge Inspection - Route 5', location: 'Main St Bridge', status: 'pending' as const, assignee: 'Sarah Chen', assigneeImage: 'https://d64gsuwffb70l.cloudfront.net/691a85289eef33309c99fc8f_1763346078831_af1e9901.webp', dueDate: '2025-11-18', priority: 'medium' as const },
  { id: '3', title: 'Pothole Repair Downtown', location: '3rd Ave & Oak St', status: 'completed' as const, assignee: 'Tom Wilson', assigneeImage: 'https://d64gsuwffb70l.cloudfront.net/691a85289eef33309c99fc8f_1763346080788_e31110a7.webp', dueDate: '2025-11-15', priority: 'low' as const },
  { id: '4', title: 'Traffic Signal Installation', location: 'Park Rd Intersection', status: 'in-progress' as const, assignee: 'Lisa Martinez', assigneeImage: 'https://d64gsuwffb70l.cloudfront.net/691a85289eef33309c99fc8f_1763346082768_49cc75d2.webp', dueDate: '2025-11-22', priority: 'high' as const },
  { id: '5', title: 'Sidewalk Replacement', location: 'Elm St Block 200', status: 'pending' as const, assignee: 'Mike Johnson', assigneeImage: 'https://d64gsuwffb70l.cloudfront.net/691a85289eef33309c99fc8f_1763346076891_2423ff27.webp', dueDate: '2025-11-25', priority: 'medium' as const },
  { id: '6', title: 'Drainage System Upgrade', location: 'Industrial Park', status: 'in-progress' as const, assignee: 'Sarah Chen', assigneeImage: 'https://d64gsuwffb70l.cloudfront.net/691a85289eef33309c99fc8f_1763346078831_af1e9901.webp', dueDate: '2025-11-19', priority: 'high' as const },
];

export const equipment = [
  { id: '1', name: 'Excavator CAT-320', image: 'https://d64gsuwffb70l.cloudfront.net/691a85289eef33309c99fc8f_1763346083817_c54cb14f.webp', status: 'in-use' as const, location: 'Highway 101', operator: 'Mike Johnson' },
  { id: '2', name: 'Asphalt Paver AP-1000', image: 'https://d64gsuwffb70l.cloudfront.net/691a85289eef33309c99fc8f_1763346088855_cee18377.webp', status: 'available' as const, location: 'Main Depot' },
  { id: '3', name: 'Road Roller RR-500', image: 'https://d64gsuwffb70l.cloudfront.net/691a85289eef33309c99fc8f_1763346090810_2ba6c5e3.webp', status: 'in-use' as const, location: 'Downtown', operator: 'Tom Wilson' },
  { id: '4', name: 'Backhoe Loader BL-250', image: 'https://d64gsuwffb70l.cloudfront.net/691a85289eef33309c99fc8f_1763346085779_ec7673ec.webp', status: 'maintenance' as const, location: 'Workshop' },
  { id: '5', name: 'Dump Truck DT-750', image: 'https://d64gsuwffb70l.cloudfront.net/691a85289eef33309c99fc8f_1763346087765_acfc8f5d.webp', status: 'available' as const, location: 'Main Depot' },
  { id: '6', name: 'Paving Machine PM-2000', image: 'https://d64gsuwffb70l.cloudfront.net/691a85289eef33309c99fc8f_1763346092827_5dde227c.webp', status: 'in-use' as const, location: 'Highway 101', operator: 'Lisa Martinez' },
];

export const team = [
  { id: '1', name: 'Mike Johnson', role: 'Senior Operator', image: 'https://d64gsuwffb70l.cloudfront.net/691a85289eef33309c99fc8f_1763346076891_2423ff27.webp', status: 'active' as const, hoursToday: 6.5, currentTask: 'Highway 101 Resurfacing' },
  { id: '2', name: 'Sarah Chen', role: 'Site Supervisor', image: 'https://d64gsuwffb70l.cloudfront.net/691a85289eef33309c99fc8f_1763346078831_af1e9901.webp', status: 'active' as const, hoursToday: 7.2, currentTask: 'Drainage System Upgrade' },
  { id: '3', name: 'Tom Wilson', role: 'Equipment Operator', image: 'https://d64gsuwffb70l.cloudfront.net/691a85289eef33309c99fc8f_1763346080788_e31110a7.webp', status: 'break' as const, hoursToday: 5.0 },
  { id: '4', name: 'Lisa Martinez', role: 'Traffic Control', image: 'https://d64gsuwffb70l.cloudfront.net/691a85289eef33309c99fc8f_1763346082768_49cc75d2.webp', status: 'active' as const, hoursToday: 6.8, currentTask: 'Traffic Signal Installation' },

];

export const trainingModules = [
  { 
    id: '1', 
    title: 'Flagger Safety Refresher', 
    description: 'Annual safety refresher course for traffic control flaggers covering hand signals, safety protocols, and emergency procedures.', 
    duration: '45 min', 
    progress: 100, 
    status: 'completed' as const, 
    category: 'Safety', 
    dueDate: '2025-11-15', 
    pdfUrl: '/training/flagger-safety.pdf',
    sections: [
      { title: 'Fundamentals', bullets: ['Purpose of flagging in temporary traffic control', 'Key work zone terminology', 'Right-of-way and communication rules'] },
      { title: 'PPE & Equipment', bullets: ['High-visibility apparel requirements', 'STOP/SLOW paddles use', 'Lighting and nighttime visibility'] },
      { title: 'Standard Procedures', bullets: ['Single-lane alternating traffic operations', 'Hand vs paddle signals', 'Maintaining predictable driver behavior'] }
    ]
  },
  { 
    id: '2', 
    title: 'Night Work Safety Refresher', 
    description: 'Essential safety training for nighttime road construction operations covering visibility, lighting, and fatigue management.', 
    duration: '1 hour', 
    progress: 0, 
    status: 'not-started' as const, 
    category: 'Safety', 
    dueDate: '2025-11-21', 
    pdfUrl: '/training/night-work-safety.pdf',
    sections: [
      { title: 'Night Work Hazards', bullets: ['Reduced visibility and increased driver impairment', 'Fatigue and long-shift risks', 'Limited depth perception'] },
      { title: 'Lighting Requirements', bullets: ['Work zone lighting placement', 'Vehicle lighting safety', 'Worker personal lighting'] },
      { title: 'Visibility Practices', bullets: ['Retroreflective apparel', 'Avoiding unlit areas', 'Managing shadows and blind spots'] }
    ]
  },
  { id: '3', title: 'OSHA Construction Safety', description: 'Comprehensive OSHA safety training for construction workers including hazard recognition and PPE requirements.', duration: '2 hours', progress: 65, status: 'in-progress' as const, category: 'Safety', dueDate: '2025-11-20', pdfUrl: '/training/osha-safety.pdf' },
  { id: '4', title: 'Heavy Equipment Operation', description: 'Advanced training for operating excavators, backhoes, and other heavy machinery safely and efficiently.', duration: '3 hours', progress: 0, status: 'not-started' as const, category: 'Equipment', dueDate: '2025-11-25', pdfUrl: '/training/equipment-ops.pdf' },
  { 
    id: '5', 
    title: 'Temporary Traffic Control Basics', 
    description: 'Introduction to traffic control procedures, work zone setup, and communication protocols for road work sites.', 
    duration: '1.5 hours', 
    progress: 30, 
    status: 'in-progress' as const, 
    category: 'Traffic Control', 
    dueDate: '2025-11-22', 
    pdfUrl: '/training/ttc-basics.pdf',
    sections: [
      { title: 'Work Zone Layout', bullets: ['Taper length and buffer spaces', 'Understanding MUTCD expectations', 'Common lane closure patterns'] },
      { title: 'Devices', bullets: ['Cone and drum spacing', 'Arrow board modes', 'Message sign best practices'] },
      { title: 'Work Zone Setup', bullets: ['Pre-job steps', 'Order of device placement', 'Proper photo documentation'] }
    ]
  },
  { id: '6', title: 'First Aid & CPR', description: 'Essential first aid and CPR certification course for construction site emergencies and medical response.', duration: '4 hours', progress: 100, status: 'completed' as const, category: 'Safety', dueDate: '2025-11-10', pdfUrl: '/training/first-aid.pdf' },
  { id: '7', title: 'Asphalt Paving Techniques', description: 'Best practices for asphalt paving including temperature control, compaction methods, and quality assurance.', duration: '2 hours', progress: 0, status: 'not-started' as const, category: 'Technical', dueDate: '2025-11-28', pdfUrl: '/training/asphalt-paving.pdf' },
  { id: '8', title: 'Environmental Compliance', description: 'Environmental regulations and compliance requirements for road construction including erosion control and waste management.', duration: '1 hour', progress: 45, status: 'in-progress' as const, category: 'Compliance', dueDate: '2025-11-24', pdfUrl: '/training/environmental.pdf' },
  { id: '9', title: 'Workplace Harassment Prevention', description: 'Required training on preventing workplace harassment, discrimination, and creating a respectful work environment.', duration: '1 hour', progress: 100, status: 'completed' as const, category: 'HR', dueDate: '2025-11-12', pdfUrl: '/training/harassment-prevention.pdf' },
];


