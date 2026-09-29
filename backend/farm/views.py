from datetime import date, timedelta

from django.contrib.auth import authenticate
from django.db.models import Count, OuterRef, Prefetch, Q, Subquery
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import (
    Animal, Feeder, FeederContent, LocationPing, TemperatureRecord, Treatment, UserProfile, WeightRecord, Zone,
)
from .schedule import animal_schedule
from .serializers import (
    AccountSerializer, AnimalDetailSerializer, AnimalListSerializer, FeederSerializer, TreatmentSerializer,
    ZoneSerializer,
)


def parse_date(value, name):
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise ValidationError({name: "Use YYYY-MM-DD."})


def animals_with_latest():
    latest_w = WeightRecord.objects.filter(animal=OuterRef("pk")).order_by("-date")
    latest_t = TemperatureRecord.objects.filter(animal=OuterRef("pk")).order_by("-date")
    return (
        Animal.objects.select_related("zone", "dam")
        .annotate(
            latest_weight=Subquery(latest_w.values("weight_lbs")[:1]),
            latest_weight_date=Subquery(latest_w.values("date")[:1]),
            latest_temp=Subquery(latest_t.values("temp_f")[:1]),
            latest_temp_date=Subquery(latest_t.values("date")[:1]),
        )
    )


# --------------------------------------------------------------------------- auth
@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    user = authenticate(username=request.data.get("username", ""), password=request.data.get("password", ""))
    if user is None:
        return Response({"detail": "Incorrect username or password."}, status=status.HTTP_400_BAD_REQUEST)
    user.last_login = timezone.now()
    user.save(update_fields=["last_login"])
    UserProfile.objects.get_or_create(user=user)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": AccountSerializer(user).data})


@api_view(["POST"])
def logout(request):
    Token.objects.filter(user=request.user).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


class AccountView(generics.RetrieveUpdateAPIView):
    serializer_class = AccountSerializer

    def get_object(self):
        UserProfile.objects.get_or_create(user=self.request.user)
        return self.request.user


# --------------------------------------------------------------------------- animals
class AnimalList(generics.ListAPIView):
    serializer_class = AnimalListSerializer
    pagination_class = None

    def get_queryset(self):
        qs = animals_with_latest()
        species = self.request.query_params.get("species")
        return qs.filter(species=species) if species else qs


class AnimalDetail(generics.RetrieveAPIView):
    serializer_class = AnimalDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return animals_with_latest().prefetch_related("health_events", "treatments__health_event")


def _series(request, slug, model, field):
    animal = generics.get_object_or_404(Animal, slug=slug)
    qs = model.objects.filter(animal=animal)
    start = parse_date(request.query_params.get("start"), "start")
    end = parse_date(request.query_params.get("end"), "end")
    if start:
        qs = qs.filter(date__gte=start)
    if end:
        qs = qs.filter(date__lte=end)
    rows = [{"date": d, "value": float(v)} for d, v in qs.values_list("date", field)]
    return Response({"animal": animal.name, "slug": animal.slug, "species": animal.species,
                     "birth_date": animal.birth_date, "records": rows})


@api_view(["GET"])
def animal_weights(request, slug):
    return _series(request, slug, WeightRecord, "weight_lbs")


@api_view(["GET"])
def animal_temperatures(request, slug):
    return _series(request, slug, TemperatureRecord, "temp_f")


# --------------------------------------------------------------------------- dashboard
@api_view(["GET"])
def readings(request):
    """Flat readings for dashboard charts: ?kind=temperature|weight&start=&end=&species="""
    kind = request.query_params.get("kind", "temperature")
    model, field = (WeightRecord, "weight_lbs") if kind == "weight" else (TemperatureRecord, "temp_f")
    today = date.today()
    start = parse_date(request.query_params.get("start"), "start") or today.replace(day=1)
    end = parse_date(request.query_params.get("end"), "end") or today
    if (end - start).days > 400:
        raise ValidationError({"start": "Range is limited to about 13 months."})
    qs = model.objects.filter(date__gte=start, date__lte=end).select_related("animal", "animal__zone")
    species = request.query_params.get("species")
    if species:
        qs = qs.filter(animal__species=species)
    rows = [
        {"slug": r.animal.slug, "name": r.animal.name, "species": r.animal.species,
         "zone": r.animal.zone.name, "stage": r.animal.life_stage, "health": r.animal.health_status,
         "date": r.date, "age_days": (r.date - r.animal.birth_date).days, "value": float(getattr(r, field))}
        for r in qs
    ]
    return Response({"kind": kind, "start": start, "end": end, "rows": rows})


@api_view(["GET"])
def summary(request):
    today = date.today()
    by_species = dict(Animal.objects.values_list("species").annotate(n=Count("id")))
    by_health = dict(Animal.objects.values_list("health_status").annotate(n=Count("id")))
    low_feed = [
        {"feeder": c.feeder.name, "feed": c.feed_name, "percent_full": c.percent_full,
         "days_remaining": c.days_remaining}
        for c in FeederContent.objects.select_related("feeder") if c.percent_full <= 25
    ]
    active_meds = Treatment.objects.filter(
        kind__in=["medication", "supplement"], start_date__lte=today
    ).filter(Q(end_date__gte=today) | Q(end_date__isnull=True)).count()
    upcoming_vax = Treatment.objects.filter(kind="vaccine", start_date__gt=today,
                                            start_date__lte=today + timedelta(days=21)).count()
    eggs = [
        {"name": a.name, "slug": a.slug, "zone": a.zone.name, "eggs": a.egg_count_mtd, "status": a.fertility_status}
        for a in Animal.objects.filter(egg_count_mtd__isnull=False).select_related("zone")
    ]
    sick = [
        {"name": a.name, "slug": a.slug, "species": a.species, "status": a.health_status,
         "condition": next((e.condition for e in a.health_events.all()), "")}
        for a in Animal.objects.exclude(health_status="healthy").prefetch_related("health_events")
    ]
    return Response({
        "species": by_species, "health": by_health, "low_feed": low_feed, "active_medications": active_meds,
        "upcoming_vaccinations": upcoming_vax, "eggs": eggs, "attention": sick,
    })


# --------------------------------------------------------------------------- map
class ZoneList(generics.ListAPIView):
    queryset = Zone.objects.all()
    serializer_class = ZoneSerializer
    pagination_class = None


@api_view(["GET"])
def tracking(request):
    try:
        hours = max(1, min(int(request.query_params.get("hours", 24)), 72))
    except ValueError:
        raise ValidationError({"hours": "Must be a number."})
    latest = LocationPing.objects.order_by("-timestamp").values_list("timestamp", flat=True).first()
    if latest is None:
        return Response({"latest": None, "animals": []})
    since = latest - timedelta(hours=hours)
    pings = LocationPing.objects.filter(timestamp__gte=since).order_by("animal_id", "timestamp")
    tracks = {}
    for p in pings.values_list("animal_id", "timestamp", "x", "y"):
        tracks.setdefault(p[0], []).append([p[1], p[2], p[3]])
    animals = Animal.objects.select_related("zone").filter(id__in=tracks.keys())
    return Response({
        "latest": latest,
        "animals": [
            {"slug": a.slug, "name": a.name, "species": a.species, "zone": a.zone.name, "area": a.zone.area,
             "type_label": a.type_label, "health_status": a.health_status, "track": tracks[a.id]}
            for a in animals
        ],
    })


# --------------------------------------------------------------------------- nutrition
class FeederList(generics.ListAPIView):
    serializer_class = FeederSerializer
    pagination_class = None
    queryset = Feeder.objects.select_related("zone").prefetch_related("contents")


class TreatmentList(generics.ListAPIView):
    serializer_class = TreatmentSerializer
    pagination_class = None

    def get_queryset(self):
        qs = Treatment.objects.select_related("animal", "health_event").order_by("animal__species", "animal__name",
                                                                                   "-start_date")
        p = self.request.query_params
        if p.get("species"):
            qs = qs.filter(animal__species=p["species"])
        if p.get("kind"):
            qs = qs.filter(kind=p["kind"])
        return qs


# --------------------------------------------------------------------------- schedule
@api_view(["GET"])
def schedule(request):
    day = parse_date(request.query_params.get("date"), "date") or date.today()
    qs = animals_with_latest().prefetch_related(
        Prefetch("treatments", queryset=Treatment.objects.order_by("start_date")), "offspring"
    )
    species = request.query_params.get("species")
    if species:
        qs = qs.filter(species=species)
    out = []
    for a in qs:
        plan = animal_schedule(a, day, a.latest_weight)
        out.append({
            "slug": a.slug, "name": a.name, "species": a.species, "type_label": a.type_label, "zone": a.zone.name,
            "life_stage": a.life_stage, "fertility_label": a.get_fertility_status_display(),
            "health_status": a.health_status, "latest_weight": a.latest_weight, **plan,
        })
    return Response({"date": day, "animals": out})
