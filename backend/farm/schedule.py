"""
Daily feeding and medication schedule.

Feed rations are rules keyed on species, life stage, sex and fertility status,
scaled by the animal's latest weight where the ration is weight-based. Doses
come from the animal's active Treatment records. Figures follow common
extension-service guidance and are a starting point, not veterinary advice.
"""

from datetime import timedelta

from .models import Animal


def _lbs(value):
    return f"{value:.2f} lb" if value < 1 else f"{value:.1f} lb"


def _item(time, category, item, amount="", notes=""):
    return {"time": time, "category": category, "item": item, "amount": amount, "notes": notes}


def chicken_plan(a, weight):
    stage, fert = a.life_stage, a.fertility_status
    if stage == "chick":
        basis = f"Chick, {a.age_days} days old. Needs 20% protein starter and steady warmth."
        items = [
            _item("07:00", "feed", "Medicated chick starter crumble 20%", "Free choice (~0.06 lb/day)",
                  "Top up feeder; check brooder is 90–95 °F minus 5 °F per week."),
            _item("07:00", "water", "Fresh water + chick vitamins/electrolytes", "1 qt waterer",
                  "Electrolytes for the first 2 weeks only." if a.age_days <= 14 else ""),
            _item("12:00", "check", "Feeder & waterer check", "", "Clear bedding from waterer."),
            _item("17:00", "feed", "Medicated chick starter crumble 20%", "Top up"),
        ]
    elif stage in ("pullet", "cockerel"):
        basis = "Growing bird. Needs 16–18% grower feed and no extra calcium until laying."
        items = [
            _item("07:00", "feed", "Grower feed 16–18%", "Free choice (~0.18 lb/day)"),
            _item("16:00", "feed", "Grower feed 16–18%", "Top up"),
        ]
    elif a.sex == "M":
        basis = "Adult rooster in a laying flock. Eats the flock ration; oyster shell stays optional."
        items = [
            _item("07:00", "feed", "Layer pellets 16% (flock ration)", _lbs(0.14)),
            _item("15:00", "feed", "Scratch grains (treat, ≤10% of diet)", _lbs(0.02)),
            _item("16:30", "feed", "Layer pellets 16% (flock ration)", _lbs(0.14)),
        ]
    elif fert == "brooding":
        basis = "Broody hen. She eats and drinks little, so put food and water within reach of the nest."
        items = [
            _item("07:00", "feed", "Layer pellets 16% beside the nest", _lbs(0.08),
                  "Lift her off the nest briefly to eat, drink and dust bathe."),
            _item("07:00", "water", "Fresh water beside nest", "Refill"),
            _item("17:00", "feed", "Layer pellets 16% beside the nest", _lbs(0.08)),
        ]
    else:
        basis = "Laying hen. Needs 16% layer ration plus free-choice calcium for shell quality."
        items = [
            _item("07:00", "feed", "Layer pellets 16%", _lbs(0.13)),
            _item("07:00", "feed", "Oyster shell", "Free choice", "Offer separately, not mixed in."),
            _item("15:00", "feed", "Scratch grains (treat, ≤10% of diet)", _lbs(0.02)),
            _item("16:30", "feed", "Layer pellets 16%", _lbs(0.12)),
            _item("17:30", "check", "Egg collection", ""),
        ]
    return basis, items


def cow_plan(a, weight):
    stage, fert = a.life_stage, a.fertility_status
    hay = weight * (0.025 if stage in ("calf", "yearling") else 0.02)
    if stage == "neonatal calf":
        basis = "Pre-weaning calf. Feed milk replacer at ~12% of body weight and introduce calf starter."
        milk = weight * 0.12 / 2
        items = [
            _item("06:30", "feed", "Milk replacer (20:20)", _lbs(milk)),
            _item("06:30", "feed", "Calf starter 18%", "Free choice"),
            _item("18:00", "feed", "Milk replacer (20:20)", _lbs(milk)),
        ]
    elif stage == "calf":
        basis = f"Weaned calf, {a.age_days // 30} months. Needs grower pellets and good-quality hay."
        pellets = min(6.0, weight * 0.012)
        items = [
            _item("06:30", "feed", "Calf grower pellets 16% (creep feeder)", _lbs(pellets / 2)),
            _item("06:30", "feed", "Grass/alfalfa hay", _lbs(hay), "Free choice from the hay ring."),
            _item("17:30", "feed", "Calf grower pellets 16% (creep feeder)", _lbs(pellets / 2)),
            _item("17:30", "feed", "Loose cattle mineral", "Free choice"),
        ]
    elif a.sex == "M":
        basis = "Adult bull, maintenance ration. Forage-based with a small grain top-up."
        items = [
            _item("06:30", "feed", "Grass hay", _lbs(hay), "Free choice from the hay ring."),
            _item("06:30", "feed", "Bull grain mix 14%", _lbs(4)),
            _item("17:30", "feed", "Loose cattle mineral", "Free choice"),
        ]
    elif fert == "pregnant":
        basis = "Pregnant heifer, last trimester. Raise energy and use a close-up mineral; no free-choice salt/limestone."
        items = [
            _item("06:30", "feed", "Grass/alfalfa hay", _lbs(weight * 0.022)),
            _item("06:30", "feed", "Close-up heifer concentrate 14%", _lbs(2.5)),
            _item("17:30", "feed", "Close-up heifer concentrate 14%", _lbs(2.5)),
            _item("17:30", "feed", "Pre-calving (anionic) mineral", "4 oz"),
            _item("20:00", "check", "Calving watch", "", "Check for springing udder, relaxed pin bones."),
        ]
    elif fert == "lactating":
        basis = "Lactating cow. Forage plus about 1 lb concentrate per 3 lb of milk."
        items = [
            _item("05:30", "feed", "Grass/alfalfa hay", _lbs(weight * 0.025)),
            _item("05:30", "feed", "Dairy concentrate 16%", _lbs(8)),
            _item("17:00", "feed", "Dairy concentrate 16%", _lbs(8)),
        ]
    elif stage == "yearling":
        basis = "Yearling heifer, still growing. Hay plus a modest concentrate to reach breeding weight."
        items = [
            _item("06:30", "feed", "Grass/alfalfa hay", _lbs(hay)),
            _item("06:30", "feed", "Heifer concentrate 14%", _lbs(2)),
            _item("17:30", "feed", "Heifer concentrate 14%", _lbs(2)),
            _item("17:30", "feed", "Loose cattle mineral", "Free choice"),
        ]
    else:
        basis = "Open (non-pregnant) adult cow. Maintenance on forage alone."
        items = [
            _item("06:30", "feed", "Grass/alfalfa hay", _lbs(hay)),
            _item("17:30", "feed", "Loose cattle mineral", "Free choice"),
        ]
    return basis, items


def pig_plan(a, weight):
    stage, fert = a.life_stage, a.fertility_status
    if stage == "nursing piglet":
        basis = f"Nursing piglet, {a.age_days} days. Mostly sow's milk; creep feed from day 7–10."
        items = [
            _item("Every 1–2 h", "feed", "Nursing (sow's milk)", "On demand"),
            _item("08:00", "feed", "Piglet creep feed 22%", "A small handful (~0.05 lb)" if a.age_days >= 7 else "Not yet",
                  "Refresh twice daily so it stays palatable."),
            _item("08:00", "check", "Heat lamp & creep area 85–90 °F", ""),
            _item("16:00", "feed", "Piglet creep feed 22%", "Refresh" if a.age_days >= 7 else "Not yet"),
        ]
    elif stage == "weaner":
        basis = "Weaned pig. Needs a 20–22% starter ration."
        items = [
            _item("07:00", "feed", "Starter ration 20–22%", _lbs(0.6)),
            _item("12:00", "feed", "Starter ration 20–22%", _lbs(0.6)),
            _item("17:00", "feed", "Starter ration 20–22%", _lbs(0.6)),
        ]
    elif stage == "grower":
        basis = "Grower pig. Needs a 16–18% grower ration."
        items = [
            _item("07:00", "feed", "Grower ration 16–18%", _lbs(2.2)),
            _item("17:00", "feed", "Grower ration 16–18%", _lbs(2.2)),
        ]
    elif fert == "lactating":
        litter = a.offspring.count()
        total = 6 + 1 * litter  # ~6 lb maintenance + 1 lb per nursing piglet
        basis = f"Lactating sow nursing {litter} piglets. Ration is 6 lb plus 1 lb per piglet, over 3 feeds."
        items = [
            _item("07:00", "feed", "Sow lactation ration 17%", _lbs(total / 3)),
            _item("12:00", "feed", "Sow lactation ration 17%", _lbs(total / 3)),
            _item("17:00", "feed", "Sow lactation ration 17%", _lbs(total / 3)),
            _item("07:00", "water", "Clean water check", "≥ 8 gal/day", "Lactating sows drink a lot."),
            _item("12:00", "check", "Udder & appetite check", "", "Watch for recurrence of fever / firm udder."),
        ]
    elif fert == "pregnant":
        basis = "Gestating sow. Needs a limited maintenance ration."
        items = [
            _item("07:00", "feed", "Sow & boar maintenance ration 14%", _lbs(2.5)),
            _item("17:00", "feed", "Sow & boar maintenance ration 14%", _lbs(2.5)),
        ]
    else:
        per_day = max(4.0, weight * 0.018)
        basis = "Adult boar, maintenance ration at ~1.8% of body weight."
        items = [
            _item("07:00", "feed", "Sow & boar maintenance ration 14%", _lbs(per_day / 2)),
            _item("17:00", "feed", "Sow & boar maintenance ration 14%", _lbs(per_day / 2)),
        ]
    return basis, items


PLANS = {"chicken": chicken_plan, "cow": cow_plan, "pig": pig_plan}


def animal_schedule(animal, day, latest_weight=None):
    weight = float(latest_weight or 0)
    basis, items = PLANS[animal.species](animal, weight)

    # Sick animals: add a daily health check.
    if animal.health_status == Animal.Health.SICK:
        items.append(_item("08:00", "check", "Sick-animal check (temperature, appetite, droppings)", "",
                           "Isolate from the group if possible."))

    upcoming = []
    for t in animal.treatments.all():
        end = t.end_date or t.start_date
        if t.start_date <= day <= end:
            times = [s.strip() for s in t.times.split(",") if s.strip()] or ["09:00"]
            for tm in times:
                items.append(_item(tm, t.kind, t.name, t.dose,
                                   f"{t.route} · {t.reason}" + (f" · Withdrawal: {t.withdrawal}" if t.withdrawal else "")))
        elif day < t.start_date <= day + timedelta(days=21):
            upcoming.append({"date": t.start_date, "kind": t.kind, "name": t.name, "dose": t.dose, "reason": t.reason})

    items.sort(key=lambda i: (i["time"][0].isdigit(), i["time"]))
    upcoming.sort(key=lambda u: u["date"])
    return {"basis": basis, "items": items, "upcoming": upcoming}
