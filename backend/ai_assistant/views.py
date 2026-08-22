from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from .gemini_service import generate_pre_visit_summary, generate_post_visit_summary

class PreVisitAnalysisPreviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        symptoms = request.data.get('symptoms')
        if not symptoms:
            return Response({'error': 'symptoms field is required'}, status=status.HTTP_400_BAD_REQUEST)
        result = generate_pre_visit_summary(symptoms)
        return Response(result)


class PostVisitSummaryPreviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        clinical_notes = request.data.get('clinical_notes', '')
        diagnosis = request.data.get('diagnosis', '')
        prescription_items = request.data.get('prescription_items', [])
        follow_up_date = request.data.get('follow_up_date', '')

        result = generate_post_visit_summary(
            clinical_notes=clinical_notes,
            diagnosis=diagnosis,
            prescription_items_list=prescription_items,
            follow_up_date_str=follow_up_date
        )
        return Response(result)
