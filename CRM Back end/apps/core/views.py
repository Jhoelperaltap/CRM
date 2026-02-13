from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q


class GlobalSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if len(q) < 2:
            return Response({"contacts": [], "corporations": [], "cases": []})

        from apps.contacts.models import Contact
        from apps.contacts.serializers import ContactListSerializer
        from apps.corporations.models import Corporation
        from apps.corporations.serializers import CorporationListSerializer
        from apps.cases.models import TaxCase
        from apps.cases.serializers import TaxCaseListSerializer

        contacts = Contact.objects.filter(
            Q(first_name__icontains=q)
            | Q(last_name__icontains=q)
            | Q(email__icontains=q)
            | Q(phone__icontains=q)
        )[:5]

        corporations = Corporation.objects.filter(
            Q(name__icontains=q) | Q(legal_name__icontains=q) | Q(ein__icontains=q)
        )[:5]

        cases = TaxCase.objects.filter(
            Q(case_number__icontains=q) | Q(title__icontains=q)
        )[:5]

        return Response(
            {
                "contacts": ContactListSerializer(contacts, many=True).data,
                "corporations": CorporationListSerializer(corporations, many=True).data,
                "cases": TaxCaseListSerializer(cases, many=True).data,
            }
        )
