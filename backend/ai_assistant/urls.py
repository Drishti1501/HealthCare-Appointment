from django.urls import path
from .views import PreVisitAnalysisPreviewView, PostVisitSummaryPreviewView

urlpatterns = [
    path('preview-symptoms/', PreVisitAnalysisPreviewView.as_view(), name='preview_symptoms'),
    path('preview-post-visit/', PostVisitSummaryPreviewView.as_view(), name='preview_post_visit'),
]
