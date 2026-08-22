from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics, permissions, status
from authentication.permissions import IsAdminUser
from .models import NotificationLog

class NotificationLogListView(generics.ListAPIView):
    queryset = NotificationLog.objects.all().order_by('-created_at')
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs
