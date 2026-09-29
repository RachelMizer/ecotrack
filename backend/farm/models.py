from datetime import date, timedelta

from django.conf import settings
from django.db import models


class Species(models.TextChoices):
    CHICKEN = "chicken", "Chicken"
    COW = "cow", "Cow"
    PIG = "pig", "Pig"


class Zone(models.Model):
    """A named place on the farm map (coop, pen, enclosure, barn...)."""

    class Area(models.TextChoices):
        COOPS = "coops", "Coops"
        PENS = "pens", "Pens"
        ENCLOSURES = "enclosures", "Enclosures"

    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(unique=True)
    area = models.CharField(max_length=20, choices=Area.choices)
    kind = models.CharField(max_length=40)  # coop, brooder, pasture, barn, enclosure
    # Rectangle on the farm map, in map units (map is 1000 x 650).
    x = models.FloatField()
    y = models.FloatField()
    width = models.FloatField()
    height = models.FloatField()
    # Optional roaming yard the animals range into (e.g. a coop's run).
    roam_x = models.FloatField(null=True, blank=True)
    roam_y = models.FloatField(null=True, blank=True)
    roam_width = models.FloatField(null=True, blank=True)
    roam_height = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ["area", "name"]

    def __str__(self):
        return self.name


class Animal(models.Model):
    class Sex(models.TextChoices):
        FEMALE = "F", "Female"
        MALE = "M", "Male"

    class Fertility(models.TextChoices):
        LAYING = "laying", "Laying"
        BROODING = "brooding", "Brooding"
        PREGNANT = "pregnant", "Pregnant (calving)"
        LACTATING = "lactating", "Lactating / nursing"
        OPEN = "open", "Not calving"
        BREEDING_MALE = "breeding_male", "Breeding male"
        IMMATURE = "immature", "Immature"

    class Health(models.TextChoices):
        HEALTHY = "healthy", "Healthy"
        SICK = "sick", "Sick"
        RECOVERING = "recovering", "Recovering"

    species = models.CharField(max_length=10, choices=Species.choices)
    name = models.CharField(max_length=80)
    slug = models.SlugField(unique=True)
    tag_id = models.CharField(max_length=20, unique=True)
    type_label = models.CharField(max_length=40)  # "Hen", "Bull Calf", "Sow Piglet"...
    sex = models.CharField(max_length=1, choices=Sex.choices)
    breed = models.CharField(max_length=60)
    birth_date = models.DateField()
    fertility_status = models.CharField(max_length=20, choices=Fertility.choices)
    zone = models.ForeignKey(Zone, on_delete=models.PROTECT, related_name="animals")
    egg_count_mtd = models.PositiveIntegerField(null=True, blank=True)
    dam = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="offspring"
    )
    health_status = models.CharField(max_length=12, choices=Health.choices, default=Health.HEALTHY)
    photo = models.CharField(max_length=200, blank=True, help_text="Path under /animals/ in the frontend")
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["species", "name"]

    def __str__(self):
        return f"{self.name} ({self.get_species_display()})"

    @property
    def age_days(self):
        return (date.today() - self.birth_date).days

    @property
    def life_stage(self):
        """Coarse life stage used by the schedule rules and dashboard filters."""
        weeks = self.age_days / 7
        if self.species == Species.CHICKEN:
            if weeks < 6:
                return "chick"
            if weeks < 18:
                return "pullet" if self.sex == "F" else "cockerel"
            return "adult"
        if self.species == Species.COW:
            if weeks < 8:
                return "neonatal calf"
            if weeks < 52:
                return "calf"
            if weeks < 104:
                return "yearling"
            return "adult"
        # pig
        if weeks < 4:
            return "nursing piglet"
        if weeks < 10:
            return "weaner"
        if weeks < 26:
            return "grower"
        return "adult"


class WeightRecord(models.Model):
    """Weekly weigh-in, starting at birth / hatching."""

    animal = models.ForeignKey(Animal, on_delete=models.CASCADE, related_name="weights")
    date = models.DateField()
    weight_lbs = models.DecimalField(max_digits=7, decimal_places=2)

    class Meta:
        ordering = ["animal", "date"]
        unique_together = [("animal", "date")]


class TemperatureRecord(models.Model):
    """Core body temperature, taken every two days."""

    animal = models.ForeignKey(Animal, on_delete=models.CASCADE, related_name="temperatures")
    date = models.DateField()
    temp_f = models.DecimalField(max_digits=5, decimal_places=1)

    class Meta:
        ordering = ["animal", "date"]
        unique_together = [("animal", "date")]


class HealthEvent(models.Model):
    """An illness or injury episode. end_date is empty while ongoing."""

    class Severity(models.TextChoices):
        MILD = "mild", "Mild"
        MODERATE = "moderate", "Moderate"
        SEVERE = "severe", "Severe"

    animal = models.ForeignKey(Animal, on_delete=models.CASCADE, related_name="health_events")
    condition = models.CharField(max_length=120)
    severity = models.CharField(max_length=10, choices=Severity.choices)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    peak_temp_rise_f = models.DecimalField(max_digits=3, decimal_places=1, default=0)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-start_date"]

    @property
    def ongoing(self):
        return self.end_date is None


class Treatment(models.Model):
    """A vaccination, medication course or supplement given to an animal."""

    class Kind(models.TextChoices):
        VACCINE = "vaccine", "Vaccination"
        MEDICATION = "medication", "Medication"
        SUPPLEMENT = "supplement", "Supplement"

    animal = models.ForeignKey(Animal, on_delete=models.CASCADE, related_name="treatments")
    health_event = models.ForeignKey(
        HealthEvent, null=True, blank=True, on_delete=models.SET_NULL, related_name="treatments"
    )
    kind = models.CharField(max_length=12, choices=Kind.choices)
    name = models.CharField(max_length=120)
    dose = models.CharField(max_length=120, blank=True)
    route = models.CharField(max_length=60, blank=True)  # oral, water, IM, SC, topical...
    times = models.CharField(max_length=60, blank=True, help_text="Comma-separated HH:MM dosing times")
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    reason = models.CharField(max_length=200, blank=True)
    withdrawal = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["-start_date"]

    @property
    def status(self):
        today = date.today()
        if self.start_date > today:
            return "scheduled"
        if self.end_date is None or self.end_date >= today:
            return "active"
        return "completed"


class LocationPing(models.Model):
    """A GPS/RFID tracker fix, in farm-map coordinates."""

    animal = models.ForeignKey(Animal, on_delete=models.CASCADE, related_name="pings")
    timestamp = models.DateTimeField()
    x = models.FloatField()
    y = models.FloatField()

    class Meta:
        ordering = ["animal", "timestamp"]
        indexes = [models.Index(fields=["timestamp"])]


class Feeder(models.Model):
    name = models.CharField(max_length=80)
    zone = models.ForeignKey(Zone, on_delete=models.PROTECT, related_name="feeders")
    feeder_type = models.CharField(max_length=60)
    serves = models.CharField(max_length=120)
    last_refilled = models.DateField()
    refill_interval_days = models.PositiveIntegerField()
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["zone__area", "name"]

    def __str__(self):
        return self.name


class FeederContent(models.Model):
    """One compartment / feed type held by a feeder."""

    feeder = models.ForeignKey(Feeder, on_delete=models.CASCADE, related_name="contents")
    feed_name = models.CharField(max_length=120)
    category = models.CharField(max_length=40)  # pellets, crumble, hay, mineral, grain...
    capacity_lbs = models.DecimalField(max_digits=7, decimal_places=1)
    current_lbs = models.DecimalField(max_digits=7, decimal_places=1)
    daily_usage_lbs = models.DecimalField(max_digits=6, decimal_places=2)

    @property
    def percent_full(self):
        return round(float(self.current_lbs) / float(self.capacity_lbs) * 100)

    @property
    def days_remaining(self):
        usage = float(self.daily_usage_lbs)
        return round(float(self.current_lbs) / usage, 1) if usage else None


class Incubator(models.Model):
    name = models.CharField(max_length=80)
    zone = models.ForeignKey(Zone, on_delete=models.PROTECT, related_name="incubators")
    capacity = models.PositiveIntegerField(default=12)
    incubation_days = models.PositiveIntegerField(default=21)  # chicken eggs hatch at ~21 days
    lockdown_day = models.PositiveIntegerField(default=18)  # stop turning, raise humidity
    temp_f = models.DecimalField(max_digits=4, decimal_places=1)
    humidity_pct = models.PositiveIntegerField()
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class IncubatorEgg(models.Model):
    """One egg in an incubator slot, linked to the hen that laid it."""

    class Color(models.TextChoices):
        WHITE = "white", "White"
        CREAM = "cream", "Cream"
        LIGHT_BROWN = "light_brown", "Light brown"
        BROWN = "brown", "Brown"
        DARK_BROWN = "dark_brown", "Dark brown"

    class Size(models.TextChoices):  # USDA weight classes
        SMALL = "small", "Small"
        MEDIUM = "medium", "Medium"
        LARGE = "large", "Large"
        EXTRA_LARGE = "extra_large", "Extra large"
        JUMBO = "jumbo", "Jumbo"

    class Candling(models.TextChoices):
        NOT_CANDLED = "not_candled", "Not yet candled"
        DEVELOPING = "developing", "Developing"
        UNCLEAR = "unclear", "Unclear, recheck"
        CLEAR = "clear", "Clear (infertile)"

    incubator = models.ForeignKey(Incubator, on_delete=models.CASCADE, related_name="eggs")
    slot = models.PositiveIntegerField()
    hen = models.ForeignKey(
        Animal, on_delete=models.PROTECT, related_name="incubated_eggs",
        limit_choices_to={"species": Species.CHICKEN, "sex": Animal.Sex.FEMALE},
    )
    laid_date = models.DateField()
    set_date = models.DateField(help_text="Day the egg went into the incubator")
    last_checked = models.DateField()
    color = models.CharField(max_length=12, choices=Color.choices)
    size = models.CharField(max_length=12, choices=Size.choices)
    weight_g = models.DecimalField(max_digits=4, decimal_places=1)
    shell = models.CharField(max_length=80, blank=True)  # texture / markings
    candling = models.CharField(max_length=12, choices=Candling.choices, default=Candling.NOT_CANDLED)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["incubator", "slot"]
        unique_together = [("incubator", "slot")]

    @property
    def days_incubating(self):
        return (date.today() - self.set_date).days

    @property
    def projected_hatch(self):
        return self.set_date + timedelta(days=self.incubator.incubation_days)


class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    farm_name = models.CharField(max_length=120, blank=True)
    role = models.CharField(max_length=60, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    farm_address = models.CharField(max_length=200, blank=True)
