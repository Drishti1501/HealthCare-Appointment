import os
from pathlib import Path
from django.contrib import admin
from django.urls import path, include, re_path
from django.http import JsonResponse, HttpResponse
from django.conf import settings

def health_check(request):
    return JsonResponse({
        'status': 'healthy',
        'service': 'Healthcare Appointment & Follow-up Manager API',
        'version': '1.0.0'
    })

def serve_react_app(request):
    frontend_index = Path(settings.BASE_DIR).parent / 'frontend' / 'dist' / 'index.html'
    if os.path.exists(frontend_index):
        with open(frontend_index, 'r', encoding='utf-8') as f:
            return HttpResponse(f.read())
    return JsonResponse({
        'message': 'Healthcare Appointment & Follow-up Manager API is active. Frontend build not found in frontend/dist.'
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health-check'),
    path('api/auth/', include('authentication.urls')),
    path('api/appointments/', include('appointments.urls')),
    path('api/prescriptions/', include('prescriptions.urls')),
    path('api/ai/', include('ai_assistant.urls')),
    path('api/integrations/', include('integrations.urls')),
    re_path(r'^(?!api/|admin/|static/).*$', serve_react_app, name='react-spa'),
]
