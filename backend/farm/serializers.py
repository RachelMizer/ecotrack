from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Animal, Feeder, FeederContent, HealthEvent, Treatment, UserProfile, Zone


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

    class Meta:
        model = Animal
        fields = ["id", "slug", "name", "species", "tag_id", "type_label", "sex", "breed", "birth_date",
                  "age_days", "life_stage", "fertility_status", "fertility_label", "zone", "zone_area",
                  "egg_count_mtd", "health_status", "dam", "photo", "notes",
                  "latest_weight", "latest_weight_date", "latest_temp", "latest_temp_date"]


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

    class Meta:
        model = Feeder
        fields = ["id", "name", "zone", "zone_area", "feeder_type", "serves", "last_refilled",
                  "refill_interval_days", "next_refill", "notes", "contents"]

    def get_next_refill(self, obj):
        from datetime import timedelta
        return obj.last_refilled + timedelta(days=obj.refill_interval_days)


class AccountSerializer(serializers.ModelSerializer):
    farm_name = serializers.CharField(source="profile.farm_name", required=False, allow_blank=True)
    role = serializers.CharField(source="profile.role", required=False, allow_blank=True)
    phone = serializers.CharField(source="profile.phone", required=False, allow_blank=True)
    farm_address = serializers.CharField(source="profile.farm_address", required=False, allow_blank=True)

    class Meta:
        model = get_user_model()
        fields = ["id", "username", "first_name", "last_name", "email", "date_joined", "last_login",
                  "farm_name", "role", "phone", "farm_address"]
        read_only_fields = ["id", "username", "date_joined", "last_login"]

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        for k, v in profile_data.items():
            setattr(profile, k, v)
        profile.save()
        return instance
