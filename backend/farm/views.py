import math
import random
import secrets
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Count, OuterRef, Prefetch, Q, Subquery
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.response import Response

from .models import (
    Animal, Assignment, Course, FarmUpdate, Feeder, FeederContent, Incubator, IncubatorEgg, LocationPing, Role,
    TemperatureRecord, Treatment, UserProfile, WeightRecord, Zone,
)
from .schedule import animal_schedule
from .serializers import (
    AccountSerializer, AnimalDetailSerializer, AnimalListSerializer, AssignmentSerializer, CourseDetailSerializer,
    CourseSerializer, FarmUpdateSerializer, FeederSerializer, IncubatorSerializer, InstructorCardSerializer,
    PersonSerializer, TreatmentSerializer, ZoneSerializer, check_email_free,
)

User = get_user_model()


def parse_date(value, name):
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise ValidationError({name: "Use YYYY-MM-DD."})


def recent_assignments(days_back=30, days_ahead=21):
    """Assignments around today, for the duties shown on animal and feeder cards."""
    today = date.today()
    qs = Assignment.objects.filter(due_date__gte=today - timedelta(days=days_back),
                                   due_date__lte=today + timedelta(days=days_ahead))
    return Prefetch("assignments", queryset=qs.select_related("assignee__profile"), to_attr="recent_assignments")


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
    username = request.data.get("username", "").strip()
    if "@" in username:  # roster accounts can sign in with their email
        username = User.objects.filter(email__iexact=username).values_list("username", flat=True).first() or username
    user = authenticate(username=username, password=request.data.get("password", ""))
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
        qs = animals_with_latest().prefetch_related(recent_assignments())
        species = self.request.query_params.get("species")
        return qs.filter(species=species) if species else qs


class AnimalDetail(generics.RetrieveAPIView):
    serializer_class = AnimalDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return animals_with_latest().prefetch_related("health_events", "treatments__health_event",
                                                      recent_assignments())


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
        "incubating": IncubatorEgg.objects.count(),
    })


# --------------------------------------------------------------------------- incubators
class IncubatorList(generics.ListAPIView):
    serializer_class = IncubatorSerializer
    pagination_class = None
    queryset = Incubator.objects.select_related("zone").prefetch_related(
        Prefetch("eggs", queryset=IncubatorEgg.objects.select_related("incubator", "hen__zone"))
    )


# --------------------------------------------------------------------------- map
class ZoneList(generics.ListAPIView):
    queryset = Zone.objects.all()
    serializer_class = ZoneSerializer
    pagination_class = None


LIVE_STRIDE = {"chicken": 12, "cow": 28, "pig": 18}  # wander radius in map units


def live_position(animal, x, y, now):
    """Simulated live fix: a smooth, deterministic wander around the last stored ping.

    Stands in for real tracker hardware so the map moves between refreshes. Every
    viewer gets the same position for the same moment, and nothing is saved.
    """
    bx, by, bw, bh = animal.range_at(timezone.localtime(now).hour)  # in a coop or barn overnight
    rng = random.Random(animal.id)
    spot = rng.uniform(0.2, 0.8), rng.uniform(0.2, 0.8)  # where it settles if the last ping is outside the range
    reach = LIVE_STRIDE[animal.species] * (0.4 if animal.health_status == Animal.Health.SICK else 1)
    reach = min(reach, bw / 3, bh / 3)  # shuffle around inside a small barn instead of pinning to its walls
    t = now.timestamp()

    def wave():
        slow, fast = rng.uniform(90, 150), rng.uniform(35, 60)  # periods in seconds
        a, b = rng.uniform(0, math.tau), rng.uniform(0, math.tau)
        return 0.65 * math.sin(math.tau * t / slow + a) + 0.35 * math.sin(math.tau * t / fast + b)

    clamp = lambda v, lo, size: min(max(v, lo + 2), lo + size - 2)
    if not (bx <= x <= bx + bw and by <= y <= by + bh):  # shut in (or let out) since the last ping
        x, y = bx + bw * spot[0], by + bh * spot[1]
    cx, cy = clamp(x, bx, bw), clamp(y, by, bh)
    return round(clamp(cx + reach * wave(), bx, bw), 1), round(clamp(cy + reach * wave(), by, bh), 1)


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
    animals = Animal.objects.select_related("zone", "night_zone").filter(id__in=tracks.keys())
    now = timezone.now()
    for a in animals:
        _, x, y = tracks[a.id][-1]
        tracks[a.id].append([now, *live_position(a, x, y, now)])
    return Response({
        "latest": now,
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
    queryset = Feeder.objects.select_related("zone").prefetch_related("contents", recent_assignments(14, 21))


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


# --------------------------------------------------------------------------- roles
def role_of(user):
    profile = getattr(user, "profile", None)
    return profile.role if profile else Role.STUDENT


class IsInstructor(BasePermission):
    message = "Only instructors can do this."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and role_of(request.user) == Role.INSTRUCTOR)


def temp_password():
    return secrets.token_urlsafe(9)


def people():
    return User.objects.select_related("profile").filter(profile__role__in=[Role.STUDENT, Role.VOLUNTEER])


@api_view(["POST"])
def change_password(request):
    user = request.user
    if not user.check_password(request.data.get("current_password", "")):
        raise ValidationError({"current_password": "That isn't your current password."})
    new = request.data.get("new_password", "")
    try:
        validate_password(new, user)
    except DjangoValidationError as e:
        raise ValidationError({"new_password": list(e.messages)})
    user.set_password(new)
    user.save()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
def my_classes(request):
    """Classes and instructors for the signed-in student or volunteer (Account page)."""
    courses = request.user.courses.select_related("instructor__profile")
    profile = getattr(request.user, "profile", None)
    supervisor = profile.supervisor if profile and profile.volunteer and profile.supervisor_id else None
    return Response({
        "classes": [
            {**CourseSerializer(c).data, "instructor_card": InstructorCardSerializer(c.instructor).data}
            for c in courses
        ],
        "volunteer_supervisor": InstructorCardSerializer(supervisor).data if supervisor else None,
    })


# --------------------------------------------------------------------------- bulletin
class FarmUpdateList(generics.ListCreateAPIView):
    serializer_class = FarmUpdateSerializer
    pagination_class = None

    def get_queryset(self):
        return FarmUpdate.objects.select_related("author")[:10]

    def perform_create(self, serializer):
        if role_of(self.request.user) != Role.INSTRUCTOR:
            raise PermissionDenied("Only instructors can post farm updates.")
        serializer.save(author=self.request.user)


class FarmUpdateDetail(generics.DestroyAPIView):
    permission_classes = [IsInstructor]
    queryset = FarmUpdate.objects.all()


# --------------------------------------------------------------------------- classes
class CourseList(generics.ListCreateAPIView):
    permission_classes = [IsInstructor]
    serializer_class = CourseSerializer
    pagination_class = None

    def get_queryset(self):
        return Course.objects.select_related("instructor").prefetch_related("students")

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)


class CourseDetail(generics.RetrieveUpdateAPIView):
    permission_classes = [IsInstructor]
    serializer_class = CourseDetailSerializer
    queryset = Course.objects.select_related("instructor__profile").prefetch_related("students__profile")


def create_person(data, role, **profile):
    """Create a login for a roster student or volunteer. Returns (user, temporary password)."""
    first, last = data.get("first_name", "").strip(), data.get("last_name", "").strip()
    if not first or not last:
        raise ValidationError({"first_name": "First and last name are required."})
    try:
        email = check_email_free(data.get("email", ""))
    except Exception as e:
        raise ValidationError({"email": e.detail if hasattr(e, "detail") else str(e)})
    if not email or "@" not in email:
        raise ValidationError({"email": "Enter a valid email."})
    password = temp_password()
    user = User.objects.create_user(username=email, email=email, password=password, first_name=first, last_name=last)
    UserProfile.objects.create(user=user, role=role, **profile)
    return user, password


@api_view(["POST"])
@permission_classes([IsInstructor])
@transaction.atomic
def course_add_student(request, pk):
    """Add a student to a class roster. Existing accounts (matched by email) are enrolled as-is."""
    course = generics.get_object_or_404(Course, pk=pk)
    email = request.data.get("email", "").strip().lower()
    existing = User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email)).first() if email else None
    password = None
    if existing:
        if role_of(existing) == Role.INSTRUCTOR:
            raise ValidationError({"email": "That email belongs to an instructor."})
        user = existing
    else:
        user, password = create_person(request.data, Role.STUDENT)
    course.students.add(user)
    return Response({"student": PersonSerializer(user).data, "temp_password": password}, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@permission_classes([IsInstructor])
def course_remove_student(request, pk, user_id):
    course = generics.get_object_or_404(Course, pk=pk)
    course.students.remove(user_id)
    return Response(status=status.HTTP_204_NO_CONTENT)


# --------------------------------------------------------------------------- people
class PersonList(generics.ListAPIView):
    """Students and volunteers (?role=student|volunteer, ?volunteer=1 for the summer list)."""

    permission_classes = [IsInstructor]
    serializer_class = PersonSerializer
    pagination_class = None

    def get_queryset(self):
        qs = people().order_by("last_name", "first_name")
        p = self.request.query_params
        if p.get("role"):
            qs = qs.filter(profile__role=p["role"])
        if p.get("volunteer"):
            qs = qs.filter(profile__volunteer=True)
        return qs


class PersonDetail(generics.RetrieveUpdateAPIView):
    permission_classes = [IsInstructor]
    serializer_class = PersonSerializer

    def get_queryset(self):
        return people()

    def retrieve(self, request, *args, **kwargs):
        person = self.get_object()
        tasks = Assignment.objects.filter(assignee=person).select_related(
            "animal", "feeder__zone", "treatment", "assigned_by", "assignee__profile").order_by("due_date", "due_time")
        return Response({
            **PersonSerializer(person).data,
            "classes": CourseSerializer(person.courses.select_related("instructor"), many=True).data,
            "assignments": AssignmentSerializer(tasks, many=True).data,
        })


@api_view(["POST"])
@permission_classes([IsInstructor])
def reset_password(request, pk):
    person = generics.get_object_or_404(people(), pk=pk)
    password = temp_password()
    person.set_password(password)
    person.save()
    Token.objects.filter(user=person).delete()  # sign them out everywhere
    return Response({"username": person.username, "temp_password": password})


@api_view(["POST"])
@permission_classes([IsInstructor])
@transaction.atomic
def add_volunteer(request):
    """Put an existing student on the volunteer list ({student: id}) or create a non-student volunteer."""
    password = None
    if request.data.get("student"):
        user = generics.get_object_or_404(people(), pk=request.data["student"])
        profile = user.profile
        profile.volunteer = True
        profile.supervisor = request.user
        if request.data.get("phone"):
            profile.phone = request.data["phone"]
        profile.save()
    else:
        user, password = create_person(request.data, Role.VOLUNTEER, volunteer=True, supervisor=request.user,
                                       phone=request.data.get("phone", "").strip())
    return Response({"volunteer": PersonSerializer(user).data, "temp_password": password},
                    status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@permission_classes([IsInstructor])
def remove_volunteer(request, pk):
    person = generics.get_object_or_404(people(), pk=pk)
    UserProfile.objects.filter(user=person).update(volunteer=False)
    return Response(status=status.HTTP_204_NO_CONTENT)


# --------------------------------------------------------------------------- assignments
def assignment_qs():
    return Assignment.objects.select_related("animal", "feeder__zone", "treatment", "assigned_by",
                                             "assignee__profile")


class AssignmentList(generics.ListCreateAPIView):
    """Instructors see every assignment; students and volunteers see their own (My Schedule)."""

    serializer_class = AssignmentSerializer
    pagination_class = None

    def get_queryset(self):
        qs = assignment_qs()
        if role_of(self.request.user) != Role.INSTRUCTOR:
            qs = qs.filter(assignee=self.request.user)
        p = self.request.query_params
        start = parse_date(p.get("start"), "start")
        end = parse_date(p.get("end"), "end")
        if start:
            qs = qs.filter(due_date__gte=start)
        if end:
            qs = qs.filter(due_date__lte=end)
        for key in ("task", "assignee"):
            if p.get(key):
                qs = qs.filter(**{key: p[key]})
        if p.get("status") == "completed":
            qs = qs.filter(completed_at__isnull=False)
        elif p.get("status") == "open":
            qs = qs.filter(completed_at__isnull=True)
        return qs

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Accepts `animals` (several slugs) and `repeat` (daily|weekly) with `repeat_until` to assign in bulk."""
        if role_of(request.user) != Role.INSTRUCTOR:
            raise PermissionDenied("Only instructors can assign tasks.")
        data = request.data
        first = parse_date(data.get("due_date"), "due_date")
        if not first:
            raise ValidationError({"due_date": "Choose a date."})
        step = {"daily": 1, "weekly": 7}.get(data.get("repeat") or "")
        until = parse_date(data.get("repeat_until"), "repeat_until") if step else first
        if step and (not until or until < first):
            raise ValidationError({"repeat_until": "Choose an end date on or after the first date."})
        if until and (until - first).days > 120:
            raise ValidationError({"repeat_until": "Repeats can run for up to 120 days."})
        animals = data.get("animals") or [data.get("animal")]
        days = [first + timedelta(days=d) for d in range(0, (until - first).days + 1, step or 1)]
        created = []
        for animal in animals:
            for day in days:
                s = self.get_serializer(data={**{k: v for k, v in data.items() if k not in ("animals",)},
                                              "animal": animal, "due_date": day.isoformat()})
                s.is_valid(raise_exception=True)
                created.append(s.save(assigned_by=request.user))
        return Response(self.get_serializer(created, many=True).data, status=status.HTTP_201_CREATED)


class AssignmentDetail(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsInstructor]
    serializer_class = AssignmentSerializer
    queryset = assignment_qs()


@api_view(["POST"])
@transaction.atomic
def complete_assignment(request, pk):
    """Mark a task done with a timestamp. Weights and temperatures can record a reading, and a
    feeder refill tops the feeder up, so the animal and feeder histories show the work."""
    task = generics.get_object_or_404(assignment_qs(), pk=pk)
    is_instructor = role_of(request.user) == Role.INSTRUCTOR
    if task.assignee_id != request.user.id and not is_instructor:
        raise PermissionDenied("This task is assigned to someone else.")
    if request.data.get("undo"):
        task.completed_at = None
        task.completion_note = ""
        task.save()
        return Response(AssignmentSerializer(task).data)
    if task.completed_at:
        raise ValidationError({"detail": "This task is already marked complete."})
    today = timezone.localdate()
    value = request.data.get("value")
    if value not in (None, "") and task.task in (Assignment.Task.WEIGHTS, Assignment.Task.TEMPERATURES):
        try:
            value = Decimal(str(value))
        except InvalidOperation:
            raise ValidationError({"value": "Enter a number."})
        if task.task == Assignment.Task.WEIGHTS:
            WeightRecord.objects.update_or_create(animal=task.animal, date=today, defaults={"weight_lbs": value})
        else:
            TemperatureRecord.objects.update_or_create(animal=task.animal, date=today, defaults={"temp_f": value})
    if task.task == Assignment.Task.REFILL_FEEDER and task.feeder:
        Feeder.objects.filter(pk=task.feeder_id).update(last_refilled=today)
        for c in task.feeder.contents.all():
            c.current_lbs = c.capacity_lbs
            c.save(update_fields=["current_lbs"])
    task.completed_at = timezone.now()
    task.completion_note = request.data.get("note", "")[:300]
    task.save()
    return Response(AssignmentSerializer(task).data)


@api_view(["GET"])
def animal_care(request, slug):
    """Every duty assigned for one animal, for its care history page."""
    animal = generics.get_object_or_404(Animal, slug=slug)
    tasks = assignment_qs().filter(animal=animal).order_by("-due_date", "-due_time")
    return Response({"animal": animal.name, "slug": animal.slug, "species": animal.species,
                     "assignments": AssignmentSerializer(tasks, many=True).data})
