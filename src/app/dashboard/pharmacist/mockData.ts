
export const MOCK_MEDICINES = [
    // General Body Pains
    { id: "M1", name: "Paracetamol 650mg", category: "Body Pain", stock: 500, price: 30, manufacturer: "GSK", dosage: "1 tab twice daily" },
    { id: "M2", name: "Ibuprofen 400mg", category: "Body Pain", stock: 300, price: 45, manufacturer: "Abbott", dosage: "1 tab as needed" },
    { id: "M3", name: "Diclofenac Gel", category: "Body Pain", stock: 150, price: 85, manufacturer: "Cipla", dosage: "Apply 3 times daily" },
    { id: "M4", name: "Naproxen 500mg", category: "Body Pain", stock: 200, price: 120, manufacturer: "Sun Pharma", dosage: "1 tab daily" },
    { id: "M5", name: "Tramadol 50mg", category: "Body Pain", stock: 100, price: 210, manufacturer: "Ranbaxy", dosage: "1 tab for acute pain" },

    // Gastric/Stomach
    { id: "M6", name: "Omeprazole 20mg", category: "Gastric", stock: 400, price: 180, manufacturer: "Dr. Reddy's", dosage: "1 cap before breakfast" },
    { id: "M7", name: "Pantoprazole 40mg", category: "Gastric", stock: 350, price: 220, manufacturer: "Torrent", dosage: "1 tab before food" },
    { id: "M8", name: "Ranitidine 150mg", category: "Gastric", stock: 450, price: 65, manufacturer: "Astra", dosage: "1 tab at night" },
    { id: "M9", name: "Digene Gel", category: "Gastric", stock: 200, price: 110, manufacturer: "Abbott", dosage: "10ml after meals" },
    { id: "M10", name: "Domperidone 10mg", category: "Gastric", stock: 300, price: 55, manufacturer: "Janssen", dosage: "1 tab 30 mins before food" },

    // Dental
    { id: "M11", name: "Amoxicillin 500mg", category: "Dental", stock: 250, price: 140, manufacturer: "Alkem", dosage: "1 cap 3 times for 5 days" },
    { id: "M12", name: "Metronidazole 400mg", category: "Dental", stock: 200, price: 90, manufacturer: "Sanofi", dosage: "1 tab after meals" },
    { id: "M13", name: "Chlorhexidine Mouthwash", category: "Dental", stock: 100, price: 160, manufacturer: "Icpa", dosage: "Rinse twice daily" },
    { id: "M14", name: "Sensodyne Paste", category: "Dental", stock: 300, price: 135, manufacturer: "GSK", dosage: "Use for brushing" },
    { id: "M15", name: "Lignocaine Gel", category: "Dental", stock: 80, price: 75, manufacturer: "Neon", dosage: "Apply to affected area" },

    // Neurology
    { id: "M16", name: "Gabapentin 300mg", category: "Neurology", stock: 120, price: 450, manufacturer: "Pfizer", dosage: "1 cap at bedtime" },
    { id: "M17", name: "Pregabalin 75mg", category: "Neurology", stock: 150, price: 520, manufacturer: "Zydus", dosage: "1 cap daily" },
    { id: "M18", name: "Sumatriptan 50mg", category: "Neurology", stock: 100, price: 850, manufacturer: "GSK", dosage: "1 tab for migraine onset" },
    { id: "M19", name: "Levetiracetam 500mg", category: "Neurology", stock: 180, price: 610, manufacturer: "UCB", dosage: "1 tab twice daily" },
    { id: "M20", name: "Donepezil 5mg", category: "Neurology", stock: 140, price: 390, manufacturer: "Eisai", dosage: "1 tab daily" },

    // Common/General
    { id: "M21", name: "Cetirizine 10mg", category: "Allergy", stock: 500, price: 25, manufacturer: "Ucb", dosage: "1 tab daily" },
    { id: "M22", name: "Loratadine 10mg", category: "Allergy", stock: 400, price: 35, manufacturer: "Bayer", dosage: "1 tab daily" },
    { id: "M23", name: "Azithromycin 500mg", category: "Antibiotic", stock: 150, price: 320, manufacturer: "Pfizer", dosage: "1 tab daily for 3 days" },
    { id: "M24", name: "Amlodipine 5mg", category: "BP", stock: 300, price: 45, manufacturer: "Lupin", dosage: "1 tab daily" },
    { id: "M25", name: "Telmisartan 40mg", category: "BP", stock: 250, price: 110, manufacturer: "Glenmark", dosage: "1 tab daily" },
    { id: "M26", name: "Metformin 500mg", category: "Diabetes", stock: 400, price: 80, manufacturer: "Merck", dosage: "1 tab with dinner" },
    { id: "M27", name: "Glimepiride 2mg", category: "Diabetes", stock: 300, price: 115, manufacturer: "Sanofi", dosage: "1 tab before breakfast" },
    { id: "M28", name: "Rosuvastatin 10mg", category: "Cholesterol", stock: 200, price: 195, manufacturer: "Astra", dosage: "1 tab at night" },
    { id: "M29", name: "Atorvastatin 20mg", category: "Cholesterol", stock: 180, price: 160, manufacturer: "Pfizer", dosage: "1 tab daily" },
    { id: "M30", name: "Vitamin D3 60K", category: "Vitamins", stock: 100, price: 420, manufacturer: "Cadila", dosage: "1 cap weekly" },
    { id: "M31", name: "Folic Acid", category: "Vitamins", stock: 500, price: 20, manufacturer: "Cipla", dosage: "1 tab daily" },
    { id: "M32", name: "Calcium Carbonate", category: "Vitamins", stock: 400, price: 95, manufacturer: "Shelcal", dosage: "1 tab twice daily" },
    { id: "M33", name: "Iron Supplement", category: "Vitamins", stock: 300, price: 130, manufacturer: "Tonoferon", dosage: "1 cap daily" },
    { id: "M34", name: "Multivitamin", category: "Vitamins", stock: 450, price: 210, manufacturer: "Becosules", dosage: "1 cap daily" },
    { id: "M35", name: "Cough Syrup", category: "Cough", stock: 200, price: 145, manufacturer: "Benadryl", dosage: "10ml as needed" },
    { id: "M36", name: "Salbutamol Inhaler", category: "Asthma", stock: 80, price: 380, manufacturer: "Cipla", dosage: "2 puffs as needed" },
    { id: "M37", name: "Montelukast 10mg", category: "Allergy", stock: 150, price: 215, manufacturer: "MSD", dosage: "1 tab at night" },
    { id: "M38", name: "Clopidogrel 75mg", category: "Heart", stock: 200, price: 110, manufacturer: "Sanofi", dosage: "1 tab daily" },
    { id: "M39", name: "Aspirin 75mg", category: "Heart", stock: 400, price: 15, manufacturer: "Bayer", dosage: "1 tab daily" },
    { id: "M40", name: "Insulin Glargine", category: "Diabetes", stock: 50, price: 950, manufacturer: "Lilly", dosage: "As directed" },
    { id: "M41", name: "Thyroxine 50mg", category: "Thyroid", stock: 300, price: 175, manufacturer: "Abbott", dosage: "1 tab empty stomach" },
    { id: "M42", name: "Spironolactone 25mg", category: "BP", stock: 120, price: 85, manufacturer: "Pfizer", dosage: "1 tab daily" },
    { id: "M43", name: "Furosemide 40mg", category: "BP", stock: 200, price: 25, manufacturer: "Sanofi", dosage: "1 tab daily" },
    { id: "M44", name: "Dicyclomine 10mg", category: "Gastric", stock: 180, price: 40, manufacturer: "Abbott", dosage: "1 tab for abdominal pain" },
    { id: "M45", name: "Oral Rehydration Salt", category: "Gastric", stock: 500, price: 15, manufacturer: "FDC", dosage: "Mix with 1L water" },
    { id: "M46", name: "Silver Nitrate soln", category: "Dental", stock: 50, price: 250, manufacturer: "Neon", dosage: "Clinic use only" },
    { id: "M47", name: "Topiramate 50mg", category: "Neurology", stock: 90, price: 480, manufacturer: "Janssen", dosage: "1 tab daily" },
    { id: "M48", name: "Zolpidem 10mg", category: "Neurology", stock: 60, price: 320, manufacturer: "Sanofi", dosage: "1 tab before sleep" },
    { id: "M49", name: "Dexamethasone 4mg", category: "Steroid", stock: 150, price: 30, manufacturer: "Zydus", dosage: "As directed" },
    { id: "M50", name: "Prednisolone 5mg", category: "Steroid", stock: 180, price: 45, manufacturer: "Pfizer", dosage: "1 tab twice daily" }
];
