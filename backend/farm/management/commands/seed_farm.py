"""
Populate the database with the EcoTrack farm.

    python manage.py seed_farm            # wipe farm data and reseed
    python manage.py seed_farm --keep-user

Output is deterministic for a given run date (fixed RNG seed). Ages in the
source files are measured back from the day the command runs.
"""

import math
import random
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from farm.models import (
    Animal, Feeder, FeederContent, HealthEvent, LocationPing, TemperatureRecord,
    Treatment, UserProfile, WeightRecord, Zone,
)

from . import farm_data as D

DEMO_USERNAME = "rachel"
DEMO_PASSWORD = "EcoTrack2026!"
TRACK_HOURS = 72
TRACK_STEP_MIN = 30

GROWTH_K = {"chicken": 0.15, "cow": 0.03, "pig": 0.035}  # Gompertz rate per week
MATURE_AGE_WEEKS = {"chicken": 26, "cow": 100, "pig": 60}
TEMP_NOISE = {"chicken": 0.35, "cow": 0.3, "pig": 0.3}


# --------------------------------------------------------------------------- growth
def gompertz(t_weeks, w0, w_inf, k):
    b = math.log(w_inf / w0)
    return w_inf * math.exp(-b * math.exp(-k * t_weeks))


def fit_growth(species, sex, breed, age_weeks, target):
    """Return (w0, w_inf, k) so that the curve hits `target` at `age_weeks`."""
    w0 = D.BIRTH_WEIGHT.get((species, breed), D.BIRTH_WEIGHT.get((species, None)))
    w_inf = D.MATURE_WEIGHT[(species, sex)]
    k = GROWTH_K[species]
    if target is None:
        return w0, w_inf, k
    if age_weeks >= MATURE_AGE_WEEKS[species]:
        # Mature animal: keep the species growth rate, solve the asymptote.
        lo, hi = target, target * 3
        for _ in range(60):
            mid = (lo + hi) / 2
            if gompertz(age_weeks, w0, mid, k) < target:
                lo = mid
            else:
                hi = mid
        return w0, (lo + hi) / 2, k
    # Young animal: keep the asymptote, solve the rate.
    b = math.log(w_inf / w0)
    ratio = math.log(w_inf / target) / b
    k = -math.log(ratio) / max(age_weeks, 0.1)
    return w0, w_inf, k


def base_temp(species, age_days):
    if species == "chicken":  # chicks start ~103.5 °F and settle ~106 °F by 3 weeks
        return 103.5 + 2.5 * min(age_days, 21) / 21
    if species == "cow":  # calves run warmer, 102 → 101.5
        return 102.0 - 0.5 * min(age_days, 180) / 180
    return 103.0 - 1.0 * min(age_days, 60) / 60  # pigs: piglets 103 → adult 102


def fever(events, day, today):
    """Extra degrees F on `day` from any illness episode covering it."""
    rise = 0.0
    for ev in events:
        end = ev.end_date or today
        if not (ev.start_date <= day <= end):
            continue
        span = max((end - ev.start_date).days, 1)
        pos = (day - ev.start_date).days / span
        if ev.end_date is None:  # ongoing: ramp up over 2 days then plateau
            shape = min(1.0, ((day - ev.start_date).days + 1) / 2.5)
        else:  # resolved: rise, plateau, fall
            shape = min(1.0, pos / 0.25) if pos < 0.25 else (1.0 if pos < 0.6 else max(0.0, (1 - pos) / 0.4))
        rise = max(rise, float(ev.peak_temp_rise_f) * shape)
    return rise


class Command(BaseCommand):
    help = "Wipe and reseed the EcoTrack farm data."

    def add_arguments(self, parser):
        parser.add_argument("--keep-user", action="store_true", help="Do not touch the demo user.")

    @transaction.atomic
    def handle(self, *args, **opts):
        self.rng = random.Random(20260929)
        self.today = date.today()

        for model in (LocationPing, TemperatureRecord, WeightRecord, Treatment, HealthEvent,
                      FeederContent, Feeder, Animal, Zone):
            model.objects.all().delete()

        zones = self.seed_zones()
        animals = self.seed_animals(zones)
        self.seed_health(animals)
        self.seed_treatments(animals)
        self.seed_measurements(animals)
        self.seed_tracking(animals)
        self.seed_feeders(zones)
        if not opts["keep_user"]:
            self.seed_user()

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {Animal.objects.count()} animals, {WeightRecord.objects.count()} weights, "
            f"{TemperatureRecord.objects.count()} temperatures, {Treatment.objects.count()} treatments, "
            f"{LocationPing.objects.count()} tracker pings, {Feeder.objects.count()} feeders."
        ))

    def day(self, offset):
        return self.today + timedelta(days=offset)

    # ----------------------------------------------------------------------- zones
    def seed_zones(self):
        zones = {}
        for name, area, kind, (x, y, w, h), roam in D.ZONES:
            rx, ry, rw, rh = roam if roam else (None,) * 4
            zones[name] = Zone.objects.create(
                name=name, slug=slugify(name), area=area, kind=kind, x=x, y=y, width=w, height=h,
                roam_x=rx, roam_y=ry, roam_width=rw, roam_height=rh,
            )
        return zones

    # ----------------------------------------------------------------------- animals
    def seed_animals(self, zones):
        animals = {}
        tag_prefix = {"chicken": "CH", "cow": "CW", "pig": "PG"}
        for species, rows in (("chicken", D.CHICKENS), ("cow", D.COWS), ("pig", D.PIGS)):
            for i, (label, sex, name, breed, age_days, fert, zone, eggs, weight) in enumerate(rows, 1):
                # "1 yr" style ages are approximate; spread birthdays within the month.
                jitter = self.rng.randint(0, 20) if age_days >= 300 else 0
                a = Animal.objects.create(
                    species=species, name=name, slug=slugify(name), tag_id=f"{tag_prefix[species]}-{i:03d}",
                    type_label=label, sex=sex, breed=breed, birth_date=self.day(-(age_days + jitter)),
                    fertility_status=fert, zone=zones[zone], egg_count_mtd=eggs,
                    notes="Name and breed missing from Cows.txt — placeholder, please confirm." if name == "Unnamed Calf" else "",
                )
                a._target_weight = weight
                animals[name] = a
        dam = animals[D.PIGLET_DAM]
        for a in animals.values():
            if a.species == "pig" and a.type_label.endswith("Piglet"):
                a.dam = dam
                a.save(update_fields=["dam"])
        return animals

    # ----------------------------------------------------------------------- health
    def seed_health(self, animals):
        self.events = {}
        for name, condition, severity, start, end, rise, notes in D.HEALTH_EVENTS:
            a = animals[name]
            ev = HealthEvent.objects.create(
                animal=a, condition=condition, severity=severity, start_date=self.day(start),
                end_date=self.day(end) if end is not None else None,
                peak_temp_rise_f=Decimal(str(rise)), notes=notes,
            )
            self.events[(name, condition)] = ev
        for a in animals.values():
            evs = list(a.health_events.all())
            if any(e.end_date is None for e in evs):
                a.health_status = Animal.Health.SICK
            elif any(e.end_date and (self.today - e.end_date).days <= 7 for e in evs):
                a.health_status = Animal.Health.RECOVERING
            a.save(update_fields=["health_status"])

    # ----------------------------------------------------------------------- treatments
    def resolve_targets(self, target, animals):
        if isinstance(target, list):
            return [animals[n] for n in target]
        if target.startswith("species:"):
            sp = target.split(":", 1)[1]
            return [a for a in animals.values() if a.species == sp]
        return [animals[target]]

    def resolve_date(self, spec, animal):
        if spec is None:
            return None
        if isinstance(spec, str) and spec.startswith("birth+"):
            return animal.birth_date + timedelta(days=int(spec[6:]))
        return self.day(spec)

    def seed_treatments(self, animals):
        for target, kind, name, dose, route, times, start, end, reason, withdrawal, cond in D.TREATMENTS:
            for a in self.resolve_targets(target, animals):
                Treatment.objects.create(
                    animal=a, kind=kind, name=name, dose=dose, route=route, times=times,
                    start_date=self.resolve_date(start, a), end_date=self.resolve_date(end, a),
                    reason=reason, withdrawal=withdrawal,
                    health_event=self.events.get((a.name, cond)) if cond else None,
                )

    # ----------------------------------------------------------------------- weights & temps
    def seed_measurements(self, animals):
        weights, temps = [], []
        for a in animals.values():
            age_days = (self.today - a.birth_date).days
            events = list(a.health_events.all())
            target = a._target_weight
            if target is None and a.species == "chicken":
                # Chicks/teens weren't given weights: layer chicks gain roughly 6 g/day early on.
                target = round((0.09 + 0.013 * age_days) * self.rng.uniform(0.9, 1.1), 2)
            w0, w_inf, k = fit_growth(a.species, a.sex, a.breed, age_days / 7, float(target))

            # Weekly weigh-ins from birth; illness knocks a few percent off.
            weeks = age_days // 7
            for wk in range(weeks + 1):
                d = a.birth_date + timedelta(weeks=wk)
                w = gompertz(wk, w0, w_inf, k)
                if wk > 0:
                    w *= self.rng.gauss(1, 0.012)
                for ev in events:
                    end = ev.end_date or self.today
                    if ev.start_date <= d <= end + timedelta(days=10):
                        w *= {"mild": 0.985, "moderate": 0.96, "severe": 0.93}[ev.severity]
                if wk == weeks and target is not None and (self.today - d).days <= 3:
                    w = float(target)
                weights.append(WeightRecord(animal=a, date=d, weight_lbs=Decimal(f"{w:.2f}")))
            # Make sure the latest record reflects the given weight today.
            if target is not None and (self.today - (a.birth_date + timedelta(weeks=weeks))).days > 3:
                weights.append(WeightRecord(animal=a, date=self.today, weight_lbs=Decimal(f"{target:.2f}")))

            # Temperatures every two days from birth.
            for dd in range(0, age_days + 1, 2):
                d = a.birth_date + timedelta(days=dd)
                t = base_temp(a.species, dd) + self.rng.gauss(0, TEMP_NOISE[a.species]) + fever(events, d, self.today)
                temps.append(TemperatureRecord(animal=a, date=d, temp_f=Decimal(f"{t:.1f}")))
        WeightRecord.objects.bulk_create(weights, batch_size=2000)
        TemperatureRecord.objects.bulk_create(temps, batch_size=2000)

    # ----------------------------------------------------------------------- tracking
    def seed_tracking(self, animals):
        zones = {z.id: z for z in Zone.objects.all()}
        barn = Zone.objects.get(name="Cloverfield Farrowing Barn")
        now = timezone.now().replace(minute=0, second=0, microsecond=0)
        steps = TRACK_HOURS * 60 // TRACK_STEP_MIN
        pings = []
        for a in animals.values():
            z = zones[a.zone_id]
            home = (z.x, z.y, z.width, z.height)
            roam = (z.roam_x, z.roam_y, z.roam_width, z.roam_height) if z.roam_x is not None else home
            px = roam[0] + roam[2] * self.rng.random()
            py = roam[1] + roam[3] * self.rng.random()
            stride = {"chicken": 6, "cow": 14, "pig": 9}[a.species]
            if a.health_status == Animal.Health.SICK:
                stride *= 0.4  # sick animals move less
            for s in range(steps + 1):
                ts = now - timedelta(minutes=TRACK_STEP_MIN * (steps - s))
                hour = timezone.localtime(ts).hour
                box = roam
                if a.species == "chicken" and (hour >= 20 or hour < 6):
                    box = home  # chickens roost in the coop overnight
                if a.name == D.PIGLET_DAM and hour % 3 == 0:
                    box = (barn.x, barn.y, barn.width, barn.height)  # sow visits piglets to nurse
                px += self.rng.gauss(0, stride)
                py += self.rng.gauss(0, stride)
                # Pull back toward the allowed box.
                bx, by, bw, bh = box
                if not (bx <= px <= bx + bw):
                    px = bx + bw * self.rng.uniform(0.2, 0.8) if abs(px - (bx + bw / 2)) > bw else min(max(px, bx + 2), bx + bw - 2)
                if not (by <= py <= by + bh):
                    py = by + bh * self.rng.uniform(0.2, 0.8) if abs(py - (by + bh / 2)) > bh else min(max(py, by + 2), by + bh - 2)
                pings.append(LocationPing(animal=a, timestamp=ts, x=round(px, 1), y=round(py, 1)))
        LocationPing.objects.bulk_create(pings, batch_size=2000)

    # ----------------------------------------------------------------------- feeders
    def seed_feeders(self, zones):
        for name, zone, ftype, serves, refilled, interval, contents in D.FEEDERS:
            f = Feeder.objects.create(
                name=name, zone=zones[zone], feeder_type=ftype, serves=serves,
                last_refilled=self.day(refilled), refill_interval_days=interval,
            )
            days = -refilled
            for feed, cat, cap, usage in contents:
                current = max(0.0, cap - usage * days)
                FeederContent.objects.create(
                    feeder=f, feed_name=feed, category=cat, capacity_lbs=Decimal(str(cap)),
                    current_lbs=Decimal(f"{current:.1f}"), daily_usage_lbs=Decimal(str(usage)),
                )

    # ----------------------------------------------------------------------- user
    def seed_user(self):
        User = get_user_model()
        user, created = User.objects.get_or_create(
            username=DEMO_USERNAME,
            defaults={"first_name": "Rachel", "last_name": "Mizer", "email": "rachel@ecotrack.example"},
        )
        if created:
            user.set_password(DEMO_PASSWORD)
            user.is_staff = True
            user.is_superuser = True
            user.save()
            self.stdout.write(f"Created demo user '{DEMO_USERNAME}' / '{DEMO_PASSWORD}'")
        UserProfile.objects.update_or_create(
            user=user,
            defaults={"farm_name": "EcoTrack Demo Farm", "role": "Farm Owner",
                      "phone": "", "farm_address": ""},
        )
