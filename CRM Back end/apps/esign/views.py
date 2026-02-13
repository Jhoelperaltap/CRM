import json

from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.esign.models import EsignDocument, EsignSignee
from apps.esign.serializers import (
    EsignDocumentListSerializer,
    EsignDocumentDetailSerializer,
    EsignDocumentCreateSerializer,
    EsignDocumentUpdateSerializer,
    EsignSigneeSerializer,
    EsignSigneeWriteSerializer,
)


class EsignDocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = EsignDocument.objects.select_related(
            "created_by", "internal_document"
        ).prefetch_related("signees", "signees__contact")

        q = self.request.query_params.get("search")
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(email_subject__icontains=q))

        doc_status = self.request.query_params.get("status")
        if doc_status:
            qs = qs.filter(status=doc_status)

        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return EsignDocumentCreateSerializer
        if self.action in ("update", "partial_update"):
            return EsignDocumentUpdateSerializer
        if self.action == "retrieve":
            return EsignDocumentDetailSerializer
        return EsignDocumentListSerializer

    def create(self, request, *args, **kwargs):
        """
        Override create to handle multipart form data with signees_json field.
        The frontend sends signees as a JSON string alongside the file.
        """
        data = request.data.copy()

        # Parse signees from the JSON string
        signees_json = data.pop("signees_json", None)
        signees_list = []
        if signees_json:
            raw = signees_json if isinstance(signees_json, str) else signees_json[0]
            try:
                signees_list = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                return Response(
                    {"signees_json": "Invalid JSON."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Build the payload for the serializer
        payload = {
            "title": data.get("title", ""),
            "document_source": data.get("document_source", "upload"),
            "email_subject": data.get("email_subject", ""),
            "email_note": data.get("email_note", ""),
            "signees": signees_list,
        }
        if data.get("internal_document"):
            payload["internal_document"] = data["internal_document"]
        if data.get("related_module"):
            payload["related_module"] = data["related_module"]
        if data.get("related_record_id"):
            payload["related_record_id"] = data["related_record_id"]
        if data.get("expires_at"):
            payload["expires_at"] = data["expires_at"]
        if "file" in request.FILES:
            payload["file"] = request.FILES["file"]

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        esign_doc = serializer.save()

        return Response(
            EsignDocumentDetailSerializer(esign_doc).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="send")
    def send_document(self, request, pk=None):
        """Mark document as sent and update signee statuses."""
        esign_doc = self.get_object()
        if esign_doc.status not in (
            EsignDocument.Status.DRAFT,
            EsignDocument.Status.IN_PROGRESS,
        ):
            return Response(
                {"detail": "Document cannot be sent in its current status."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from django.utils import timezone

        esign_doc.status = EsignDocument.Status.SENT
        esign_doc.sent_at = timezone.now()
        esign_doc.save(update_fields=["status", "sent_at", "updated_at"])

        esign_doc.signees.filter(status=EsignSignee.SigneeStatus.PENDING).update(
            status=EsignSignee.SigneeStatus.SENT
        )

        return Response(
            EsignDocumentDetailSerializer(esign_doc).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="void")
    def void_document(self, request, pk=None):
        """Void / cancel an esign document."""
        esign_doc = self.get_object()
        esign_doc.status = EsignDocument.Status.VOIDED
        esign_doc.save(update_fields=["status", "updated_at"])
        return Response(
            EsignDocumentDetailSerializer(esign_doc).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post", "get"], url_path="signees")
    def signees(self, request, pk=None):
        """Manage signees on this document."""
        esign_doc = self.get_object()
        if request.method == "GET":
            qs = esign_doc.signees.select_related("contact")
            return Response(EsignSigneeSerializer(qs, many=True).data)

        serializer = EsignSigneeWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(esign_document=esign_doc)
        return Response(
            EsignSigneeSerializer(
                esign_doc.signees.select_related("contact"), many=True
            ).data,
            status=status.HTTP_201_CREATED,
        )
