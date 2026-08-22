from django.urls import path
from .views import NotificationLogListView

urlpatterns = [
    path('notifications/', NotificationLogListView.as_view(), name='notification_logs'),
]
