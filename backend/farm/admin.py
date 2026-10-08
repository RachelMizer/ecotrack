from django.contrib import admin

from .models import (
    Animal, Assignment, Course, FarmUpdate, Feeder, FeederContent, HealthEvent, Incubator, IncubatorEgg, LocationPing,
    TemperatureRecord, Treatment, UserProfile, WeightRecord, Zone,
)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "role", "volunteer", "phone"]
    list_filter = ["role", "volunteer"]


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ["name", "section", "term_start", "term_end", "instructor"]
    filter_horizontal = ["students"]


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ["task", "assignee", "animal", "feeder", "due_date", "completed_at"]
    list_filter = ["task", "assignee__profile__role"]
    date_hierarchy = "due_date"


class HealthEventInline(admin.TabularInline):
    model = HealthEvent
    extra = 0


class TreatmentInline(admin.TabularInline):
    model = Treatment
    extra = 0
    fk_name = "animal"


@admin.register(Animal)
class AnimalAdmin(admin.ModelAdmin):
    list_display = ["name", "species", "type_label", "breed", "zone", "fertility_status", "health_status"]
    list_filter = ["species", "zone", "health_status", "fertility_status"]
    search_fields = ["name", "tag_id"]
    prepopulated_fields = {"slug": ["name"]}
    inlines = [HealthEventInline, TreatmentInline]


class FeederContentInline(admin.TabularInline):
    model = FeederContent
    extra = 0


@admin.register(Feeder)
class FeederAdmin(admin.ModelAdmin):
    list_display = ["name", "zone", "feeder_type", "last_refilled", "refill_interval_days"]
    inlines = [FeederContentInline]


class IncubatorEggInline(admin.TabularInline):
    model = IncubatorEgg
    extra = 0


@admin.register(Incubator)
class IncubatorAdmin(admin.ModelAdmin):
    list_display = ["name", "zone", "capacity", "temp_f", "humidity_pct"]
    inlines = [IncubatorEggInline]


@admin.register(WeightRecord, TemperatureRecord)
class ReadingAdmin(admin.ModelAdmin):
    list_display = ["animal", "date"]
    list_filter = ["animal__species", "animal"]
    date_hierarchy = "date"


admin.site.register([Zone, HealthEvent, Treatment, LocationPing, FarmUpdate])
