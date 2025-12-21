"""
Predefined Theme Definitions for ARK Digital Calendar.

This module contains predefined monthly and weekly theme structures
that can be used to populate the system with meaningful content themes.
"""

from typing import Dict, List, Any
from datetime import date
import calendar

# Monthly theme definitions with personality alignments and keywords
MONTHLY_THEMES = {
    1: {  # January
        'name': 'New Beginnings',
        'description': 'Start the year with fresh perspectives, goal setting, and personal renewal.',
        'keywords': ['new year', 'goals', 'resolutions', 'fresh start', 'renewal', 'planning', 'vision'],
        'personality_alignment': {
            'spirituality': 0.3,
            'education': 0.4,
            'health': 0.2,
            'philosophy': 0.1
        },
        'config': {
            'color': '#4CAF50',
            'icon': 'sunrise',
            'priority': 1
        },
        'weekly_themes': [
            {
                'name': 'Reflection & Assessment',
                'description': 'Looking back at the past year and assessing where you are now.',
                'keywords': ['reflection', 'assessment', 'past year', 'evaluation', 'learning']
            },
            {
                'name': 'Vision & Goal Setting',
                'description': 'Creating a clear vision for the year ahead and setting meaningful goals.',
                'keywords': ['vision', 'goals', 'planning', 'future', 'aspirations', 'dreams']
            },
            {
                'name': 'Building New Habits',
                'description': 'Establishing positive habits and routines for lasting change.',
                'keywords': ['habits', 'routines', 'consistency', 'discipline', 'change']
            },
            {
                'name': 'Momentum & Action',
                'description': 'Taking the first steps and building momentum toward your goals.',
                'keywords': ['action', 'momentum', 'first steps', 'progress', 'movement']
            }
        ]
    },
    2: {  # February
        'name': 'Love & Connection',
        'description': 'Explore relationships, self-love, and meaningful connections with others.',
        'keywords': ['love', 'relationships', 'connection', 'compassion', 'kindness', 'empathy'],
        'personality_alignment': {
            'spirituality': 0.4,
            'philosophy': 0.3,
            'humor': 0.2,
            'health': 0.1
        },
        'config': {
            'color': '#E91E63',
            'icon': 'heart',
            'priority': 1
        },
        'weekly_themes': [
            {
                'name': 'Self-Love & Acceptance',
                'description': 'Cultivating a loving relationship with yourself.',
                'keywords': ['self-love', 'acceptance', 'self-care', 'inner peace', 'self-worth']
            },
            {
                'name': 'Romantic Love',
                'description': 'Celebrating romantic relationships and intimate connections.',
                'keywords': ['romance', 'partnership', 'intimacy', 'valentine', 'couples']
            },
            {
                'name': 'Family & Friendship',
                'description': 'Strengthening bonds with family and friends.',
                'keywords': ['family', 'friendship', 'bonds', 'support', 'community']
            },
            {
                'name': 'Universal Love',
                'description': 'Extending love and compassion to all beings.',
                'keywords': ['universal love', 'compassion', 'humanity', 'kindness', 'service']
            }
        ]
    },
    3: {  # March
        'name': 'Growth & Renewal',
        'description': 'Embrace personal growth, spring energy, and new opportunities.',
        'keywords': ['growth', 'renewal', 'spring', 'opportunity', 'development', 'expansion'],
        'personality_alignment': {
            'education': 0.4,
            'health': 0.3,
            'spirituality': 0.2,
            'sport': 0.1
        },
        'config': {
            'color': '#8BC34A',
            'icon': 'leaf',
            'priority': 1
        },
        'weekly_themes': [
            {
                'name': 'Spring Awakening',
                'description': 'Awakening to new possibilities and fresh energy.',
                'keywords': ['awakening', 'spring', 'energy', 'vitality', 'renewal']
            },
            {
                'name': 'Learning & Development',
                'description': 'Investing in personal and professional development.',
                'keywords': ['learning', 'development', 'skills', 'knowledge', 'education']
            },
            {
                'name': 'Breaking Barriers',
                'description': 'Overcoming limitations and breaking through obstacles.',
                'keywords': ['barriers', 'obstacles', 'breakthrough', 'courage', 'persistence']
            },
            {
                'name': 'Planting Seeds',
                'description': 'Starting new projects and planting seeds for future success.',
                'keywords': ['seeds', 'projects', 'beginnings', 'potential', 'future']
            }
        ]
    },
    4: {  # April
        'name': 'Creativity & Expression',
        'description': 'Unleash your creative potential and express your authentic self.',
        'keywords': ['creativity', 'expression', 'art', 'innovation', 'imagination', 'authenticity'],
        'personality_alignment': {
            'humor': 0.3,
            'education': 0.3,
            'spirituality': 0.2,
            'philosophy': 0.2
        },
        'config': {
            'color': '#FF9800',
            'icon': 'palette',
            'priority': 1
        },
        'weekly_themes': [
            {
                'name': 'Artistic Expression',
                'description': 'Exploring various forms of artistic and creative expression.',
                'keywords': ['art', 'creativity', 'expression', 'painting', 'music', 'writing']
            },
            {
                'name': 'Innovation & Ideas',
                'description': 'Generating new ideas and innovative solutions.',
                'keywords': ['innovation', 'ideas', 'brainstorming', 'solutions', 'thinking']
            },
            {
                'name': 'Authentic Self',
                'description': 'Expressing your true, authentic self without fear.',
                'keywords': ['authenticity', 'true self', 'genuine', 'honest', 'real']
            },
            {
                'name': 'Creative Collaboration',
                'description': 'Working with others to create something beautiful.',
                'keywords': ['collaboration', 'teamwork', 'partnership', 'synergy', 'together']
            }
        ]
    },
    5: {  # May
        'name': 'Abundance & Gratitude',
        'description': 'Recognize abundance in your life and cultivate deep gratitude.',
        'keywords': ['abundance', 'gratitude', 'appreciation', 'blessing', 'prosperity', 'thankfulness'],
        'personality_alignment': {
            'spirituality': 0.5,
            'philosophy': 0.3,
            'health': 0.1,
            'humor': 0.1
        },
        'config': {
            'color': '#FFC107',
            'icon': 'star',
            'priority': 1
        },
        'weekly_themes': [
            {
                'name': 'Counting Blessings',
                'description': 'Recognizing and appreciating the blessings in your life.',
                'keywords': ['blessings', 'appreciation', 'thankful', 'grateful', 'gifts']
            },
            {
                'name': 'Material Abundance',
                'description': 'Understanding true wealth and material abundance.',
                'keywords': ['wealth', 'prosperity', 'resources', 'material', 'financial']
            },
            {
                'name': 'Emotional Richness',
                'description': 'Celebrating the richness of emotional experiences.',
                'keywords': ['emotions', 'feelings', 'richness', 'depth', 'experience']
            },
            {
                'name': 'Sharing & Giving',
                'description': 'Sharing your abundance and giving back to others.',
                'keywords': ['sharing', 'giving', 'generosity', 'charity', 'service']
            }
        ]
    },
    6: {  # June
        'name': 'Balance & Harmony',
        'description': 'Find balance in all areas of life and create inner harmony.',
        'keywords': ['balance', 'harmony', 'equilibrium', 'peace', 'stability', 'centeredness'],
        'personality_alignment': {
            'health': 0.4,
            'spirituality': 0.3,
            'philosophy': 0.2,
            'sport': 0.1
        },
        'config': {
            'color': '#9C27B0',
            'icon': 'balance',
            'priority': 1
        },
        'weekly_themes': [
            {
                'name': 'Work-Life Balance',
                'description': 'Creating healthy boundaries between work and personal life.',
                'keywords': ['work-life', 'boundaries', 'professional', 'personal', 'time']
            },
            {
                'name': 'Mind-Body Connection',
                'description': 'Harmonizing mental and physical well-being.',
                'keywords': ['mind-body', 'wellness', 'health', 'fitness', 'mental health']
            },
            {
                'name': 'Inner Peace',
                'description': 'Cultivating inner peace and emotional stability.',
                'keywords': ['inner peace', 'calm', 'serenity', 'tranquility', 'stability']
            },
            {
                'name': 'Relationships Balance',
                'description': 'Balancing giving and receiving in relationships.',
                'keywords': ['relationships', 'giving', 'receiving', 'reciprocity', 'mutual']
            }
        ]
    },
    7: {  # July
        'name': 'Freedom & Adventure',
        'description': 'Embrace freedom, seek adventure, and explore new horizons.',
        'keywords': ['freedom', 'adventure', 'exploration', 'independence', 'discovery', 'journey'],
        'personality_alignment': {
            'sport': 0.4,
            'humor': 0.3,
            'education': 0.2,
            'health': 0.1
        },
        'config': {
            'color': '#2196F3',
            'icon': 'compass',
            'priority': 1
        },
        'weekly_themes': [
            {
                'name': 'Personal Freedom',
                'description': 'Celebrating personal independence and self-determination.',
                'keywords': ['independence', 'self-determination', 'autonomy', 'choice', 'liberty']
            },
            {
                'name': 'Physical Adventure',
                'description': 'Engaging in physical adventures and outdoor activities.',
                'keywords': ['outdoor', 'adventure', 'physical', 'nature', 'exploration']
            },
            {
                'name': 'Mental Exploration',
                'description': 'Exploring new ideas, concepts, and ways of thinking.',
                'keywords': ['mental', 'ideas', 'concepts', 'thinking', 'intellectual']
            },
            {
                'name': 'Breaking Free',
                'description': 'Breaking free from limitations and old patterns.',
                'keywords': ['breaking free', 'limitations', 'patterns', 'liberation', 'release']
            }
        ]
    },
    8: {  # August
        'name': 'Strength & Courage',
        'description': 'Build inner strength and find the courage to face challenges.',
        'keywords': ['strength', 'courage', 'bravery', 'resilience', 'power', 'determination'],
        'personality_alignment': {
            'sport': 0.4,
            'philosophy': 0.3,
            'health': 0.2,
            'spirituality': 0.1
        },
        'config': {
            'color': '#F44336',
            'icon': 'shield',
            'priority': 1
        },
        'weekly_themes': [
            {
                'name': 'Inner Strength',
                'description': 'Discovering and building your inner strength and resilience.',
                'keywords': ['inner strength', 'resilience', 'endurance', 'fortitude', 'power']
            },
            {
                'name': 'Facing Fears',
                'description': 'Confronting fears with courage and determination.',
                'keywords': ['fears', 'courage', 'bravery', 'confronting', 'overcoming']
            },
            {
                'name': 'Physical Strength',
                'description': 'Building physical strength and vitality.',
                'keywords': ['physical', 'fitness', 'strength', 'vitality', 'body']
            },
            {
                'name': 'Moral Courage',
                'description': 'Standing up for what is right with moral courage.',
                'keywords': ['moral', 'ethics', 'integrity', 'values', 'principles']
            }
        ]
    },
    9: {  # September
        'name': 'Wisdom & Learning',
        'description': 'Seek wisdom, embrace learning, and share knowledge with others.',
        'keywords': ['wisdom', 'learning', 'knowledge', 'education', 'understanding', 'insight'],
        'personality_alignment': {
            'education': 0.5,
            'philosophy': 0.3,
            'spirituality': 0.1,
            'humor': 0.1
        },
        'config': {
            'color': '#795548',
            'icon': 'book',
            'priority': 1
        },
        'weekly_themes': [
            {
                'name': 'Lifelong Learning',
                'description': 'Embracing continuous learning and personal development.',
                'keywords': ['lifelong learning', 'development', 'growth', 'education', 'skills']
            },
            {
                'name': 'Ancient Wisdom',
                'description': 'Learning from ancient wisdom and timeless teachings.',
                'keywords': ['ancient wisdom', 'teachings', 'philosophy', 'tradition', 'timeless']
            },
            {
                'name': 'Practical Knowledge',
                'description': 'Applying knowledge in practical and meaningful ways.',
                'keywords': ['practical', 'application', 'useful', 'skills', 'implementation']
            },
            {
                'name': 'Teaching & Sharing',
                'description': 'Sharing your knowledge and wisdom with others.',
                'keywords': ['teaching', 'sharing', 'mentoring', 'guidance', 'helping']
            }
        ]
    },
    10: {  # October
        'name': 'Transformation & Change',
        'description': 'Embrace transformation and navigate change with grace.',
        'keywords': ['transformation', 'change', 'evolution', 'metamorphosis', 'adaptation', 'growth'],
        'personality_alignment': {
            'spirituality': 0.4,
            'philosophy': 0.3,
            'education': 0.2,
            'health': 0.1
        },
        'config': {
            'color': '#FF5722',
            'icon': 'butterfly',
            'priority': 1
        },
        'weekly_themes': [
            {
                'name': 'Letting Go',
                'description': 'Releasing what no longer serves you.',
                'keywords': ['letting go', 'release', 'surrender', 'detachment', 'freedom']
            },
            {
                'name': 'Embracing Change',
                'description': 'Welcoming change as an opportunity for growth.',
                'keywords': ['change', 'opportunity', 'growth', 'adaptation', 'flexibility']
            },
            {
                'name': 'Inner Transformation',
                'description': 'Undergoing deep inner transformation and renewal.',
                'keywords': ['inner transformation', 'renewal', 'rebirth', 'evolution', 'metamorphosis']
            },
            {
                'name': 'New Perspectives',
                'description': 'Gaining new perspectives and ways of seeing.',
                'keywords': ['perspectives', 'viewpoints', 'vision', 'understanding', 'clarity']
            }
        ]
    },
    11: {  # November
        'name': 'Reflection & Gratitude',
        'description': 'Reflect on the year\'s journey and cultivate deep gratitude.',
        'keywords': ['reflection', 'gratitude', 'thankfulness', 'appreciation', 'contemplation', 'mindfulness'],
        'personality_alignment': {
            'spirituality': 0.5,
            'philosophy': 0.3,
            'health': 0.1,
            'humor': 0.1
        },
        'config': {
            'color': '#607D8B',
            'icon': 'mirror',
            'priority': 1
        },
        'weekly_themes': [
            {
                'name': 'Year in Review',
                'description': 'Looking back at the year\'s experiences and lessons.',
                'keywords': ['year review', 'experiences', 'lessons', 'journey', 'memories']
            },
            {
                'name': 'Gratitude Practice',
                'description': 'Deepening your gratitude practice and appreciation.',
                'keywords': ['gratitude', 'appreciation', 'thankfulness', 'blessings', 'practice']
            },
            {
                'name': 'Quiet Contemplation',
                'description': 'Finding peace in quiet contemplation and mindfulness.',
                'keywords': ['contemplation', 'mindfulness', 'quiet', 'peace', 'meditation']
            },
            {
                'name': 'Preparing for Winter',
                'description': 'Preparing mentally and spiritually for the winter season.',
                'keywords': ['preparation', 'winter', 'rest', 'introspection', 'gathering']
            }
        ]
    },
    12: {  # December
        'name': 'Joy & Celebration',
        'description': 'Celebrate life\'s joys and spread happiness to others.',
        'keywords': ['joy', 'celebration', 'happiness', 'festivity', 'cheer', 'merriment'],
        'personality_alignment': {
            'humor': 0.4,
            'spirituality': 0.3,
            'health': 0.2,
            'philosophy': 0.1
        },
        'config': {
            'color': '#4CAF50',
            'icon': 'gift',
            'priority': 1
        },
        'weekly_themes': [
            {
                'name': 'Holiday Spirit',
                'description': 'Embracing the warmth and spirit of the holiday season.',
                'keywords': ['holiday', 'spirit', 'warmth', 'tradition', 'celebration']
            },
            {
                'name': 'Giving & Generosity',
                'description': 'Practicing generosity and the joy of giving.',
                'keywords': ['giving', 'generosity', 'charity', 'kindness', 'sharing']
            },
            {
                'name': 'Family & Togetherness',
                'description': 'Celebrating family bonds and togetherness.',
                'keywords': ['family', 'togetherness', 'unity', 'bonds', 'connection']
            },
            {
                'name': 'Year\'s End Reflection',
                'description': 'Reflecting on the year\'s end and preparing for renewal.',
                'keywords': ['year end', 'reflection', 'completion', 'renewal', 'cycle']
            }
        ]
    }
}


def get_monthly_theme_definition(month: int) -> Dict[str, Any]:
    """
    Get the predefined theme definition for a specific month.
    
    Args:
        month: Month number (1-12)
        
    Returns:
        Dictionary containing the theme definition
    """
    return MONTHLY_THEMES.get(month, {})


def get_all_monthly_themes() -> Dict[int, Dict[str, Any]]:
    """
    Get all predefined monthly theme definitions.
    
    Returns:
        Dictionary mapping month numbers to theme definitions
    """
    return MONTHLY_THEMES


def get_weekly_themes_for_month(month: int) -> List[Dict[str, Any]]:
    """
    Get the predefined weekly theme definitions for a specific month.
    
    Args:
        month: Month number (1-12)
        
    Returns:
        List of weekly theme definitions
    """
    monthly_theme = MONTHLY_THEMES.get(month, {})
    return monthly_theme.get('weekly_themes', [])


def populate_year_themes(theme_manager, year: int) -> Dict[str, Any]:
    """
    Populate a year with predefined themes using the theme manager.
    
    Args:
        theme_manager: ThemeManager instance
        year: Year to populate
        
    Returns:
        Dictionary containing creation results
    """
    results = {
        'year': year,
        'created_monthly': [],
        'created_weekly': [],
        'errors': []
    }
    
    for month_num, theme_def in MONTHLY_THEMES.items():
        try:
            # Create monthly theme
            monthly_theme = theme_manager.create_monthly_theme(
                name=theme_def['name'],
                description=theme_def['description'],
                year=year,
                month=month_num,
                keywords=theme_def['keywords'],
                personality_alignment=theme_def['personality_alignment'],
                config=theme_def['config']
            )
            
            if monthly_theme:
                results['created_monthly'].append(monthly_theme.id)
                
                # Create weekly themes
                for week_num, weekly_def in enumerate(theme_def['weekly_themes'], 1):
                    weekly_theme = theme_manager.create_weekly_theme(
                        name=weekly_def['name'],
                        description=weekly_def['description'],
                        parent_theme_id=monthly_theme.id,
                        week_number=week_num,
                        keywords=weekly_def['keywords'],
                        personality_alignment=theme_def['personality_alignment'],  # Inherit from monthly
                        config=theme_def['config']  # Inherit from monthly
                    )
                    
                    if weekly_theme:
                        results['created_weekly'].append(weekly_theme.id)
                    else:
                        results['errors'].append(f"Failed to create weekly theme '{weekly_def['name']}' for month {month_num}")
            else:
                results['errors'].append(f"Failed to create monthly theme '{theme_def['name']}' for month {month_num}")
                
        except Exception as e:
            results['errors'].append(f"Error creating themes for month {month_num}: {str(e)}")
    
    return results