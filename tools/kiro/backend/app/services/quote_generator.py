"""
Quote Generator Service for ARK Digital Calendar.

This service handles AI-powered quote generation with personalization,
theme integration, and uniqueness validation.
"""

import httpx
import json
import logging
import uuid
from datetime import date, datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.quote import Quote
from app.models.user import User
from app.models.theme import Theme
from app.repositories.quote_repository import QuoteRepository
from app.repositories.theme_repository import ThemeRepository
from app.repositories.user_repository import UserRepository
from app.services.quote_archive import QuoteArchiveService
from app.services.content_validator import ContentValidator, ValidationResult
from app.services.content_quality import ContentQualityService

logger = logging.getLogger(__name__)

class QuoteGenerationError(Exception):
    """Exception raised when quote generation fails."""
    pass

class QuoteGenerator:
    """
    Service for generating personalized daily quotes using AI.
    
    Handles OpenAI API integration, personalization based on user profiles,
    theme alignment, and quote uniqueness validation.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.quote_repo = QuoteRepository(db)
        self.theme_repo = ThemeRepository(db)
        self.user_repo = UserRepository(db)
        self.archive_service = QuoteArchiveService(db)
        self.content_validator = ContentValidator()
        self.content_quality = ContentQualityService(db)
        self.openai_api_key = settings.OPENAI_API_KEY
        self.openai_model = settings.OPENAI_MODEL
        
        if not self.openai_api_key:
            logger.warning("OpenAI API key not configured. Quote generation will use fallback content.")
    
    async def generate_daily_quote(self, user_id: str, target_date: date) -> Quote:
        """
        Generate a personalized daily quote for a user on a specific date.
        
        Args:
            user_id: The user's unique identifier
            target_date: The date for which to generate the quote
            
        Returns:
            Quote: The generated quote with all metadata
            
        Raises:
            QuoteGenerationError: If quote generation fails
        """
        try:
            # Check if quote already exists for this user and date
            existing_quote = self.quote_repo.get_by_user_and_date(user_id, target_date)
            if existing_quote:
                logger.info(f"Returning existing quote for user {user_id} on {target_date}")
                return existing_quote
            
            # Get user profile for personalization
            user = self.user_repo.get_by_id(user_id)
            if not user:
                raise QuoteGenerationError(f"User {user_id} not found")
            
            # Get theme context for the date
            theme_context = await self.get_theme_context(target_date)
            
            # Get style variation for content diversity
            style_variation = self.content_quality.get_style_variation_for_user(
                user_id, target_date, user.personality_data
            )
            
            # Generate personalized content
            quote_content = await self._generate_ai_content(user, theme_context, target_date, style_variation=style_variation)
            
            # Validate content safety and quality
            validation_context = {
                'theme_context': theme_context,
                'user_profile': user.personality_data if user.personality_data else {},
                'target_date': target_date.isoformat()
            }
            validation_report = self.content_validator.validate_content(quote_content, validation_context)
            
            # Handle validation failures
            if validation_report.overall_result == ValidationResult.FAIL:
                logger.warning(f"Quote validation failed for user {user_id}: {validation_report.issues}")
                # Try regenerating once with stricter guidelines
                quote_content = await self._generate_ai_content(
                    user, theme_context, target_date, style_variation=style_variation, ensure_safe=True
                )
                # Re-validate
                validation_report = self.content_validator.validate_content(quote_content, validation_context)
                
                if validation_report.overall_result == ValidationResult.FAIL:
                    logger.error(f"Quote validation failed twice for user {user_id}, using fallback")
                    quote_content = self._get_fallback_quote(theme_context, target_date)
                    validation_report = self.content_validator.validate_content(quote_content, validation_context)
            
            # Log validation results
            logger.info(f"Quote validation for user {user_id}: {validation_report.overall_result.value}, "
                       f"quality_score: {validation_report.quality_score:.2f}")
            if validation_report.issues:
                logger.debug(f"Validation issues: {validation_report.issues}")
            
            # Assess content quality and variety
            quality_context = {
                'theme_context': theme_context,
                'user_profile': user.personality_data if user.personality_data else {},
                'style_variation': {
                    'style': style_variation.style.value,
                    'approach': style_variation.approach.value,
                    'tone': style_variation.tone,
                    'length_preference': style_variation.length_preference,
                    'complexity_level': style_variation.complexity_level
                } if style_variation else None
            }
            quality_metrics = self.content_quality.assess_content_quality(quote_content, user_id, quality_context)
            
            logger.info(f"Quote quality assessment for user {user_id}: overall_quality={quality_metrics.overall_quality:.2f}, "
                       f"variety={quality_metrics.variety_score:.2f}")
            if quality_metrics.recommendations:
                logger.debug(f"Quality recommendations: {quality_metrics.recommendations}")
            
            # Validate theme alignment
            if theme_context:
                alignment_score = self._calculate_theme_alignment(quote_content, theme_context)
                if alignment_score < 0.3:  # Low alignment threshold
                    logger.info(f"Quote alignment score too low ({alignment_score:.2f}), regenerating...")
                    quote_content = await self._generate_ai_content(
                        user, theme_context, target_date, style_variation=style_variation, ensure_unique=True
                    )
            
            # Validate uniqueness
            is_unique = await self.validate_quote_uniqueness(user_id, quote_content)
            if not is_unique:
                # Regenerate with uniqueness constraint
                quote_content = await self._generate_ai_content(
                    user, theme_context, target_date, style_variation=style_variation, ensure_unique=True
                )
            
            # Create enhanced personalization context with archive metadata
            personalization_context = {
                'personality_categories': user.personality_data.get('categories', []) if user.personality_data else [],
                'dominant_categories': user.personality_data.get('dominant_categories', []) if user.personality_data else [],
                'theme_alignment': theme_context.get('alignment_score', 0.0) if theme_context else 0.0,
                'generation_timestamp': datetime.now(timezone.utc).isoformat(),
                'model_used': self.openai_model,
                'personalization_strength': self._calculate_personalization_strength(user, theme_context),
                'user_preferences': user.preferences or {},
                'theme_context': {
                    'theme_id': theme_context.get('theme_id'),
                    'theme_name': theme_context.get('theme_name'),
                    'theme_type': theme_context.get('theme_type'),
                    'keywords': theme_context.get('keywords', [])
                } if theme_context else None,
                'content_validation': {
                    'overall_result': validation_report.overall_result.value,
                    'safety_result': validation_report.safety_result.value,
                    'grammar_result': validation_report.grammar_result.value,
                    'coherence_result': validation_report.coherence_result.value,
                    'quality_score': validation_report.quality_score,
                    'validation_timestamp': datetime.now(timezone.utc).isoformat()
                },
                'quality_metrics': {
                    'variety_score': quality_metrics.variety_score,
                    'style_diversity': quality_metrics.style_diversity,
                    'approach_diversity': quality_metrics.approach_diversity,
                    'content_freshness': quality_metrics.content_freshness,
                    'overall_quality': quality_metrics.overall_quality,
                    'assessment_timestamp': datetime.now(timezone.utc).isoformat()
                },
                'style_variation': {
                    'style': style_variation.style.value,
                    'approach': style_variation.approach.value,
                    'tone': style_variation.tone,
                    'length_preference': style_variation.length_preference,
                    'complexity_level': style_variation.complexity_level
                } if style_variation else None,
                # Add archive metadata immediately
                'archived_at': datetime.now(timezone.utc).isoformat(),
                'archive_version': '1.0'
            }
            
            # Create and store the quote
            quote_data = {
                'id': str(uuid.uuid4()),
                'user_id': user_id,
                'content': quote_content,
                'date': target_date,
                'theme_id': theme_context.get('theme_id') if theme_context else None,
                'personalization_context': personalization_context
            }
            
            # Save to database using repository
            saved_quote = self.quote_repo.create(quote_data)
            
            logger.info(f"Generated new quote for user {user_id} on {target_date}")
            
            return saved_quote
            
        except Exception as e:
            logger.error(f"Failed to generate quote for user {user_id} on {target_date}: {str(e)}")
            raise QuoteGenerationError(f"Quote generation failed: {str(e)}")
    
    async def validate_quote_uniqueness(self, user_id: str, content: str) -> bool:
        """
        Validate that a quote is unique for the user within the last 365 days.
        
        Args:
            user_id: The user's unique identifier
            content: The quote content to validate
            
        Returns:
            bool: True if the quote is unique, False otherwise
        """
        try:
            # Get user's quotes from the last 365 days
            recent_quotes = self.quote_repo.get_recent_quotes(user_id, days=365)
            
            # Check for exact content matches
            for quote in recent_quotes:
                if quote.content.strip().lower() == content.strip().lower():
                    logger.info(f"Quote uniqueness validation failed for user {user_id}")
                    return False
            
            # Check for high similarity (basic word overlap check)
            content_words = set(content.lower().split())
            for quote in recent_quotes:
                quote_words = set(quote.content.lower().split())
                
                # If more than 80% of words overlap, consider it too similar
                if len(content_words) > 0:
                    overlap = len(content_words.intersection(quote_words))
                    similarity = overlap / len(content_words)
                    if similarity > 0.8:
                        logger.info(f"Quote similarity too high for user {user_id}: {similarity:.2f}")
                        return False
            
            return True
            
        except Exception as e:
            logger.error(f"Quote uniqueness validation failed: {str(e)}")
            # If validation fails, assume it's unique to avoid blocking generation
            return True
    
    async def get_theme_context(self, target_date: date) -> Optional[Dict[str, Any]]:
        """
        Get comprehensive theme context for a specific date.
        
        Args:
            target_date: The date to get theme context for
            
        Returns:
            Dict containing theme information, or None if no theme found
        """
        try:
            # Get current theme for the date (prioritizes weekly over monthly)
            current_theme = self.theme_repo.get_theme_for_date(target_date)
            
            if not current_theme:
                logger.info(f"No theme found for date {target_date}")
                return None
            
            theme_context = {
                'theme_id': current_theme.id,
                'theme_name': current_theme.name,
                'theme_description': current_theme.description,
                'theme_type': current_theme.type.value,
                'keywords': current_theme.keywords or [],
                'personality_alignment': current_theme.personality_alignment or {},
                'alignment_score': 1.0  # Full alignment with current theme
            }
            
            # If this is a weekly theme, also include parent monthly theme context
            if current_theme.parent_theme_id:
                parent_theme = self.theme_repo.get_by_id(current_theme.parent_theme_id)
                if parent_theme:
                    theme_context['parent_theme'] = {
                        'theme_id': parent_theme.id,
                        'theme_name': parent_theme.name,
                        'theme_description': parent_theme.description,
                        'keywords': parent_theme.keywords or [],
                        'personality_alignment': parent_theme.personality_alignment or {}
                    }
            
            return theme_context
            
        except Exception as e:
            logger.error(f"Failed to get theme context for {target_date}: {str(e)}")
            return None
    
    async def _generate_ai_content(
        self, 
        user: User, 
        theme_context: Optional[Dict[str, Any]], 
        target_date: date,
        style_variation: Optional[Any] = None,
        ensure_unique: bool = False,
        ensure_safe: bool = False
    ) -> str:
        """
        Generate AI-powered quote content using OpenAI API.
        
        Args:
            user: User object with personality data
            theme_context: Theme information for the date
            target_date: Date for the quote
            style_variation: Style variation configuration for content diversity
            ensure_unique: Whether to emphasize uniqueness in generation
            ensure_safe: Whether to emphasize safety and appropriateness in generation
            
        Returns:
            str: Generated quote content
        """
        if not self.openai_api_key:
            return self._get_fallback_quote(theme_context, target_date)
        
        try:
            # Build personalization prompt
            prompt = self._build_generation_prompt(user, theme_context, target_date, style_variation, ensure_unique, ensure_safe)
            
            # Make API call to OpenAI
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.openai_model,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a wise and inspiring quote generator for a daily calendar app. Generate original, meaningful quotes that resonate with the user's personality and current life themes. Keep quotes concise (1-3 sentences) and avoid clichés."
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        "max_tokens": 150,
                        "temperature": 0.8,
                        "top_p": 0.9
                    },
                    timeout=30.0
                )
            
            if response.status_code != 200:
                logger.error(f"OpenAI API error: {response.status_code} - {response.text}")
                return self._get_fallback_quote(theme_context, target_date)
            
            result = response.json()
            quote_content = result['choices'][0]['message']['content'].strip()
            
            # Clean up the quote (remove quotes if AI added them)
            quote_content = quote_content.strip('"\'')
            
            logger.info(f"Successfully generated AI quote for user {user.id}")
            return quote_content
            
        except Exception as e:
            logger.error(f"AI quote generation failed: {str(e)}")
            return self._get_fallback_quote(theme_context, target_date)
    
    def _build_generation_prompt(
        self, 
        user: User, 
        theme_context: Optional[Dict[str, Any]], 
        target_date: date,
        style_variation: Optional[Any] = None,
        ensure_unique: bool = False,
        ensure_safe: bool = False
    ) -> str:
        """Build a personalized prompt for quote generation with enhanced user profile integration."""
        prompt_parts = []
        
        # Date context
        prompt_parts.append(f"Generate an inspiring quote for {target_date.strftime('%B %d, %Y')}.")
        
        # Enhanced user personality context
        if user.personality_data and user.personality_data.get('categories'):
            categories = user.personality_data['categories']
            
            # Get top personality categories with weights
            top_categories = sorted(categories, key=lambda x: x.get('weight', 0), reverse=True)[:3]
            
            if top_categories:
                # Build detailed personality context
                personality_context = []
                for cat in top_categories:
                    category_name = cat.get('category', '')
                    weight = cat.get('weight', 0)
                    confidence = cat.get('confidence', 0)
                    
                    if weight > 0.2:  # Only include meaningful categories
                        strength = "strongly" if weight > 0.4 else "moderately"
                        personality_context.append(f"{strength} interested in {category_name}")
                
                if personality_context:
                    prompt_parts.append(f"This person is {', '.join(personality_context)}.")
                
                # Get dominant categories for focused personalization
                dominant_categories = user.personality_data.get('dominant_categories', [])
                if dominant_categories:
                    prompt_parts.append(f"Focus especially on themes related to: {', '.join(dominant_categories[:2])}")
        
        # Enhanced theme context with personality alignment
        if theme_context:
            theme_name = theme_context.get('theme_name', '')
            theme_desc = theme_context.get('theme_description', '')
            theme_type = theme_context.get('theme_type', '')
            keywords = theme_context.get('keywords', [])
            personality_alignment = theme_context.get('personality_alignment', {})
            
            # Primary theme information
            prompt_parts.append(f"The current {theme_type} theme is '{theme_name}': {theme_desc}")
            
            # Include parent theme context if available (for weekly themes)
            if 'parent_theme' in theme_context:
                parent = theme_context['parent_theme']
                prompt_parts.append(f"This is part of the broader monthly theme '{parent['theme_name']}'.")
                
                # Combine keywords from both themes
                parent_keywords = parent.get('keywords', [])
                all_keywords = list(set(keywords + parent_keywords))
            else:
                all_keywords = keywords
            
            # Theme keywords
            if all_keywords:
                prompt_parts.append(f"Focus on concepts related to: {', '.join(all_keywords[:7])}")
            
            # Enhanced personality-theme alignment
            if personality_alignment and user.personality_data:
                user_categories = {cat.get('category'): cat.get('weight', 0) 
                                 for cat in user.personality_data.get('categories', [])}
                
                # Find strong alignments between user personality and theme
                strong_alignments = []
                for category, theme_weight in personality_alignment.items():
                    user_weight = user_categories.get(category, 0)
                    if theme_weight > 0.5 and user_weight > 0.2:
                        alignment_strength = theme_weight * user_weight
                        strong_alignments.append((category, alignment_strength))
                
                if strong_alignments:
                    # Sort by alignment strength
                    strong_alignments.sort(key=lambda x: x[1], reverse=True)
                    top_alignments = [cat for cat, _ in strong_alignments[:2]]
                    prompt_parts.append(f"This theme particularly resonates with this person's interest in: {', '.join(top_alignments)}")
        
        # Style variation guidance
        if style_variation:
            style_guidance = self.content_quality.generate_style_guidance(style_variation, theme_context)
            if style_guidance:
                prompt_parts.append(f"Style guidance: {style_guidance}")
        
        # Personalization based on user preferences
        if user.preferences:
            quote_length = user.preferences.get('quote_length', 'medium')
            if quote_length == 'short':
                prompt_parts.append("Keep the quote concise - one powerful sentence.")
            elif quote_length == 'long':
                prompt_parts.append("Create a more elaborate quote with 2-3 thoughtful sentences.")
            else:
                prompt_parts.append("Create a quote with 1-2 meaningful sentences.")
        
        # Uniqueness emphasis
        if ensure_unique:
            prompt_parts.append("Make this quote distinctly unique and original, avoiding common phrases.")
        
        # Safety emphasis
        if ensure_safe:
            prompt_parts.append("IMPORTANT: Ensure the quote is completely appropriate, positive, and safe for all audiences.")
            prompt_parts.append("Avoid any content that could be considered offensive, controversial, or inappropriate.")
            prompt_parts.append("Focus on universally positive, uplifting, and constructive messages.")
        
        # Final instructions with enhanced personalization
        prompt_parts.append("Create a quote that is:")
        prompt_parts.append("- Deeply personalized to this individual's interests and personality")
        prompt_parts.append("- Authentically aligned with the theme's essence")
        prompt_parts.append("- Original and thought-provoking")
        prompt_parts.append("- Positive and inspiring")
        prompt_parts.append("- Free of clichés and generic motivational language")
        prompt_parts.append("- Suitable for daily reflection and personal growth")
        prompt_parts.append("- Grammatically correct and well-structured")
        prompt_parts.append("- Appropriate for all audiences and cultures")
        
        if theme_context:
            prompt_parts.append(f"- Authentically connected to the {theme_context.get('theme_type', 'current')} theme's focus")
        
        # Add personality-specific guidance
        if user.personality_data and user.personality_data.get('dominant_categories'):
            dominant = user.personality_data['dominant_categories'][0]
            personality_guidance = {
                'spirituality': "- Incorporate elements of inner wisdom, connection, and transcendence",
                'sport': "- Include themes of perseverance, achievement, and physical/mental strength", 
                'education': "- Emphasize learning, growth, curiosity, and intellectual development",
                'health': "- Focus on wellness, balance, vitality, and holistic well-being",
                'humor': "- Include lightness, joy, and positive perspective while remaining meaningful",
                'philosophy': "- Incorporate deep thinking, wisdom, and life's fundamental questions"
            }
            
            if dominant in personality_guidance:
                prompt_parts.append(personality_guidance[dominant])
        
        return " ".join(prompt_parts)
    
    def _get_fallback_quote(self, theme_context: Optional[Dict[str, Any]], target_date: Optional[date] = None) -> str:
        """
        Get a theme-aligned fallback quote when AI generation is unavailable.
        
        Args:
            theme_context: Theme information to guide fallback selection
            target_date: The target date for the quote (used for uniqueness)
            
        Returns:
            str: A fallback quote aligned with the theme
        """
        # Enhanced fallback quotes organized by theme keywords and concepts
        fallback_quotes = {
            'growth': [
                "Every day is a new opportunity to grow beyond yesterday's limitations.",
                "Progress is not about perfection, but about persistence in the right direction.",
                "The seeds of tomorrow's success are planted in today's efforts.",
                "Growth happens when you step outside your comfort zone with intention.",
                "Your potential expands each time you choose courage over comfort."
            ],
            'wisdom': [
                "True wisdom lies not in having all the answers, but in asking better questions.",
                "Experience is the teacher that gives the test first and the lesson after.",
                "Knowledge speaks, but wisdom listens.",
                "The deepest insights often come from the quietest moments.",
                "Wisdom is knowing what to do next, virtue is doing it."
            ],
            'courage': [
                "Courage is not the absence of fear, but action in spite of it.",
                "The bravest thing you can do is be yourself in a world trying to make you someone else.",
                "Every great journey begins with a single brave step.",
                "Courage grows stronger each time you choose to face what frightens you.",
                "Your dreams are waiting on the other side of your fears."
            ],
            'peace': [
                "Peace is not the absence of conflict, but the presence of harmony within it.",
                "In stillness, we find the answers that noise cannot provide.",
                "Serenity comes not from controlling the storm, but from finding calm within it.",
                "Inner peace is the foundation from which all other achievements flow.",
                "The quieter you become, the more you can hear."
            ],
            'mindfulness': [
                "This moment is the only time you truly have power to create change.",
                "Awareness is the first step toward transformation.",
                "The present moment is where life actually happens.",
                "Mindfulness turns ordinary moments into extraordinary awareness.",
                "Being fully present is the greatest gift you can give yourself."
            ],
            'creativity': [
                "Creativity is intelligence having fun with possibilities.",
                "Every masterpiece began as someone's wild idea.",
                "Innovation happens when you give yourself permission to explore.",
                "Your unique perspective is your greatest creative asset.",
                "Creativity flows when you stop judging and start exploring."
            ],
            'health': [
                "Your body is your temple; treat it with the respect it deserves.",
                "Health is not just about what you eat, but what you think and feel.",
                "Small daily improvements lead to stunning long-term results.",
                "Wellness is a journey, not a destination.",
                "Taking care of yourself is not selfish; it's essential."
            ],
            'relationships': [
                "The quality of your relationships determines the quality of your life.",
                "Connection happens when we listen with our hearts, not just our ears.",
                "Love is not just a feeling; it's a daily choice to show up.",
                "The best relationships are built on mutual growth and understanding.",
                "Kindness is a language that everyone understands."
            ],
            'spirituality': [
                "Your soul knows the way; trust its quiet guidance.",
                "Spirituality is not about having all the answers, but embracing the mystery.",
                "The divine speaks through the language of synchronicity and intuition.",
                "Inner peace is your natural state; everything else is learned.",
                "You are not a human having a spiritual experience, but spirit having a human experience."
            ],
            'purpose': [
                "Your purpose is not something you find; it's something you create.",
                "Meaning emerges when your actions align with your deepest values.",
                "The world needs what you have to offer, even if you can't see it yet.",
                "Purpose is found in service to something greater than yourself.",
                "Your life's work is to become who you were meant to be."
            ],
            'default': [
                "Today holds infinite possibilities waiting to be discovered.",
                "Your potential is limitless when you believe in your ability to grow.",
                "Every moment is a fresh beginning, every breath a new chance.",
                "The journey of a thousand miles begins with a single step.",
                "You have within you right now, everything you need to deal with whatever the world can throw at you.",
                "Success is not final, failure is not fatal: it is the courage to continue that counts.",
                "The only way to do great work is to love what you do.",
                "Life is what happens to you while you're busy making other plans.",
                "The future belongs to those who believe in the beauty of their dreams.",
                "It is during our darkest moments that we must focus to see the light.",
                "The way to get started is to quit talking and begin doing.",
                "Don't let yesterday take up too much of today.",
                "You learn more from failure than from success. Don't let it stop you.",
                "If you are working on something that you really care about, you don't have to be pushed.",
                "Experience is a hard teacher because she gives the test first, the lesson afterward.",
                "The most difficult thing is the decision to act, the rest is merely tenacity.",
                "Every strike brings me closer to the next home run.",
                "Definiteness of purpose is the starting point of all achievement.",
                "Life is really simple, but we insist on making it complicated.",
                "The time is always right to do what is right."
            ]
        }
        
        # Determine the best category based on theme context
        selected_category = 'default'
        
        if theme_context:
            keywords = theme_context.get('keywords', [])
            theme_name = theme_context.get('theme_name', '').lower()
            theme_desc = theme_context.get('theme_description', '').lower()
            
            # Check parent theme keywords if available
            if 'parent_theme' in theme_context:
                parent_keywords = theme_context['parent_theme'].get('keywords', [])
                keywords.extend(parent_keywords)
            
            # Score each category based on keyword matches and theme content
            category_scores = {}
            
            for category in fallback_quotes.keys():
                if category == 'default':
                    continue
                    
                score = 0
                
                # Direct keyword matches
                for keyword in keywords:
                    if keyword.lower() in category or category in keyword.lower():
                        score += 3
                
                # Theme name/description matches
                if category in theme_name or category in theme_desc:
                    score += 2
                
                # Semantic matches (basic)
                semantic_matches = {
                    'growth': ['develop', 'improve', 'progress', 'advance', 'evolve'],
                    'wisdom': ['learn', 'understand', 'insight', 'knowledge', 'enlighten'],
                    'courage': ['brave', 'bold', 'fearless', 'strength', 'confidence'],
                    'peace': ['calm', 'tranquil', 'serene', 'harmony', 'balance'],
                    'mindfulness': ['present', 'aware', 'conscious', 'attention', 'focus'],
                    'creativity': ['create', 'innovate', 'imagine', 'artistic', 'express'],
                    'health': ['wellness', 'fitness', 'vitality', 'energy', 'body'],
                    'relationships': ['connect', 'love', 'friendship', 'family', 'community'],
                    'spirituality': ['soul', 'divine', 'sacred', 'meditation', 'prayer'],
                    'purpose': ['meaning', 'mission', 'calling', 'destiny', 'fulfillment']
                }
                
                if category in semantic_matches:
                    for semantic_word in semantic_matches[category]:
                        if any(semantic_word in keyword.lower() for keyword in keywords):
                            score += 1
                        if semantic_word in theme_name or semantic_word in theme_desc:
                            score += 1
                
                category_scores[category] = score
            
            # Select the highest scoring category
            if category_scores:
                selected_category = max(category_scores, key=category_scores.get)
                if category_scores[selected_category] == 0:
                    selected_category = 'default'
        
        # Get quotes from the selected category
        quotes = fallback_quotes.get(selected_category, fallback_quotes['default'])
        
        # Use target_date if provided, otherwise use current date
        if target_date:
            date_str = target_date.strftime('%Y-%m-%d')
        else:
            date_str = date.today().strftime('%Y-%m-%d')
        
        # Create a unique index using multiple date components to avoid collisions
        if target_date:
            # Use multiple date components for better distribution
            year = target_date.year
            month = target_date.month
            day = target_date.day
            day_of_year = target_date.timetuple().tm_yday
        else:
            today = date.today()
            year = today.year
            month = today.month
            day = today.day
            day_of_year = today.timetuple().tm_yday
        
        # Create a composite index using prime number multiplication to avoid patterns
        # This ensures different dates map to different quotes
        composite_index = (
            (year * 365) +           # Year component
            (month * 31) +           # Month component  
            (day * 7) +              # Day component
            (day_of_year * 3)        # Day of year component
        )
        
        # Add category-specific offset to ensure different categories don't collide
        category_offset = abs(hash(selected_category)) % 10000
        
        # Final index calculation
        quote_index = (composite_index + category_offset) % len(quotes)
        
        selected_quote = quotes[quote_index]
        
        logger.info(f"Selected fallback quote from category '{selected_category}' for date {date_str} (index {quote_index}/{len(quotes)}): {selected_quote[:50]}...")
        return selected_quote
    
    def _calculate_theme_alignment(self, quote_content: str, theme_context: Dict[str, Any]) -> float:
        """
        Calculate how well a quote aligns with the given theme context.
        
        Args:
            quote_content: The generated quote content
            theme_context: Theme information for alignment calculation
            
        Returns:
            float: Alignment score between 0.0 and 1.0
        """
        try:
            if not quote_content or not theme_context:
                return 0.0
            
            quote_words = set(quote_content.lower().split())
            alignment_score = 0.0
            total_weight = 0.0
            
            # Check keyword alignment
            keywords = theme_context.get('keywords', [])
            if keywords:
                keyword_matches = 0
                for keyword in keywords:
                    keyword_words = set(keyword.lower().split())
                    if keyword_words.intersection(quote_words):
                        keyword_matches += 1
                
                keyword_alignment = keyword_matches / len(keywords) if keywords else 0
                alignment_score += keyword_alignment * 0.4  # 40% weight for keywords
                total_weight += 0.4
            
            # Check theme name alignment
            theme_name = theme_context.get('theme_name', '')
            if theme_name:
                theme_name_words = set(theme_name.lower().split())
                name_intersection = len(theme_name_words.intersection(quote_words))
                name_alignment = name_intersection / len(theme_name_words) if theme_name_words else 0
                alignment_score += name_alignment * 0.3  # 30% weight for theme name
                total_weight += 0.3
            
            # Check parent theme alignment if available
            if 'parent_theme' in theme_context:
                parent_keywords = theme_context['parent_theme'].get('keywords', [])
                if parent_keywords:
                    parent_matches = 0
                    for keyword in parent_keywords:
                        keyword_words = set(keyword.lower().split())
                        if keyword_words.intersection(quote_words):
                            parent_matches += 1
                    
                    parent_alignment = parent_matches / len(parent_keywords) if parent_keywords else 0
                    alignment_score += parent_alignment * 0.2  # 20% weight for parent theme
                    total_weight += 0.2
            
            # Semantic alignment check (basic)
            theme_desc = theme_context.get('theme_description', '').lower()
            if theme_desc:
                desc_words = set(theme_desc.split())
                semantic_intersection = len(desc_words.intersection(quote_words))
                semantic_alignment = min(semantic_intersection / 10, 1.0)  # Cap at 1.0, normalize by 10 words
                alignment_score += semantic_alignment * 0.1  # 10% weight for semantic alignment
                total_weight += 0.1
            
            # Normalize the score
            final_score = alignment_score / total_weight if total_weight > 0 else 0.0
            
            logger.debug(f"Theme alignment score: {final_score:.3f} for quote: {quote_content[:50]}...")
            return final_score
            
        except Exception as e:
            logger.error(f"Error calculating theme alignment: {str(e)}")
            return 0.5  # Return neutral score on error
    
    def _calculate_personalization_strength(self, user: User, theme_context: Optional[Dict[str, Any]]) -> float:
        """
        Calculate the strength of personalization applied to quote generation.
        
        Args:
            user: User object with personality data
            theme_context: Theme information
            
        Returns:
            float: Personalization strength score between 0.0 and 1.0
        """
        try:
            strength_score = 0.0
            
            # User personality data contribution
            if user.personality_data and user.personality_data.get('categories'):
                categories = user.personality_data['categories']
                
                # Check for well-defined personality profile
                non_zero_categories = [cat for cat in categories if cat.get('weight', 0) > 0.1]
                if len(non_zero_categories) >= 3:
                    strength_score += 0.4  # Strong personality profile
                elif len(non_zero_categories) >= 1:
                    strength_score += 0.2  # Some personality data
                
                # Check for high-confidence categories
                high_confidence_categories = [cat for cat in categories if cat.get('confidence', 0) > 0.7]
                if high_confidence_categories:
                    strength_score += 0.2  # High confidence in personality assessment
                
                # Check for dominant categories
                dominant_categories = user.personality_data.get('dominant_categories', [])
                if len(dominant_categories) >= 2:
                    strength_score += 0.1  # Clear dominant interests
            
            # Theme-personality alignment contribution
            if theme_context and user.personality_data:
                personality_alignment = theme_context.get('personality_alignment', {})
                if personality_alignment:
                    user_categories = {cat.get('category'): cat.get('weight', 0) 
                                     for cat in user.personality_data.get('categories', [])}
                    
                    # Calculate alignment strength
                    alignment_scores = []
                    for category, theme_weight in personality_alignment.items():
                        user_weight = user_categories.get(category, 0)
                        if theme_weight > 0.3 and user_weight > 0.1:
                            alignment_scores.append(theme_weight * user_weight)
                    
                    if alignment_scores:
                        avg_alignment = sum(alignment_scores) / len(alignment_scores)
                        strength_score += avg_alignment * 0.3  # Theme-personality alignment bonus
            
            # User preferences contribution
            if user.preferences:
                # Having preferences indicates engagement
                strength_score += 0.1
            
            # Cap the score at 1.0
            return min(strength_score, 1.0)
            
        except Exception as e:
            logger.error(f"Error calculating personalization strength: {str(e)}")
            return 0.5  # Return neutral score on error