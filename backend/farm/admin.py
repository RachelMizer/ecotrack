from django.contrib import admin

from .models import (
    Animal, Feeder, FeederContent, HealthEvent, LocationPing, TemperatureRecord, Treatment, UserProfile,
    WeightRecord, Zone,
)


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


@admin.register(WeightRecord, TemperatureRecord)
class ReadingAdmin(admin.ModelAdmin):
    list_display = ["animal", "date"]
    list_filter = ["animal__species", "animal"]
    date_hierarchy = "date"


admin.site.register([Zone, HealthEvent, Treatment, LocationPing, UserProfile])
