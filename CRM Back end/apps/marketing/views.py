from datetime import timedelta

from django.db.models import Count, F, Q, Sum
from django.http import HttpResponse
from django.shortcuts import redirect
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    AutomationEnrollment,
    AutomationSequence,
    AutomationStep,
    Campaign,
    CampaignLink,
    CampaignLinkClick,
    CampaignRecipient,
    CampaignTemplate,
    EmailList,
    EmailListSubscriber,
)
from .serializers import (
    AutomationEnrollmentSerializer,
    AutomationSequenceListSerializer,
    AutomationSequenceSerializer,
    AutomationStepSerializer,
    BulkSubscribeSerializer,
    CampaignLinkSerializer,
    CampaignListSerializer,
    CampaignRecipientSerializer,
    CampaignSerializer,
    CampaignTemplateSerializer,
    EmailListSerializer,
    EmailListSubscriberSerializer,
)
from .tasks import send_campaign, update_campaign_stats


class EmailListViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing email lists.
    """

    queryset = EmailList.objects.all()
    serializer_class = EmailListSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["get"])
    def subscribers(self, request, pk=None):
        """Get subscribers for a list."""
        email_list = self.get_object()
        subscribers = email_list.subscribers.select_related("contact")

        # Filter by subscription status
        is_subscribed = request.query_params.get("is_subscribed")
        if is_subscribed is not None:
            subscribers = subscribers.filter(
                is_subscribed=is_subscribed.lower() == "true"
            )

        page = self.paginate_queryset(subscribers)
        if page is not None:
            serializer = EmailListSubscriberSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = EmailListSubscriberSerializer(subscribers, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def add_subscribers(self, request, pk=None):
        """Bulk add subscribers to a list."""
        email_list = self.get_object()
        serializer = BulkSubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        contact_ids = serializer.validated_data["contact_ids"]
        source = serializer.validated_data["source"]

        from apps.contacts.models import Contact

        contacts = Contact.objects.filter(id__in=contact_ids)

        added = 0
        for contact in contacts:
            _, created = EmailListSubscriber.objects.get_or_create(
                email_list=email_list,
                contact=contact,
                defaults={"source": source, "is_subscribed": True},
            )
            if created:
                added += 1

        return Response({"message": f"Added {added} subscribers", "added": added})

    @action(detail=True, methods=["post"])
    def remove_subscribers(self, request, pk=None):
        """Bulk remove subscribers from a list."""
        email_list = self.get_object()
        contact_ids = request.data.get("contact_ids", [])

        updated = EmailListSubscriber.objects.filter(
            email_list=email_list, contact_id__in=contact_ids
        ).update(is_subscribed=False, unsubscribed_at=timezone.now())

        return Response(
            {"message": f"Removed {updated} subscribers", "removed": updated}
        )


class CampaignTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing campaign templates.
    """

    queryset = CampaignTemplate.objects.all()
    serializer_class = CampaignTemplateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by category
        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category=category)

        # Filter by active status
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")

        return queryset


class CampaignViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing email campaigns.
    """

    queryset = Campaign.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return CampaignListSerializer
        return CampaignSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by status
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by campaign type
        campaign_type = self.request.query_params.get("campaign_type")
        if campaign_type:
            queryset = queryset.filter(campaign_type=campaign_type)

        return queryset

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        """Send the campaign immediately."""
        campaign = self.get_object()

        if campaign.status not in ["draft", "scheduled"]:
            return Response(
                {"error": "Campaign is not ready to send"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not campaign.email_lists.exists():
            return Response(
                {"error": "No email lists selected"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Start sending
        send_campaign.delay(str(campaign.id))

        return Response(
            {"message": "Campaign sending started", "campaign_id": str(campaign.id)}
        )

    @action(detail=True, methods=["post"])
    def schedule(self, request, pk=None):
        """Schedule the campaign for later."""
        campaign = self.get_object()
        scheduled_at = request.data.get("scheduled_at")

        if not scheduled_at:
            return Response(
                {"error": "scheduled_at is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        campaign.scheduled_at = scheduled_at
        campaign.status = "scheduled"
        campaign.save()

        return Response(
            {"message": "Campaign scheduled", "scheduled_at": campaign.scheduled_at}
        )

    @action(detail=True, methods=["post"])
    def pause(self, request, pk=None):
        """Pause a sending campaign."""
        campaign = self.get_object()

        if campaign.status != "sending":
            return Response(
                {"error": "Only sending campaigns can be paused"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        campaign.status = "paused"
        campaign.save()

        return Response({"message": "Campaign paused"})

    @action(detail=True, methods=["post"])
    def resume(self, request, pk=None):
        """Resume a paused campaign."""
        campaign = self.get_object()

        if campaign.status != "paused":
            return Response(
                {"error": "Only paused campaigns can be resumed"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        campaign.status = "sending"
        campaign.save()

        # Resume sending pending recipients
        from .tasks import send_campaign_email

        for recipient in campaign.recipients.filter(status="pending"):
            send_campaign_email.delay(str(recipient.id))

        return Response({"message": "Campaign resumed"})

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancel a campaign."""
        campaign = self.get_object()

        if campaign.status in ["sent", "cancelled"]:
            return Response(
                {"error": "Campaign cannot be cancelled"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        campaign.status = "cancelled"
        campaign.save()

        return Response({"message": "Campaign cancelled"})

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        """Create a copy of the campaign."""
        campaign = self.get_object()

        new_campaign = Campaign.objects.create(
            name=f"Copy of {campaign.name}",
            description=campaign.description,
            campaign_type=campaign.campaign_type,
            subject=campaign.subject,
            preview_text=campaign.preview_text,
            from_name=campaign.from_name,
            from_email=campaign.from_email,
            reply_to=campaign.reply_to,
            html_content=campaign.html_content,
            text_content=campaign.text_content,
            template=campaign.template,
            track_opens=campaign.track_opens,
            track_clicks=campaign.track_clicks,
            is_ab_test=campaign.is_ab_test,
            ab_test_subject_b=campaign.ab_test_subject_b,
            ab_test_content_b=campaign.ab_test_content_b,
            ab_test_split=campaign.ab_test_split,
            ab_test_winner_criteria=campaign.ab_test_winner_criteria,
            created_by=request.user,
        )

        # Copy email lists
        new_campaign.email_lists.set(campaign.email_lists.all())

        serializer = CampaignSerializer(new_campaign)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def recipients(self, request, pk=None):
        """Get campaign recipients with their status."""
        campaign = self.get_object()
        recipients = campaign.recipients.select_related("contact")

        # Filter by status
        status_filter = request.query_params.get("status")
        if status_filter:
            recipients = recipients.filter(status=status_filter)

        page = self.paginate_queryset(recipients)
        if page is not None:
            serializer = CampaignRecipientSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = CampaignRecipientSerializer(recipients, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def links(self, request, pk=None):
        """Get campaign links with click stats."""
        campaign = self.get_object()
        links = campaign.links.all()

        serializer = CampaignLinkSerializer(links, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def stats(self, request, pk=None):
        """Get detailed campaign statistics."""
        campaign = self.get_object()

        # Refresh stats
        update_campaign_stats.delay(str(campaign.id))

        # Get hourly opens/clicks for the last 7 days
        seven_days_ago = timezone.now() - timedelta(days=7)
        hourly_opens = (
            campaign.recipients.filter(opened_at__gte=seven_days_ago)
            .extra(select={"hour": "date_trunc('hour', opened_at)"})
            .values("hour")
            .annotate(count=Count("id"))
        )

        hourly_clicks = (
            campaign.recipients.filter(clicked_at__gte=seven_days_ago)
            .extra(select={"hour": "date_trunc('hour', clicked_at)"})
            .values("hour")
            .annotate(count=Count("id"))
        )

        # A/B test results
        ab_results = None
        if campaign.is_ab_test:
            ab_results = {
                "variant_a": campaign.recipients.filter(ab_variant="A").aggregate(
                    sent=Count(
                        "id",
                        filter=Q(status__in=["sent", "delivered", "opened", "clicked"]),
                    ),
                    opened=Count("id", filter=Q(status__in=["opened", "clicked"])),
                    clicked=Count("id", filter=Q(status="clicked")),
                ),
                "variant_b": campaign.recipients.filter(ab_variant="B").aggregate(
                    sent=Count(
                        "id",
                        filter=Q(status__in=["sent", "delivered", "opened", "clicked"]),
                    ),
                    opened=Count("id", filter=Q(status__in=["opened", "clicked"])),
                    clicked=Count("id", filter=Q(status="clicked")),
                ),
            }

        return Response(
            {
                "campaign": CampaignSerializer(campaign).data,
                "hourly_opens": list(hourly_opens),
                "hourly_clicks": list(hourly_clicks),
                "ab_results": ab_results,
                "top_links": CampaignLinkSerializer(
                    campaign.links.order_by("-total_clicks")[:10], many=True
                ).data,
            }
        )

    @action(detail=True, methods=["post"])
    def test_send(self, request, pk=None):
        """Send a test email to specified addresses."""
        campaign = self.get_object()
        test_emails = request.data.get("emails", [])

        if not test_emails:
            return Response(
                {"error": "At least one email address is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.core.mail import EmailMultiAlternatives

        from .tasks import render_template_string, strip_html_tags

        context = {
            "contact": {
                "first_name": "Test",
                "last_name": "User",
                "full_name": "Test User",
                "email": "test@example.com",
            },
            "company_name": "Ebenezer Tax Services",
            "unsubscribe_url": "#",
        }

        subject = render_template_string(campaign.subject, context)
        html_content = render_template_string(campaign.html_content, context)
        text_content = (
            render_template_string(campaign.text_content, context)
            if campaign.text_content
            else ""
        )

        sent_to = []
        for email in test_emails:
            try:
                msg = EmailMultiAlternatives(
                    subject=f"[TEST] {subject}",
                    body=text_content or strip_html_tags(html_content),
                    from_email=f"{campaign.from_name} <{campaign.from_email}>",
                    to=[email],
                )
                msg.attach_alternative(html_content, "text/html")
                msg.send()
                sent_to.append(email)
            except Exception:
                pass

        return Response(
            {
                "message": f"Test email sent to {len(sent_to)} addresses",
                "sent_to": sent_to,
            }
        )


class AutomationSequenceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing automation sequences.
    """

    queryset = AutomationSequence.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return AutomationSequenceListSerializer
        return AutomationSequenceSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        """Activate the automation sequence."""
        sequence = self.get_object()
        sequence.is_active = True
        sequence.save()
        return Response({"message": "Automation activated"})

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        """Deactivate the automation sequence."""
        sequence = self.get_object()
        sequence.is_active = False
        sequence.save()
        return Response({"message": "Automation deactivated"})

    @action(detail=True, methods=["get"])
    def enrollments(self, request, pk=None):
        """Get enrollments for an automation."""
        sequence = self.get_object()
        enrollments = sequence.enrollments.select_related("contact", "current_step")

        # Filter by status
        status_filter = request.query_params.get("status")
        if status_filter:
            enrollments = enrollments.filter(status=status_filter)

        page = self.paginate_queryset(enrollments)
        if page is not None:
            serializer = AutomationEnrollmentSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = AutomationEnrollmentSerializer(enrollments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def enroll_contacts(self, request, pk=None):
        """Manually enroll contacts in the automation."""
        sequence = self.get_object()
        contact_ids = request.data.get("contact_ids", [])

        from apps.contacts.models import Contact

        from .tasks import process_automation_enrollment

        contacts = Contact.objects.filter(id__in=contact_ids)
        enrolled = 0

        for contact in contacts:
            enrollment, created = AutomationEnrollment.objects.get_or_create(
                sequence=sequence, contact=contact, defaults={"status": "active"}
            )

            if created:
                first_step = sequence.steps.order_by("order").first()
                if first_step:
                    enrollment.current_step = first_step
                    enrollment.save()

                sequence.total_enrolled += 1
                sequence.save()

                process_automation_enrollment.delay(str(enrollment.id))
                enrolled += 1

        return Response(
            {"message": f"Enrolled {enrolled} contacts", "enrolled": enrolled}
        )


class AutomationStepViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing automation steps.
    """

    queryset = AutomationStep.objects.all()
    serializer_class = AutomationStepSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by sequence
        sequence_id = self.request.query_params.get("sequence")
        if sequence_id:
            queryset = queryset.filter(sequence_id=sequence_id)

        return queryset.order_by("sequence", "order")

    @action(detail=True, methods=["post"])
    def reorder(self, request, pk=None):
        """Change the order of a step."""
        step = self.get_object()
        new_order = request.data.get("order")

        if new_order is None:
            return Response(
                {"error": "order is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Reorder other steps
        if new_order < step.order:
            # Moving up
            AutomationStep.objects.filter(
                sequence=step.sequence, order__gte=new_order, order__lt=step.order
            ).update(order=F("order") + 1)
        else:
            # Moving down
            AutomationStep.objects.filter(
                sequence=step.sequence, order__gt=step.order, order__lte=new_order
            ).update(order=F("order") - 1)

        step.order = new_order
        step.save()

        return Response({"message": "Step reordered"})


class CampaignAnalyticsView(APIView):
    """
    Get overall campaign analytics.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Date range
        days = int(request.query_params.get("days", 30))
        start_date = timezone.now() - timedelta(days=days)

        # Overall stats
        campaigns = Campaign.objects.filter(created_at__gte=start_date)

        total_sent = campaigns.aggregate(total=Sum("total_sent"))["total"] or 0
        total_opened = campaigns.aggregate(total=Sum("total_opened"))["total"] or 0
        total_clicked = campaigns.aggregate(total=Sum("total_clicked"))["total"] or 0

        avg_open_rate = (total_opened / total_sent * 100) if total_sent > 0 else 0
        avg_click_rate = (total_clicked / total_sent * 100) if total_sent > 0 else 0

        # Campaigns by status
        campaigns_by_status = dict(
            campaigns.values("status")
            .annotate(count=Count("id"))
            .values_list("status", "count")
        )

        # Campaigns over time
        campaigns_over_time = list(
            campaigns.extra(select={"date": "date_trunc('day', created_at)"})
            .values("date")
            .annotate(
                count=Count("id"),
                sent=Sum("total_sent"),
                opened=Sum("total_opened"),
            )
            .order_by("date")
        )

        return Response(
            {
                "total_campaigns": campaigns.count(),
                "total_sent": total_sent,
                "total_opened": total_opened,
                "total_clicked": total_clicked,
                "avg_open_rate": round(avg_open_rate, 2),
                "avg_click_rate": round(avg_click_rate, 2),
                "campaigns_by_status": campaigns_by_status,
                "campaigns_over_time": campaigns_over_time,
            }
        )


class TrackOpenView(APIView):
    """
    Track email opens via tracking pixel.
    """

    permission_classes = []  # Public endpoint

    def get(self, request, tracking_token):
        try:
            recipient = CampaignRecipient.objects.get(tracking_token=tracking_token)
            recipient.mark_opened()

            # Update campaign stats
            update_campaign_stats.delay(str(recipient.campaign_id))

        except CampaignRecipient.DoesNotExist:
            pass

        # Return 1x1 transparent GIF
        gif = b"\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b"
        return HttpResponse(gif, content_type="image/gif")


class TrackClickView(APIView):
    """
    Track link clicks and redirect.
    """

    permission_classes = []  # Public endpoint

    def get(self, request, tracking_token, link_id):
        try:
            recipient = CampaignRecipient.objects.get(tracking_token=tracking_token)
            link = CampaignLink.objects.get(id=link_id, campaign=recipient.campaign)

            # Record click
            recipient.mark_clicked()

            # Update link stats
            link.total_clicks += 1

            # Check if unique click
            existing_click = CampaignLinkClick.objects.filter(
                link=link, recipient=recipient
            ).exists()

            if not existing_click:
                link.unique_clicks += 1

            link.save()

            # Log click details
            CampaignLinkClick.objects.create(
                link=link,
                recipient=recipient,
                ip_address=request.META.get("REMOTE_ADDR"),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
            )

            # Update campaign stats
            update_campaign_stats.delay(str(recipient.campaign_id))

            # Redirect to original URL
            return redirect(link.original_url)

        except (CampaignRecipient.DoesNotExist, CampaignLink.DoesNotExist):
            return Response({"error": "Invalid tracking link"}, status=404)


class UnsubscribeView(APIView):
    """
    Handle unsubscribe requests.
    """

    permission_classes = []  # Public endpoint

    def get(self, request, tracking_token):
        """Show unsubscribe confirmation page."""
        try:
            recipient = CampaignRecipient.objects.select_related(
                "contact", "campaign"
            ).get(tracking_token=tracking_token)

            return Response(
                {
                    "email": recipient.email,
                    "campaign_name": recipient.campaign.name,
                }
            )

        except CampaignRecipient.DoesNotExist:
            return Response({"error": "Invalid token"}, status=404)

    def post(self, request, tracking_token):
        """Process unsubscribe request."""
        try:
            recipient = CampaignRecipient.objects.select_related("contact").get(
                tracking_token=tracking_token
            )

            # Update recipient status
            recipient.status = "unsubscribed"
            recipient.unsubscribed_at = timezone.now()
            recipient.save()

            # Update campaign stats
            recipient.campaign.total_unsubscribed += 1
            recipient.campaign.save()

            # Unsubscribe from all lists
            EmailListSubscriber.objects.filter(contact=recipient.contact).update(
                is_subscribed=False, unsubscribed_at=timezone.now()
            )

            # Update contact opt-in status
            recipient.contact.email_opt_in_status = "opt_out"
            recipient.contact.save()

            return Response({"message": "Successfully unsubscribed"})

        except CampaignRecipient.DoesNotExist:
            return Response({"error": "Invalid token"}, status=404)
