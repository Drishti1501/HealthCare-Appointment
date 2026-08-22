from django.urls import path
from .views import (
    DoctorListView, DoctorDetailView, AvailableSlotsView,
    AcquireSlotHoldView, ConfirmBookingView, AppointmentListView,
    AppointmentDetailView, CancelAppointmentView, DoctorLeaveManageView
)

urlpatterns = [
    path('doctors/', DoctorListView.as_view(), name='doctor_list'),
    path('doctors/<int:pk>/', DoctorDetailView.as_view(), name='doctor_detail'),
    path('doctors/<int:doctor_id>/slots/', AvailableSlotsView.as_view(), name='available_slots'),
    path('hold-slot/', AcquireSlotHoldView.as_view(), name='hold_slot'),
    path('confirm-booking/', ConfirmBookingView.as_view(), name='confirm_booking'),
    path('list/', AppointmentListView.as_view(), name='appointment_list'),
    path('<int:pk>/', AppointmentDetailView.as_view(), name='appointment_detail'),
    path('<int:pk>/cancel/', CancelAppointmentView.as_view(), name='cancel_appointment'),
    path('leaves/', DoctorLeaveManageView.as_view(), name='doctor_leaves'),
]
