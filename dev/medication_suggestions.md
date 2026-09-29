# EcoTrack: medication and care suggestions (please review)

The spec asked for some animals to be sick now or in the past, with medication changes to match. The illnesses,
drugs and doses below are **illustrative**. I chose them from common US farm practice, and a veterinarian should
confirm them before anything is presented as real advice. They live in
`backend/farm/management/commands/farm_data.py` (`HEALTH_EVENTS` and `TREATMENTS`). Edit that file and re-run
`python manage.py seed_farm` to change them.

## Currently sick (shows ▲ Sick; temperatures show a fever)

| Animal | Condition | Treatment in the data | Notes / withdrawal |
|---|---|---|---|
| Lydia (hen) | Respiratory infection, suspected Mycoplasma gallisepticum, started 6 days ago | Tylosin (Tylan Soluble) in water, 1 tsp/gal, 6 days; vitamins/electrolytes | Discard eggs during treatment + 5 days. Confirm the MG diagnosis with a lab test. MG birds can stay carriers, so culling may be advised. |
| Lucy (Simmental heifer) | Bovine respiratory disease, started 4 days ago, fever peaked at 104.6 °F | Tulathromycin (Draxxin) single SC dose; flunixin (Banamine) IV × 3 days; temperature checks twice a day | Slaughter withdrawal: Draxxin 18 days, Banamine 4 days. Draxxin and Banamine are prescription-only (Rx). |
| Hogwarts (boar piglet) | E. coli scours, started 2 days ago | Spectinomycin oral (Spectam Scour-Halt) twice a day × 4 days; oral electrolytes 3× a day | Keep the creep area warm. If scours spread to the litter, the sow should get an E. coli vaccine before her next farrowing. |

## Recovering or past illnesses

| Animal | Condition | Treatment |
|---|---|---|
| Rose (hen teen) | Coccidiosis at 7 days old, ended 2 days ago | Amprolium (Corid) 9.6% in water × 7 days, then probiotic/vitamin B |
| Michael (rooster chick) | Pasty butt | Daily warm-water cleaning |
| Fred (rooster) | Bumblefoot, about 4 months ago | Chlorhexidine soaks + wound spray |
| Meg (hen) | Northern fowl mites, about 2 months ago | Elector PSP (spinosad) spray, repeated after 14 days, no egg withdrawal |
| Chuck (bull calf) | Neonatal calf scours at about a week old | Oral electrolytes twice a day |
| Harold (bull) | Pinkeye, last year | Oxytetracycline (LA-200) plus an eye patch |
| Maggie (Highland) | Foot rot, about 2 months ago | Ceftiofur (Excede), Rx |
| Hamela Anderson (sow) | Postpartum fever (mild MMA) after farrowing | Oxytocin + flunixin × 3 days, Rx |
| Kevin Bacon (boar) | Swine erysipelas, about 6.5 months ago | Penicillin G procaine × 5 days |

## Routine vaccinations and preventives in the data

- **Chickens:** Marek's at hatch; Newcastle–Bronchitis (B1) eye drop at ~3 weeks. All chicks and teens have this dose coming up in the next 1–9 days. Fowl pox at ~12 weeks. Chicks are on medicated (amprolium) starter feed.
- **Cattle:** Bovi-Shield Gold FP5 L5 and a clostridial 7-way yearly, with calfhood boosters. Brucellosis RB51 for the heifer calves (must be given by a vet). Weaning dose of Bovi-Shield Gold 5 for the calves. Vibrio-Lepto for the bulls. ScourGuard 4KC for Gertrude in 2 doses before calving, then Bo-Se (vitamin E/selenium) before calving. Ivermectin pour-on for all cattle in 5 days (fall parasite control).
- **Pigs:** Iron dextran for the piglets at day 3. Mycoplasma + PCV2 at 3 weeks (next week) and erysipelas at 8 weeks. FarrowSure Gold for the sow and boar (the boar's 6-month booster is in 3 days). Ivermectin for the sow before farrowing.

## Questions for you

1. **Do these illnesses and drugs match what you want?** Tell me if a vet or the farm uses different products.
2. **The unnamed heifer calf** in Cows.txt (7 months) has no name or breed. It is stored as "Unnamed Calf" with breed "Unrecorded" until you send both.
3. **Hen breeds:** Chickens.txt uses both "Isa Red" and "Isa Brown". I kept them as written. If they are meant to be the same breed, tell me and I'll change it.
4. **Brooding hens** (Jane, Kitty, Mary, Jo, Meg) have normal egg counts month-to-date. Brooding hens usually stop laying, so the numbers may need adjusting.
5. **Piglet weights** (3.1–4.0 lb at 14 days) are light for the age. A typical 14-day piglet weighs 8–10 lb. I kept the file's values as their current weights.
