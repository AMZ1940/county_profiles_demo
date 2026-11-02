/* ==========================================================================
   FICTIONAL DEMO DATA — Briarwood County, State of Westhaven
   Every name, number, declaration and grant below is made up for
   demonstration. None of it describes a real place or real award.
   Swap this file for real data later; app.js reads only this object.
   ========================================================================== */
window.PROFILE = {
  county: {
    name: "Briarwood County",
    state: "State of Westhaven",
    stateAbbr: "WH",
    fips: "99-041 (fictional)",
    seat: "Briarwood",
    region: "Central Planning Region",
    asOf: "November 2026"
  },

  /* ---------- General statistics (county vs. state) ---------- */
  general: {
    population:      { county: 84612,  state: 4215000 },
    landAreaSqMi:    { county: 612,    state: 41870 },
    households:      { county: 33940,  state: 1652000 },
    medianAge:       { county: 41.8,   state: 39.1 },
    medianHHIncome:  { county: 54380,  state: 63150 },
    medianHomeValue: { county: 186500, state: 241000 },
    homeownership:   { county: 70.4,   state: 66.9 },
    unemployment:    { county: 4.1,    state: 3.6 },
    bachelorsPlus:   { county: 21.7,   state: 29.4 },
    stateCountyCount: 72
  },

  popTrend: {
    years:  [2000, 2005, 2010, 2015, 2020, 2025],
    county: [76240, 78910, 81050, 82330, 83900, 84612],
    state:  [3610000, 3800000, 3955000, 4050000, 4160000, 4215000]
  },

  ageGroups: {
    labels: ["0–4", "5–17", "18–24", "25–44", "45–64", "65–74", "75+"],
    county: [5.4, 15.9, 8.1, 23.6, 26.4, 11.8, 8.8],
    state:  [5.9, 16.4, 9.3, 26.2, 25.1, 10.2, 6.9]
  },

  housingType: {
    labels: ["Single-family", "Multi-family", "Mobile / manufactured", "Other"],
    county: [68.2, 14.9, 13.6, 3.3]
  },

  /* ---------- Vulnerable population indicators (% of pop or households) ---------- */
  vulnerable: [
    { key: "age65",       label: "Age 65 and older",               county: 20.6, state: 17.1, base: "persons" },
    { key: "under5",      label: "Under age 5",                    county: 5.4,  state: 5.9,  base: "persons" },
    { key: "disability",  label: "Living with a disability",       county: 17.9, state: 14.6, base: "persons" },
    { key: "poverty",     label: "Below poverty level",            county: 15.8, state: 13.2, base: "persons" },
    { key: "uninsured",   label: "No health insurance",            county: 10.9, state: 9.4,  base: "persons" },
    { key: "lep",         label: "Limited English proficiency",    county: 2.1,  state: 3.4,  base: "persons" },
    { key: "novehicle",   label: "Households with no vehicle",     county: 7.6,  state: 6.1,  base: "households" },
    { key: "nobroadband", label: "Households without broadband",   county: 22.4, state: 15.8, base: "households" },
    { key: "mobilehome",  label: "Mobile / manufactured homes",    county: 13.6, state: 8.7,  base: "housing units" },
    { key: "alone65",     label: "65+ living alone",               county: 12.3, state: 10.6, base: "households" },
    { key: "singleparent",label: "Single-parent households",       county: 9.8,  state: 8.9,  base: "households" }
  ],
  svi: { county: 0.71, state: 0.50 },              // 0 (least) – 1 (most vulnerable)
  electricityDependent: { county: 1184 },          // Medicare beneficiaries, fictional

  /* ---------- Disaster history ---------- */
  // pa: Public Assistance federal share by category (USD)
  //   A Debris · B Emergency Protective Measures · C Roads & Bridges · D Water Control
  //   E Buildings & Equipment · F Utilities · G Parks, Recreation & Other
  // ia: Individual Assistance (USD) or null when IA was not designated
  disasters: [
    { id: "DR-9101", title: "Severe Storms & Flooding", type: "Flooding",
      start: "2010-05-01", end: "2010-05-09",
      impacts: { deaths: 3, injuries: 14, homesDamaged: 1240, homesDestroyed: 86, businesses: 72, peakOutages: 18400 },
      note: "Mill Creek and Harlan River crested 9 ft above flood stage; 41 roads closed.",
      pa: { A: 2840000, B: 1120000, C: 4650000, D: 380000, E: 1210000, F: 940000, G: 470000 },
      ia: { registrations: 2310, approved: 1486, repair: 6420000, replacement: 1180000, rental: 1950000,
            personalProperty: 2060000, medical: 90000, transportation: 310000, otherONA: 440000 } },

    { id: "DR-9132", title: "Severe Storms & Tornadoes", type: "Tornado",
      start: "2011-04-27", end: "2011-04-27",
      impacts: { deaths: 2, injuries: 31, homesDamaged: 318, homesDestroyed: 64, businesses: 11, peakOutages: 22600 },
      note: "EF-3 tornado on an 11-mile track through Oak Hollow.",
      pa: { A: 1960000, B: 620000, C: 210000, D: 0, E: 580000, F: 1370000, G: 120000 },
      ia: { registrations: 640, approved: 402, repair: 1740000, replacement: 960000, rental: 410000,
            personalProperty: 520000, medical: 60000, transportation: 180000, otherONA: 70000 } },

    { id: "DR-9178", title: "Severe Winter Storm (Ice)", type: "Winter Storm",
      start: "2015-02-20", end: "2015-02-24",
      impacts: { deaths: 1, injuries: 9, homesDamaged: 96, homesDestroyed: 0, businesses: 4, peakOutages: 31200 },
      note: "Up to 1 in. of ice accretion; 70% of customers without power at peak.",
      pa: { A: 3120000, B: 880000, C: 150000, D: 0, E: 90000, F: 2410000, G: 60000 },
      ia: null },

    { id: "DR-9204", title: "Severe Storms, Straight-line Winds & Flooding", type: "Severe Storms",
      start: "2017-04-30", end: "2017-05-04",
      impacts: { deaths: 0, injuries: 3, homesDamaged: 205, homesDestroyed: 6, businesses: 9, peakOutages: 9800 },
      note: "Washouts on 17 county roads; two low-water crossings lost.",
      pa: { A: 740000, B: 310000, C: 1880000, D: 120000, E: 220000, F: 390000, G: 180000 },
      ia: null },

    { id: "DR-9241", title: "Severe Storms & Flooding", type: "Flooding",
      start: "2019-02-06", end: "2019-03-03",
      impacts: { deaths: 0, injuries: 2, homesDamaged: 488, homesDestroyed: 19, businesses: 23, peakOutages: 3100 },
      note: "Prolonged river flooding; Briarwood WWTP operated on bypass for 9 days.",
      pa: { A: 580000, B: 690000, C: 3270000, D: 840000, E: 410000, F: 520000, G: 330000 },
      ia: { registrations: 1020, approved: 611, repair: 2150000, replacement: 220000, rental: 740000,
            personalProperty: 660000, medical: 10000, transportation: 90000, otherONA: 120000 } },

    { id: "DR-9266", title: "Severe Storms & Tornadoes", type: "Tornado",
      start: "2020-03-03", end: "2020-03-03",
      impacts: { deaths: 0, injuries: 12, homesDamaged: 142, homesDestroyed: 27, businesses: 6, peakOutages: 7400 },
      note: "Overnight EF-2 tornado near Ferris Junction.",
      pa: { A: 1050000, B: 270000, C: 80000, D: 0, E: 360000, F: 710000, G: 50000 },
      ia: { registrations: 380, approved: 236, repair: 880000, replacement: 520000, rental: 190000,
            personalProperty: 270000, medical: 20000, transportation: 80000, otherONA: 30000 } },

    { id: "DR-9270", title: "Pandemic Response", type: "Biological",
      start: "2020-01-20", end: "2023-05-11",
      impacts: { deaths: null, injuries: null, homesDamaged: 0, homesDestroyed: 0, businesses: null, peakOutages: 0 },
      note: "Testing and vaccination sites, non-congregate sheltering, PPE (Category B only).",
      pa: { A: 0, B: 4960000, C: 0, D: 0, E: 0, F: 0, G: 0 },
      ia: null },

    { id: "DR-9318", title: "Flash Flooding", type: "Flooding",
      start: "2021-08-21", end: "2021-08-22",
      impacts: { deaths: 4, injuries: 6, homesDamaged: 610, homesDestroyed: 112, businesses: 31, peakOutages: 12700 },
      note: "11+ in. of rain in 24 hrs; Millbrook downtown inundated.",
      pa: { A: 1470000, B: 830000, C: 3940000, D: 610000, E: 950000, F: 680000, G: 220000 },
      ia: { registrations: 1540, approved: 1033, repair: 4120000, replacement: 1640000, rental: 1080000,
            personalProperty: 1370000, medical: 50000, transportation: 460000, otherONA: 210000 } },

    { id: "DR-9356", title: "Severe Storms & Straight-line Winds", type: "Severe Storms",
      start: "2023-03-31", end: "2023-04-01",
      impacts: { deaths: 0, injuries: 4, homesDamaged: 174, homesDestroyed: 3, businesses: 8, peakOutages: 26300 },
      note: "Derecho-type wind event; widespread tree and utility damage.",
      pa: { A: 920000, B: 240000, C: 170000, D: 0, E: 190000, F: 860000, G: 140000 },
      ia: null },

    { id: "DR-9389", title: "Remnants of Tropical Storm", type: "Tropical",
      start: "2024-09-26", end: "2024-09-28",
      impacts: { deaths: 1, injuries: 3, homesDamaged: 263, homesDestroyed: 14, businesses: 12, peakOutages: 15800 },
      note: "Inland flooding and wind as remnants tracked through the region.",
      pa: { A: 660000, B: 380000, C: 1210000, D: 290000, E: 170000, F: 310000, G: 110000 },
      ia: { registrations: 470, approved: 288, repair: 970000, replacement: 80000, rental: 310000,
            personalProperty: 290000, medical: 0, transportation: 70000, otherONA: 50000 } },

    { id: "DR-9402", title: "Severe Winter Storm", type: "Winter Storm",
      start: "2025-01-05", end: "2025-01-10",
      impacts: { deaths: 0, injuries: 7, homesDamaged: 58, homesDestroyed: 0, businesses: 3, peakOutages: 11900 },
      note: "Heavy snow and extended cold; warming centers open 6 days.",
      pa: { A: 410000, B: 570000, C: 220000, D: 0, E: 60000, F: 480000, G: 20000 },
      ia: null }
  ],

  // State-level comparisons (fictional)
  stateDisasterBenchmarks: {
    // average number of major disaster declarations per county, by period
    periods: ["2010–14", "2015–19", "2020–24", "2025–"],
    countyDecls: [2, 3, 5, 1],
    stateAvgDecls: [1.4, 1.9, 2.6, 0.6],
    // statewide PA share by category (%), all declarations 2010–2025
    paShareState: { A: 21.4, B: 24.8, C: 26.1, D: 4.3, E: 9.6, F: 9.9, G: 3.9 },
    paPerCapitaState: 312,  // statewide PA federal share per resident since 2010 (USD)
    iaPerCapitaState: 118   // statewide IA per resident since 2010 (USD)
  },

  /* ---------- Other emergency-management grants ---------- */
  grants: [
    { program: "HMGP",          source: "FEMA",  year: 2011, amount: 4280000, phase: "Mitigation",   status: "Closed",
      purpose: "Acquisition & demolition of 38 flood-prone homes along Mill Creek (DR-9101)" },
    { program: "HMGP",          source: "FEMA",  year: 2012, amount: 1150000, phase: "Mitigation",   status: "Closed",
      purpose: "Two community tornado safe rooms at Oak Hollow schools (DR-9132)" },
    { program: "PDM",           source: "FEMA",  year: 2016, amount: 96000,   phase: "Mitigation",   status: "Closed",
      purpose: "Multi-jurisdictional Hazard Mitigation Plan update" },
    { program: "EMPG",          source: "FEMA",  year: 2025, amount: 891300,  phase: "Preparedness", status: "Ongoing",
      purpose: "County EMA staffing & operations, FY2015–FY2025 combined" },
    { program: "EOC Grant",     source: "FEMA",  year: 2019, amount: 380000,  phase: "Response",     status: "Closed",
      purpose: "EOC backup generator and power resilience upgrades" },
    { program: "USDA EWP",      source: "USDA",  year: 2019, amount: 612000,  phase: "Recovery",     status: "Closed",
      purpose: "Emergency streambank stabilization after DR-9241" },
    { program: "HMGP 5%",       source: "FEMA",  year: 2021, amount: 45000,   phase: "Preparedness", status: "Closed",
      purpose: "NOAA weather radios for mobile-home parks and senior housing (DR-9266)" },
    { program: "FMA",           source: "FEMA",  year: 2021, amount: 1920000, phase: "Mitigation",   status: "Active",
      purpose: "Elevation of 12 severe repetitive-loss properties" },
    { program: "HMGP",          source: "FEMA",  year: 2022, amount: 2640000, phase: "Mitigation",   status: "Active",
      purpose: "Stormwater culvert upsizing, Millbrook (DR-9318)" },
    { program: "CDBG-DR",       source: "HUD",   year: 2022, amount: 6750000, phase: "Recovery",     status: "Active",
      purpose: "Housing rehabilitation & replacement after 2021 flash flood" },
    { program: "BRIC",          source: "FEMA",  year: 2022, amount: 3850000, phase: "Mitigation",   status: "Active",
      purpose: "Briarwood wastewater treatment plant floodproofing" },
    { program: "HSGP (SHSP)",   source: "DHS",   year: 2023, amount: 214000,  phase: "Preparedness", status: "Closed",
      purpose: "Interoperable radio upgrades for fire, EMS and EMA" },
    { program: "State Warning", source: "State", year: 2024, amount: 268000,  phase: "Preparedness", status: "Active",
      purpose: "Nine outdoor warning sirens covering rural areas" }
  ],

  /* ---------- Risk index (illustrative, NRI-style 0–100 scores) ---------- */
  risk: {
    overall:    { county: 82.4, state: 61.5 },
    resilience: { county: 46.2, state: 52.8 },   // higher = more resilient
    probMajorDecl5yr: 87,                          // modeled % chance of ≥1 declaration in 5 yrs
    hazards: [
      { name: "Riverine Flooding", abbr: "FLD", county: 94.1, state: 71.3, eal: 3840000, freq: 1.6,   likelihood: 5, impact: 5, trend: "up" },
      { name: "Tornado",           abbr: "TOR", county: 88.6, state: 79.0, eal: 2960000, freq: 0.9,   likelihood: 4, impact: 5, trend: "steady" },
      { name: "Strong Wind",       abbr: "WND", county: 76.2, state: 68.4, eal: 1120000, freq: 4.8,   likelihood: 5, impact: 3, trend: "up" },
      { name: "Ice Storm",         abbr: "ICE", county: 72.4, state: 63.5, eal: 690000,  freq: 0.6,   likelihood: 3, impact: 4, trend: "steady" },
      { name: "Hail",              abbr: "HAL", county: 66.3, state: 62.9, eal: 350000,  freq: 2.4,   likelihood: 4, impact: 2, trend: "steady" },
      { name: "Heat Wave",         abbr: "HT",  county: 64.0, state: 60.1, eal: 280000,  freq: 2.1,   likelihood: 4, impact: 3, trend: "up" },
      { name: "Winter Weather",    abbr: "WIN", county: 61.7, state: 55.2, eal: 410000,  freq: 5.2,   likelihood: 5, impact: 2, trend: "down" },
      { name: "Earthquake",        abbr: "EQ",  county: 58.9, state: 66.8, eal: 520000,  freq: 0.002, likelihood: 1, impact: 5, trend: "steady" },
      { name: "Lightning",         abbr: "LTG", county: 55.1, state: 57.7, eal: 120000,  freq: 9.6,   likelihood: 5, impact: 1, trend: "steady" },
      { name: "Landslide",         abbr: "LND", county: 47.5, state: 38.2, eal: 85000,   freq: 0.3,   likelihood: 2, impact: 2, trend: "up" },
      { name: "Drought",           abbr: "DRT", county: 42.6, state: 50.3, eal: 190000,  freq: 0.8,   likelihood: 3, impact: 2, trend: "up" },
      { name: "Wildfire",          abbr: "WF",  county: 29.8, state: 34.6, eal: 40000,   freq: 0.05,  likelihood: 2, impact: 2, trend: "up" }
    ]
  },

  /* ---------- Map geography (fictional coordinates, no basemap) ---------- */
  geo: {
    boundary: [[-87.18,35.82],[-86.98,35.845],[-86.80,35.83],[-86.62,35.80],[-86.595,35.66],[-86.63,35.52],
               [-86.66,35.40],[-86.84,35.385],[-87.02,35.41],[-87.16,35.44],[-87.205,35.58],[-87.18,35.82]],
    river: [[-87.205,35.70],[-87.12,35.69],[-87.06,35.66],[-86.98,35.645],[-86.91,35.605],[-86.84,35.60],
            [-86.76,35.575],[-86.68,35.56],[-86.60,35.545]],
    towns: [
      { name: "Briarwood (county seat)", lon: -86.90, lat: 35.62, weight: 0.38, urban: 1.0 },
      { name: "Millbrook",       lon: -87.06, lat: 35.73, weight: 0.14, urban: 0.7 },
      { name: "Ferris Junction", lon: -86.72, lat: 35.71, weight: 0.12, urban: 0.6 },
      { name: "Oak Hollow",      lon: -86.78, lat: 35.46, weight: 0.10, urban: 0.5 },
      { name: "Pine Landing",    lon: -87.08, lat: 35.50, weight: 0.08, urban: 0.4 }
    ],
    facilities: [
      { name: "Briarwood Regional Medical Center", type: "Hospital",     lon: -86.885, lat: 35.628 },
      { name: "Harlan Valley Dialysis",            type: "Dialysis",     lon: -86.915, lat: 35.612 },
      { name: "Maple Court Nursing & Rehab",       type: "Nursing home", lon: -86.872, lat: 35.606 },
      { name: "Millbrook Senior Living",           type: "Nursing home", lon: -87.050, lat: 35.722 },
      { name: "Oak Hollow Care Center",            type: "Nursing home", lon: -86.790, lat: 35.468 },
      { name: "Pine Landing Assisted Living",      type: "Nursing home", lon: -87.072, lat: 35.512 },
      { name: "Briarwood High School",             type: "Shelter",      lon: -86.925, lat: 35.640 },
      { name: "Millbrook Community Center",        type: "Shelter",      lon: -87.068, lat: 35.740 },
      { name: "Ferris Junction Middle School",     type: "Shelter",      lon: -86.712, lat: 35.700 },
      { name: "Oak Hollow Safe Room",              type: "Shelter",      lon: -86.770, lat: 35.452 },
      { name: "Pine Landing Fire Hall",            type: "Shelter",      lon: -87.090, lat: 35.492 },
      { name: "County Fairgrounds Expo",           type: "Shelter",      lon: -86.840, lat: 35.655 }
    ]
  }
};
