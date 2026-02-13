"""
Management command to populate the CRM with demo data for client demonstration.
Usage: python manage.py populate_demo_data
"""
import random
from decimal import Decimal
from datetime import timedelta, date, time
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from apps.cases.models import TaxCase
from apps.contacts.models import Contact
from apps.corporations.models import Corporation

User = get_user_model()


class Command(BaseCommand):
    help = "Populate database with demo data for client demonstration"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing demo data before populating",
        )

    def handle(self, *args, **options):
        self.stdout.write("Starting demo data population...")

        with transaction.atomic():
            # 1. Create Roles first
            roles = self.create_roles()
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(roles)} roles"))

            # 2. Create Branches
            branches = self.create_branches()
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(branches)} branches"))

            # 3. Create Users (not touching admin)
            users = self.create_users(roles, branches)
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(users)} users"))

            # 4. Create User Groups
            groups = self.create_user_groups(users)
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(groups)} user groups"))

            # 5. Create Corporations
            corporations = self.create_corporations(users)
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(corporations)} corporations"))

            # 6. Create Contacts
            contacts = self.create_contacts(users, corporations)
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(contacts)} contacts"))

            # 7. Create Tax Cases
            cases = self.create_cases(users, contacts, corporations)
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(cases)} tax cases"))

            # 8. Create Case Notes
            notes = self.create_case_notes(cases, users)
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(notes)} case notes"))

            # 9. Create Appointments
            appointments = self.create_appointments(users, contacts, cases)
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(appointments)} appointments"))

            # 10. Create Tasks
            tasks = self.create_tasks(users, contacts, cases, groups)
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(tasks)} tasks"))

            # 11. Create Document Folders and Documents
            folders, documents = self.create_documents(users, contacts, corporations, cases)
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(folders)} folders, {len(documents)} documents"))

            # 12. Create Email Accounts
            email_accounts = self.create_email_accounts(users)
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(email_accounts)} email accounts"))

            # 13. Create Email Templates
            templates = self.create_email_templates(users)
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(templates)} email templates"))

            # 14. Create Quotes
            quotes = self.create_quotes(users, contacts, corporations, cases)
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(quotes)} quotes"))

            # 15. Create Products and Services
            products, services = self.create_products_services()
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(products)} products, {len(services)} services"))

            # 16. Create Vendors
            vendors = self.create_vendors(users)
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(vendors)} vendors"))

            # 17. Create Tax Rates
            tax_rates = self.create_tax_rates()
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(tax_rates)} tax rates"))

            # 18. Create Invoices
            invoices = self.create_invoices(users, contacts, corporations, products, services, tax_rates)
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(invoices)} invoices"))

            # 19. Create Workflows
            workflows = self.create_workflows(users)
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(workflows)} workflows"))

            # 20. Create Notifications
            notifications = self.create_notifications(users)
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(notifications)} notifications"))

            # 21. Create Dashboard Widgets
            widgets = self.create_dashboard_widgets()
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(widgets)} dashboard widgets"))

            # 22. Create Checklist Templates
            checklists = self.create_checklist_templates(users)
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(checklists)} checklist templates"))

            # 23. Create Business Hours
            bh = self.create_business_hours()
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(bh)} business hours configs"))

            # 24. Create Internal Tickets
            tickets = self.create_internal_tickets(users, groups)
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(tickets)} internal tickets"))

            # 25. Create Portal Access
            portal_access = self.create_portal_access(contacts)
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(portal_access)} portal accounts"))

            # 26. Create Sales Quotas and Forecasts
            quotas = self.create_sales_quotas(users)
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(quotas)} sales quotas"))

            # 27. Create Approvals
            approvals = self.create_approvals(users, roles)
            self.stdout.write(self.style.SUCCESS(f"[OK] Created {len(approvals)} approval rules"))

        self.stdout.write(self.style.SUCCESS("\n=== Demo data population completed successfully! ==="))

    def create_roles(self):
        from apps.users.models import Role, ModulePermission

        roles_data = [
            {"name": "Manager", "slug": "manager", "level": 2, "department": "Operations"},
            {"name": "Supervisor", "slug": "supervisor", "level": 3, "department": "Operations"},
            {"name": "Tax Preparer", "slug": "preparer", "level": 4, "department": "Tax Services"},
            {"name": "Reviewer", "slug": "reviewer", "level": 4, "department": "Tax Services"},
            {"name": "Receptionist", "slug": "receptionist", "level": 5, "department": "Front Office"},
            {"name": "Sales Representative", "slug": "sales-representative", "level": 4, "department": "Sales"},
        ]

        created = []
        for data in roles_data:
            role, was_created = Role.objects.get_or_create(
                slug=data["slug"],
                defaults=data
            )
            if was_created:
                created.append(role)
                # Create module permissions for the role
                modules = ["contacts", "corporations", "cases", "appointments", "documents", "tasks", "quotes", "emails"]
                for module in modules:
                    ModulePermission.objects.get_or_create(
                        role=role,
                        module=module,
                        defaults={
                            "can_view": True,
                            "can_create": data["level"] <= 4,
                            "can_edit": data["level"] <= 4,
                            "can_delete": data["level"] <= 3,
                            "can_export": data["level"] <= 3,
                            "can_import": data["level"] <= 3,
                        }
                    )
        return created

    def create_branches(self):
        from apps.users.models import Branch

        branches_data = [
            {"name": "Main Office", "code": "HQ", "address": "123 Main Street", "city": "Miami", "state": "FL", "zip_code": "33101", "phone": "(305) 555-0100", "is_headquarters": True},
            {"name": "Downtown Branch", "code": "DT", "address": "456 Business Ave", "city": "Miami", "state": "FL", "zip_code": "33130", "phone": "(305) 555-0200", "is_headquarters": False},
            {"name": "Coral Gables Office", "code": "CG", "address": "789 Miracle Mile", "city": "Coral Gables", "state": "FL", "zip_code": "33134", "phone": "(305) 555-0300", "is_headquarters": False},
        ]

        created = []
        for data in branches_data:
            branch, was_created = Branch.objects.get_or_create(
                code=data["code"],
                defaults=data
            )
            if was_created:
                created.append(branch)
        return created

    def create_users(self, roles, branches):
        from apps.users.models import Role, Branch

        if not roles:
            roles = list(Role.objects.exclude(slug="admin"))
        if not branches:
            branches = list(Branch.objects.all())

        users_data = [
            {"email": "maria.garcia@ebenezer.com", "first_name": "Maria", "last_name": "Garcia", "role_slug": "manager", "phone": "(305) 555-1001"},
            {"email": "carlos.rodriguez@ebenezer.com", "first_name": "Carlos", "last_name": "Rodriguez", "role_slug": "supervisor", "phone": "(305) 555-1002"},
            {"email": "jennifer.martinez@ebenezer.com", "first_name": "Jennifer", "last_name": "Martinez", "role_slug": "preparer", "phone": "(305) 555-1003"},
            {"email": "david.johnson@ebenezer.com", "first_name": "David", "last_name": "Johnson", "role_slug": "preparer", "phone": "(305) 555-1004"},
            {"email": "ana.lopez@ebenezer.com", "first_name": "Ana", "last_name": "Lopez", "role_slug": "reviewer", "phone": "(305) 555-1005"},
            {"email": "michael.brown@ebenezer.com", "first_name": "Michael", "last_name": "Brown", "role_slug": "receptionist", "phone": "(305) 555-1006"},
            {"email": "sofia.hernandez@ebenezer.com", "first_name": "Sofia", "last_name": "Hernandez", "role_slug": "sales-representative", "phone": "(305) 555-1007"},
            {"email": "james.wilson@ebenezer.com", "first_name": "James", "last_name": "Wilson", "role_slug": "preparer", "phone": "(305) 555-1008"},
        ]

        created = []
        for data in users_data:
            if not User.objects.filter(email=data["email"]).exists():
                role = Role.objects.filter(slug=data.pop("role_slug")).first()
                branch = random.choice(branches) if branches else None
                user = User.objects.create_user(
                    email=data["email"],
                    password="Demo2024!",
                    username=data["email"].split("@")[0],
                    first_name=data["first_name"],
                    last_name=data["last_name"],
                    phone=data["phone"],
                    role=role,
                    branch=branch,
                    is_active=True
                )
                created.append(user)
        return created

    def create_user_groups(self, users):
        from apps.users.models import UserGroup, UserGroupMembership

        if not users:
            users = list(User.objects.exclude(is_superuser=True))

        groups_data = [
            {"name": "Tax Preparers Team", "description": "All tax preparers and reviewers"},
            {"name": "Sales Team", "description": "Sales and business development staff"},
            {"name": "Management", "description": "Managers and supervisors"},
        ]

        created = []
        for data in groups_data:
            group, was_created = UserGroup.objects.get_or_create(
                name=data["name"],
                defaults=data
            )
            if was_created:
                created.append(group)
                # Add random users to group
                for user in random.sample(users, min(3, len(users))):
                    UserGroupMembership.objects.get_or_create(group=group, user=user)
        return created

    def create_corporations(self, users):
        from apps.corporations.models import Corporation

        if not users:
            users = list(User.objects.exclude(is_superuser=True))

        corporations_data = [
            {
                "name": "TechStart Solutions",
                "legal_name": "TechStart Solutions LLC",
                "entity_type": "llc",
                "organization_type": "customer",
                "organization_status": "hot",
                "ein": "12-3456789",
                "industry": "Technology",
                "annual_revenue": Decimal("2500000.00"),
                "annual_revenue_range": "1m_5m",
                "employees": 45,
                "ownership": "Private",
                "sic_code": "7371",
                "website": "https://www.techstartsolutions.com",
                "twitter_username": "@techstart",
            },
            {
                "name": "Miami Construction Co",
                "legal_name": "Miami Construction Company Inc",
                "entity_type": "s_corp",
                "organization_type": "customer",
                "organization_status": "warm",
                "ein": "23-4567890",
                "industry": "Construction",
                "annual_revenue": Decimal("5000000.00"),
                "annual_revenue_range": "1m_5m",
                "employees": 120,
                "ownership": "Private",
                "sic_code": "1542",
            },
            {
                "name": "Sunshine Medical Group",
                "legal_name": "Sunshine Medical Group PA",
                "entity_type": "c_corp",
                "organization_type": "customer",
                "organization_status": "hot",
                "ein": "34-5678901",
                "industry": "Healthcare",
                "annual_revenue": Decimal("8000000.00"),
                "annual_revenue_range": "5m_10m",
                "employees": 85,
                "ownership": "Professional Association",
                "sic_code": "8011",
                "website": "https://www.sunshinemedical.com",
            },
            {
                "name": "Coral Real Estate",
                "legal_name": "Coral Real Estate Partners LLC",
                "entity_type": "llc",
                "organization_type": "customer",
                "organization_status": "warm",
                "ein": "45-6789012",
                "industry": "Real Estate",
                "annual_revenue": Decimal("3500000.00"),
                "annual_revenue_range": "1m_5m",
                "employees": 25,
                "ownership": "Partnership",
                "sic_code": "6531",
                "website": "https://www.coralrealestate.com",
            },
            {
                "name": "Ocean Imports",
                "legal_name": "Ocean Imports & Exports Inc",
                "entity_type": "c_corp",
                "organization_type": "customer",
                "organization_status": "hot",
                "ein": "56-7890123",
                "industry": "Import/Export",
                "annual_revenue": Decimal("12000000.00"),
                "annual_revenue_range": "10m_25m",
                "employees": 200,
                "ownership": "Private",
                "sic_code": "5199",
                "website": "https://www.oceanimports.com",
                "twitter_username": "@oceanimports",
            },
            {
                "name": "Green Gardens Landscaping",
                "legal_name": "Green Gardens Landscaping LLC",
                "entity_type": "llc",
                "organization_type": "lead",
                "organization_status": "cold",
                "ein": "67-8901234",
                "industry": "Landscaping",
                "annual_revenue": Decimal("750000.00"),
                "annual_revenue_range": "500k_1m",
                "employees": 18,
                "ownership": "Private",
                "sic_code": "0782",
            },
            {
                "name": "Family Restaurant Group",
                "legal_name": "Family Restaurant Group Inc",
                "entity_type": "s_corp",
                "organization_type": "customer",
                "organization_status": "warm",
                "ein": "78-9012345",
                "industry": "Food & Beverage",
                "annual_revenue": Decimal("1800000.00"),
                "annual_revenue_range": "1m_5m",
                "employees": 65,
                "ownership": "Family Owned",
                "sic_code": "5812",
                "website": "https://www.familyrestaurantgroup.com",
            },
            {
                "name": "Blue Wave Consulting",
                "legal_name": "Blue Wave Consulting LLC",
                "entity_type": "llc",
                "organization_type": "prospect",
                "organization_status": "warm",
                "ein": "89-0123456",
                "industry": "Consulting",
                "annual_revenue": Decimal("950000.00"),
                "annual_revenue_range": "500k_1m",
                "employees": 12,
                "ownership": "Private",
                "sic_code": "8742",
                "website": "https://www.bluewaveconsulting.com",
                "linkedin_url": "https://linkedin.com/company/bluewave",
            },
        ]

        cities_data = [
            {"city": "Miami", "state": "FL", "zip": "33101", "region": "southeast"},
            {"city": "Coral Gables", "state": "FL", "zip": "33134", "region": "southeast"},
            {"city": "Hialeah", "state": "FL", "zip": "33010", "region": "southeast"},
            {"city": "Doral", "state": "FL", "zip": "33166", "region": "southeast"},
            {"city": "Kendall", "state": "FL", "zip": "33156", "region": "southeast"},
            {"city": "Brickell", "state": "FL", "zip": "33131", "region": "southeast"},
        ]

        streets = ["Business", "Commerce", "Corporate", "Trade", "Executive", "Enterprise", "Professional"]
        street_types = ["Street", "Avenue", "Boulevard", "Drive", "Way", "Plaza", "Parkway"]
        timezones = ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"]

        created = []
        for data in corporations_data:
            if not Corporation.objects.filter(name=data["name"]).exists():
                city_data = random.choice(cities_data)
                street_num = random.randint(100, 9999)
                street_name = random.choice(streets)
                street_type = random.choice(street_types)
                full_street = f"{street_num} {street_name} {street_type}"

                corp = Corporation.objects.create(
                    **data,
                    # Billing address
                    billing_street=full_street,
                    billing_city=city_data["city"],
                    billing_state=city_data["state"],
                    billing_zip=city_data["zip"],
                    billing_country="United States",
                    billing_po_box="" if random.random() > 0.2 else f"PO Box {random.randint(100, 9999)}",
                    # Shipping address (same as billing for most)
                    shipping_street=full_street,
                    shipping_city=city_data["city"],
                    shipping_state=city_data["state"],
                    shipping_zip=city_data["zip"],
                    shipping_country="United States",
                    shipping_po_box="",
                    # Legacy address
                    street_address=full_street,
                    city=city_data["city"],
                    state=city_data["state"],
                    zip_code=city_data["zip"],
                    country="United States",
                    # Region and timezone
                    region=city_data["region"],
                    timezone=random.choice(timezones),
                    # Contact info
                    phone=f"(305) 555-{random.randint(2000, 9999)}",
                    secondary_phone=f"(786) 555-{random.randint(2000, 9999)}" if random.random() > 0.5 else "",
                    fax=f"(305) 555-{random.randint(2000, 9999)}" if random.random() > 0.6 else "",
                    email=f"info@{data['name'].lower().replace(' ', '')}.com",
                    secondary_email=f"contact@{data['name'].lower().replace(' ', '')}.com" if random.random() > 0.5 else "",
                    email_domain=f"{data['name'].lower().replace(' ', '')}.com",
                    # Marketing preferences
                    email_opt_in="single_opt_in",
                    sms_opt_in="single_opt_in",
                    notify_owner=random.choice([True, False]),
                    # Status
                    status="active",
                    fiscal_year_end="December",
                    date_incorporated=date(random.randint(2000, 2020), random.randint(1, 12), random.randint(1, 28)),
                    description=f"{data['name']} is a leading company in the {data['industry']} industry, providing quality services to clients throughout South Florida.",
                    assigned_to=random.choice(users) if users else None,
                    created_by=random.choice(users) if users else None,
                )
                created.append(corp)
        return created

    def create_contacts(self, users, corporations):
        from apps.contacts.models import Contact

        if not users:
            users = list(User.objects.exclude(is_superuser=True))
        if not corporations:
            corporations = list(Corporation.objects.all())

        first_names = ["John", "Maria", "Robert", "Patricia", "Michael", "Jennifer", "William", "Linda", "David", "Elizabeth",
                       "Richard", "Barbara", "Joseph", "Susan", "Thomas", "Jessica", "Charles", "Sarah", "Christopher", "Karen",
                       "Daniel", "Nancy", "Matthew", "Lisa", "Anthony", "Betty", "Jose", "Margaret", "Mark", "Sandra"]
        last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
                      "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
                      "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson"]

        cities = ["Miami", "Coral Gables", "Hialeah", "Doral", "Kendall", "Miami Beach", "Homestead", "Aventura"]
        sources = ["Referral", "Website", "Walk-in", "Social Media", "Google Ads", "Radio Ad", "TV Ad", "Existing Client"]

        created = []
        for i in range(50):  # Create 50 contacts
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            email = f"{first_name.lower()}.{last_name.lower()}{random.randint(1, 999)}@email.com"

            if not Contact.objects.filter(email=email).exists():
                corp = random.choice(corporations) if corporations and random.random() > 0.4 else None
                contact = Contact.objects.create(
                    salutation=random.choice(["Mr.", "Ms.", "Mrs.", "Dr.", ""]),
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                    phone=f"(305) {random.randint(200, 999)}-{random.randint(1000, 9999)}",
                    mobile=f"(786) {random.randint(200, 999)}-{random.randint(1000, 9999)}",
                    date_of_birth=date(random.randint(1950, 2000), random.randint(1, 12), random.randint(1, 28)),
                    ssn_last_four=f"{random.randint(1000, 9999)}",
                    street_address=f"{random.randint(100, 9999)} {random.choice(['Oak', 'Pine', 'Maple', 'Palm', 'Coral', 'Ocean'])} {random.choice(['Street', 'Avenue', 'Drive', 'Lane', 'Court'])}",
                    city=random.choice(cities),
                    state="FL",
                    zip_code=f"331{random.randint(10, 99)}",
                    country="USA",
                    preferred_language=random.choice(["EN", "ES", "EN", "EN"]),  # More English speakers
                    status=random.choice(["ACTIVE", "ACTIVE", "ACTIVE", "LEAD", "INACTIVE"]),  # Most active
                    source=random.choice(sources),
                    corporation=corp,
                    assigned_to=random.choice(users) if users else None,
                    created_by=random.choice(users) if users else None,
                    description="Contact created for demo purposes. Interested in tax services.",
                )
                created.append(contact)
        return created

    def create_cases(self, users, contacts, corporations):
        from apps.cases.models import TaxCase

        if not users:
            users = list(User.objects.exclude(is_superuser=True))
        if not contacts:
            contacts = list(Contact.objects.all())
        if not corporations:
            corporations = list(Corporation.objects.all())

        case_types = ["INDIVIDUAL_1040", "CORPORATE_1120", "S_CORP_1120S", "PARTNERSHIP_1065", "PAYROLL", "SALES_TAX", "AMENDMENT"]
        statuses = ["NEW", "WAITING_FOR_DOCUMENTS", "IN_PROGRESS", "UNDER_REVIEW", "READY_TO_FILE", "FILED", "COMPLETED"]
        priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"]

        created = []
        case_counter = TaxCase.objects.count() + 1

        for i in range(40):  # Create 40 cases
            contact = random.choice(contacts) if contacts else None
            case_type = random.choice(case_types)

            # Determine if corporate case
            if case_type in ["CORPORATE_1120", "S_CORP_1120S", "PARTNERSHIP_1065"]:
                corp = random.choice(corporations) if corporations else None
            else:
                corp = None

            status = random.choice(statuses)
            fiscal_year = random.choice([2023, 2024, 2024, 2024])  # Most 2024

            due_date = date(fiscal_year + 1, 4, 15) if case_type == "INDIVIDUAL_1040" else date(fiscal_year + 1, 3, 15)

            case = TaxCase.objects.create(
                case_number=f"CASE-{fiscal_year}-{case_counter:04d}",
                title=f"{case_type.replace('_', ' ').title()} - {contact.first_name} {contact.last_name}" if contact else f"{case_type.replace('_', ' ').title()} - {corp.name if corp else 'Client'}",
                case_type=case_type,
                fiscal_year=fiscal_year,
                status=status,
                priority=random.choice(priorities),
                contact=contact,
                corporation=corp,
                assigned_preparer=random.choice(users) if users else None,
                reviewer=random.choice(users) if users else None,
                created_by=random.choice(users) if users else None,
                estimated_fee=Decimal(random.randint(200, 5000)),
                actual_fee=Decimal(random.randint(200, 5000)) if status in ["FILED", "COMPLETED"] else None,
                due_date=due_date,
                filed_date=due_date - timedelta(days=random.randint(1, 30)) if status in ["FILED", "COMPLETED"] else None,
                description=f"Tax preparation case for fiscal year {fiscal_year}.",
            )
            created.append(case)
            case_counter += 1

        return created

    def create_case_notes(self, cases, users):
        from apps.cases.models import TaxCaseNote

        if not cases:
            cases = list(TaxCase.objects.all())
        if not users:
            users = list(User.objects.exclude(is_superuser=True))

        note_templates = [
            "Initial consultation completed. Client provided basic documents.",
            "Received W-2 forms from client. Waiting for additional 1099s.",
            "All documents received. Starting preparation.",
            "Found potential deduction for home office expenses.",
            "Review completed. Minor adjustments needed.",
            "Client approved final numbers. Ready to file.",
            "Return filed electronically. Confirmation received.",
            "Client called with question about refund status.",
            "Follow-up scheduled for next week.",
            "Additional documentation requested for business expenses.",
        ]

        created = []
        for case in cases[:30]:  # Add notes to 30 cases
            num_notes = random.randint(1, 4)
            for _ in range(num_notes):
                note = TaxCaseNote.objects.create(
                    case=case,
                    author=random.choice(users) if users else None,
                    content=random.choice(note_templates),
                    is_internal=random.choice([True, True, False]),
                )
                created.append(note)
        return created

    def create_appointments(self, users, contacts, cases):
        from apps.appointments.models import Appointment
        from apps.cases.models import TaxCase

        if not users:
            users = list(User.objects.exclude(is_superuser=True))
        if not contacts:
            contacts = list(Contact.objects.all())
        if not cases:
            cases = list(TaxCase.objects.all())

        titles = [
            "Initial Consultation",
            "Document Review Meeting",
            "Tax Planning Session",
            "Return Review & Signature",
            "Year-End Planning",
            "Quarterly Review",
            "Amendment Discussion",
            "Business Tax Consultation",
        ]

        locations = ["OFFICE", "VIRTUAL", "PHONE"]

        created = []
        base_date = timezone.now()

        for i in range(30):  # Create 30 appointments
            # Mix of past and future appointments
            if i < 15:
                start = base_date - timedelta(days=random.randint(1, 60))
                status = random.choice(["COMPLETED", "COMPLETED", "CANCELLED", "NO_SHOW"])
            else:
                start = base_date + timedelta(days=random.randint(1, 30))
                status = random.choice(["SCHEDULED", "CONFIRMED"])

            start = start.replace(hour=random.choice([9, 10, 11, 13, 14, 15, 16]), minute=random.choice([0, 30]), second=0, microsecond=0)
            end = start + timedelta(hours=1)

            contact = random.choice(contacts) if contacts else None
            case = random.choice(cases) if cases and random.random() > 0.3 else None

            apt = Appointment.objects.create(
                title=random.choice(titles),
                description=f"Meeting with {contact.first_name} {contact.last_name}" if contact else "Client meeting",
                start_datetime=start,
                end_datetime=end,
                location=random.choice(locations),
                status=status,
                contact=contact,
                assigned_to=random.choice(users) if users else None,
                created_by=random.choice(users) if users else None,
                case=case,
                notes="Scheduled via CRM demo",
                recurrence_pattern="NONE",
            )
            created.append(apt)
        return created

    def create_tasks(self, users, contacts, cases, groups):
        from apps.tasks.models import Task
        from apps.cases.models import TaxCase
        from apps.users.models import UserGroup

        if not users:
            users = list(User.objects.exclude(is_superuser=True))
        if not contacts:
            contacts = list(Contact.objects.all())
        if not cases:
            cases = list(TaxCase.objects.all())
        if not groups:
            groups = list(UserGroup.objects.all())

        task_titles = [
            "Call client for missing documents",
            "Review submitted W-2 forms",
            "Prepare 1040 draft",
            "Send document request email",
            "Follow up on extension request",
            "Review amended return",
            "Prepare engagement letter",
            "Update client contact information",
            "Schedule quarterly review meeting",
            "Process payment received",
            "Send invoice to client",
            "Review prior year return",
            "Verify deductions documentation",
            "Calculate estimated payments",
            "Prepare state tax return",
        ]

        priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"]
        statuses = ["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"]

        created = []
        base_date = date.today()

        for i in range(40):  # Create 40 tasks
            due_date = base_date + timedelta(days=random.randint(-10, 30))
            status = random.choice(statuses)

            task = Task.objects.create(
                title=random.choice(task_titles),
                description="Task created for demo purposes.",
                assigned_to=random.choice(users) if users and random.random() > 0.2 else None,
                assigned_group=random.choice(groups) if groups and random.random() > 0.7 else None,
                created_by=random.choice(users) if users else None,
                case=random.choice(cases) if cases and random.random() > 0.3 else None,
                contact=random.choice(contacts) if contacts and random.random() > 0.5 else None,
                priority=random.choice(priorities),
                status=status,
                due_date=due_date,
                completed_at=timezone.now() if status == "COMPLETED" else None,
            )
            created.append(task)
        return created

    def create_documents(self, users, contacts, corporations, cases):
        from apps.documents.models import DocumentFolder, Document, DocumentTag
        from apps.cases.models import TaxCase

        if not users:
            users = list(User.objects.exclude(is_superuser=True))
        if not contacts:
            contacts = list(Contact.objects.all())
        if not cases:
            cases = list(TaxCase.objects.all())

        # Create folders
        folders_data = [
            {"name": "Client Documents", "description": "Documents uploaded by clients"},
            {"name": "Tax Returns", "description": "Completed tax returns"},
            {"name": "W-2 Forms", "description": "Employee wage statements"},
            {"name": "1099 Forms", "description": "Miscellaneous income forms"},
            {"name": "Bank Statements", "description": "Financial account statements"},
            {"name": "Receipts", "description": "Expense receipts and invoices"},
        ]

        folders_created = []
        for data in folders_data:
            folder, was_created = DocumentFolder.objects.get_or_create(
                name=data["name"],
                defaults={**data, "owner": random.choice(users) if users else None}
            )
            if was_created:
                folders_created.append(folder)

        folders = list(DocumentFolder.objects.all())

        # Create tags
        tags_data = [
            {"name": "Urgent", "color": "#ef4444", "tag_type": "SHARED"},
            {"name": "Verified", "color": "#22c55e", "tag_type": "SHARED"},
            {"name": "Pending Review", "color": "#f59e0b", "tag_type": "SHARED"},
            {"name": "2024", "color": "#3b82f6", "tag_type": "SHARED"},
            {"name": "2023", "color": "#6366f1", "tag_type": "SHARED"},
        ]

        for data in tags_data:
            DocumentTag.objects.get_or_create(name=data["name"], defaults=data)

        tags = list(DocumentTag.objects.all())

        # Create documents (metadata only, no actual files)
        doc_types = ["W2", "1099", "TAX_RETURN", "ID_DOCUMENT", "BANK_STATEMENT", "RECEIPT", "OTHER"]
        statuses = ["PENDING", "APPROVED", "APPROVED", "APPROVED"]  # Mostly approved

        documents_created = []
        for i in range(60):  # Create 60 document records
            contact = random.choice(contacts) if contacts and random.random() > 0.3 else None
            case = random.choice(cases) if cases and random.random() > 0.4 else None

            doc_type = random.choice(doc_types)
            title_map = {
                "W2": f"W-2 Form {random.randint(2022, 2024)}",
                "1099": f"1099-MISC {random.randint(2022, 2024)}",
                "TAX_RETURN": f"Tax Return {random.randint(2022, 2024)}",
                "ID_DOCUMENT": "Driver License Copy",
                "BANK_STATEMENT": f"Bank Statement {random.choice(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'])} 2024",
                "RECEIPT": f"Expense Receipt #{random.randint(1000, 9999)}",
                "OTHER": "Supporting Document",
            }

            doc = Document.objects.create(
                title=title_map[doc_type],
                doc_type=doc_type,
                status=random.choice(statuses),
                description=f"Document for {contact.first_name if contact else 'client'}",
                file_size=random.randint(50000, 5000000),
                mime_type="application/pdf",
                contact=contact,
                corporation=contact.corporation if contact else None,
                case=case,
                folder=random.choice(folders) if folders else None,
                uploaded_by=random.choice(users) if users else None,
            )
            # Add random tags
            if tags:
                doc.tags.set(random.sample(tags, random.randint(0, 2)))
            documents_created.append(doc)

        return folders_created, documents_created

    def create_email_accounts(self, users):
        from apps.emails.models import EmailAccount

        if not users:
            users = list(User.objects.exclude(is_superuser=True))

        accounts_data = [
            {"name": "Main Office", "email_address": "office@ebenezer-tax.com", "imap_host": "imap.gmail.com", "smtp_host": "smtp.gmail.com"},
            {"name": "Support", "email_address": "support@ebenezer-tax.com", "imap_host": "imap.gmail.com", "smtp_host": "smtp.gmail.com"},
            {"name": "Sales", "email_address": "sales@ebenezer-tax.com", "imap_host": "imap.gmail.com", "smtp_host": "smtp.gmail.com"},
        ]

        created = []
        for data in accounts_data:
            account, was_created = EmailAccount.objects.get_or_create(
                email_address=data["email_address"],
                defaults={
                    **data,
                    "imap_port": 993,
                    "imap_use_ssl": True,
                    "smtp_port": 587,
                    "smtp_use_tls": True,
                    "username": data["email_address"],
                    "password": "demo_password_encrypted",
                    "is_active": True,
                    "sync_interval_minutes": 5,
                    "created_by": random.choice(users) if users else None,
                }
            )
            if was_created:
                created.append(account)

        # Assign email accounts to some users
        accounts = list(EmailAccount.objects.all())
        if accounts and users:
            for user in users[:3]:
                user.email_account = random.choice(accounts)
                user.save()

        return created

    def create_email_templates(self, users):
        from apps.emails.models import EmailTemplate

        if not users:
            users = list(User.objects.exclude(is_superuser=True))

        templates_data = [
            {
                "name": "Document Request",
                "subject": "Documents Needed for Your Tax Return - {{client_name}}",
                "body_text": "Dear {{client_name}},\n\nWe are preparing your tax return and need the following documents:\n\n{{document_list}}\n\nPlease upload these documents to your client portal or bring them to our office.\n\nThank you,\nEbenezer Tax Services",
                "variables": ["client_name", "document_list"],
            },
            {
                "name": "Appointment Confirmation",
                "subject": "Appointment Confirmed - {{date}}",
                "body_text": "Dear {{client_name}},\n\nYour appointment has been confirmed for {{date}} at {{time}}.\n\nLocation: {{location}}\n\nPlease bring any relevant documents.\n\nBest regards,\nEbenezer Tax Services",
                "variables": ["client_name", "date", "time", "location"],
            },
            {
                "name": "Return Ready for Review",
                "subject": "Your Tax Return is Ready for Review",
                "body_text": "Dear {{client_name}},\n\nGreat news! Your {{tax_year}} tax return is ready for your review.\n\nSummary:\n- Federal Refund/Amount Due: {{federal_amount}}\n- State Refund/Amount Due: {{state_amount}}\n\nPlease log into your portal to review and approve.\n\nBest regards,\nEbenezer Tax Services",
                "variables": ["client_name", "tax_year", "federal_amount", "state_amount"],
            },
            {
                "name": "Welcome New Client",
                "subject": "Welcome to Ebenezer Tax Services!",
                "body_text": "Dear {{client_name}},\n\nWelcome to Ebenezer Tax Services! We're excited to have you as a client.\n\nYour dedicated tax preparer is {{preparer_name}}.\n\nTo get started, please complete your client profile in our portal.\n\nBest regards,\nThe Ebenezer Team",
                "variables": ["client_name", "preparer_name"],
            },
            {
                "name": "Payment Receipt",
                "subject": "Payment Received - Thank You",
                "body_text": "Dear {{client_name}},\n\nThank you for your payment of {{amount}}.\n\nPayment Details:\n- Date: {{payment_date}}\n- Method: {{payment_method}}\n- Reference: {{reference_number}}\n\nThank you for choosing Ebenezer Tax Services.\n\nBest regards,\nEbenezer Tax Services",
                "variables": ["client_name", "amount", "payment_date", "payment_method", "reference_number"],
            },
        ]

        created = []
        for data in templates_data:
            template, was_created = EmailTemplate.objects.get_or_create(
                name=data["name"],
                defaults={
                    **data,
                    "is_active": True,
                    "created_by": random.choice(users) if users else None,
                }
            )
            if was_created:
                created.append(template)
        return created

    def create_quotes(self, users, contacts, corporations, cases):
        from apps.quotes.models import Quote, QuoteLineItem
        from apps.cases.models import TaxCase

        if not users:
            users = list(User.objects.exclude(is_superuser=True))
        if not contacts:
            contacts = list(Contact.objects.all())
        if not cases:
            cases = list(TaxCase.objects.all())

        stages = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"]
        service_types = [
            ("INDIVIDUAL_1040", "Individual Tax Return (1040)", Decimal("350.00")),
            ("CORPORATE_1120", "Corporate Tax Return (1120)", Decimal("1500.00")),
            ("S_CORP_1120S", "S-Corp Tax Return (1120S)", Decimal("1200.00")),
            ("PARTNERSHIP_1065", "Partnership Return (1065)", Decimal("1000.00")),
            ("PAYROLL", "Quarterly Payroll Services", Decimal("300.00")),
            ("BOOKKEEPING", "Monthly Bookkeeping", Decimal("500.00")),
        ]

        created = []
        quote_counter = Quote.objects.count() + 1

        for i in range(20):  # Create 20 quotes
            contact = random.choice(contacts) if contacts else None
            stage = random.choice(stages)

            quote = Quote.objects.create(
                quote_number=f"QT-{date.today().year}-{quote_counter:04d}",
                subject=f"Tax Services Quote - {contact.first_name} {contact.last_name}" if contact else "Tax Services Quote",
                stage=stage,
                valid_until=date.today() + timedelta(days=30) if stage in ["DRAFT", "SENT"] else None,
                contact=contact,
                corporation=contact.corporation if contact else None,
                assigned_to=random.choice(users) if users else None,
                created_by=random.choice(users) if users else None,
                billing_street=contact.street_address if contact else "",
                billing_city=contact.city if contact else "",
                billing_state=contact.state if contact else "",
                billing_zip=contact.zip_code if contact else "",
                billing_country="USA",
                terms_conditions="Payment due upon completion of services. 50% deposit required for new clients.",
                description="Quote for tax preparation services.",
            )

            # Add line items
            subtotal = Decimal("0.00")
            num_items = random.randint(1, 3)
            for j, (svc_type, desc, price) in enumerate(random.sample(service_types, num_items)):
                qty = Decimal("1")
                total = price * qty
                subtotal += total
                QuoteLineItem.objects.create(
                    quote=quote,
                    service_type=svc_type,
                    description=desc,
                    quantity=qty,
                    unit_price=price,
                    discount_percent=Decimal("0"),
                    total=total,
                    sort_order=j,
                )

            # Update totals
            quote.subtotal = subtotal
            quote.tax_percent = Decimal("7.00")
            quote.tax_amount = subtotal * Decimal("0.07")
            quote.total = subtotal + quote.tax_amount
            quote.save()

            created.append(quote)
            quote_counter += 1

        return created

    def create_products_services(self):
        from apps.inventory.models import Product, Service

        products_data = [
            {"name": "Tax Organizer Folder", "product_code": "PROD-001", "category": "Supplies", "unit_price": Decimal("15.00"), "qty_in_stock": 100},
            {"name": "Filing Envelope Pack", "product_code": "PROD-002", "category": "Supplies", "unit_price": Decimal("25.00"), "qty_in_stock": 50},
            {"name": "Tax Software License", "product_code": "PROD-003", "category": "Software", "unit_price": Decimal("299.00"), "qty_in_stock": 10},
            {"name": "Client Welcome Kit", "product_code": "PROD-004", "category": "Supplies", "unit_price": Decimal("35.00"), "qty_in_stock": 75},
        ]

        services_data = [
            {"name": "Individual Tax Return (1040)", "service_code": "SVC-1040", "category": "Tax Preparation", "unit_price": Decimal("350.00")},
            {"name": "Corporate Tax Return (1120)", "service_code": "SVC-1120", "category": "Tax Preparation", "unit_price": Decimal("1500.00")},
            {"name": "S-Corp Tax Return (1120S)", "service_code": "SVC-1120S", "category": "Tax Preparation", "unit_price": Decimal("1200.00")},
            {"name": "Partnership Return (1065)", "service_code": "SVC-1065", "category": "Tax Preparation", "unit_price": Decimal("1000.00")},
            {"name": "Quarterly Bookkeeping", "service_code": "SVC-BOOK-Q", "category": "Bookkeeping", "unit_price": Decimal("450.00")},
            {"name": "Monthly Bookkeeping", "service_code": "SVC-BOOK-M", "category": "Bookkeeping", "unit_price": Decimal("350.00")},
            {"name": "Payroll Processing", "service_code": "SVC-PAYROLL", "category": "Payroll", "unit_price": Decimal("150.00")},
            {"name": "Tax Consultation (Hourly)", "service_code": "SVC-CONSULT", "category": "Consulting", "unit_price": Decimal("175.00")},
            {"name": "IRS Representation", "service_code": "SVC-IRS-REP", "category": "Representation", "unit_price": Decimal("500.00")},
            {"name": "Amendment Filing", "service_code": "SVC-AMEND", "category": "Tax Preparation", "unit_price": Decimal("200.00")},
        ]

        products_created = []
        for data in products_data:
            product, was_created = Product.objects.get_or_create(
                product_code=data["product_code"],
                defaults={**data, "is_active": True, "unit": "each"}
            )
            if was_created:
                products_created.append(product)

        services_created = []
        for data in services_data:
            service, was_created = Service.objects.get_or_create(
                service_code=data["service_code"],
                defaults={**data, "is_active": True, "usage_unit": "service"}
            )
            if was_created:
                services_created.append(service)

        return products_created, services_created

    def create_vendors(self, users):
        from apps.inventory.models import Vendor

        if not users:
            users = list(User.objects.exclude(is_superuser=True))

        vendors_data = [
            {"name": "Office Depot", "vendor_code": "VEND-001", "category": "Office Supplies", "email": "orders@officedepot.com", "phone": "(800) 555-1234"},
            {"name": "Tax Software Inc", "vendor_code": "VEND-002", "category": "Software", "email": "sales@taxsoftware.com", "phone": "(800) 555-2345"},
            {"name": "Print Shop Plus", "vendor_code": "VEND-003", "category": "Printing", "email": "orders@printshop.com", "phone": "(305) 555-3456"},
            {"name": "IT Solutions LLC", "vendor_code": "VEND-004", "category": "Technology", "email": "support@itsolutions.com", "phone": "(305) 555-4567"},
        ]

        created = []
        for data in vendors_data:
            vendor, was_created = Vendor.objects.get_or_create(
                vendor_code=data["vendor_code"],
                defaults={
                    **data,
                    "city": "Miami",
                    "state": "FL",
                    "country": "USA",
                    "is_active": True,
                    "assigned_to": random.choice(users) if users else None,
                    "created_by": random.choice(users) if users else None,
                }
            )
            if was_created:
                created.append(vendor)
        return created

    def create_tax_rates(self):
        from apps.inventory.models import TaxRate

        rates_data = [
            {"name": "Florida Sales Tax", "rate": Decimal("6.00"), "is_active": True},
            {"name": "Miami-Dade County Tax", "rate": Decimal("1.00"), "is_active": True},
            {"name": "No Tax", "rate": Decimal("0.00"), "is_active": True},
        ]

        created = []
        for data in rates_data:
            rate, was_created = TaxRate.objects.get_or_create(
                name=data["name"],
                defaults=data
            )
            if was_created:
                created.append(rate)
        return created

    def create_invoices(self, users, contacts, corporations, products, services, tax_rates):
        from apps.inventory.models import Invoice, InvoiceLineItem, TaxRate, Service
        from apps.contacts.models import Contact

        if not users:
            users = list(User.objects.exclude(is_superuser=True))
        if not contacts:
            contacts = list(Contact.objects.all())
        if not tax_rates:
            tax_rates = list(TaxRate.objects.filter(is_active=True))
        if not services:
            services = list(Service.objects.filter(is_active=True))

        statuses = ["Draft", "Sent", "Paid", "Paid", "Paid", "Overdue"]  # More paid

        created = []
        invoice_counter = Invoice.objects.count() + 1

        for i in range(25):  # Create 25 invoices
            contact = random.choice(contacts) if contacts else None
            status = random.choice(statuses)

            invoice = Invoice.objects.create(
                invoice_number=f"INV-{date.today().year}-{invoice_counter:04d}",
                subject=f"Tax Services - {contact.first_name} {contact.last_name}" if contact else "Tax Services",
                status=status,
                contact=contact,
                corporation=contact.corporation if contact else None,
                assigned_to=random.choice(users) if users else None,
                created_by=random.choice(users) if users else None,
                billing_street=contact.street_address if contact else "",
                billing_city=contact.city if contact else "",
                billing_state=contact.state if contact else "",
                billing_zip=contact.zip_code if contact else "",
                billing_country="USA",
                terms_and_conditions="Payment due within 30 days.",
                description="Invoice for tax services rendered.",
            )

            # Add line items
            subtotal = Decimal("0.00")
            num_items = random.randint(1, 3)
            for j, service in enumerate(random.sample(services, min(num_items, len(services)))):
                qty = Decimal("1")
                total = service.unit_price * qty
                subtotal += total
                InvoiceLineItem.objects.create(
                    invoice=invoice,
                    service=service,
                    description=service.name,
                    quantity=qty,
                    unit_price=service.unit_price,
                    discount_percent=Decimal("0"),
                    tax_rate=random.choice(tax_rates) if tax_rates else None,
                    total=total,
                    sort_order=j,
                )

            # Update totals
            invoice.subtotal = subtotal
            invoice.tax_amount = subtotal * Decimal("0.07")
            invoice.total = subtotal + invoice.tax_amount
            invoice.save()

            created.append(invoice)
            invoice_counter += 1

        return created

    def create_workflows(self, users):
        from apps.workflows.models import WorkflowRule

        if not users:
            users = list(User.objects.exclude(is_superuser=True))

        workflows_data = [
            {
                "name": "New Case Assignment Notification",
                "description": "Send notification when a new case is assigned",
                "trigger_type": "CASE_CREATED",
                "trigger_config": {},
                "conditions": [],
                "action_type": "SEND_NOTIFICATION",
                "action_config": {"title": "New Case Assigned", "message": "A new case has been assigned to you."},
            },
            {
                "name": "Case Due Date Reminder",
                "description": "Send reminder 7 days before case due date",
                "trigger_type": "CASE_DUE_DATE_APPROACHING",
                "trigger_config": {"days_before": 7},
                "conditions": [],
                "action_type": "SEND_EMAIL",
                "action_config": {"template": "due_date_reminder"},
            },
            {
                "name": "Document Upload Notification",
                "description": "Notify preparer when client uploads document",
                "trigger_type": "DOCUMENT_UPLOADED",
                "trigger_config": {},
                "conditions": [],
                "action_type": "SEND_NOTIFICATION",
                "action_config": {"title": "New Document", "message": "A client has uploaded a new document."},
            },
            {
                "name": "Task Overdue Alert",
                "description": "Create alert when task is overdue",
                "trigger_type": "TASK_OVERDUE",
                "trigger_config": {},
                "conditions": [],
                "action_type": "SEND_NOTIFICATION",
                "action_config": {"title": "Overdue Task", "message": "You have an overdue task."},
            },
        ]

        created = []
        for data in workflows_data:
            workflow, was_created = WorkflowRule.objects.get_or_create(
                name=data["name"],
                defaults={
                    **data,
                    "is_active": True,
                    "created_by": random.choice(users) if users else None,
                }
            )
            if was_created:
                created.append(workflow)
        return created

    def create_notifications(self, users):
        from apps.notifications.models import Notification

        if not users:
            users = list(User.objects.exclude(is_superuser=True))

        notification_types = [
            ("CASE_STATUS_CHANGED", "Case Status Updated", "Case #CASE-2024-0015 status changed to In Progress"),
            ("EMAIL_ASSIGNED", "New Email Assigned", "You have been assigned a new email from john.smith@email.com"),
            ("TASK_DUE", "Task Due Today", "Task 'Call client for missing documents' is due today"),
            ("DOCUMENT_UPLOADED", "New Document", "Client Maria Garcia uploaded a new W-2 form"),
            ("APPOINTMENT_REMINDER", "Upcoming Appointment", "You have an appointment in 1 hour with John Smith"),
        ]

        created = []
        for user in users[:5]:  # Add notifications for 5 users
            for notif_type, title, message in random.sample(notification_types, 3):
                notif = Notification.objects.create(
                    recipient=user,
                    notification_type=notif_type,
                    title=title,
                    message=message,
                    severity=random.choice(["INFO", "WARNING", "SUCCESS"]),
                    is_read=random.choice([True, False]),
                )
                created.append(notif)
        return created

    def create_dashboard_widgets(self):
        from apps.dashboard.models import DashboardWidget

        widgets_data = [
            {"name": "Cases by Status", "widget_type": "CASES_BY_STATUS", "chart_type": "BAR", "description": "Distribution of cases by current status"},
            {"name": "Revenue Pipeline", "widget_type": "REVENUE_PIPELINE", "chart_type": "LINE", "description": "Monthly revenue projection and actuals"},
            {"name": "Upcoming Deadlines", "widget_type": "UPCOMING_DEADLINES", "chart_type": "TABLE", "description": "Cases with approaching due dates"},
            {"name": "Tasks Overview", "widget_type": "TASKS_OVERVIEW", "chart_type": "PIE", "description": "Task completion statistics"},
            {"name": "Recent Activity", "widget_type": "RECENT_ACTIVITY", "chart_type": "TABLE", "description": "Latest system activity"},
            {"name": "Client Stats", "widget_type": "CLIENT_STATS", "chart_type": "STAT_CARD", "description": "Key client metrics"},
        ]

        created = []
        for i, data in enumerate(widgets_data):
            widget, was_created = DashboardWidget.objects.get_or_create(
                widget_type=data["widget_type"],
                defaults={**data, "default_enabled": True, "sort_order": i}
            )
            if was_created:
                created.append(widget)
        return created

    def create_checklist_templates(self, users):
        from apps.cases.models import ChecklistTemplate, ChecklistTemplateItem

        if not users:
            users = list(User.objects.exclude(is_superuser=True))

        templates_data = [
            {
                "name": "Individual 1040 Checklist",
                "case_type": "INDIVIDUAL_1040",
                "items": [
                    {"title": "W-2 Forms", "description": "All W-2 forms from employers", "doc_type": "W2", "is_required": True},
                    {"title": "1099 Forms", "description": "All 1099 forms (interest, dividends, etc.)", "doc_type": "1099", "is_required": True},
                    {"title": "Photo ID", "description": "Valid government-issued photo ID", "doc_type": "ID_DOCUMENT", "is_required": True},
                    {"title": "Social Security Card", "description": "SSN card for all dependents", "doc_type": "ID_DOCUMENT", "is_required": True},
                    {"title": "Prior Year Return", "description": "Copy of last year's tax return", "doc_type": "TAX_RETURN", "is_required": False},
                    {"title": "Bank Statements", "description": "For direct deposit setup", "doc_type": "BANK_STATEMENT", "is_required": False},
                ],
            },
            {
                "name": "Corporate 1120 Checklist",
                "case_type": "CORPORATE_1120",
                "items": [
                    {"title": "Financial Statements", "description": "Year-end P&L and Balance Sheet", "doc_type": "OTHER", "is_required": True},
                    {"title": "Bank Statements", "description": "All business bank accounts", "doc_type": "BANK_STATEMENT", "is_required": True},
                    {"title": "Payroll Reports", "description": "Annual payroll summary", "doc_type": "OTHER", "is_required": True},
                    {"title": "Depreciation Schedule", "description": "Asset depreciation records", "doc_type": "OTHER", "is_required": False},
                    {"title": "Prior Year Return", "description": "Previous corporate return", "doc_type": "TAX_RETURN", "is_required": True},
                ],
            },
        ]

        created = []
        for data in templates_data:
            template, was_created = ChecklistTemplate.objects.get_or_create(
                name=data["name"],
                defaults={
                    "case_type": data["case_type"],
                    "is_active": True,
                    "created_by": random.choice(users) if users else None,
                }
            )
            if was_created:
                created.append(template)
                for i, item_data in enumerate(data["items"]):
                    ChecklistTemplateItem.objects.create(
                        template=template,
                        title=item_data["title"],
                        description=item_data["description"],
                        doc_type=item_data["doc_type"],
                        is_required=item_data["is_required"],
                        sort_order=i,
                    )
        return created

    def create_business_hours(self):
        from apps.business_hours.models import BusinessHours, WorkingDay, WorkingInterval, Holiday

        bh, was_created = BusinessHours.objects.get_or_create(
            name="Standard Office Hours",
            defaults={
                "timezone": "America/New_York",
                "is_default": True,
                "is_active": True,
            }
        )

        if was_created:
            # Create working days (Mon-Fri)
            for day in range(5):  # 0-4 = Mon-Fri
                wd = WorkingDay.objects.create(
                    business_hours=bh,
                    day_of_week=day,
                    is_working=True,
                )
                WorkingInterval.objects.create(
                    working_day=wd,
                    start_time=time(9, 0),
                    end_time=time(12, 0),
                    sort_order=0,
                )
                WorkingInterval.objects.create(
                    working_day=wd,
                    start_time=time(13, 0),
                    end_time=time(17, 0),
                    sort_order=1,
                )

            # Weekend - not working
            for day in [5, 6]:  # Sat, Sun
                WorkingDay.objects.create(
                    business_hours=bh,
                    day_of_week=day,
                    is_working=False,
                )

            # Add some holidays
            holidays = [
                (date(2024, 1, 1), "New Year's Day"),
                (date(2024, 7, 4), "Independence Day"),
                (date(2024, 11, 28), "Thanksgiving"),
                (date(2024, 12, 25), "Christmas Day"),
                (date(2025, 1, 1), "New Year's Day 2025"),
            ]
            for hdate, hname in holidays:
                Holiday.objects.create(
                    business_hours=bh,
                    date=hdate,
                    name=hname,
                )

            return [bh]
        return []

    def create_internal_tickets(self, users, groups):
        from apps.internal_tickets.models import InternalTicket
        from apps.users.models import UserGroup

        if not users:
            users = list(User.objects.exclude(is_superuser=True))
        if not groups:
            groups = list(UserGroup.objects.all())

        tickets_data = [
            {"title": "Computer running slow", "description": "My computer has been running very slow since last week.", "category": "IT", "priority": "NORMAL"},
            {"title": "Request new monitor", "description": "Need a second monitor for my workstation.", "category": "IT", "priority": "LOW"},
            {"title": "Payroll question", "description": "Question about my latest pay stub.", "category": "HR", "priority": "NORMAL"},
            {"title": "Office supplies needed", "description": "Need printer paper and pens for the front desk.", "category": "GENERAL", "priority": "LOW"},
            {"title": "Software license renewal", "description": "Tax software license expiring next month.", "category": "IT", "priority": "HIGH"},
            {"title": "AC not working", "description": "The air conditioning in the main office is not working.", "category": "GENERAL", "priority": "URGENT"},
        ]

        created = []
        ticket_counter = InternalTicket.objects.count() + 1

        for data in tickets_data:
            ticket = InternalTicket.objects.create(
                ticket_number=f"TKT-{ticket_counter:04d}",
                title=data["title"],
                description=data["description"],
                status=random.choice(["NEW", "OPEN", "IN_PROGRESS", "CLOSED"]),
                priority=data["priority"],
                category=data["category"],
                group=random.choice(groups) if groups else None,
                assigned_to=random.choice(users) if users else None,
                employee=random.choice(users) if users else None,
                created_by=random.choice(users) if users else None,
                channel="WEB",
                email=random.choice(users).email if users else "employee@company.com",
            )
            created.append(ticket)
            ticket_counter += 1

        return created

    def create_portal_access(self, contacts):
        from apps.portal.models import ClientPortalAccess
        from apps.contacts.models import Contact
        from django.contrib.auth.hashers import make_password

        if not contacts:
            contacts = list(Contact.objects.filter(status="ACTIVE")[:10])

        created = []
        for contact in contacts[:10]:  # Create portal access for 10 contacts
            if not ClientPortalAccess.objects.filter(contact=contact).exists():
                portal = ClientPortalAccess.objects.create(
                    contact=contact,
                    email=contact.email,
                    password_hash=make_password("Portal2024!"),
                    is_active=True,
                )
                created.append(portal)
        return created

    def create_sales_quotas(self, users):
        from apps.forecasts.models import SalesQuota, ForecastEntry

        if not users:
            users = list(User.objects.exclude(is_superuser=True))

        created = []
        current_year = date.today().year

        for user in users[:4]:  # Create quotas for 4 users
            for quarter in range(1, 5):
                quota, was_created = SalesQuota.objects.get_or_create(
                    user=user,
                    fiscal_year=current_year,
                    quarter=quarter,
                    defaults={
                        "amount": Decimal(random.randint(50000, 150000)),
                        "notify_by_email": True,
                    }
                )
                if was_created:
                    created.append(quota)
                    # Create forecast entry
                    ForecastEntry.objects.get_or_create(
                        user=user,
                        fiscal_year=current_year,
                        quarter=quarter,
                        defaults={
                            "pipeline": Decimal(random.randint(30000, 100000)),
                            "best_case": Decimal(random.randint(40000, 120000)),
                            "commit": Decimal(random.randint(20000, 80000)),
                        }
                    )
        return created

    def create_approvals(self, users, roles):
        from apps.approvals.models import Approval, ApprovalRule, ApprovalAction
        from apps.users.models import Role

        if not users:
            users = list(User.objects.exclude(is_superuser=True))
        if not roles:
            roles = list(Role.objects.all())

        approvals_data = [
            {
                "name": "Quote Approval",
                "description": "Approval required for quotes over $5000",
                "module": "QUOTES",
                "trigger": "ON_SAVE",
                "entry_criteria_all": [{"field": "total", "operator": "greater_than", "value": 5000}],
            },
            {
                "name": "Case Closure Approval",
                "description": "Manager approval required to close cases",
                "module": "CASES",
                "trigger": "ON_SAVE",
                "entry_criteria_all": [{"field": "status", "operator": "equals", "value": "CLOSED"}],
            },
        ]

        created = []
        for data in approvals_data:
            approval, was_created = Approval.objects.get_or_create(
                name=data["name"],
                defaults={
                    **data,
                    "is_active": True,
                    "apply_on": "CREATED_BY",
                    "created_by": random.choice(users) if users else None,
                }
            )
            if was_created:
                created.append(approval)
                # Create approval rule
                rule = ApprovalRule.objects.create(
                    approval=approval,
                    rule_number=1,
                    conditions=[],
                )
                if roles:
                    rule.owner_profiles.set(roles[:2])
                if users:
                    rule.approvers.set(users[:2])

                # Create approval action
                ApprovalAction.objects.create(
                    approval=approval,
                    phase="APPROVAL",
                    action_type="SEND_NOTIFICATION",
                    action_title="Notify on Approval",
                    action_config={"title": "Approved", "message": "Your request has been approved."},
                    is_active=True,
                )

        return created
