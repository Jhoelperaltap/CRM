"""
AI Service for the AI Agent system.
Provides unified interface for OpenAI and Anthropic AI providers.
"""

import json
import logging
import time
from typing import Any

from django.utils import timezone

logger = logging.getLogger(__name__)


class AIService:
    """
    Unified AI service that supports both OpenAI and Anthropic providers.
    """

    def __init__(self, config):
        """
        Initialize AI service with configuration.

        Args:
            config: AgentConfiguration instance
        """
        self.config = config
        self.provider = config.ai_provider
        self.model = config.ai_model
        self.temperature = config.ai_temperature
        self.max_tokens = config.max_tokens
        self.client = None

        self._initialize_client()

    def _initialize_client(self):
        """Initialize the appropriate AI client based on provider."""
        if self.provider == "openai":
            self._init_openai()
        elif self.provider == "anthropic":
            self._init_anthropic()
        else:
            raise ValueError(f"Unsupported AI provider: {self.provider}")

    def _init_openai(self):
        """Initialize OpenAI client."""
        try:
            from openai import OpenAI

            api_key = self.config.openai_api_key
            if not api_key:
                raise ValueError("OpenAI API key not configured")

            self.client = OpenAI(api_key=api_key)
            logger.info("OpenAI client initialized successfully")
        except ImportError:
            logger.error("OpenAI package not installed")
            raise ImportError("Please install openai: pip install openai")

    def _init_anthropic(self):
        """Initialize Anthropic client."""
        try:
            from anthropic import Anthropic

            api_key = self.config.anthropic_api_key
            if not api_key:
                raise ValueError("Anthropic API key not configured")

            self.client = Anthropic(api_key=api_key)
            logger.info("Anthropic client initialized successfully")
        except ImportError:
            logger.error("Anthropic package not installed")
            raise ImportError("Please install anthropic: pip install anthropic")

    def analyze(
        self,
        prompt: str,
        system_prompt: str | None = None,
        json_response: bool = False,
    ) -> dict[str, Any]:
        """
        Send a prompt to the AI and get a response.

        Args:
            prompt: The user prompt to send
            system_prompt: Optional system prompt for context
            json_response: If True, parse response as JSON

        Returns:
            dict with keys: content, tokens_used, latency_ms, model
        """
        if not self.client:
            raise RuntimeError("AI client not initialized")

        start_time = time.time()

        # Build system prompt with custom instructions
        full_system_prompt = system_prompt or ""
        if self.config.custom_instructions:
            full_system_prompt = f"{full_system_prompt}\n\n{self.config.custom_instructions}".strip()

        try:
            if self.provider == "openai":
                result = self._call_openai(prompt, full_system_prompt, json_response)
            else:
                result = self._call_anthropic(prompt, full_system_prompt, json_response)

            latency_ms = int((time.time() - start_time) * 1000)
            result["latency_ms"] = latency_ms
            result["model"] = self.model
            result["timestamp"] = timezone.now().isoformat()

            return result

        except Exception as e:
            logger.error(f"AI API call failed: {e}")
            raise

    def _call_openai(
        self,
        prompt: str,
        system_prompt: str,
        json_response: bool,
    ) -> dict[str, Any]:
        """Make OpenAI API call."""
        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        messages.append({"role": "user", "content": prompt})

        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
        }

        if json_response:
            kwargs["response_format"] = {"type": "json_object"}

        response = self.client.chat.completions.create(**kwargs)

        content = response.choices[0].message.content
        tokens_used = response.usage.total_tokens if response.usage else 0

        if json_response:
            try:
                content = json.loads(content)
            except json.JSONDecodeError:
                logger.warning("Failed to parse JSON response from OpenAI")

        return {
            "content": content,
            "tokens_used": tokens_used,
            "raw_response": response.model_dump() if hasattr(response, "model_dump") else None,
        }

    def _call_anthropic(
        self,
        prompt: str,
        system_prompt: str,
        json_response: bool,
    ) -> dict[str, Any]:
        """Make Anthropic API call."""
        kwargs = {
            "model": self.model,
            "max_tokens": self.max_tokens,
            "messages": [{"role": "user", "content": prompt}],
        }

        if system_prompt:
            kwargs["system"] = system_prompt

        if json_response:
            # Anthropic doesn't have native JSON mode, add instruction
            kwargs["messages"][0]["content"] = (
                f"{prompt}\n\nIMPORTANT: Respond ONLY with valid JSON, no other text."
            )

        response = self.client.messages.create(**kwargs)

        content = response.content[0].text
        tokens_used = response.usage.input_tokens + response.usage.output_tokens

        if json_response:
            try:
                content = json.loads(content)
            except json.JSONDecodeError:
                logger.warning("Failed to parse JSON response from Anthropic")

        return {
            "content": content,
            "tokens_used": tokens_used,
            "raw_response": response.model_dump() if hasattr(response, "model_dump") else None,
        }

    def analyze_with_context(
        self,
        prompt: str,
        context: dict[str, Any],
        system_prompt: str | None = None,
        json_response: bool = True,
    ) -> dict[str, Any]:
        """
        Analyze with additional structured context.

        Args:
            prompt: The analysis prompt
            context: Dictionary of contextual information
            system_prompt: Optional system prompt
            json_response: If True, parse response as JSON

        Returns:
            AI response with parsed content
        """
        context_str = json.dumps(context, indent=2, default=str)
        full_prompt = f"""Context:
{context_str}

{prompt}"""

        return self.analyze(full_prompt, system_prompt, json_response)


def get_ai_service(config=None):
    """
    Factory function to get AI service instance.

    Args:
        config: Optional AgentConfiguration instance. If not provided,
                will load from database.

    Returns:
        AIService instance
    """
    if config is None:
        from apps.ai_agent.models import AgentConfiguration

        config = AgentConfiguration.get_config()

    return AIService(config)
