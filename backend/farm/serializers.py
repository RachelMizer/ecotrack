from datetime import timedelta

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (
    Animal, Assignment, Course, FarmUpdate, Feeder, FeederContent, HealthEvent, Incubator, IncubatorEgg, Role,
    Treatment, UserProfile, Zone, season_of,
)

User = get_user_model()


def full_name(user):
    return (user.get_full_name() or user.username) if user else None


class ZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zone
        fields = ["id", "name", "slug", "area", "kind", "x", "y", "width", "height",
                  "roam_x", "roam_y", "roam_width", "roam_height"]


class HealthEventSerializer(serializers.ModelSerializer):
    ongoing = serializers.BooleanField(read_only=True)

    class Meta:
        model = HealthEvent
        fields = ["id", "condition", "severity", "start_date", "end_date", "ongoing", "peak_temp_rise_f", "notes"]


class TreatmentSerializer(serializers.ModelSerializer):
    status = serializers.CharField(read_only=True)
    animal_name = serializers.CharField(source="animal.name", read_only=True)
    animal_slug = serializers.CharField(source="animal.slug", read_only=True)
    species = serializers.CharField(source="animal.species", read_only=True)
    condition = serializers.CharField(source="health_event.condition", read_only=True, default=None)

    class Meta:
        model = Treatment
        fields = ["id", "animal_name", "animal_slug", "species", "kind", "name", "dose", "route", "times",
                  "start_date", "end_date", "status", "reason", "withdrawal", "condition"]


class CareSummarySerializer(serializers.ModelSerializer):
    """Compact assignment for animal and feeder cards."""

    task_label = serializers.CharField(source="get_task_display")
    assignee_name = serializers.SerializerMethodField()
    assignee_role = serializers.CharField(source="assignee.profile.get_role_display", default=None)
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Assignment
        fields = ["id", "task", "task_label", "assignee_name", "assignee_role", "due_date", "due_time",
                  "status", "completed_at", "veterinarian"]

    def get_assignee_name(self, obj):
        return full_name(obj.assignee)


class AnimalListSerializer(serializers.ModelSerializer):
    zone = serializers.CharField(source="zone.name")
    zone_area = serializers.CharField(source="zone.area")
    age_days = serializers.IntegerField(read_only=True)
    life_stage = serializers.CharField(read_only=True)
    fertility_label = serializers.CharField(source="get_fertility_status_display")
    latest_weight = serializers.DecimalField(max_digits=7, decimal_places=2, read_only=True)
    latest_weight_date = serializers.DateField(read_only=True)
    latest_temp = serializers.DecimalField(max_digits=5, decimal_places=1, read_only=True)
    latest_temp_date = serializers.DateField(read_only=True)
    dam = serializers.CharField(source="dam.name", default=None)
    duties = serializers.SerializerMethodField()

    class Meta:
        model = Animal
        fields = ["id", "slug", "name", "species", "tag_id", "type_label", "sex", "breed", "birth_date",
                  "age_days", "life_stage", "fertility_status", "fertility_label", "zone", "zone_area",
                  "egg_count_mtd", "health_status", "dam", "photo", "notes",
                  "latest_weight", "latest_weight_date", "latest_temp", "latest_temp_date", "duties"]

    def get_duties(self, obj):
        # The view prefetches recent and upcoming assignments as `recent_assignments`.
        return CareSummarySerializer(getattr(obj, "recent_assignments", []), many=True).data


class AnimalDetailSerializer(AnimalListSerializer):
    health_events = HealthEventSerializer(many=True, read_only=True)
    treatments = TreatmentSerializer(many=True, read_only=True)

    class Meta(AnimalListSerializer.Meta):
        fields = AnimalListSerializer.Meta.fields + ["health_events", "treatments"]


class FeederContentSerializer(serializers.ModelSerializer):
    percent_full = serializers.IntegerField(read_only=True)
    days_remaining = serializers.FloatField(read_only=True)

    class Meta:
        model = FeederContent
        fields = ["id", "feed_name", "category", "capacity_lbs", "current_lbs", "daily_usage_lbs",
                  "percent_full", "days_remaining"]


class FeederSerializer(serializers.ModelSerializer):
    zone = serializers.CharField(source="zone.name")
    zone_area = serializers.CharField(source="zone.area")
    contents = FeederContentSerializer(many=True, read_only=True)
    next_refill = serializers.SerializerMethodField()

    duties = serializers.SerializerMethodField()

    class Meta:
        model = Feeder
        fields = ["id", "name", "zone", "zone_area", "feeder_type", "serves", "last_refilled",
                  "refill_interval_days", "next_refill", "notes", "contents", "duties"]

    def get_next_refill(self, obj):
        return obj.last_refilled + timedelta(days=obj.refill_interval_days)

    def get_duties(self, obj):
        # The view prefetches recent and upcoming assignments as `recent_assignments`.
        return CareSummarySerializer(getattr(obj, "recent_assignments", []), many=True).data


class IncubatorEggSerializer(serializers.ModelSerializer):
    hen = serializers.CharField(source="hen.name")
    hen_slug = serializers.CharField(source="hen.slug")
    hen_breed = serializers.CharField(source="hen.breed")
    hen_zone = serializers.CharField(source="hen.zone.name")
    color_label = serializers.CharField(source="get_color_display")
    size_label = serializers.CharField(source="get_size_display")
    candling_label = serializers.CharField(source="get_candling_display")
    days_incubating = serializers.IntegerField(read_only=True)
    projected_hatch = serializers.DateField(read_only=True)

    class Meta:
        model = IncubatorEgg
        fields = ["id", "slot", "hen", "hen_slug", "hen_breed", "hen_zone", "laid_date", "set_date",
                  "days_incubating", "projected_hatch", "last_checked", "color", "color_label", "size",
                  "size_label", "weight_g", "shell", "candling", "candling_label", "notes"]


class IncubatorSerializer(serializers.ModelSerializer):
    zone = serializers.CharField(source="zone.name")
    eggs = IncubatorEggSerializer(many=True, read_only=True)

    class Meta:
        model = Incubator
        fields = ["id", "name", "zone", "capacity", "incubation_days", "lockdown_day", "temp_f", "humidity_pct",
                  "notes", "eggs"]


def save_user(instance, validated_data):
    profile_data = validated_data.pop("profile", {})
    email = validated_data.get("email")
    # Roster accounts log in with their email as the username, so keep the two in step.
    if email and instance.email and instance.username.lower() == instance.email.lower():
        instance.username = email.lower()
    for k, v in validated_data.items():
        setattr(instance, k, v)
    instance.save()
    profile, _ = UserProfile.objects.get_or_create(user=instance)
    for k, v in profile_data.items():
        setattr(profile, k, v)
    profile.save()
    return instance


def check_email_free(email, instance=None):
    email = email.strip().lower()
    taken = User.objects.filter(email__iexact=email) | User.objects.filter(username__iexact=email)
    if instance:
        taken = taken.exclude(pk=instance.pk)
    if taken.exists():
        raise serializers.ValidationError("Another account already uses this email.")
    return email


class AccountSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source="profile.role", read_only=True)
    role_label = serializers.CharField(source="profile.get_role_display", read_only=True)
    volunteer = serializers.BooleanField(source="profile.volunteer", read_only=True)
    farm_name = serializers.CharField(source="profile.farm_name", required=False, allow_blank=True)
    phone = serializers.CharField(source="profile.phone", required=False, allow_blank=True)
    farm_address = serializers.CharField(source="profile.farm_address", required=False, allow_blank=True)
    office_location = serializers.CharField(source="profile.office_location", required=False, allow_blank=True)
    office_hours = serializers.CharField(source="profile.office_hours", required=False, allow_blank=True)
    message = serializers.CharField(source="profile.message", required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email", "date_joined", "last_login",
                  "role", "role_label", "volunteer", "farm_name", "phone", "farm_address",
                  "office_location", "office_hours", "message"]
        read_only_fields = ["id", "username", "date_joined", "last_login"]

    def validate_email(self, value):
        return check_email_free(value, self.instance) if value else value

    def update(self, instance, validated_data):
        return save_user(instance, validated_data)


# --------------------------------------------------------------------------- classroom
class InstructorCardSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    phone = serializers.CharField(source="profile.phone")
    office_location = serializers.CharField(source="profile.office_location")
    office_hours = serializers.CharField(source="profile.office_hours")
    message = serializers.CharField(source="profile.message")

    class Meta:
        model = User
        fields = ["id", "name", "email", "phone", "office_location", "office_hours", "message"]

    def get_name(self, obj):
        return full_name(obj)


class PersonSerializer(serializers.ModelSerializer):
    """A student or volunteer, as an instructor sees and edits them."""

    name = serializers.SerializerMethodField()
    email = serializers.EmailField()
    phone = serializers.CharField(source="profile.phone", required=False, allow_blank=True)
    role = serializers.CharField(source="profile.role", read_only=True)
    role_label = serializers.CharField(source="profile.get_role_display", read_only=True)
    volunteer = serializers.BooleanField(source="profile.volunteer", read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "name", "first_name", "last_name", "email", "phone", "role", "role_label",
                  "volunteer", "last_login"]
        read_only_fields = ["id", "username", "last_login"]
        extra_kwargs = {"first_name": {"required": True, "allow_blank": False},
                        "last_name": {"required": True, "allow_blank": False}}

    def get_name(self, obj):
        return full_name(obj)

    def validate_email(self, value):
        return check_email_free(value, self.instance)

    def update(self, instance, validated_data):
        return save_user(instance, validated_data)


class CourseSerializer(serializers.ModelSerializer):
    instructor = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()
    season = serializers.SerializerMethodField()
    term_end = serializers.DateField(required=False)

    class Meta:
        model = Course
        fields = ["id", "name", "section", "description", "term_start", "term_end", "season", "instructor",
                  "student_count"]

    def get_instructor(self, obj):
        return full_name(obj.instructor)

    def get_student_count(self, obj):
        return obj.students.count()

    def get_season(self, obj):
        return season_of(obj.term_start)

    def validate(self, data):
        start = data.get("term_start", getattr(self.instance, "term_start", None))
        if not data.get("term_end") and not self.instance:
            data["term_end"] = start + timedelta(weeks=16)  # default semester length
        end = data.get("term_end", getattr(self.instance, "term_end", None))
        if end < start:
            raise serializers.ValidationError({"term_end": "The term must end after it starts."})
        return data


class CourseDetailSerializer(CourseSerializer):
    students = PersonSerializer(many=True, read_only=True)
    instructor_card = InstructorCardSerializer(source="instructor", read_only=True)

    class Meta(CourseSerializer.Meta):
        fields = CourseSerializer.Meta.fields + ["students", "instructor_card"]


class AssignmentSerializer(serializers.ModelSerializer):
    task_label = serializers.CharField(source="get_task_display", read_only=True)
    assignee = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    assignee_name = serializers.SerializerMethodField()
    assignee_role = serializers.CharField(source="assignee.profile.role", read_only=True, default=None)
    assigned_by = serializers.SerializerMethodField()
    animal = serializers.SlugRelatedField(slug_field="slug", queryset=Animal.objects.all(), required=False,
                                          allow_null=True)
    animal_name = serializers.CharField(source="animal.name", read_only=True, default=None)
    animal_species = serializers.CharField(source="animal.species", read_only=True, default=None)
    feeder_name = serializers.CharField(source="feeder.name", read_only=True, default=None)
    feeder_zone = serializers.CharField(source="feeder.zone.name", read_only=True, default=None)
    treatment_name = serializers.CharField(source="treatment.name", read_only=True, default=None)
    treatment_dose = serializers.CharField(source="treatment.dose", read_only=True, default=None)
    status = serializers.CharField(read_only=True)
    season = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = ["id", "task", "task_label", "assignee", "assignee_name", "assignee_role", "assigned_by",
                  "animal", "animal_name", "animal_species", "feeder", "feeder_name", "feeder_zone",
                  "treatment", "treatment_name", "treatment_dose", "due_date", "due_time", "notes",
                  "veterinarian", "season", "status", "completed_at", "completion_note", "created_at"]
        read_only_fields = ["completed_at", "completion_note", "created_at"]

    def get_assignee_name(self, obj):
        return full_name(obj.assignee)

    def get_assigned_by(self, obj):
        return full_name(obj.assigned_by)

    def get_season(self, obj):
        return season_of(obj.due_date)

    def validate(self, data):
        def get(k):
            return data[k] if k in data else getattr(self.instance, k, None)

        task, assignee, animal, feeder = get("task"), get("assignee"), get("animal"), get("feeder")
        if task == Assignment.Task.REFILL_FEEDER:
            if not feeder:
                raise serializers.ValidationError({"feeder": "Choose the feeder to refill."})
            data["animal"] = None
            data["treatment"] = None
        else:
            if not animal:
                raise serializers.ValidationError({"animal": "Choose the animal."})
            data["feeder"] = None
            treatment = get("treatment")
            if treatment and treatment.animal_id != animal.id:
                raise serializers.ValidationError({"treatment": "That treatment belongs to a different animal."})
        role = getattr(getattr(assignee, "profile", None), "role", Role.STUDENT)
        if role == Role.VOLUNTEER and task not in Assignment.VOLUNTEER_TASKS:
            raise serializers.ValidationError(
                {"task": "Volunteers help with feeder refills, special feedings and weights only."})
        if season_of(get("due_date")) == "summer" and task not in Assignment.VOLUNTEER_TASKS:
            if role != Role.INSTRUCTOR:
                raise serializers.ValidationError({"assignee": "In summer a veterinarian does this with the "
                                                               "instructor, so assign it to an instructor."})
            if not get("veterinarian"):
                raise serializers.ValidationError({"veterinarian": "Name the veterinarian doing this in summer."})
        return data


class FarmUpdateSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    author_id = serializers.IntegerField(source="author.id", read_only=True)

    class Meta:
        model = FarmUpdate
        fields = ["id", "title", "body", "author", "author_id", "created_at"]
        read_only_fields = ["created_at"]

    def get_author(self, obj):
        return full_name(obj.author)
