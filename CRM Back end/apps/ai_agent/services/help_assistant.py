"""
Help Assistant Service for Staff Users.

This AI assistant helps staff with system functionality questions only.
It validates user permissions before providing guidance.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# System prompt that restricts the AI to help-only responses
HELP_ASSISTANT_SYSTEM_PROMPT = """You are EJFLOW Help Assistant, an AI assistant that ONLY helps staff users with system functionality questions.

## STRICT RULES - YOU MUST FOLLOW THESE:

1. **ONLY answer questions about EJFLOW CRM system functionality:**
   - How to create/edit/delete users, contacts, corporations, cases
   - How to configure system settings
   - How to use features (dashboard, reports, documents, appointments, etc.)
   - Navigation and UI questions
   - Troubleshooting common issues

2. **REFUSE to answer:**
   - Questions unrelated to the system (weather, news, general knowledge, coding, etc.)
   - Questions about hacking, security vulnerabilities, or exploiting the system
   - Questions about accessing other users' data without permission
   - Requests to bypass permissions or security measures
   - Personal advice, opinions, or conversations

3. **When refusing, say:**
   "I can only help with EJFLOW system functionality questions. Please ask me about how to use the CRM features, configure settings, or navigate the system."

4. **USER PERMISSIONS - Check before answering:**
   The user has the following permissions:
   {permissions}

   - If user asks about a feature they DON'T have permission for, tell them they need to contact an administrator
   - Only guide them on features they have access to

5. **RESPONSE STYLE:**
   - Be concise and helpful
   - Use bullet points for steps
   - Mention the exact menu path (e.g., "Go to Settings > Users > Create New")
   - If unsure, suggest contacting support: jhoelp@supportit.com

## AVAILABLE MODULES AND FEATURES:

### Contacts Module (requires contacts permission)
- Create, edit, delete contacts
- Import/export contacts via CSV
- Star/favorite contacts
- Assign contacts to corporations

### Corporations Module (requires corporations permission)
- Create, edit, delete companies/corporations
- Link contacts to corporations

### Cases Module (requires cases permission)
- Create tax cases for contacts
- Add notes to cases
- Update case status
- Assign cases to preparers

### Users Module (requires users permission - Admin only)
- Create staff users
- Assign roles and permissions
- Activate/deactivate users

### Documents Module (requires documents permission)
- Upload documents
- Organize in folders
- Share with clients via portal

### Appointments Module (requires appointments permission)
- Schedule appointments
- Create appointment pages for clients

### Settings (Admin only)
- System configuration
- Email settings
- Portal settings
- Workflow rules

### Reports & Dashboard
- View analytics
- Create reports
- Customize dashboard widgets

Remember: You are a HELP assistant. Only provide guidance on using the system, nothing else.
"""


class HelpAssistantService:
    """
    Service for AI-powered staff help assistant.
    """

    def __init__(self, api_key: str = None, provider: str = "openai"):
        self.api_key = api_key
        self.provider = provider
        self.client = None
        self._initialize_client()

    def _initialize_client(self):
        """Initialize the AI client."""
        if not self.api_key:
            logger.warning("No API key configured for help assistant")
            return

        if self.provider == "openai":
            try:
                import openai

                self.client = openai.OpenAI(api_key=self.api_key)
            except ImportError:
                logger.error("OpenAI package not installed")
        elif self.provider == "anthropic":
            try:
                import anthropic

                self.client = anthropic.Anthropic(api_key=self.api_key)
            except ImportError:
                logger.error("Anthropic package not installed")

    def _format_permissions(self, user) -> str:
        """Format user permissions for the system prompt."""
        if user.is_superuser:
            return "SUPERUSER - Full access to all features"

        permissions = []
        role = getattr(user, "role", None)

        if role:
            permissions.append(f"Role: {role.name}")

            # Get module permissions
            try:
                from apps.users.models import ModulePermission

                module_perms = ModulePermission.objects.filter(role=role)
                for perm in module_perms:
                    access = []
                    if perm.can_create:
                        access.append("create")
                    if perm.can_read:
                        access.append("read")
                    if perm.can_update:
                        access.append("update")
                    if perm.can_delete:
                        access.append("delete")
                    if access:
                        permissions.append(f"- {perm.module.name}: {', '.join(access)}")
            except Exception as e:
                logger.error(f"Error getting permissions: {e}")

        if not permissions:
            permissions.append("Basic user access")

        return "\n".join(permissions)

    def get_response(
        self,
        user,
        message: str,
        conversation_history: Optional[list] = None,
    ) -> dict:
        """
        Get AI response for a help question.

        Args:
            user: The authenticated user
            message: The user's question
            conversation_history: Previous messages in the conversation

        Returns:
            dict with 'content' and 'error' keys
        """
        if not self.client:
            return {
                "content": "The help assistant is not configured. Please contact your administrator to set up the AI API key in Settings > AI Agent.",
                "error": "no_client",
            }

        # Build system prompt with user permissions
        permissions = self._format_permissions(user)
        system_prompt = HELP_ASSISTANT_SYSTEM_PROMPT.format(permissions=permissions)

        # Build messages
        messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history
        if conversation_history:
            for msg in conversation_history[-10:]:  # Last 10 messages
                messages.append({"role": msg["role"], "content": msg["content"]})

        # Add current message
        messages.append({"role": "user", "content": message})

        try:
            if self.provider == "openai":
                return self._get_openai_response(messages)
            elif self.provider == "anthropic":
                return self._get_anthropic_response(messages, system_prompt)
        except Exception as e:
            logger.error(f"Help assistant error: {e}")
            return {
                "content": "I encountered an error processing your request. Please try again or contact support at jhoelp@supportit.com",
                "error": str(e),
            }

    def _get_openai_response(self, messages: list) -> dict:
        """Get response from OpenAI."""
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.3,  # Low temperature for consistent, factual responses
            max_tokens=800,
        )

        return {
            "content": response.choices[0].message.content,
            "error": None,
        }

    def _get_anthropic_response(self, messages: list, system_prompt: str) -> dict:
        """Get response from Anthropic."""
        # Convert messages format for Anthropic
        conversation_messages = [msg for msg in messages if msg["role"] != "system"]

        response = self.client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=800,
            system=system_prompt,
            messages=conversation_messages,
        )

        content = ""
        for block in response.content:
            if block.type == "text":
                content = block.text
                break

        return {
            "content": content,
            "error": None,
        }


def get_help_assistant_service() -> Optional[HelpAssistantService]:
    """
    Factory function to get the help assistant service with configuration.
    """
    try:
        from apps.ai_agent.models import AgentConfiguration

        config = AgentConfiguration.get_config()

        if not config.is_active:
            return None

        # Use the AI agent's API key
        api_key = None
        provider = "openai"

        if config.openai_api_key:
            api_key = config.openai_api_key
            provider = "openai"
        elif config.anthropic_api_key:
            api_key = config.anthropic_api_key
            provider = "anthropic"

        if not api_key:
            return None

        return HelpAssistantService(api_key=api_key, provider=provider)
    except Exception as e:
        logger.error(f"Error creating help assistant service: {e}")
        return None
