"""
Content Quality Service for ARK Digital Calendar.

This service handles content variety mechanisms, style variation, and quality scoring
to ensure diverse and engaging quote generation over time.
"""

import logging
import random
from datetime import date, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
from sqlalchemy.orm import Session

from app.repositories.quote_repository import QuoteRepository

logger = logging.getLogger(__name__)

class QuoteStyle(Enum):
    """Enumeration of quote styles."""
    INSPIRATIONAL = "inspirational"
    PHILOSOPHICAL = "philosophical"
    PRACTICAL = "practical"
    POETIC = "poetic"
    CONVERSATIONAL = "conversational"
    REFLECTIVE = "reflective"
    MOTIVATIONAL = "motivational"
    WISDOM = "wisdom"

class QuoteApproach(Enum):
    """Enumeration of quote approaches."""
    DIRECT = "direct"
    METAPHORICAL = "metaphorical"
    QUESTIONING = "questioning"
    STORYTELLING = "storytelling"
    COMPARATIVE = "comparative"
    INSTRUCTIONAL = "instructional"
    OBSERVATIONAL = "observational"
    PHILOSOPHICAL = "philosophical"

@dataclass
class StyleVariation:
    """Configuration for style variation."""
    style: QuoteStyle
    approach: QuoteApproach
    tone: str
    length_preference: str
    complexity_level: str

@dataclass
class QualityMetrics:
    """Metrics for content quality assessment."""
    variety_score: float  # 0.0 to 1.0
    style_diversity: float  # 0.0 to 1.0
    approach_diversity: float  # 0.0 to 1.0
    content_freshness: float  # 0.0 to 1.0
    overall_quality: float  # 0.0 to 1.0
    recommendations: List[str]

class ContentQualityService:
    """
    Service for managing content variety, style variation, and quality scoring.
    
    Ensures quotes maintain diversity in style, approach, and content over time
    while maintaining high quality standards.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.quote_repo = QuoteRepository(db)
        self.style_patterns = self._initialize_style_patterns()
        self.approach_patterns = self._initialize_approach_patterns()
        self.quality_indicators = self._initialize_quality_indicators()
    
    def get_style_variation_for_user(self, user_id: str, target_date: date, 
                                   user_profile: Optional[Dict[str, Any]] = None) -> StyleVariation:
        """
        Determine the optimal style variation for a user's quote on a specific date.
        
        Args:
            user_id: User's unique identifier
            target_date: Date for the quote
            user_profile: User's personality and preference data
            
        Returns:
            StyleVariation: Recommended style configuration
        """
        try:
            # Get user's recent quotes to analyze patterns
            recent_quotes = self.quote_repo.get_recent_quotes(user_id, days=30)
            
            # Analyze recent style usage
            recent_styles = self._extract_styles_from_quotes(recent_quotes)
            recent_approaches = self._extract_approaches_from_quotes(recent_quotes)
            
            # Determine preferred styles based on user profile
            preferred_styles = self._get_preferred_styles(user_profile)
            preferred_approaches = self._get_preferred_approaches(user_profile)
            
            # Select style with variety consideration
            selected_style = self._select_varied_style(recent_styles, preferred_styles)
            selected_approach = self._select_varied_approach(recent_approaches, preferred_approaches)
            
            # Determine tone and complexity based on user profile and date
            tone = self._determine_tone(user_profile, target_date, selected_style)
            length_preference = self._determine_length_preference(user_profile, selected_style)
            complexity_level = self._determine_complexity_level(user_profile, selected_approach)
            
            variation = StyleVariation(
                style=selected_style,
                approach=selected_approach,
                tone=tone,
                length_preference=length_preference,
                complexity_level=complexity_level
            )
            
            logger.info(f"Selected style variation for user {user_id}: {selected_style.value}/{selected_approach.value}")
            return variation
            
        except Exception as e:
            logger.error(f"Error determining style variation for user {user_id}: {str(e)}")
            # Return default variation
            return StyleVariation(
                style=QuoteStyle.INSPIRATIONAL,
                approach=QuoteApproach.DIRECT,
                tone="positive",
                length_preference="medium",
                complexity_level="moderate"
            )
    
    def assess_content_quality(self, content: str, user_id: str, 
                             context: Optional[Dict[str, Any]] = None) -> QualityMetrics:
        """
        Assess the quality of generated content across multiple dimensions.
        
        Args:
            content: The quote content to assess
            user_id: User's unique identifier
            context: Additional context (theme, user profile, etc.)
            
        Returns:
            QualityMetrics: Comprehensive quality assessment
        """
        try:
            # Get user's recent quotes for comparison
            recent_quotes = self.quote_repo.get_recent_quotes(user_id, days=60)
            
            # Calculate variety metrics
            variety_score = self._calculate_variety_score(content, recent_quotes)
            style_diversity = self._calculate_style_diversity(content, recent_quotes)
            approach_diversity = self._calculate_approach_diversity(content, recent_quotes)
            content_freshness = self._calculate_content_freshness(content, recent_quotes)
            
            # Calculate overall quality
            overall_quality = self._calculate_overall_quality(
                content, variety_score, style_diversity, approach_diversity, content_freshness
            )
            
            # Generate recommendations
            recommendations = self._generate_quality_recommendations(
                content, variety_score, style_diversity, approach_diversity, content_freshness
            )
            
            return QualityMetrics(
                variety_score=variety_score,
                style_diversity=style_diversity,
                approach_diversity=approach_diversity,
                content_freshness=content_freshness,
                overall_quality=overall_quality,
                recommendations=recommendations
            )
            
        except Exception as e:
            logger.error(f"Error assessing content quality: {str(e)}")
            return QualityMetrics(
                variety_score=0.5,
                style_diversity=0.5,
                approach_diversity=0.5,
                content_freshness=0.5,
                overall_quality=0.5,
                recommendations=["Unable to assess quality due to error"]
            )
    
    def generate_style_guidance(self, variation: StyleVariation, 
                              theme_context: Optional[Dict[str, Any]] = None) -> str:
        """
        Generate style guidance for AI content generation.
        
        Args:
            variation: Style variation configuration
            theme_context: Theme information for context
            
        Returns:
            str: Style guidance text for AI prompt
        """
        guidance_parts = []
        
        # Style-specific guidance
        style_guidance = self.style_patterns.get(variation.style, {})
        if style_guidance:
            guidance_parts.append(f"Style: {style_guidance.get('description', '')}")
            guidance_parts.append(f"Characteristics: {', '.join(style_guidance.get('characteristics', []))}")
        
        # Approach-specific guidance
        approach_guidance = self.approach_patterns.get(variation.approach, {})
        if approach_guidance:
            guidance_parts.append(f"Approach: {approach_guidance.get('description', '')}")
            guidance_parts.append(f"Techniques: {', '.join(approach_guidance.get('techniques', []))}")
        
        # Tone guidance
        tone_guidance = {
            "positive": "Maintain an uplifting, optimistic tone throughout",
            "reflective": "Use a thoughtful, contemplative tone that encourages introspection",
            "energetic": "Employ an enthusiastic, dynamic tone that motivates action",
            "calm": "Use a peaceful, serene tone that promotes tranquility",
            "wise": "Adopt a sage-like, experienced tone that conveys deep understanding"
        }
        
        if variation.tone in tone_guidance:
            guidance_parts.append(f"Tone: {tone_guidance[variation.tone]}")
        
        # Length guidance
        length_guidance = {
            "short": "Keep the quote concise - one powerful, impactful sentence",
            "medium": "Create a quote with 1-2 well-crafted sentences",
            "long": "Develop a more elaborate quote with 2-3 thoughtful sentences"
        }
        
        if variation.length_preference in length_guidance:
            guidance_parts.append(f"Length: {length_guidance[variation.length_preference]}")
        
        # Complexity guidance
        complexity_guidance = {
            "simple": "Use clear, straightforward language that's easily understood",
            "moderate": "Balance accessibility with depth, using some sophisticated concepts",
            "complex": "Employ rich, nuanced language with layered meanings and deeper concepts"
        }
        
        if variation.complexity_level in complexity_guidance:
            guidance_parts.append(f"Complexity: {complexity_guidance[variation.complexity_level]}")
        
        # Theme integration
        if theme_context:
            theme_name = theme_context.get('theme_name', '')
            if theme_name:
                guidance_parts.append(f"Integrate the theme '{theme_name}' naturally into the {variation.style.value} style")
        
        return " ".join(guidance_parts)
    
    def _initialize_style_patterns(self) -> Dict[QuoteStyle, Dict[str, Any]]:
        """Initialize patterns for different quote styles."""
        return {
            QuoteStyle.INSPIRATIONAL: {
                "description": "Uplifting and motivating content that encourages positive action",
                "characteristics": ["uplifting", "motivating", "empowering", "hopeful"],
                "keywords": ["inspire", "motivate", "achieve", "dream", "potential", "possible"],
                "tone_preferences": ["positive", "energetic"]
            },
            QuoteStyle.PHILOSOPHICAL: {
                "description": "Deep, contemplative content that explores life's fundamental questions",
                "characteristics": ["thoughtful", "profound", "contemplative", "abstract"],
                "keywords": ["wisdom", "truth", "existence", "meaning", "purpose", "understanding"],
                "tone_preferences": ["reflective", "wise"]
            },
            QuoteStyle.PRACTICAL: {
                "description": "Actionable advice and concrete guidance for daily life",
                "characteristics": ["actionable", "concrete", "useful", "applicable"],
                "keywords": ["action", "practice", "apply", "implement", "do", "create"],
                "tone_preferences": ["direct", "encouraging"]
            },
            QuoteStyle.POETIC: {
                "description": "Lyrical and artistic content with rich imagery and metaphors",
                "characteristics": ["lyrical", "artistic", "metaphorical", "beautiful"],
                "keywords": ["beauty", "flow", "rhythm", "imagery", "metaphor", "art"],
                "tone_preferences": ["artistic", "flowing"]
            },
            QuoteStyle.CONVERSATIONAL: {
                "description": "Friendly, approachable content that feels like personal advice",
                "characteristics": ["friendly", "approachable", "personal", "relatable"],
                "keywords": ["you", "we", "together", "friend", "share", "understand"],
                "tone_preferences": ["warm", "friendly"]
            },
            QuoteStyle.REFLECTIVE: {
                "description": "Introspective content that encourages self-examination",
                "characteristics": ["introspective", "contemplative", "self-examining", "mindful"],
                "keywords": ["reflect", "consider", "examine", "inner", "self", "awareness"],
                "tone_preferences": ["calm", "thoughtful"]
            },
            QuoteStyle.MOTIVATIONAL: {
                "description": "High-energy content focused on achievement and success",
                "characteristics": ["energetic", "achievement-focused", "success-oriented", "driven"],
                "keywords": ["success", "achieve", "win", "excel", "overcome", "conquer"],
                "tone_preferences": ["energetic", "powerful"]
            },
            QuoteStyle.WISDOM: {
                "description": "Time-tested insights and universal truths",
                "characteristics": ["timeless", "universal", "insightful", "experienced"],
                "keywords": ["wisdom", "truth", "experience", "learn", "understand", "know"],
                "tone_preferences": ["wise", "authoritative"]
            }
        }
    
    def _initialize_approach_patterns(self) -> Dict[QuoteApproach, Dict[str, Any]]:
        """Initialize patterns for different quote approaches."""
        return {
            QuoteApproach.DIRECT: {
                "description": "Straightforward statements that clearly express the message",
                "techniques": ["clear statements", "direct advice", "explicit guidance"],
                "indicators": ["is", "are", "must", "should", "will", "can"]
            },
            QuoteApproach.METAPHORICAL: {
                "description": "Uses analogies and metaphors to convey deeper meanings",
                "techniques": ["analogies", "metaphors", "symbolic language", "comparisons"],
                "indicators": ["like", "as", "resembles", "mirrors", "reflects"]
            },
            QuoteApproach.QUESTIONING: {
                "description": "Poses questions to encourage reflection and self-discovery",
                "techniques": ["rhetorical questions", "thought-provoking inquiries", "self-examination prompts"],
                "indicators": ["what", "how", "why", "when", "where", "?"]
            },
            QuoteApproach.STORYTELLING: {
                "description": "Uses narrative elements to illustrate points",
                "techniques": ["brief narratives", "examples", "scenarios", "illustrations"],
                "indicators": ["once", "imagine", "consider", "picture", "story"]
            },
            QuoteApproach.COMPARATIVE: {
                "description": "Draws comparisons to highlight differences or similarities",
                "techniques": ["contrasts", "comparisons", "before/after", "either/or"],
                "indicators": ["than", "versus", "compared", "unlike", "similar"]
            },
            QuoteApproach.INSTRUCTIONAL: {
                "description": "Provides step-by-step guidance or methods",
                "techniques": ["instructions", "methods", "processes", "how-to guidance"],
                "indicators": ["first", "then", "next", "finally", "step", "method"]
            },
            QuoteApproach.OBSERVATIONAL: {
                "description": "Makes observations about life, nature, or human behavior",
                "techniques": ["observations", "insights", "noticing patterns", "awareness"],
                "indicators": ["notice", "observe", "see", "witness", "recognize"]
            }
        }
    
    def _initialize_quality_indicators(self) -> Dict[str, List[str]]:
        """Initialize indicators for quality assessment."""
        return {
            "depth_words": [
                "profound", "deep", "meaningful", "significant", "important", "essential",
                "fundamental", "core", "heart", "soul", "essence", "truth", "wisdom"
            ],
            "engagement_words": [
                "discover", "explore", "journey", "adventure", "quest", "search",
                "find", "seek", "pursue", "chase", "follow", "embrace"
            ],
            "transformation_words": [
                "transform", "change", "evolve", "grow", "develop", "become",
                "shift", "transition", "metamorphosis", "renewal", "rebirth"
            ],
            "connection_words": [
                "connect", "unite", "join", "bond", "link", "bridge",
                "together", "community", "relationship", "harmony", "unity"
            ],
            "overused_words": [
                "amazing", "awesome", "incredible", "fantastic", "wonderful",
                "perfect", "best", "greatest", "ultimate", "absolute"
            ],
            "cliche_phrases": [
                "follow your dreams", "believe in yourself", "never give up",
                "everything happens for a reason", "live laugh love", "carpe diem"
            ]
        }
    
    def _extract_styles_from_quotes(self, quotes: List[Any]) -> Dict[QuoteStyle, int]:
        """Extract style usage patterns from recent quotes."""
        style_counts = {style: 0 for style in QuoteStyle}
        
        for quote in quotes:
            # Analyze quote content to determine likely style
            content = quote.content.lower()
            
            # Simple style detection based on keywords and patterns
            for style, patterns in self.style_patterns.items():
                keywords = patterns.get('keywords', [])
                keyword_matches = sum(1 for keyword in keywords if keyword in content)
                
                if keyword_matches > 0:
                    style_counts[style] += keyword_matches
        
        return style_counts
    
    def _extract_approaches_from_quotes(self, quotes: List[Any]) -> Dict[QuoteApproach, int]:
        """Extract approach usage patterns from recent quotes."""
        approach_counts = {approach: 0 for approach in QuoteApproach}
        
        for quote in quotes:
            content = quote.content.lower()
            
            # Simple approach detection based on indicators
            for approach, patterns in self.approach_patterns.items():
                indicators = patterns.get('indicators', [])
                indicator_matches = sum(1 for indicator in indicators if indicator in content)
                
                if indicator_matches > 0:
                    approach_counts[approach] += indicator_matches
        
        return approach_counts
    
    def _get_preferred_styles(self, user_profile: Optional[Dict[str, Any]]) -> List[QuoteStyle]:
        """Determine preferred styles based on user profile."""
        if not user_profile or not user_profile.get('categories'):
            return list(QuoteStyle)  # All styles if no profile
        
        preferred = []
        categories = user_profile.get('categories', [])
        
        # Map personality categories to preferred styles
        category_style_mapping = {
            'spirituality': [QuoteStyle.PHILOSOPHICAL, QuoteStyle.REFLECTIVE, QuoteStyle.WISDOM],
            'sport': [QuoteStyle.MOTIVATIONAL, QuoteStyle.INSPIRATIONAL, QuoteStyle.PRACTICAL],
            'education': [QuoteStyle.WISDOM, QuoteStyle.PHILOSOPHICAL, QuoteStyle.PRACTICAL],
            'health': [QuoteStyle.PRACTICAL, QuoteStyle.INSPIRATIONAL, QuoteStyle.REFLECTIVE],
            'humor': [QuoteStyle.CONVERSATIONAL, QuoteStyle.INSPIRATIONAL],
            'philosophy': [QuoteStyle.PHILOSOPHICAL, QuoteStyle.WISDOM, QuoteStyle.REFLECTIVE]
        }
        
        for category in categories:
            category_name = category.get('category', '')
            weight = category.get('weight', 0)
            
            if weight > 0.2 and category_name in category_style_mapping:
                preferred.extend(category_style_mapping[category_name])
        
        return list(set(preferred)) if preferred else list(QuoteStyle)
    
    def _get_preferred_approaches(self, user_profile: Optional[Dict[str, Any]]) -> List[QuoteApproach]:
        """Determine preferred approaches based on user profile."""
        if not user_profile:
            return list(QuoteApproach)
        
        # Simple mapping - could be enhanced with more sophisticated analysis
        preferences = user_profile.get('preferences', {})
        
        if preferences.get('learning_style') == 'visual':
            return [QuoteApproach.METAPHORICAL, QuoteApproach.STORYTELLING]
        elif preferences.get('learning_style') == 'analytical':
            return [QuoteApproach.DIRECT, QuoteApproach.COMPARATIVE, QuoteApproach.INSTRUCTIONAL]
        elif preferences.get('learning_style') == 'reflective':
            return [QuoteApproach.QUESTIONING, QuoteApproach.OBSERVATIONAL]
        
        return list(QuoteApproach)
    
    def _select_varied_style(self, recent_styles: Dict[QuoteStyle, int], 
                           preferred_styles: List[QuoteStyle]) -> QuoteStyle:
        """Select a style that provides variety while respecting preferences."""
        # Find least used preferred styles
        preferred_usage = {style: recent_styles.get(style, 0) for style in preferred_styles}
        
        if not preferred_usage:
            return random.choice(list(QuoteStyle))
        
        # Select from least used styles
        min_usage = min(preferred_usage.values())
        least_used = [style for style, count in preferred_usage.items() if count == min_usage]
        
        return random.choice(least_used)
    
    def _select_varied_approach(self, recent_approaches: Dict[QuoteApproach, int],
                              preferred_approaches: List[QuoteApproach]) -> QuoteApproach:
        """Select an approach that provides variety while respecting preferences."""
        preferred_usage = {approach: recent_approaches.get(approach, 0) for approach in preferred_approaches}
        
        if not preferred_usage:
            return random.choice(list(QuoteApproach))
        
        min_usage = min(preferred_usage.values())
        least_used = [approach for approach, count in preferred_usage.items() if count == min_usage]
        
        return random.choice(least_used)
    
    def _determine_tone(self, user_profile: Optional[Dict[str, Any]], 
                       target_date: date, style: QuoteStyle) -> str:
        """Determine appropriate tone based on context."""
        # Default tone based on style
        style_tones = self.style_patterns.get(style, {}).get('tone_preferences', ['positive'])
        
        # Consider user preferences
        if user_profile and user_profile.get('preferences'):
            preferred_tone = user_profile['preferences'].get('tone_preference')
            if preferred_tone and preferred_tone in style_tones:
                return preferred_tone
        
        # Consider date context (e.g., Monday might need more energetic tone)
        weekday = target_date.weekday()
        if weekday == 0:  # Monday
            return 'energetic' if 'energetic' in style_tones else style_tones[0]
        elif weekday == 6:  # Sunday
            return 'calm' if 'calm' in style_tones else style_tones[0]
        
        return random.choice(style_tones)
    
    def _determine_length_preference(self, user_profile: Optional[Dict[str, Any]], 
                                   style: QuoteStyle) -> str:
        """Determine appropriate length preference."""
        if user_profile and user_profile.get('preferences'):
            return user_profile['preferences'].get('quote_length', 'medium')
        
        # Default based on style
        style_defaults = {
            QuoteStyle.POETIC: 'medium',
            QuoteStyle.PHILOSOPHICAL: 'long',
            QuoteStyle.PRACTICAL: 'short',
            QuoteStyle.CONVERSATIONAL: 'medium'
        }
        
        return style_defaults.get(style, 'medium')
    
    def _determine_complexity_level(self, user_profile: Optional[Dict[str, Any]], 
                                  approach: QuoteApproach) -> str:
        """Determine appropriate complexity level."""
        if user_profile and user_profile.get('categories'):
            # Higher education weight suggests higher complexity tolerance
            education_weight = 0
            for category in user_profile['categories']:
                if category.get('category') == 'education':
                    education_weight = category.get('weight', 0)
                    break
            
            if education_weight > 0.6:
                return 'complex'
            elif education_weight > 0.3:
                return 'moderate'
        
        # Default based on approach
        approach_defaults = {
            QuoteApproach.PHILOSOPHICAL: 'complex',
            QuoteApproach.METAPHORICAL: 'moderate',
            QuoteApproach.DIRECT: 'simple',
            QuoteApproach.QUESTIONING: 'moderate'
        }
        
        return approach_defaults.get(approach, 'moderate')
    
    def _calculate_variety_score(self, content: str, recent_quotes: List[Any]) -> float:
        """Calculate variety score based on content uniqueness."""
        if not recent_quotes:
            return 1.0
        
        content_words = set(content.lower().split())
        
        # Calculate similarity with recent quotes
        similarities = []
        for quote in recent_quotes[-10:]:  # Check last 10 quotes
            quote_words = set(quote.content.lower().split())
            if len(content_words) > 0 and len(quote_words) > 0:
                intersection = len(content_words.intersection(quote_words))
                union = len(content_words.union(quote_words))
                similarity = intersection / union if union > 0 else 0
                similarities.append(similarity)
        
        if not similarities:
            return 1.0
        
        # Higher variety score for lower average similarity
        avg_similarity = sum(similarities) / len(similarities)
        return max(0.0, 1.0 - avg_similarity)
    
    def _calculate_style_diversity(self, content: str, recent_quotes: List[Any]) -> float:
        """Calculate style diversity score."""
        # This is a simplified implementation
        # In practice, you'd want more sophisticated style detection
        return 0.8  # Placeholder
    
    def _calculate_approach_diversity(self, content: str, recent_quotes: List[Any]) -> float:
        """Calculate approach diversity score."""
        # This is a simplified implementation
        return 0.8  # Placeholder
    
    def _calculate_content_freshness(self, content: str, recent_quotes: List[Any]) -> float:
        """Calculate content freshness score."""
        if not recent_quotes:
            # Even without recent quotes, check for clichés and overused words
            return self._assess_intrinsic_freshness(content)
        
        # Check for overused words and phrases
        content_lower = content.lower()
        overused_count = 0
        
        for word in self.quality_indicators['overused_words']:
            if word in content_lower:
                overused_count += 1
        
        for phrase in self.quality_indicators['cliche_phrases']:
            if phrase in content_lower:
                overused_count += 2  # Clichés are worse than overused words
        
        # Calculate freshness based on overuse
        freshness = max(0.0, 1.0 - (overused_count * 0.2))
        return freshness
    
    def _assess_intrinsic_freshness(self, content: str) -> float:
        """Assess content freshness without comparing to recent quotes."""
        content_lower = content.lower()
        freshness_score = 1.0
        
        # Check for overused words
        overused_count = 0
        for word in self.quality_indicators['overused_words']:
            if word in content_lower:
                overused_count += 1
        
        # Check for cliché phrases
        cliche_count = 0
        for phrase in self.quality_indicators['cliche_phrases']:
            if phrase in content_lower:
                cliche_count += 1
        
        # Penalize based on overuse and clichés
        freshness_score -= (overused_count * 0.1)  # 10% penalty per overused word
        freshness_score -= (cliche_count * 0.3)    # 30% penalty per cliché phrase
        
        return max(0.0, freshness_score)
    
    def _calculate_overall_quality(self, content: str, variety_score: float,
                                 style_diversity: float, approach_diversity: float,
                                 content_freshness: float) -> float:
        """Calculate overall quality score."""
        # Weighted combination of quality factors
        weights = {
            'variety': 0.3,
            'style_diversity': 0.2,
            'approach_diversity': 0.2,
            'content_freshness': 0.3
        }
        
        overall = (
            variety_score * weights['variety'] +
            style_diversity * weights['style_diversity'] +
            approach_diversity * weights['approach_diversity'] +
            content_freshness * weights['content_freshness']
        )
        
        return min(1.0, max(0.0, overall))
    
    def _generate_quality_recommendations(self, content: str, variety_score: float,
                                        style_diversity: float, approach_diversity: float,
                                        content_freshness: float) -> List[str]:
        """Generate recommendations for improving content quality."""
        recommendations = []
        
        if variety_score < 0.6:
            recommendations.append("Increase content variety by using different vocabulary and concepts")
        
        if style_diversity < 0.6:
            recommendations.append("Experiment with different quote styles to maintain engagement")
        
        if approach_diversity < 0.6:
            recommendations.append("Vary the approach used to convey messages")
        
        if content_freshness < 0.6:
            recommendations.append("Avoid overused words and clichéd phrases")
        
        if not recommendations:
            recommendations.append("Content quality is good - maintain current standards")
        
        return recommendations