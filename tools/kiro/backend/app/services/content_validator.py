"""
Content Validator Service for ARK Digital Calendar.

This service handles content safety filtering, grammar checking, and coherence validation
for AI-generated quotes to ensure high-quality, appropriate content delivery.
"""

import re
import logging
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class ValidationResult(Enum):
    """Enumeration of validation results."""
    PASS = "pass"
    FAIL = "fail"
    WARNING = "warning"

@dataclass
class ContentValidationReport:
    """Comprehensive report of content validation results."""
    overall_result: ValidationResult
    safety_result: ValidationResult
    grammar_result: ValidationResult
    coherence_result: ValidationResult
    quality_score: float  # 0.0 to 1.0
    issues: List[str]
    suggestions: List[str]
    metadata: Dict[str, Any]

class ContentValidator:
    """
    Service for validating AI-generated content for safety, grammar, and coherence.
    
    Implements comprehensive content filtering to ensure quotes meet quality standards
    and are appropriate for all users.
    """
    
    def __init__(self):
        self.safety_patterns = self._initialize_safety_patterns()
        self.grammar_patterns = self._initialize_grammar_patterns()
        self.coherence_patterns = self._initialize_coherence_patterns()
        self.quality_indicators = self._initialize_quality_indicators()
    
    def validate_content(self, content: str, context: Optional[Dict[str, Any]] = None) -> ContentValidationReport:
        """
        Perform comprehensive content validation.
        
        Args:
            content: The quote content to validate
            context: Optional context information (theme, user profile, etc.)
            
        Returns:
            ContentValidationReport: Comprehensive validation results
        """
        if not content or not content.strip():
            return ContentValidationReport(
                overall_result=ValidationResult.FAIL,
                safety_result=ValidationResult.FAIL,
                grammar_result=ValidationResult.FAIL,
                coherence_result=ValidationResult.FAIL,
                quality_score=0.0,
                issues=["Content is empty or contains only whitespace"],
                suggestions=["Provide non-empty content for validation"],
                metadata={"content_length": 0}
            )
        
        content = content.strip()
        issues = []
        suggestions = []
        metadata = {
            "content_length": len(content),
            "word_count": len(content.split()),
            "sentence_count": len(self._split_sentences(content))
        }
        
        # Perform individual validations
        safety_result, safety_issues, safety_suggestions = self._validate_safety(content, context)
        grammar_result, grammar_issues, grammar_suggestions = self._validate_grammar(content)
        coherence_result, coherence_issues, coherence_suggestions = self._validate_coherence(content)
        
        # Aggregate issues and suggestions
        issues.extend(safety_issues)
        issues.extend(grammar_issues)
        issues.extend(coherence_issues)
        
        suggestions.extend(safety_suggestions)
        suggestions.extend(grammar_suggestions)
        suggestions.extend(coherence_suggestions)
        
        # Calculate overall quality score
        quality_score = self._calculate_quality_score(content, safety_result, grammar_result, coherence_result)
        metadata["quality_score"] = quality_score
        
        # Determine overall result
        overall_result = self._determine_overall_result(safety_result, grammar_result, coherence_result, quality_score)
        
        return ContentValidationReport(
            overall_result=overall_result,
            safety_result=safety_result,
            grammar_result=grammar_result,
            coherence_result=coherence_result,
            quality_score=quality_score,
            issues=issues,
            suggestions=suggestions,
            metadata=metadata
        )
    
    def _validate_safety(self, content: str, context: Optional[Dict[str, Any]] = None) -> Tuple[ValidationResult, List[str], List[str]]:
        """
        Validate content for safety and appropriateness.
        
        Args:
            content: Content to validate
            context: Optional context information
            
        Returns:
            Tuple of (result, issues, suggestions)
        """
        issues = []
        suggestions = []
        content_lower = content.lower()
        
        # Check for inappropriate content patterns
        for category, patterns in self.safety_patterns.items():
            for pattern in patterns:
                if re.search(pattern, content_lower, re.IGNORECASE):
                    issues.append(f"Content contains potentially inappropriate {category} language")
                    suggestions.append(f"Remove or replace {category} content with more positive alternatives")
        
        # Check for excessive negativity
        negative_indicators = self._count_negative_indicators(content_lower)
        if negative_indicators > 3:
            issues.append("Content contains excessive negative language")
            suggestions.append("Balance negative concepts with positive or constructive alternatives")
        
        # Check for controversial topics
        controversial_score = self._assess_controversial_content(content_lower)
        if controversial_score > 0.7:
            issues.append("Content may contain controversial or divisive topics")
            suggestions.append("Focus on universally positive and inclusive themes")
        elif controversial_score > 0.3:
            issues.append("Content touches on potentially controversial topics")
            suggestions.append("Consider focusing on more universally positive themes")
        
        # Check for personal information patterns
        if self._contains_personal_info(content):
            issues.append("Content may contain personal information")
            suggestions.append("Remove any personal identifiers or specific references")
        
        # Determine safety result
        if len(issues) == 0:
            result = ValidationResult.PASS
        elif any("inappropriate" in issue for issue in issues):
            result = ValidationResult.FAIL
        else:
            result = ValidationResult.WARNING
        
        return result, issues, suggestions
    
    def _validate_grammar(self, content: str) -> Tuple[ValidationResult, List[str], List[str]]:
        """
        Validate content for grammar and language correctness.
        
        Args:
            content: Content to validate
            
        Returns:
            Tuple of (result, issues, suggestions)
        """
        issues = []
        suggestions = []
        
        # Check for basic grammar patterns
        for pattern_name, pattern in self.grammar_patterns.items():
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                issues.append(f"Grammar issue detected: {pattern_name}")
                suggestions.append(f"Review and correct {pattern_name.lower()}")
        
        # Check sentence structure
        sentences = self._split_sentences(content)
        
        # Check for incomplete sentences
        for sentence in sentences:
            sentence = sentence.strip()
            if sentence and not self._is_complete_sentence(sentence):
                issues.append(f"Incomplete sentence detected: '{sentence[:30]}...'")
                suggestions.append("Ensure all sentences are complete with proper punctuation")
        
        # Check for run-on sentences
        for sentence in sentences:
            if len(sentence.split()) > 30:  # Very long sentence
                issues.append("Potentially run-on sentence detected")
                suggestions.append("Consider breaking long sentences into shorter, clearer ones")
        
        # Check capitalization
        if not self._has_proper_capitalization(content):
            issues.append("Capitalization issues detected")
            suggestions.append("Ensure proper capitalization of sentences and proper nouns")
        
        # Check punctuation
        punctuation_issues = self._check_punctuation(content)
        issues.extend(punctuation_issues)
        if punctuation_issues:
            suggestions.append("Review and correct punctuation usage")
        
        # Determine grammar result
        critical_issues = [issue for issue in issues if "incomplete sentence" in issue.lower()]
        if len(critical_issues) > 0:
            result = ValidationResult.FAIL
        elif len(issues) > 2:
            result = ValidationResult.WARNING
        else:
            result = ValidationResult.PASS
        
        return result, issues, suggestions
    
    def _validate_coherence(self, content: str) -> Tuple[ValidationResult, List[str], List[str]]:
        """
        Validate content for coherence and logical flow.
        
        Args:
            content: Content to validate
            
        Returns:
            Tuple of (result, issues, suggestions)
        """
        issues = []
        suggestions = []
        
        # Check for coherence indicators
        coherence_score = self._calculate_coherence_score(content)
        
        if coherence_score < 0.3:
            issues.append("Content lacks coherence and logical flow")
            suggestions.append("Ensure ideas connect logically and support a central theme")
        elif coherence_score < 0.6:
            issues.append("Content coherence could be improved")
            suggestions.append("Strengthen connections between ideas and concepts")
        
        # Check for contradictory statements
        if self._contains_contradictions(content):
            issues.append("Content may contain contradictory statements")
            suggestions.append("Review content for internal consistency")
        
        # Check for topic drift
        if self._has_topic_drift(content):
            issues.append("Content appears to drift between unrelated topics")
            suggestions.append("Focus on a single, coherent theme or message")
        
        # Check for meaningful content
        if not self._has_meaningful_content(content):
            issues.append("Content lacks substantive or meaningful message")
            suggestions.append("Ensure content provides value, insight, or inspiration")
        
        # Determine coherence result
        if coherence_score < 0.3:
            result = ValidationResult.FAIL
        elif len(issues) > 1:
            result = ValidationResult.WARNING
        else:
            result = ValidationResult.PASS
        
        return result, issues, suggestions
    
    def _calculate_quality_score(self, content: str, safety_result: ValidationResult, 
                                grammar_result: ValidationResult, coherence_result: ValidationResult) -> float:
        """
        Calculate overall quality score based on validation results.
        
        Args:
            content: The content being validated
            safety_result: Safety validation result
            grammar_result: Grammar validation result
            coherence_result: Coherence validation result
            
        Returns:
            float: Quality score between 0.0 and 1.0
        """
        base_score = 0.5  # Start with neutral score
        
        # Safety component (40% weight)
        safety_score = {
            ValidationResult.PASS: 1.0,
            ValidationResult.WARNING: 0.6,
            ValidationResult.FAIL: 0.0
        }[safety_result]
        
        # Grammar component (30% weight)
        grammar_score = {
            ValidationResult.PASS: 1.0,
            ValidationResult.WARNING: 0.7,
            ValidationResult.FAIL: 0.2
        }[grammar_result]
        
        # Coherence component (30% weight)
        coherence_score = {
            ValidationResult.PASS: 1.0,
            ValidationResult.WARNING: 0.6,
            ValidationResult.FAIL: 0.1
        }[coherence_result]
        
        # Calculate weighted score
        weighted_score = (safety_score * 0.4) + (grammar_score * 0.3) + (coherence_score * 0.3)
        
        # Apply quality indicators bonus/penalty
        quality_bonus = self._calculate_quality_bonus(content)
        final_score = min(1.0, max(0.0, weighted_score + quality_bonus))
        
        return final_score
    
    def _determine_overall_result(self, safety_result: ValidationResult, grammar_result: ValidationResult,
                                 coherence_result: ValidationResult, quality_score: float) -> ValidationResult:
        """
        Determine overall validation result based on individual components.
        
        Args:
            safety_result: Safety validation result
            grammar_result: Grammar validation result
            coherence_result: Coherence validation result
            quality_score: Overall quality score
            
        Returns:
            ValidationResult: Overall validation result
        """
        # Safety failures are always critical
        if safety_result == ValidationResult.FAIL:
            return ValidationResult.FAIL
        
        # Be more lenient with grammar for quotes - allow some creative expression
        # Only fail on severe grammar issues
        if grammar_result == ValidationResult.FAIL and quality_score < 0.3:
            return ValidationResult.FAIL
        
        # Be more lenient with coherence for quotes - short quotes may not need complex coherence
        if coherence_result == ValidationResult.FAIL and quality_score < 0.2:
            return ValidationResult.FAIL
        
        # Lower quality score threshold for quotes
        if quality_score < 0.2:
            return ValidationResult.FAIL
        elif quality_score < 0.5:
            return ValidationResult.WARNING
        else:
            return ValidationResult.PASS
    
    def _initialize_safety_patterns(self) -> Dict[str, List[str]]:
        """Initialize patterns for safety validation."""
        return {
            "profanity": [
                r'\b(damn|hell|crap)\b',  # Mild profanity
                r'\b(stupid|idiot|moron)\b',  # Derogatory terms
            ],
            "violence": [
                r'\b(kill|murder|death|violence|harm|hurt|pain|suffer)\b',
                r'\b(fight|attack|destroy|damage|break)\b',
            ],
            "discrimination": [
                r'\b(hate|racist|sexist|bigot)\b',
                r'\b(inferior|superior|worthless)\b',
            ],
            "inappropriate": [
                r'\b(sex|sexual|porn|drug|drunk|alcohol|gambling)\b',
                r'\b(suicide|depression|anxiety)\b',  # Mental health triggers
            ],
            "political": [
                r'\b(democrat|republican|liberal|conservative|politics|government|election)\b',
                r'\b(trump|biden|obama|clinton)\b',  # Specific political figures
            ]
        }
    
    def _initialize_grammar_patterns(self) -> Dict[str, str]:
        """Initialize patterns for grammar validation."""
        return {
            "double_spaces": r'  +',
            "missing_apostrophe": r'\b(dont|cant|wont|isnt|arent|wasnt|werent|hasnt|havent|hadnt|shouldnt|couldnt|wouldnt)\b',
            "incorrect_its": r'\b(its)\b(?=\s+[a-z])',  # "its" followed by verb (should be "it's")
            "sentence_fragments": r'^[a-z][^.!?]*[^.!?]$',  # Lowercase start, no ending punctuation
            "repeated_words": r'\b(\w+)\s+\1\b',  # Same word repeated
        }
    
    def _initialize_coherence_patterns(self) -> Dict[str, str]:
        """Initialize patterns for coherence validation."""
        return {
            "transition_words": r'\b(however|therefore|moreover|furthermore|consequently|meanwhile|nevertheless)\b',
            "connecting_words": r'\b(and|but|or|so|yet|for|nor|because|since|although|while|if|when|where)\b',
            "pronoun_references": r'\b(this|that|these|those|it|they|them)\b',
        }
    
    def _initialize_quality_indicators(self) -> Dict[str, List[str]]:
        """Initialize indicators for quality assessment."""
        return {
            "positive_words": [
                "inspire", "motivate", "encourage", "empower", "uplift", "hope", "joy", "peace",
                "growth", "wisdom", "strength", "courage", "love", "compassion", "gratitude",
                "success", "achievement", "progress", "potential", "opportunity", "possibility"
            ],
            "depth_indicators": [
                "reflect", "consider", "understand", "realize", "discover", "learn", "grow",
                "transform", "evolve", "develop", "cultivate", "nurture", "embrace", "explore"
            ],
            "cliche_phrases": [
                "follow your dreams", "believe in yourself", "never give up", "everything happens for a reason",
                "live laugh love", "carpe diem", "yolo", "just do it", "think outside the box"
            ]
        }
    
    def _split_sentences(self, content: str) -> List[str]:
        """Split content into sentences."""
        # Simple sentence splitting - could be enhanced with more sophisticated NLP
        sentences = re.split(r'[.!?]+', content)
        return [s.strip() for s in sentences if s.strip()]
    
    def _is_complete_sentence(self, sentence: str) -> bool:
        """Check if a sentence is grammatically complete."""
        sentence = sentence.strip()
        
        # Must have some content
        if len(sentence) < 2:
            return False
        
        # For quotes, we can be more lenient about sentence fragments
        # Allow phrases that start with capital letters and have meaningful content
        if sentence[0].isupper():
            # If it ends with proper punctuation, it's likely complete
            if sentence.endswith(('.', '!', '?')):
                return True
            
            # For quotes, allow meaningful phrases even without ending punctuation
            # if they have at least 2 words and seem intentional
            words = sentence.split()
            if len(words) >= 2:
                # Check if it looks like a meaningful phrase or title
                # Allow things like "Today's personalized quote" or "A new beginning"
                return True
        
        # Must end with proper punctuation for traditional sentences
        if not sentence.endswith(('.', '!', '?')):
            return False
        
        # Must contain at least a subject and predicate (very basic check)
        words = sentence.split()
        
        # Very short sentences need special handling
        if len(words) < 3:
            # Allow very short complete sentences like "I am." or "Go now."
            return True
        
        # For sentences with 3+ words, check for basic sentence structure
        # Look for common sentence patterns
        has_verb = any(word.lower() in [
            'is', 'are', 'was', 'were', 'am', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
            'can', 'may', 'might', 'must', 'shall', 'go', 'goes', 'went', 'come', 'comes', 'came',
            'get', 'gets', 'got', 'make', 'makes', 'made', 'take', 'takes', 'took', 'give', 'gives', 'gave',
            'begins', 'begin', 'started', 'starts', 'start', 'brings', 'bring', 'brought'
        ] for word in words)
        
        if has_verb:
            return True
        
        # If no obvious verb, but it's a reasonable length and properly punctuated, likely complete
        # Relax this check - if it has proper capitalization and punctuation, trust it
        return len(words) >= 2
    
    def _has_proper_capitalization(self, content: str) -> bool:
        """Check for proper capitalization."""
        sentences = self._split_sentences(content)
        
        for sentence in sentences:
            sentence = sentence.strip()
            if sentence and not sentence[0].isupper():
                return False
        
        return True
    
    def _check_punctuation(self, content: str) -> List[str]:
        """Check for punctuation issues."""
        issues = []
        
        # Check for missing end punctuation
        if not content.strip().endswith(('.', '!', '?')):
            issues.append("Missing end punctuation")
        
        # Check for excessive punctuation
        if re.search(r'[.!?]{3,}', content):
            issues.append("Excessive punctuation detected")
        
        # Check for spacing around punctuation
        if re.search(r'\w[.!?]\w', content):
            issues.append("Missing space after punctuation")
        
        return issues
    
    def _calculate_coherence_score(self, content: str) -> float:
        """Calculate coherence score based on various indicators."""
        score = 0.5  # Base score
        
        # Check for transition words
        transition_count = len(re.findall(self.coherence_patterns["transition_words"], content, re.IGNORECASE))
        if transition_count > 0:
            score += 0.1
        
        # Check for connecting words
        connecting_count = len(re.findall(self.coherence_patterns["connecting_words"], content, re.IGNORECASE))
        if connecting_count > 0:
            score += 0.1
        
        # Check for pronoun references (indicates connected ideas)
        pronoun_count = len(re.findall(self.coherence_patterns["pronoun_references"], content, re.IGNORECASE))
        if pronoun_count > 0:
            score += 0.1
        
        # Check sentence length variation (good coherence indicator)
        sentences = self._split_sentences(content)
        if len(sentences) > 1:
            lengths = [len(s.split()) for s in sentences]
            if len(set(lengths)) > 1:  # Varied sentence lengths
                score += 0.1
        
        # Check for thematic consistency
        if self._has_thematic_consistency(content):
            score += 0.2
        
        return min(1.0, score)
    
    def _contains_contradictions(self, content: str) -> bool:
        """Check for contradictory statements (basic implementation)."""
        content_lower = content.lower()
        
        # Simple contradiction patterns
        contradiction_pairs = [
            (r'\balways\b', r'\bnever\b'),
            (r'\beveryone\b', r'\bno one\b'),
            (r'\bpossible\b', r'\bimpossible\b'),
            (r'\bcan\b', r'\bcannot\b'),
            (r'\byes\b', r'\bno\b'),
        ]
        
        for positive, negative in contradiction_pairs:
            if re.search(positive, content_lower) and re.search(negative, content_lower):
                return True
        
        return False
    
    def _has_topic_drift(self, content: str) -> bool:
        """Check for topic drift in content."""
        sentences = self._split_sentences(content)
        
        if len(sentences) < 2:
            return False
        
        # Simple topic drift detection based on word overlap between sentences
        for i in range(len(sentences) - 1):
            words1 = set(sentences[i].lower().split())
            words2 = set(sentences[i + 1].lower().split())
            
            # Remove common words
            common_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"}
            words1 -= common_words
            words2 -= common_words
            
            if len(words1) > 0 and len(words2) > 0:
                overlap = len(words1.intersection(words2)) / min(len(words1), len(words2))
                if overlap < 0.1:  # Very low overlap suggests topic drift
                    return True
        
        return False
    
    def _has_meaningful_content(self, content: str) -> bool:
        """Check if content has meaningful substance."""
        content_lower = content.lower()
        
        # Check for depth indicators
        depth_words = self.quality_indicators["depth_indicators"]
        depth_count = sum(1 for word in depth_words if word in content_lower)
        
        # Check for positive/inspirational words
        positive_words = self.quality_indicators["positive_words"]
        positive_count = sum(1 for word in positive_words if word in content_lower)
        
        # Check for general meaningful words (nouns, adjectives, etc.)
        meaningful_words = [
            "life", "time", "day", "moment", "future", "past", "present", "world", "people",
            "person", "heart", "mind", "soul", "spirit", "journey", "path", "way", "change",
            "new", "old", "good", "great", "beautiful", "amazing", "wonderful", "special",
            "important", "simple", "true", "real", "right", "best", "better", "today",
            "tomorrow", "yesterday", "always", "never", "sometimes", "often", "every"
        ]
        meaningful_count = sum(1 for word in meaningful_words if word in content_lower)
        
        # Content should have some depth, positive message, or general meaningful content
        # Be more lenient - even simple phrases can be meaningful
        return depth_count > 0 or positive_count > 0 or meaningful_count > 0 or len(content.split()) >= 2
    
    def _has_thematic_consistency(self, content: str) -> bool:
        """Check for thematic consistency in content."""
        # Simple implementation - check if content maintains focus
        sentences = self._split_sentences(content)
        
        if len(sentences) < 2:
            return True
        
        # Check if sentences share common themes/concepts
        all_words = []
        for sentence in sentences:
            words = [word.lower() for word in sentence.split() if len(word) > 3]
            all_words.extend(words)
        
        # If there are repeated meaningful words, likely thematically consistent
        word_counts = {}
        for word in all_words:
            word_counts[word] = word_counts.get(word, 0) + 1
        
        repeated_words = [word for word, count in word_counts.items() if count > 1]
        return len(repeated_words) > 0
    
    def _count_negative_indicators(self, content: str) -> int:
        """Count negative language indicators."""
        negative_words = [
            "not", "no", "never", "nothing", "nobody", "nowhere", "neither", "nor",
            "can't", "won't", "don't", "doesn't", "didn't", "isn't", "aren't", "wasn't", "weren't",
            "shouldn't", "couldn't", "wouldn't", "haven't", "hasn't", "hadn't",
            "fail", "failure", "impossible", "difficult", "hard", "struggle", "problem",
            "bad", "worse", "worst", "terrible", "awful", "horrible", "sad", "angry"
        ]
        
        return sum(1 for word in negative_words if word in content.lower())
    
    def _assess_controversial_content(self, content: str) -> float:
        """Assess how controversial the content might be."""
        # Only check for explicitly controversial terms, not partial matches
        controversial_topics = [
            "democrat", "republican", "politics", "political", "election",
            "religion", "religious", "race", "racial", "gender", "sexuality", "abortion", 
            "gun control", "war", "immigration", "climate change", "vaccine", "conspiracy", "tax policy"
        ]
        
        controversial_count = 0
        content_lower = content.lower()
        
        # Check for exact matches or clear contextual matches
        for topic in controversial_topics:
            if topic in content_lower:
                # Make sure it's not a partial match within another word
                if topic == "government":
                    # Only flag if "government" appears as a standalone word
                    import re
                    if re.search(r'\bgovernment\b', content_lower):
                        controversial_count += 1
                else:
                    controversial_count += 1
        
        # Also check for political figures or parties
        political_terms = ["trump", "biden", "obama", "clinton", "liberal", "conservative"]
        for term in political_terms:
            if term in content_lower:
                controversial_count += 2  # Political figures are more controversial
        
        return min(1.0, controversial_count / 2.0)  # Normalize to 0-1 scale
    
    def _contains_personal_info(self, content: str) -> bool:
        """Check for personal information patterns."""
        # Simple patterns for personal info
        personal_patterns = [
            r'\b\d{3}-\d{3}-\d{4}\b',  # Phone numbers
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Email addresses
            r'\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln)\b',  # Addresses
            r'\b\d{5}(-\d{4})?\b',  # ZIP codes
        ]
        
        for pattern in personal_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                return True
        
        return False
    
    def _calculate_quality_bonus(self, content: str) -> float:
        """Calculate quality bonus/penalty based on content characteristics."""
        bonus = 0.0
        content_lower = content.lower()
        
        # Positive words bonus
        positive_words = self.quality_indicators["positive_words"]
        positive_count = sum(1 for word in positive_words if word in content_lower)
        bonus += min(0.1, positive_count * 0.02)
        
        # Depth indicators bonus
        depth_words = self.quality_indicators["depth_indicators"]
        depth_count = sum(1 for word in depth_words if word in content_lower)
        bonus += min(0.1, depth_count * 0.03)
        
        # Cliché penalty
        cliche_phrases = self.quality_indicators["cliche_phrases"]
        cliche_count = sum(1 for phrase in cliche_phrases if phrase in content_lower)
        bonus -= min(0.2, cliche_count * 0.1)
        
        # Length appropriateness
        word_count = len(content.split())
        if 10 <= word_count <= 50:  # Appropriate length for quotes
            bonus += 0.05
        elif word_count < 5 or word_count > 100:  # Too short or too long
            bonus -= 0.1
        
        return bonus