from django.urls import path
from .views import (
    SubmitConsultationView, PrescriptionDetailView,
    PatientPrescriptionListView, PatientMedicationRemindersView
)

urlpatterns = [
    path('submit-consultation/', SubmitConsultationView.as_view(), name='submit_consultation'),
    path('list/', PatientPrescriptionListView.as_view(), name='prescription_list'),
    path('<int:pk>/', PrescriptionDetailView.as_view(), name='prescription_detail'),
    path('reminders/', PatientMedicationRemindersView.as_view(), name='medication_reminders'),
]
