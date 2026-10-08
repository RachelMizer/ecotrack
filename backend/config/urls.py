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
    path("api/incubators/", views.IncubatorList.as_view()),
    path("api/feeders/", views.FeederList.as_view()),
    path("api/treatments/", views.TreatmentList.as_view()),
    path("api/schedule/", views.schedule),
    path("api/account/password/", views.change_password),
    path("api/account/classes/", views.my_classes),
    path("api/animals/<slug:slug>/care/", views.animal_care),
    path("api/updates/", views.FarmUpdateList.as_view()),
    path("api/updates/<int:pk>/", views.FarmUpdateDetail.as_view()),
    path("api/classes/", views.CourseList.as_view()),
    path("api/classes/<int:pk>/", views.CourseDetail.as_view()),
    path("api/classes/<int:pk>/students/", views.course_add_student),
    path("api/classes/<int:pk>/students/<int:user_id>/", views.course_remove_student),
    path("api/people/", views.PersonList.as_view()),
    path("api/people/<int:pk>/", views.PersonDetail.as_view()),
    path("api/people/<int:pk>/reset-password/", views.reset_password),
    path("api/volunteers/", views.add_volunteer),
    path("api/volunteers/<int:pk>/", views.remove_volunteer),
    path("api/assignments/", views.AssignmentList.as_view()),
    path("api/assignments/<int:pk>/", views.AssignmentDetail.as_view()),
    path("api/assignments/<int:pk>/complete/", views.complete_assignment),
]
