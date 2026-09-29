"""
Static farm data used by the seed command.

Animal rows come from dev/animal data/*.txt. Where the source files left a value
out (chicken weights, cow weights, one calf's name and breed) a value was
assigned here and is marked with a comment.

Illness histories and treatments are illustrative. Every drug and dose below
should be confirmed with the farm's veterinarian before real-world use.

Offsets are in days relative to the day the seed runs ("T").
"""

# ---------------------------------------------------------------------------
# Map zones. The farm map is 1000 x 650 map units.
# roam = the yard/run the animals range into during the day.
# ---------------------------------------------------------------------------
ZONES = [
    # name, area, kind, (x, y, w, h), roam (x, y, w, h) or None
    ("Longbourn Coop", "coops", "coop", (70, 70, 70, 46), (50, 55, 160, 115)),
    ("Orchard Coop", "coops", "coop", (240, 70, 70, 46), (220, 55, 150, 115)),
    ("Frat House Coop", "coops", "coop", (70, 205, 70, 46), (50, 190, 150, 95)),
    ("Neverland Brooder", "coops", "brooder", (250, 215, 70, 44), None),
    ("Cloverfield Pasture", "pens", "pasture", (45, 345, 325, 175), (55, 355, 305, 155)),
    ("Cloverfield Farrowing Barn", "pens", "barn", (130, 545, 150, 70), None),
    ("Upper Enclosure", "enclosures", "enclosure", (430, 40, 530, 255), (445, 55, 500, 225)),
    ("Lower Enclosure", "enclosures", "enclosure", (430, 330, 530, 285), (445, 345, 500, 255)),
]

# ---------------------------------------------------------------------------
# Animals
# species, type_label, sex, name, breed, age_days, fertility, zone,
# egg_count_mtd, current_weight_lbs (None = derive from growth curve)
# ---------------------------------------------------------------------------
YEAR = 365
MONTH = 30

CHICKENS = [
    # Hens. Weights not supplied in Chickens.txt; assigned within breed norms.
    ("Hen", "F", "Elizabeth", "Golden Comet", YEAR, "laying", "Longbourn Coop", 13, 4.2),
    ("Hen", "F", "Jane", "White Leghorn", YEAR, "brooding", "Longbourn Coop", 15, 3.6),
    ("Hen", "F", "Lydia", "Golden Comet", YEAR, "laying", "Longbourn Coop", 12, 3.9),
    ("Hen", "F", "Kitty", "White Leghorn", YEAR, "brooding", "Longbourn Coop", 12, 3.4),
    ("Hen", "F", "Mary", "Golden Comet", YEAR, "brooding", "Longbourn Coop", 9, 4.4),
    ("Hen", "F", "Jo", "Isa Red", YEAR, "brooding", "Orchard Coop", 18, 4.6),
    ("Hen", "F", "Meg", "Isa Red", YEAR, "brooding", "Orchard Coop", 12, 4.3),
    ("Hen", "F", "Beth", "Isa Red", YEAR, "laying", "Orchard Coop", 10, 4.1),
    ("Hen", "F", "Amy", "Isa Red", YEAR, "laying", "Orchard Coop", 20, 4.5),
    # Chicks
    ("Hen Chick", "F", "Wendy", "Golden Comet", 12, "immature", "Neverland Brooder", None, None),
    ("Hen Chick", "F", "Moira", "Golden Comet", 12, "immature", "Neverland Brooder", None, None),
    ("Rooster Chick", "M", "John", "Isa Red", 12, "immature", "Neverland Brooder", None, None),
    ("Rooster Chick", "M", "Michael", "White Leghorn", 12, "immature", "Neverland Brooder", None, None),
    ("Rooster Chick", "M", "Peter", "White Leghorn", 12, "immature", "Neverland Brooder", None, None),
    # Teens
    ("Hen Teen", "F", "Daisy", "Golden Comet", 18, "immature", "Frat House Coop", None, None),
    ("Hen Teen", "F", "Poppy", "White Leghorn", 18, "immature", "Frat House Coop", None, None),
    ("Hen Teen", "F", "Iris", "White Leghorn", 18, "immature", "Frat House Coop", None, None),
    ("Hen Teen", "F", "Rose", "Golden Comet", 16, "immature", "Frat House Coop", None, None),
    ("Hen Teen", "F", "Violet", "Isa Brown", 16, "immature", "Frat House Coop", None, None),
    ("Hen Teen", "F", "Petunia", "Isa Brown", 16, "immature", "Frat House Coop", None, None),
    ("Rooster Teen", "M", "Harry", "Isa Brown", 15, "immature", "Frat House Coop", None, None),
    ("Rooster Teen", "M", "Ron", "White Leghorn", 15, "immature", "Frat House Coop", None, None),
    # Roosters (weights assigned)
    ("Rooster", "M", "Darcy", "Golden Comet", YEAR, "breeding_male", "Longbourn Coop", None, 5.8),
    ("Rooster", "M", "Fred", "White Leghorn", YEAR + 3 * MONTH, "breeding_male", "Orchard Coop", None, 5.3),
    ("Rooster", "M", "Lawrence", "Isa Brown", YEAR + 8 * MONTH, "breeding_male", "Orchard Coop", None, 6.1),
]

COWS = [
    # Weights not supplied in Cows.txt; assigned within breed norms.
    ("Bull", "M", "Harold", "Holstein", 4 * YEAR + 3 * MONTH, "breeding_male", "Upper Enclosure", None, 2150),
    ("Bull", "M", "Angus", "Highland", 3 * YEAR + 6 * MONTH, "breeding_male", "Upper Enclosure", None, 1480),
    ("Heifer", "F", "Gertrude", "Holstein", 2 * YEAR + 2 * MONTH, "pregnant", "Lower Enclosure", None, 1360),
    ("Heifer", "F", "Maggie", "Highland", 3 * YEAR + 6 * MONTH, "open", "Lower Enclosure", None, 1020),
    ("Heifer", "F", "Lucy", "Simmental", YEAR + 8 * MONTH, "open", "Lower Enclosure", None, 1010),
    ("Heifer Calf", "F", "Edith", "Holstein", 6 * MONTH, "immature", "Lower Enclosure", None, 395),
    ("Bull Calf", "M", "Chuck", "Holstein", 6 * MONTH, "immature", "Lower Enclosure", None, 430),
    # Cows.txt lists this calf without a name or breed. Placeholder values; please confirm.
    ("Heifer Calf", "F", "Unnamed Calf", "Unrecorded", 7 * MONTH, "immature", "Lower Enclosure", None, 360),
]

PIGS = [
    ("Sow", "F", "Hamela Anderson", "Red Wattle Hog", 2 * YEAR, "lactating", "Cloverfield Pasture", None, 285),
    ("Boar", "M", "Kevin Bacon", "Mulefoot Hog", 3 * YEAR, "breeding_male", "Cloverfield Pasture", None, 310),
    ("Sow Piglet", "F", "Piggy Minaj", "Red Wattle Hog", 14, "immature", "Cloverfield Farrowing Barn", None, 3.2),
    ("Sow Piglet", "F", "Hogatha Christie", "Red Wattle Hog", 14, "immature", "Cloverfield Farrowing Barn", None, 3.5),
    ("Sow Piglet", "F", "Porkahontas", "Red Wattle Hog", 14, "immature", "Cloverfield Farrowing Barn", None, 3.1),
    ("Boar Piglet", "M", "Sir Oinks-A-Lot", "Red Wattle Hog", 14, "immature", "Cloverfield Farrowing Barn", None, 3.8),
    ("Boar Piglet", "M", "Hogwarts", "Red Wattle Hog", 14, "immature", "Cloverfield Farrowing Barn", None, 4.0),
    ("Boar Piglet", "M", "Pork Solo", "Red Wattle Hog", 14, "immature", "Cloverfield Farrowing Barn", None, 3.6),
    ("Boar Piglet", "M", "Hamlet", "Red Wattle Hog", 14, "immature", "Cloverfield Farrowing Barn", None, 3.9),
    ("Boar Piglet", "M", "Bacon Bill", "Red Wattle Hog", 14, "immature", "Cloverfield Farrowing Barn", None, 3.4),
]

PIGLET_DAM = "Hamela Anderson"

# Birth / hatch weights (lbs) and mature weights used for growth curves.
BIRTH_WEIGHT = {
    ("chicken", None): 0.09,
    ("cow", "Holstein"): 90,
    ("cow", "Highland"): 60,
    ("cow", "Simmental"): 85,
    ("cow", "Unrecorded"): 75,
    ("pig", None): 2.4,
}
MATURE_WEIGHT = {
    ("chicken", "F"): 4.3,
    ("chicken", "M"): 5.8,
    ("cow", "F"): 1300,
    ("cow", "M"): 1900,
    ("pig", "F"): 290,
    ("pig", "M"): 320,
}

# ---------------------------------------------------------------------------
# Health events: (animal, condition, severity, start_offset, end_offset|None,
#                 peak_temp_rise_f, notes)
# ---------------------------------------------------------------------------
HEALTH_EVENTS = [
    # Chickens
    ("Lydia", "Respiratory infection (suspected Mycoplasma gallisepticum)", "moderate", -6, None, 1.8,
     "Sneezing, watery eyes, reduced laying. Isolated in the Longbourn Coop sick bay."),
    ("Rose", "Coccidiosis", "moderate", -9, -2, 0.8,
     "Bloody droppings and lethargy at 7 days old. Responded to amprolium; monitoring weight gain."),
    ("Michael", "Pasty butt", "mild", -10, -7, 0.4, "Cleaned daily; resolved within three days."),
    ("Fred", "Bumblefoot (left foot)", "mild", -120, -98, 0.6, "Soaked, debrided and bandaged; healed."),
    ("Meg", "Northern fowl mites", "mild", -70, -49, 0.0, "Coop cleaned and bedding replaced."),
    # Cows
    ("Lucy", "Bovine respiratory disease (BRD)", "moderate", -4, None, 3.0,
     "Nasal discharge, cough, reduced appetite. Fever peaked at 104.6 °F."),
    ("Chuck", "Neonatal calf scours", "moderate", -172, -164, 2.0, "Dehydrated at about a week old; recovered with electrolytes."),
    ("Harold", "Pinkeye (infectious bovine keratoconjunctivitis)", "mild", -420, -404, 1.5, "Right eye; patched."),
    ("Maggie", "Foot rot", "moderate", -61, -50, 2.1, "Lame on right hind; swelling between claws."),
    # Pigs
    ("Hogwarts", "E. coli scours", "moderate", -2, None, 1.8, "Watery diarrhoea; nursing less. Warmth and fluids."),
    ("Hamela Anderson", "Postpartum fever (mild MMA)", "moderate", -13, -9, 2.2,
     "Off feed after farrowing, firm udder; piglets supplemented for 2 days."),
    ("Kevin Bacon", "Swine erysipelas", "severe", -200, -189, 3.6,
     "Diamond-shaped skin lesions, high fever. Full recovery."),
]

# ---------------------------------------------------------------------------
# Treatments: (animal or group, kind, name, dose, route, times, start, end|None,
#              reason, withdrawal, linked condition|None)
# A group is "species:<species>" / "zone:<zone name>" / a list of names.
# ---------------------------------------------------------------------------
ALL_CHICKS = ["Wendy", "Moira", "John", "Michael", "Peter"]
ALL_TEENS = ["Daisy", "Poppy", "Iris", "Rose", "Violet", "Petunia", "Harry", "Ron"]
ADULT_CHICKENS = ["Elizabeth", "Jane", "Lydia", "Kitty", "Mary", "Jo", "Meg", "Beth", "Amy",
                  "Darcy", "Fred", "Lawrence"]
PIGLETS = ["Piggy Minaj", "Hogatha Christie", "Porkahontas", "Sir Oinks-A-Lot", "Hogwarts",
           "Pork Solo", "Hamlet", "Bacon Bill"]
CALVES = ["Edith", "Chuck", "Unnamed Calf"]
ADULT_CATTLE = ["Harold", "Angus", "Gertrude", "Maggie", "Lucy"]
ALL_CATTLE = ADULT_CATTLE + CALVES

# "birth+N" means N days after that animal's birth date.
TREATMENTS = [
    # --- Chickens: vaccines ---
    ("species:chicken", "vaccine", "Marek's disease vaccine (HVT)", "0.2 mL", "SC", "", "birth+0", "birth+0",
     "Hatchery vaccination", "", None),
    (ADULT_CHICKENS, "vaccine", "Newcastle–Bronchitis (B1 strain)", "1 drop", "Eye drop", "", "birth+21", "birth+21",
     "Routine flock vaccination", "", None),
    (ADULT_CHICKENS, "vaccine", "Fowl pox vaccine", "Wing-web stab", "Wing web", "", "birth+84", "birth+84",
     "Routine flock vaccination", "", None),
    (ALL_CHICKS + ALL_TEENS, "vaccine", "Newcastle–Bronchitis (B1 strain)", "1 drop", "Eye drop", "", "birth+21",
     "birth+21", "Routine chick vaccination (upcoming)", "", None),
    # --- Chickens: medications / supplements ---
    ("Lydia", "medication", "Tylosin (Tylan Soluble)", "1 tsp per gallon drinking water", "Water", "07:00", -5, 0,
     "Respiratory infection", "Discard eggs during treatment + 5 days", "Respiratory infection (suspected Mycoplasma gallisepticum)"),
    ("Lydia", "supplement", "Vitamin & electrolyte powder", "1/4 tsp per gallon", "Water", "07:00", -5, 2,
     "Support during illness", "", "Respiratory infection (suspected Mycoplasma gallisepticum)"),
    ("Rose", "medication", "Amprolium 9.6% (Corid)", "2 tsp per gallon drinking water", "Water", "07:00", -9, -3,
     "Coccidiosis", "", "Coccidiosis"),
    ("Rose", "supplement", "Probiotic + vitamin B complex", "Per label", "Water", "07:00", -2, 5,
     "Gut recovery after coccidiosis", "", "Coccidiosis"),
    (ALL_CHICKS, "supplement", "Chick vitamins & electrolytes", "Per label", "Water", "07:00", "birth+0", "birth+14",
     "Brooder start-up", "", None),
    ("Michael", "medication", "Warm-water vent cleaning + petroleum jelly", "Daily", "Topical", "08:00", -10, -7,
     "Pasty butt", "", "Pasty butt"),
    ("Fred", "medication", "Chlorhexidine soak + Vetericyn wound spray", "Twice daily", "Topical", "08:00,18:00",
     -118, -98, "Bumblefoot", "", "Bumblefoot (left foot)"),
    ("Meg", "medication", "Elector PSP (spinosad)", "1 fl oz per 2 gal water, spray", "Topical", "09:00", -70, -56,
     "Northern fowl mites (repeat after 14 days)", "No egg withdrawal", "Northern fowl mites"),
    # --- Cattle: vaccines ---
    (ADULT_CATTLE, "vaccine", "Bovi-Shield Gold FP5 L5 (IBR, BVD, PI3, BRSV, Lepto)", "2 mL", "IM", "", -150, -150,
     "Annual pre-breeding vaccination", "21 days slaughter", None),
    (ALL_CATTLE, "vaccine", "Clostridial 7-way (Ultrabac 7)", "5 mL", "SC", "", -150, -150,
     "Annual / calfhood clostridial", "21 days slaughter", None),
    (CALVES, "vaccine", "Clostridial 7-way booster", "5 mL", "SC", "", -120, -120, "Calfhood booster", "", None),
    (["Edith", "Unnamed Calf"], "vaccine", "Brucellosis RB51 (vet administered)", "2 mL", "SC", "", 6, 6,
     "Official calfhood vaccination, 4–12 months", "", None),
    (CALVES, "vaccine", "Bovi-Shield Gold 5 (weaning dose)", "2 mL", "IM", "", 10, 10, "Weaning vaccination", "", None),
    (["Harold", "Angus"], "vaccine", "Vibrio-Lepto 5", "5 mL", "IM", "", 20, 20, "Annual bull vaccination", "", None),
    ("Gertrude", "vaccine", "ScourGuard 4KC (dose 1)", "2 mL", "IM", "", -12, -12, "Pre-calving scour protection", "", None),
    ("Gertrude", "vaccine", "ScourGuard 4KC (dose 2)", "2 mL", "IM", "", 9, 9, "Pre-calving booster", "", None),
    ("Gertrude", "supplement", "Vitamin E & selenium (Bo-Se)", "1 mL / 40 lb", "SC", "", 14, 14,
     "Pre-calving; prevents retained placenta", "", None),
    ("species:cow", "medication", "Ivermectin pour-on (Ivomec)", "1 mL / 22 lb", "Pour-on", "09:00", 5, 5,
     "Fall parasite control", "48 days slaughter", None),
    # --- Cattle: medications ---
    ("Lucy", "medication", "Tulathromycin (Draxxin)", "1.1 mL / 100 lb (≈11 mL)", "SC", "08:00", -4, -4,
     "BRD", "18 days slaughter", "Bovine respiratory disease (BRD)"),
    ("Lucy", "medication", "Flunixin meglumine (Banamine)", "1 mL / 100 lb (≈10 mL)", "IV", "08:00", -4, -2,
     "Fever & inflammation", "4 days slaughter", "Bovine respiratory disease (BRD)"),
    ("Lucy", "medication", "Temperature check + isolation pen", "Rectal temp", "Check", "08:00,18:00", -4, 3,
     "Monitor response to BRD treatment", "", "Bovine respiratory disease (BRD)"),
    ("Chuck", "medication", "Oral electrolytes", "2 quarts", "Oral", "07:00,19:00", -172, -166, "Calf scours", "",
     "Neonatal calf scours"),
    ("Harold", "medication", "Oxytetracycline (LA-200)", "4.5 mL / 100 lb", "SC", "08:00", -420, -420, "Pinkeye",
     "28 days slaughter", "Pinkeye (infectious bovine keratoconjunctivitis)"),
    ("Maggie", "medication", "Ceftiofur (Excede)", "1.5 mL / 100 lb", "SC (ear)", "08:00", -61, -61, "Foot rot",
     "13 days slaughter", "Foot rot"),
    # --- Pigs: vaccines ---
    (PIGLETS, "supplement", "Iron dextran", "100 mg", "IM", "", "birth+3", "birth+3", "Prevent piglet anaemia", "", None),
    (PIGLETS, "vaccine", "Mycoplasma + PCV2 (Circumvent PCV-M G2)", "2 mL", "IM", "", "birth+21", "birth+21",
     "Weaning-age vaccination", "21 days slaughter", None),
    (PIGLETS, "vaccine", "Erysipelas (ER Bac Plus)", "2 mL", "IM", "", "birth+56", "birth+56",
     "Grower vaccination", "21 days slaughter", None),
    ("Hamela Anderson", "vaccine", "FarrowSure Gold (parvo, erysipelas, lepto)", "5 mL", "IM", "", -150, -150,
     "Pre-breeding", "21 days slaughter", None),
    ("Kevin Bacon", "vaccine", "FarrowSure Gold (parvo, erysipelas, lepto)", "5 mL", "IM", "", -180, -180,
     "Every 6 months", "21 days slaughter", None),
    ("Kevin Bacon", "vaccine", "FarrowSure Gold booster", "5 mL", "IM", "", 3, 3, "6-month booster", "", None),
    ("Hamela Anderson", "medication", "Ivermectin (Ivomec 1%)", "1 mL / 75 lb", "SC", "09:00", -24, -24,
     "Pre-farrowing deworming", "18 days slaughter", None),
    # --- Pigs: medications ---
    ("Hogwarts", "medication", "Spectinomycin oral (Spectam Scour-Halt)", "1 pump (≈50 mg)", "Oral", "07:00,19:00",
     -2, 1, "E. coli scours", "21 days slaughter", "E. coli scours"),
    ("Hogwarts", "supplement", "Oral electrolytes", "30 mL", "Oral", "07:00,13:00,19:00", -2, 2,
     "Rehydration", "", "E. coli scours"),
    ("Hamela Anderson", "medication", "Oxytocin", "1 mL (20 IU)", "IM", "08:00", -13, -13, "Milk let-down",
     "", "Postpartum fever (mild MMA)"),
    ("Hamela Anderson", "medication", "Flunixin meglumine (Banamine)", "1 mL / 45 lb", "IM", "08:00", -13, -11,
     "Fever & udder inflammation", "12 days slaughter", "Postpartum fever (mild MMA)"),
    ("Kevin Bacon", "medication", "Penicillin G procaine", "1 mL / 100 lb", "IM", "08:00", -200, -196,
     "Swine erysipelas", "14 days slaughter", "Swine erysipelas"),
]

# ---------------------------------------------------------------------------
# Feeders: name, zone, type, serves, last_refilled_offset, interval_days,
#          [(feed, category, capacity, daily_usage)]
# current level = capacity - usage * days since refill (floored at 0).
# ---------------------------------------------------------------------------
FEEDERS = [
    ("Longbourn Tube Feeder", "Longbourn Coop", "Hanging tube feeder", "5 hens, 1 rooster", -9, 14, [
        ("Layer pellets 16% protein", "Pellets", 50, 1.45),
        ("Oyster shell (free choice)", "Calcium", 10, 0.12),
    ]),
    ("Orchard Treadle Feeder", "Orchard Coop", "Treadle feeder", "4 hens, 2 roosters", -27, 14, [
        ("Layer pellets 16% protein", "Pellets", 50, 1.55),
        ("Oyster shell (free choice)", "Calcium", 10, 0.1),
        ("Scratch grains (treat)", "Grain", 15, 0.2),
    ]),
    ("Frat House Trough", "Frat House Coop", "Chick trough feeder", "8 young birds", -5, 10, [
        ("Medicated chick starter/grower 20% (amprolium)", "Crumble", 25, 0.7),
        ("Chick grit", "Grit", 5, 0.03),
    ]),
    ("Neverland Brooder Feeder", "Neverland Brooder", "Chick feeder + quart waterer", "5 chicks", -3, 7, [
        ("Medicated chick starter 20% (amprolium)", "Crumble", 10, 0.3),
        ("Chick vitamins & electrolytes", "Water additive", 1, 0.02),
    ]),
    ("Cloverfield Sow Trough", "Cloverfield Pasture", "Covered trough", "Sow (lactating)", -6, 10, [
        ("Sow lactation ration 17%", "Pellets", 300, 13.5),
        ("Swine mineral premix", "Mineral", 25, 0.2),
    ]),
    ("Cloverfield Boar Feeder", "Cloverfield Pasture", "Self feeder", "Boar", -6, 14, [
        ("Sow & boar maintenance ration 14%", "Pellets", 150, 5.5),
    ]),
    ("Farrowing Creep Feeder", "Cloverfield Farrowing Barn", "Creep feeder (piglets only)", "8 piglets", -4, 7, [
        ("Piglet creep feed 22% (pre-starter)", "Pellets", 25, 0.45),
    ]),
    ("Upper Hay Ring", "Upper Enclosure", "Round-bale hay ring", "2 bulls", -10, 14, [
        ("Grass hay (round bale)", "Hay", 1000, 72),
        ("Loose cattle mineral", "Mineral", 50, 0.3),
    ]),
    ("Upper Grain Bunk", "Upper Enclosure", "Bunk feeder", "2 bulls", -3, 14, [
        ("Bull grain mix 14%", "Grain", 200, 8),
    ]),
    ("Lower Hay Ring", "Lower Enclosure", "Round-bale hay ring", "3 heifers, 3 calves", -8, 10, [
        ("Grass/alfalfa mixed hay (round bale)", "Hay", 1200, 102),
        ("Loose cattle mineral", "Mineral", 50, 0.5),
    ]),
    ("Lower Calf Creep Feeder", "Lower Enclosure", "Creep gate feeder (calves only)", "3 calves", -8, 10, [
        ("Calf grower pellets 16%", "Pellets", 150, 15),
    ]),
    ("Lower Heifer Bunk", "Lower Enclosure", "Bunk feeder", "Gertrude, Lucy", -5, 10, [
        ("Close-up / heifer concentrate 14%", "Grain", 150, 9),
    ]),
]
