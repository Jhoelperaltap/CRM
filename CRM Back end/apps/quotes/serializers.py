from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from apps.quotes.models import Quote, QuoteLineItem


# ---------------------------------------------------------------------------
# Helpers – lightweight nested representations
# ---------------------------------------------------------------------------
class _UserSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    full_name = serializers.CharField(source="get_full_name", read_only=True)
    email = serializers.EmailField(read_only=True)


class _ContactSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)


class _CorporationSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)


class _CaseSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    case_number = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)


# ---------------------------------------------------------------------------
# Line item serializers
# ---------------------------------------------------------------------------
class QuoteLineItemSerializer(serializers.ModelSerializer):
    """Read serializer for quote line items."""

    class Meta:
        model = QuoteLineItem
        fields = [
            "id",
            "service_type",
            "description",
            "quantity",
            "unit_price",
            "discount_percent",
            "total",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class QuoteLineItemWriteSerializer(serializers.ModelSerializer):
    """Writable serializer for line items (used nested inside QuoteCreateUpdateSerializer)."""

    id = serializers.UUIDField(required=False)

    class Meta:
        model = QuoteLineItem
        fields = [
            "id",
            "service_type",
            "description",
            "quantity",
            "unit_price",
            "discount_percent",
            "sort_order",
        ]


# ---------------------------------------------------------------------------
# Quote serializers
# ---------------------------------------------------------------------------
class QuoteListSerializer(serializers.ModelSerializer):
    """Compact serializer used in list views."""

    contact_name = serializers.SerializerMethodField()
    corporation_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = Quote
        fields = [
            "id",
            "quote_number",
            "subject",
            "stage",
            "contact_name",
            "corporation_name",
            "assigned_to_name",
            "total",
            "valid_until",
            "created_at",
        ]
        read_only_fields = fields

    def get_contact_name(self, obj) -> str:
        contact = obj.contact
        if contact:
            first = getattr(contact, "first_name", "")
            last = getattr(contact, "last_name", "")
            return f"{first} {last}".strip()
        return ""

    def get_corporation_name(self, obj) -> str | None:
        if obj.corporation:
            return obj.corporation.name
        return None

    def get_assigned_to_name(self, obj) -> str | None:
        if obj.assigned_to:
            return obj.assigned_to.get_full_name()
        return None


class QuoteDetailSerializer(serializers.ModelSerializer):
    """Full serializer used in retrieve views; includes nested objects."""

    contact = _ContactSummarySerializer(read_only=True)
    corporation = _CorporationSummarySerializer(read_only=True)
    case = _CaseSummarySerializer(read_only=True)
    assigned_to = _UserSummarySerializer(read_only=True)
    created_by = _UserSummarySerializer(read_only=True)
    line_items = QuoteLineItemSerializer(many=True, read_only=True)

    class Meta:
        model = Quote
        fields = [
            "id",
            "quote_number",
            "subject",
            "stage",
            "valid_until",
            "contact",
            "corporation",
            "case",
            "assigned_to",
            "created_by",
            "billing_street",
            "billing_city",
            "billing_state",
            "billing_zip",
            "billing_country",
            "shipping_street",
            "shipping_city",
            "shipping_state",
            "shipping_zip",
            "shipping_country",
            "subtotal",
            "discount_percent",
            "discount_amount",
            "tax_percent",
            "tax_amount",
            "total",
            "terms_conditions",
            "description",
            "custom_fields",
            "line_items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class QuoteCreateUpdateSerializer(serializers.ModelSerializer):
    """Writable serializer with nested line_items create/update/delete."""

    line_items = QuoteLineItemWriteSerializer(many=True, required=False)

    class Meta:
        model = Quote
        fields = [
            "subject",
            "stage",
            "valid_until",
            "contact",
            "corporation",
            "case",
            "assigned_to",
            "billing_street",
            "billing_city",
            "billing_state",
            "billing_zip",
            "billing_country",
            "shipping_street",
            "shipping_city",
            "shipping_state",
            "shipping_zip",
            "shipping_country",
            "discount_percent",
            "tax_percent",
            "terms_conditions",
            "description",
            "custom_fields",
            "line_items",
        ]

    # ----- helpers -----
    @staticmethod
    def _generate_quote_number():
        today = timezone.now().strftime("%Y%m%d")
        prefix = f"QT-{today}-"
        last = (
            Quote.objects.filter(quote_number__startswith=prefix)
            .order_by("-quote_number")
            .values_list("quote_number", flat=True)
            .first()
        )
        if last:
            seq = int(last.split("-")[-1]) + 1
        else:
            seq = 1
        return f"{prefix}{seq:03d}"

    @staticmethod
    def _calc_line_total(item_data):
        qty = Decimal(str(item_data.get("quantity", 1)))
        price = Decimal(str(item_data.get("unit_price", 0)))
        disc = Decimal(str(item_data.get("discount_percent", 0)))
        gross = qty * price
        return gross - (gross * disc / Decimal("100"))

    def _recalculate_totals(self, quote):
        subtotal = sum(li.total for li in quote.line_items.all())
        discount_pct = quote.discount_percent or Decimal("0")
        tax_pct = quote.tax_percent or Decimal("0")
        discount_amt = subtotal * discount_pct / Decimal("100")
        after_discount = subtotal - discount_amt
        tax_amt = after_discount * tax_pct / Decimal("100")
        total = after_discount + tax_amt

        Quote.objects.filter(pk=quote.pk).update(
            subtotal=subtotal,
            discount_amount=discount_amt,
            tax_amount=tax_amt,
            total=total,
        )
        quote.refresh_from_db()

    def _save_line_items(self, quote, line_items_data):
        existing_ids = set(quote.line_items.values_list("id", flat=True))
        incoming_ids = set()

        for idx, item_data in enumerate(line_items_data):
            item_id = item_data.pop("id", None)
            item_data["sort_order"] = item_data.get("sort_order", idx)
            item_data["total"] = self._calc_line_total(item_data)

            if item_id and item_id in existing_ids:
                QuoteLineItem.objects.filter(pk=item_id, quote=quote).update(**item_data)
                incoming_ids.add(item_id)
            else:
                li = QuoteLineItem.objects.create(quote=quote, **item_data)
                incoming_ids.add(li.pk)

        # Delete removed items
        to_delete = existing_ids - incoming_ids
        if to_delete:
            QuoteLineItem.objects.filter(pk__in=to_delete, quote=quote).delete()

    # ----- create / update -----
    def create(self, validated_data):
        line_items_data = validated_data.pop("line_items", [])
        validated_data["quote_number"] = self._generate_quote_number()
        quote = super().create(validated_data)
        self._save_line_items(quote, line_items_data)
        self._recalculate_totals(quote)
        return quote

    def update(self, instance, validated_data):
        line_items_data = validated_data.pop("line_items", None)
        quote = super().update(instance, validated_data)
        if line_items_data is not None:
            self._save_line_items(quote, line_items_data)
        self._recalculate_totals(quote)
        return quote

    def to_representation(self, instance):
        return QuoteDetailSerializer(instance, context=self.context).data
