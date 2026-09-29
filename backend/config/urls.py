from django.contrib import admin
from django.http import JsonResponse
from django.urls import path

from farm import views

urlpatterns = [
    path("", lambda r: JsonResponse({"service": "EcoTrack API", "status": "ok"})),
    path("admin/", admin.site.urls),
    path("api/auth/login/", views.login),
    path("api/auth/logout/", views.logout),
    path("api/account/", views.AccountView.as_view()),
    path("api/animals/", views.AnimalList.as_view()),
    path("api/animals/<slug:slug>/", views.AnimalDetail.as_view()),
    path("api/animals/<slug:slug>/weights/", views.animal_weights),
    path("api/animals/<slug:slug>/temperatures/", views.animal_temperatures),
    path("api/readings/", views.readings),
    path("api/summary/", views.summary),
    path("api/zones/", views.ZoneList.as_view()),
    path("api/tracking/", views.tracking),
    path("api/feeders/", views.FeederList.as_view()),
    path("api/treatments/", views.TreatmentList.as_view()),
    path("api/schedule/", views.schedule),
]
