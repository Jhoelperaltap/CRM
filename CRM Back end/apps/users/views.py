import csv
import io

from django.contrib.auth import update_session_auth_hash
from django.contrib.sessions.backends.base import CreateError
from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.users.authentication import (
    clear_auth_cookies,
    get_refresh_token_from_cookie,
    set_auth_cookies,
)
from apps.users.filters import UserFilter
from apps.users.models import ModulePermission, Role, User
from apps.users.permissions import IsAdminRole, has_action_permission
from apps.users.permissions import ModulePermission as ModulePermissionPerm
from apps.users.serializers import (
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    ModulePermissionSerializer,
    RoleCreateUpdateSerializer,
    RoleSerializer,
    RoleTreeSerializer,
    UserCreateSerializer,
    UserImportSerializer,
    UserSerializer,
    UserUpdateSerializer,
)


# ---------------------------------------------------------------------------
# User CRUD
# ---------------------------------------------------------------------------
class UserViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for user accounts.

    - **list / retrieve**: any authenticated user.
    - **create / update / destroy**: admin or manager roles only.
    - **me** (GET / PATCH): current authenticated user's own profile.
    """

    queryset = User.objects.select_related(
        "role",
        "reports_to",
        "primary_group",
        "branch",
        "department",
        "business_hours",
        "email_account",
    ).all()
    filterset_class = UserFilter
    search_fields = ["email", "username", "first_name", "last_name", "phone"]
    ordering_fields = ["email", "first_name", "last_name", "created_at", "is_active"]
    ordering = ["-created_at"]
    module_name = "users"

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        if self.action in ("update", "partial_update"):
            return UserUpdateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve", "me"):
            return [IsAuthenticated()]
        # Write operations require admin or module-level permission
        return [IsAuthenticated(), ModulePermissionPerm()]

    # ----- Custom actions -----

    @action(detail=False, methods=["get", "patch"], url_path="me")
    def me(self, request):
        """Return or update the currently authenticated user's profile."""
        user = request.user
        if request.method == "PATCH":
            serializer = UserUpdateSerializer(
                user,
                data=request.data,
                partial=True,
                context={"request": request},
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        serializer = UserSerializer(user, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(
        detail=False,
        methods=["post"],
        url_path="import_csv",
        permission_classes=[IsAuthenticated, IsAdminRole],
    )
    def import_csv(self, request):
        """Import users from a CSV file."""
        if not has_action_permission(request.user, "users", "import"):
            return Response(
                {"detail": "You do not have import permission."},
                status=status.HTTP_403_FORBIDDEN,
            )
        csv_file = request.FILES.get("file")
        if not csv_file:
            return Response(
                {"detail": "No file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        decoded = csv_file.read().decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(decoded))
        created = 0
        errors = []
        for i, row in enumerate(reader, start=2):
            serializer = UserImportSerializer(data=row)
            if serializer.is_valid():
                email = serializer.validated_data["email"]
                if User.objects.filter(email=email).exists():
                    errors.append({"row": i, "error": f"Duplicate email: {email}"})
                    continue
                serializer.save()
                created += 1
            else:
                errors.append({"row": i, "error": serializer.errors})

        return Response(
            {"created": created, "errors": errors},
            status=status.HTTP_200_OK,
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="export_csv",
        permission_classes=[IsAuthenticated, IsAdminRole],
    )
    def export_csv(self, request):
        """Export all users as a CSV download."""
        if not has_action_permission(request.user, "users", "export"):
            return Response(
                {"detail": "You do not have export permission."},
                status=status.HTTP_403_FORBIDDEN,
            )
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="users.csv"'
        writer = csv.writer(response)
        writer.writerow(
            [
                "email",
                "username",
                "first_name",
                "last_name",
                "role",
                "phone",
                "is_active",
            ]
        )
        for u in User.objects.select_related("role").all():
            writer.writerow(
                [
                    u.email,
                    u.username,
                    u.first_name,
                    u.last_name,
                    u.role.slug if u.role else "",
                    u.phone,
                    u.is_active,
                ]
            )
        return response


# ---------------------------------------------------------------------------
# Roles (read-only)
# ---------------------------------------------------------------------------
class RoleViewSet(viewsets.ModelViewSet):
    """
    CRUD for roles.  Read is open to all authenticated users;
    write operations require admin role.
    """

    queryset = (
        Role.objects.select_related("parent")
        .prefetch_related("permissions", "children")
        .all()
    )
    pagination_class = None  # roles are a small fixed set

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return RoleCreateUpdateSerializer
        if self.action == "tree":
            return RoleTreeSerializer
        return RoleSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve", "tree"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminRole()]

    @action(detail=False, methods=["get"], url_path="tree")
    def tree(self, request):
        """Return the full role hierarchy as a nested tree."""
        roots = Role.objects.filter(parent__isnull=True).prefetch_related(
            "permissions", "children__permissions", "children__children__permissions"
        )
        serializer = RoleTreeSerializer(roots, many=True)
        return Response(serializer.data)

    def perform_update(self, serializer):
        # Prevent circular references
        instance = serializer.instance
        parent = serializer.validated_data.get("parent")
        if parent:
            ancestors = parent.get_ancestors()
            if instance in ancestors or parent.pk == instance.pk:
                from rest_framework.exceptions import ValidationError

                raise ValidationError(
                    {"parent": "Cannot create circular role hierarchy."}
                )
        serializer.save()


# ---------------------------------------------------------------------------
# Module Permissions per role
# ---------------------------------------------------------------------------
class ModulePermissionViewSet(viewsets.ViewSet):
    """
    List and update module-level permissions for a given role.

    GET  /roles/<role_pk>/permissions/          -> list permissions
    PUT  /roles/<role_pk>/permissions/<pk>/      -> update a single permission row
    """

    permission_classes = [IsAuthenticated, IsAdminRole]
    module_name = "users"

    def list(self, request, role_pk=None):
        permissions = ModulePermission.objects.filter(role_id=role_pk)
        serializer = ModulePermissionSerializer(permissions, many=True)
        return Response(serializer.data)

    def update(self, request, pk=None, role_pk=None):
        try:
            permission = ModulePermission.objects.get(pk=pk, role_id=role_pk)
        except ModulePermission.DoesNotExist:
            return Response(
                {"detail": "Permission not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = ModulePermissionSerializer(
            permission,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
class CustomTokenObtainPairView(TokenObtainPairView):
    """
    POST /api/v1/auth/login/
    Returns access + refresh tokens along with the user profile.
    Also records LoginHistory, creates a UserSession, and enforces
    the concurrent session limit.

    Security: Implements brute force protection with account lockout.
    """

    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        from apps.audit.models import LoginHistory
        from apps.users.models import AuthenticationPolicy, UserSession
        from apps.users.services.brute_force import BruteForceProtection

        ip = self._get_client_ip(request)
        user_agent = request.META.get("HTTP_USER_AGENT", "")
        email = request.data.get("email", "")

        # Load policy for brute force settings
        policy = AuthenticationPolicy.load()

        # Check if account is locked before attempting login
        user_for_lockout = User.objects.filter(email=email).first()
        if user_for_lockout:
            is_locked, remaining_seconds = BruteForceProtection.check_account_locked(
                user_for_lockout
            )
            if is_locked:
                LoginHistory.objects.create(
                    user=user_for_lockout,
                    email_attempted=email,
                    status=LoginHistory.Status.FAILED,
                    ip_address=ip,
                    user_agent=user_agent,
                    failure_reason="Account locked",
                )
                remaining_minutes = (remaining_seconds // 60) + 1
                return Response(
                    {
                        "detail": f"Account is locked. Try again in {remaining_minutes} minutes.",
                        "error_code": "account_locked",
                        "retry_after_seconds": remaining_seconds,
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        try:
            response = super().post(request, *args, **kwargs)
        except Exception:
            # Login failed (bad credentials, inactive user, etc.)
            LoginHistory.objects.create(
                email_attempted=email,
                status=LoginHistory.Status.FAILED,
                ip_address=ip,
                user_agent=user_agent,
                failure_reason="Invalid credentials",
            )

            # Record failed attempt for brute force protection
            if user_for_lockout:
                account_locked, lockout_seconds = (
                    BruteForceProtection.record_failed_attempt(user_for_lockout, policy)
                )
                if account_locked:
                    remaining_minutes = (lockout_seconds // 60) + 1
                    return Response(
                        {
                            "detail": f"Too many failed attempts. Account locked for {remaining_minutes} minutes.",
                            "error_code": "account_locked",
                            "retry_after_seconds": lockout_seconds,
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )

            raise

        if response.status_code == 200:
            user_data = response.data.get("user")
            if user_data:
                user_id = user_data["id"]
                User.objects.filter(pk=user_id).update(last_login_ip=ip)

                # Record successful login
                user_obj = User.objects.filter(pk=user_id).first()
                LoginHistory.objects.create(
                    user=user_obj,
                    email_attempted=email or (user_obj.email if user_obj else ""),
                    status=LoginHistory.Status.SUCCESS,
                    ip_address=ip,
                    user_agent=user_agent,
                )

                # Reset brute force counter on successful login
                BruteForceProtection.record_successful_login(user_obj)

                # --- 2FA check ---
                if user_obj and user_obj.is_2fa_enabled:
                    from apps.users.views_2fa import create_temp_2fa_token

                    temp_token = create_temp_2fa_token(user_obj)
                    return Response(
                        {"requires_2fa": True, "temp_token": temp_token},
                        status=status.HTTP_200_OK,
                    )

                # If 2FA is not enabled, check if the policy enforces it for this user's role
                if user_obj:
                    policy = AuthenticationPolicy.load()
                    user_role_slug = user_obj.role.slug if user_obj.role else None
                    # Check if this user's role requires 2FA
                    role_requires_2fa = (
                        policy.requires_2fa_for_role(user_role_slug)
                        if user_role_slug
                        else policy.enforce_2fa  # Fallback for users without roles
                    )
                    requires_setup = role_requires_2fa and not user_obj.is_2fa_enabled
                else:
                    requires_setup = False

                # Create UserSession from the access token's jti
                access_token = response.data.get("access", "")
                if access_token:
                    from rest_framework_simplejwt.tokens import AccessToken

                    try:
                        token = AccessToken(access_token)
                        jti = str(token.get("jti", ""))
                        if jti and user_obj:
                            UserSession.objects.create(
                                user=user_obj,
                                jti=jti,
                                ip_address=ip,
                                user_agent=user_agent,
                            )

                            # Enforce concurrent session limit
                            policy = AuthenticationPolicy.load()
                            active = UserSession.objects.filter(
                                user=user_obj, is_active=True
                            ).order_by("created_at")
                            excess = active.count() - policy.max_concurrent_sessions
                            if excess > 0:
                                oldest_ids = list(
                                    active.values_list("pk", flat=True)[:excess]
                                )
                                UserSession.objects.filter(pk__in=oldest_ids).update(
                                    is_active=False
                                )
                    except Exception:
                        pass  # Don't block login if session tracking fails

                if requires_setup:
                    response.data["requires_2fa_setup"] = True

                # Session fixation prevention: regenerate session ID after login
                # This prevents session fixation attacks where an attacker sets
                # a known session ID before the user authenticates
                self._regenerate_session(request)

                # Set JWT tokens as httpOnly cookies (XSS protection)
                access_token = response.data.get("access")
                refresh_token = response.data.get("refresh")
                if access_token and refresh_token:
                    set_auth_cookies(response, access_token, refresh_token)
                    # Remove tokens from response body for browser clients
                    # They don't need them since cookies are set automatically
                    # Note: Keep them in body for backwards compatibility with mobile apps
                    response.data["cookies_set"] = True
        else:
            # Non-200 response (e.g., 401)
            LoginHistory.objects.create(
                email_attempted=email,
                status=LoginHistory.Status.FAILED,
                ip_address=ip,
                user_agent=user_agent,
                failure_reason=f"HTTP {response.status_code}",
            )

        return response

    @staticmethod
    def _get_client_ip(request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")

    @staticmethod
    def _regenerate_session(request):
        """
        Regenerate the session ID after successful authentication.

        Security: This prevents session fixation attacks where an attacker
        sets a known session ID before the user authenticates. By regenerating
        the session after login, any pre-set session becomes invalid.
        """
        if hasattr(request, "session"):
            try:
                # Save any data that needs to persist
                old_session_data = dict(request.session.items())

                # Cycle the session key
                request.session.cycle_key()

                # Restore the session data
                for key, value in old_session_data.items():
                    request.session[key] = value

            except (CreateError, Exception):
                # If session cycling fails, create a new session
                request.session.flush()
                for key, value in old_session_data.items():
                    request.session[key] = value


class ChangePasswordView(APIView):
    """
    POST /api/v1/auth/change-password/
    Allows the authenticated user to change their own password.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # Keep the session valid after password change (admin site, etc.)
        update_session_auth_hash(request, request.user)
        return Response(
            {"detail": "Password updated successfully."},
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/
    Accepts a refresh token in the request body OR cookie and blacklists it.
    Also clears the httpOnly auth cookies.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Try to get refresh token from body first (mobile apps), then cookie (web)
        refresh_token = request.data.get("refresh") or get_refresh_token_from_cookie(
            request
        )

        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                # Token might already be blacklisted or invalid - continue with logout
                pass

        # Clear the httpOnly cookies
        response = Response(
            {"detail": "Successfully logged out."},
            status=status.HTTP_200_OK,
        )
        clear_auth_cookies(response)
        return response


class CookieTokenRefreshView(APIView):
    """
    POST /api/v1/auth/refresh/
    Refreshes the access token using the refresh token from cookie or body.
    Sets new tokens as httpOnly cookies.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        # Try to get refresh token from body first (mobile apps), then cookie (web)
        refresh_token = request.data.get("refresh") or get_refresh_token_from_cookie(
            request
        )

        if not refresh_token:
            return Response(
                {"detail": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)

            # Check if token rotation is enabled
            from django.conf import settings

            rotate_tokens = settings.SIMPLE_JWT.get("ROTATE_REFRESH_TOKENS", False)
            blacklist_after = settings.SIMPLE_JWT.get("BLACKLIST_AFTER_ROTATION", False)

            if rotate_tokens:
                # Get user from the refresh token payload
                user_id = token.payload.get("user_id")
                if not user_id:
                    return Response(
                        {"detail": "Invalid token payload."},
                        status=status.HTTP_401_UNAUTHORIZED,
                    )

                # Blacklist old token before creating new one
                if blacklist_after:
                    token.blacklist()

                # Create new refresh token for the user
                user = User.objects.get(pk=user_id)
                new_refresh_token = RefreshToken.for_user(user)
                new_access = str(new_refresh_token.access_token)
                new_refresh = str(new_refresh_token)
            else:
                # No rotation - just get new access token from existing refresh
                new_access = str(token.access_token)
                new_refresh = refresh_token

            response_data = {
                "access": new_access,
                "refresh": new_refresh,
            }

            response = Response(response_data, status=status.HTTP_200_OK)

            # Set new tokens as httpOnly cookies
            set_auth_cookies(response, new_access, new_refresh)
            response.data["cookies_set"] = True

            return response

        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except Exception as e:
            return Response(
                {"detail": "Invalid or expired refresh token.", "error": str(e)},
                status=status.HTTP_401_UNAUTHORIZED,
            )
