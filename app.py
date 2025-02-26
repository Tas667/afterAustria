from flask import Flask, render_template, request, jsonify, Response
from openai import OpenAI
import json
import os
from dotenv import load_dotenv
import httpx

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Initialize OpenAI client with API key from environment variable and custom HTTP client
http_client = httpx.Client(
    base_url="https://api.openai.com/v1",
    follow_redirects=True
)

client = OpenAI(
    api_key=os.getenv('OPENAI_API_KEY'),
    http_client=http_client
)

# Base system prompt
CLIL_BASE_PROMPT = """You are a CLIL (Content and Language Integrated Learning) activity designer.
Ensure responses contain more detailed explanations, longer lists, and richer descriptions.
Keep the JSON structure exactly as defined but provide more extensive content in each field
You must respond with a valid JSON object using exactly these fields:
{
    "content_objectives": [
        "Objective 1",
        "Objective 2",
        ...
    ],
    "language_objectives": {
        "key_vocabulary": ["word1", "word2", ...],
        "language_structures": ["structure1", "structure2", ...],
        "example_phrases": ["phrase1", "phrase2", ...]
    },
    "learning_tasks": [
        {
            "title": "Activity Title",
            "description": "A clear and complete description of the activity, including its purpose and expected outcomes.",
            "duration": "Estimated time to complete the activity",
            "step_1_requirements": {
                "name": "What You Need",
                "description": "Everything needed to prepare for this activity.",
                "elements": [
                    {
                        "name": "Materials & Tools",
                        "details": [
                            "A full list of necessary materials, tools, or resources.",
                            "If text-based content (e.g., student handouts, story prompts, quiz questions), the **full text must be included**.",
                            "If a list is referenced (e.g., 'list of historical events'), the **list must be fully provided**."
                        ]
                    },
                    {
                        "name": "Student Handouts / Reading Texts",
                        "details": [
                            "**Full delivery of any required text** (not just 'prepare a text' but the actual text)."
                        ]
                    },
                    {
                        "name": "Pre-Generated Content",
                        "details": [
                            "If applicable, provide at least **one** real example (e.g., a math problem, science hypothesis, story excerpt, discussion prompt)."
                        ]
                    }
                ]
            },
            "step_2_execution": {
                "name": "How to Run the Activity",
                "description": "Step-by-step instructions on how to execute the activity.",
                "elements": [
                    {
                        "name": "Process",
                        "details": [
                            "Detailed instructions on what to do at each stage.",
                            "Clear guidance for students and facilitators."
                        ]
                    },
                    {
                        "name": "Potential Problems",
                        "details": [
                            "Common mistakes or difficulties that might arise.",
                            "Ways to troubleshoot or adapt the activity."
                        ]
                    }
                ]
            },
            "step_3_wrap_up": {
                "name": "Wrap-Up & Reflection",
                "description": "Final review, discussion, and follow-up tasks.",
                "elements": [
                    {
                        "name": "Review Checklist",
                        "details": [
                            "A structured checklist to verify completion."
                        ]
                    },
                    {
                        "name": "Discussion Questions",
                        "details": [
                            "At least **three fully written** discussion questions."
                        ]
                    },
                    {
                        "name": "Next Steps",
                        "details": [
                            "Concrete suggestions for extending learning."
                        ]
                    }
                ]
            }
        },
        ...
    ],
    "assessment_criteria": [
        {
            "criterion": "What is being assessed",
            "method": "How it will be assessed"
        },
        ...
    ],
    "text_deep_learning_input": {
        "pareto_printable": {
            "title": "Key Information About the Subject",
            "points": [
                {
                    "point": "Point 1 about the subject",
                    "explanation": "1-2 sentence explanation of this point"
                },
                // 9 more similar points for a total of 10
            ]
        },
        "socratic_questions": {
            "question_types": ["Analytical", "Comparative", "Reflective", "Cause & Effect", "Hypothetical", "Ethical"],
            "example_questions": [
                "(EXAMPLE) What is the main argument presented in the text?",
                "(EXAMPLE) How does this idea relate to similar concepts in other subjects?",
                "(EXAMPLE) What assumptions does the author make?",
                "(EXAMPLE) What would happen if this idea were applied in a different context?",
                "(EXAMPLE) How does this topic influence modern thinking or practice?",
                "(EXAMPLE) What counterarguments could challenge the ideas in the text?"
            ]
        },
        "extended_writing_exercises": {
            "writing_types": ["Analytical Essay", "Creative Application", "Comparative Essay", "Reflective Writing", "Persuasive Writing"],
            "example_tasks": [
                {
                    "task": "(EXAMPLE) Analysis & Argumentation",
                    "description": "(EXAMPLE) Write a structured response analyzing the key argument of the text, using supporting evidence."
                },
                {
                    "task": "(EXAMPLE) Creative Application",
                    "description": "(EXAMPLE) Reimagine the concept in a different historical or futuristic setting and write a narrative incorporating the key ideas."
                },
                {
                    "task": "(EXAMPLE) Comparison Essay",
                    "description": "(EXAMPLE) Compare and contrast this topic with another related idea, explaining similarities and differences in a structured essay."
                }
            ]
        }
    }
}"""

# Prompt modifiers
ACTIVITY_TYPES = {
    "superhero": """Transform the activity using superhero themes:
- Use superhero characters and powers as examples
- Include superhero-themed vocabulary and scenarios
- Reference popular superheroes in examples
- Use superhero missions as learning challenges
- Make students feel like heroes in training""",

    "space": """Make the activity space-themed:
- Use astronomy and space exploration examples
- Include planets, stars, and space missions
- Reference space technology and discoveries
- Use space travel scenarios
- Connect learning to space exploration""",

    "mystery": """Turn the activity into a detective investigation:
- Structure tasks as clues to solve
- Include mysteries and puzzles
- Use detective vocabulary and scenarios
- Make students act as investigators
- Create suspense and discovery moments""",

    "music": """Integrate music throughout the activity:
- Use songs and rhythm in learning
- Include musical instruments as examples
- Connect concepts to musical terms
- Add singing and musical activities
- Use music-based metaphors""",

    "food": """Theme the activity around cooking and food:
- Use cooking metaphors and examples
- Include food-related vocabulary
- Structure tasks like cooking recipes
- Reference different cuisines and dishes
- Connect learning to food preparation""",

    "station_rotation": {
        "name": "Station Rotation",
        "description": """Learning style where students rotate through different stations, each focusing on a specific aspect of the content:
- Typically 3-5 stations with different learning objectives
- Students work in small groups
- Each station has a different learning approach (hands-on, digital, written, etc.)
- Timed rotations (usually 15-20 minutes per station)
- Can include teacher-led, independent, and collaborative stations"""
    },
    "think_pair_share": {
        "name": "Think-Pair-Share",
        "description": """Three-step collaborative learning structure:
- Individual thinking time for concept processing
- Pairing with a partner to discuss ideas
- Sharing insights with the larger group
- Emphasizes both individual reflection and collaborative learning
- Builds speaking and listening skills"""
    },
    "project_based": {
        "name": "Project Based",
        "description": """Extended learning experience centered around a real-world project:
- Focuses on creating a final product or presentation
- Involves research, planning, and execution phases
- Integrates multiple skills and subject areas
- Emphasizes student autonomy and decision-making
- Includes regular progress checks and feedback"""
    },
    "interactive_presentation": {
        "name": "Interactive Presentation",
        "description": """Engaging presentation format with active audience participation:
- Combines direct instruction with student interaction
- Includes regular check-ins and audience response moments
- Uses multimedia elements
- Incorporates quick activities and discussions
- Balances teacher guidance with student participation"""
    },
    "debate_format": {
        "name": "Debate Format",
        "description": """Structured discussion format focusing on different viewpoints:
- Clear positions or arguments to be defended
- Research and preparation phase
- Formal presentation of arguments
- Rebuttal and counter-argument practice
- Emphasis on evidence-based reasoning"""
    },
    "jigsaw_learning": {
        "name": "Jigsaw Learning",
        "description": """Cooperative learning strategy where students become experts in one area:
- Students split into 'expert' groups for specific topics
- Deep learning of assigned content
- Regrouping to teach others their expertise
- Everyone learns all parts from the experts
- Builds teaching and communication skills"""
    },
    "lab_investigation": {
        "name": "Lab Investigation",
        "description": """Hands-on experimental learning approach:
- Clear hypothesis or question to investigate
- Step-by-step experimental procedure
- Data collection and analysis
- Drawing conclusions from evidence
- Connecting findings to larger concepts"""
    },
    "research_present": {
        "name": "Research & Present",
        "description": """Independent research project with presentation component:
- Topic selection and research question development
- Information gathering from multiple sources
- Analysis and synthesis of findings
- Creation of presentation materials
- Formal sharing of learning with peers"""
    },
    "game_based": {
        "name": "Game Based Learning",
        "description": """Learning through structured game activities:
- Clear learning objectives within game format
- Competitive or cooperative elements
- Point systems or progress tracking
- Immediate feedback and rewards
- Fun and engaging interaction"""
    },
    "digital_story": {
        "name": "Digital Story Creation",
        "description": """Creating narrative content using digital tools:
- Story planning and storyboarding
- Digital media creation or selection
- Narrative development
- Technical production skills
- Sharing and presenting final stories"""
    },
    "peer_teaching": {
        "name": "Peer Teaching",
        "description": """Students teaching other students:
- Preparation of teaching materials
- Clear explanation of concepts
- Answering peer questions
- Checking for understanding
- Building teaching and leadership skills"""
    },
    "role_play": {
        "name": "Role Play",
        "description": """Learning through acting out scenarios:
- Character/role assignment
- Scenario preparation
- Acting out situations
- Reflection and discussion
- Real-world application practice"""
    },
    "case_study": {
        "name": "Case Study",
        "description": """Analysis of specific real or simulated situations:
- Detailed case information
- Problem identification
- Analysis of factors
- Solution development
- Application of learning to similar cases"""
    }
}

# Section-specific system prompts for customization
SECTION_PROMPTS = {
    "1": """You are a CLIL activity modifier focusing on Content Objectives.
Current full activity context:
{current_activity}

You are being asked to modify the Content Objectives section.
Customization request: {customization}

Present the content objectives naturally and clearly. Structure your response in whatever way you think will be most helpful and clear for teachers.""",

    "2": """You are a CLIL activity modifier focusing on Language Objectives.
Current full activity context:
{current_activity}

You are being asked to modify the Language Objectives section.
Customization request: {customization}

Present the language objectives naturally and clearly. Include vocabulary, structures, and examples in whatever way makes most sense for this content.""",

    "3": """You are a CLIL activity modifier focusing on Learning Tasks.
Current full activity context:
{current_activity}

You are being asked to modify the Learning Tasks section.
Customization request: {customization}

Present the learning tasks naturally and clearly. Organize the activities in whatever way will be most useful for teachers implementing this lesson. 

Each learning task should include:
1. A clear title, description, and duration
2. A structured sequence of three steps:
   - Step 1: Requirements (What You Need)
   - Step 2: Execution (How to Run the Activity)
   - Step 3: Wrap-Up & Reflection

For each step, include the specific elements as follows:

Step 1 Requirements should include:
- Materials & Tools: Provide a FULL list of all necessary materials, tools, or resources
- Student Handouts / Reading Texts: Include the COMPLETE text of any handouts or readings
- Pre-Generated Content: Provide at least one REAL example of content needed

Step 2 Execution should include:
- Process: Detailed instructions for each stage of the activity
- Potential Problems: Common issues and how to address them

Step 3 Wrap-Up should include:
- Review Checklist: A structured list to verify completion
- Discussion Questions: At least THREE fully written discussion questions
- Next Steps: Concrete suggestions for extending learning

IMPORTANT: For any materials, texts, or content mentioned, you MUST provide the FULL content, not just a description. If you mention a list, include the complete list. If you mention a text, provide the actual text.

Avoid vague descriptions—provide real, practical examples and specific details that teachers can immediately use.""",

    "4": """You are a CLIL activity modifier focusing on Assessment Criteria.
Current full activity context:
{current_activity}

You are being asked to modify the Assessment Criteria section.
Customization request: {customization}

Present the assessment criteria naturally and clearly. Structure the evaluation methods in whatever way best explains how to assess student learning.""",

    "5": """You are a CLIL activity modifier focusing on Text Deep Learning.
Current full activity context:
{current_activity}

You are being asked to modify the Text Deep Learning section.
Customization request: {customization}

Your response should maintain the structure of a deep learning text analysis, including:
1. A main reading passage or text guidelines
2. An 80/20 Pareto summary of key points
3. Socratic questions for discussion and analysis
4. Extended writing exercises

Consider these aspects when modifying:
- Language complexity and accessibility
- Critical thinking development
- Cultural relevance and perspectives
- Integration of content and language learning
- Opportunities for active engagement and discussion

Present your response in a clear, well-structured format that helps teachers implement deep learning strategies effectively."""
}

# Add helper system prompt
HELPER_SYSTEM_PROMPT = """You are a CLIL teaching assistant providing contextual help for lesson planning.
For any given topic, create a valid JSON object with these sections:

{
    "topic_overview": {
        "title": "Topic Overview",
        "description": "Brief overview of the main topic",
        "key_concepts": ["concept1", "concept2", ...]
    },
    "teaching_aspects": [
        {
            "title": "Core Concepts",
            "description": "Key concepts to cover in the lesson",
            "tags": ["tag1", "tag2", ...]
        },
        {
            "title": "Teaching Approaches",
            "description": "Effective methods for this topic",
            "tags": ["approach1", "approach2", ...]
        },
        {
            "title": "Common Challenges",
            "description": "Typical difficulties and solutions",
            "tags": ["challenge1", "challenge2", ...]
        }
    ],
    "suggested_resources": [
        {
            "type": "Resource type",
            "description": "How to use this resource",
            "examples": ["example1", "example2", ...]
        }
    ]
}

Make the content specific to the topic and useful for CLIL lesson customization.
Remember to respond with a valid JSON object."""

# Add insight generation prompt
INSIGHT_PROMPT = """You are an expert CLIL teaching advisor within our educational app. A teacher has just received the following helper content about their lesson:

{helper_context}

The teacher clicked on the tag "{concept}" to learn more about this specific aspect. This indicates they want to understand this concept better and how it applies to their CLIL teaching.

Provide a focused, practical explanation that builds upon the context above. Your response must be a valid JSON object using exactly this structure:

{{
    "title": "Brief title for {concept}",
    "summary": "2-3 sentence overview connecting this concept to the context above",
    "practical_tips": [
        "Specific actionable tip that builds on the context",
        "Another practical tip considering the teaching scenario",
        "A third tip that helps implement this in CLIL"
    ],
    "example": {{
        "scenario": "A real-world example that relates to the original helper content",
        "application": "How to apply this in class, considering the full context"
    }}
}}

Keep the explanation focused and actionable. Teachers should be able to use this information immediately in their CLIL context.
Remember to respond with a valid JSON object."""

# Add new system prompt for inline generation
INLINE_GENERATION_PROMPT = """You are an AI assistant helping to generate inline content in a document editor.
You will receive:
1. Text that appears before the cursor position
2. A command from the user about what to add/modify

Your task is follow the user request and generate text that continues naturally from the above context.
user will probaby as for elaboration or list of examples or something like that.

Respond ONLY with the text to be inserted, no explanations or markdown."""

# Add chat system prompt
CHAT_SYSTEM_PROMPT = """You are a friendly CLIL activity designer's assistant. Your mission is clear: gather the essential information needed to create a perfectly tailored CLIL activity. Think of yourself as a friendly guide who's helping teachers build the foundation for their perfect activity.

Start conversations with enthusiasm about creating activities, like:
"I'm excited to help you create a CLIL activity! To make it perfect for your class, let me learn a bit about your teaching context."
"Let's design an activity that really works for your students! Tell me about your class setup."

MISSION CHECKLIST (track what you know and what you still need):

ESSENTIAL INFO (must have):
✓ Student count
✓ Grade/age level
✓ Language proficiency
✓ Lesson duration
✓ Main topic/subject

HELPFUL INFO (good to have):
✓ Available technology
✓ Classroom setup
✓ Learning preferences
✓ Cultural background
✓ Previous knowledge

Current class context:
{class_context}

ACTIVITY TYPE PREFERENCES:
The teacher has indicated interest in the following activity types:
{activity_types}

INFORMATION GATHERING RULES:
1. ALWAYS check what you already know from:
   - Class context variables above
   - Previous messages
   - Indirect mentions
2. NEVER ask about known information
3. Keep track of what you've learned
4. When you have enough info, say something like:
   "Great! I think I have a good picture of your teaching context now. Would you like me to help create an activity that..."

CONVERSATION STYLE:
- Be enthusiastic about creating the perfect activity
- Connect questions to activity creation ("This will help us choose the right group activities...")
- Show how each piece of information will help
- When activity types are selected, reference their specific features and benefits
- Suggest activity types that complement the teacher's preferences

READY TO CREATE CHECK:
When you have gathered enough information (at least all ESSENTIAL INFO), say:
"I think we have enough context to create a great activity now! Would you like me to help you design an activity that [summarize key points and include selected activity types]?"

Remember: Every question should clearly connect to creating a better-tailored activity. Keep the focus on gathering what we need to create something perfect for their specific context When delivering final response make sure to inslude avery piece of information that was gathered including all the is avaiable in the class_contect and the activity types variables that are avaiable to you."""

# Add tag generation prompt
TAG_GENERATION_PROMPT = """You are a CLIL teaching assistant helping to generate related tags.
Given a clicked tag and the context of the lesson, generate 3 closely related tags that would complement the clicked tag.
Consider:
- The existing tags in the context
- The topic overview and key concepts
- The overall lesson content and objectives
- The pedagogical relevance for CLIL teaching

Your response must be a valid JSON object with exactly this structure:
{
    "related_tags": ["tag1", "tag2", "tag3"]
}

The generated tags should:
- Be concise (1-3 words)
- Directly relate to CLIL teaching
- Build upon the existing context
- Offer new but related perspectives
- Be useful for lesson planning

Remember to respond with a valid JSON object."""

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate_activity():
    user_prompt = request.json.get('prompt')
    section = request.json.get('section', 'all')
    customization = request.json.get('customization', '')
    current_activity = request.json.get('current_activity', {})
    modifiers = request.json.get('modifiers', [])
    
    try:
        if section == 'all':
            # Generate main lesson content
            system_prompt = CLIL_BASE_PROMPT
            if modifiers:
                modifier_prompts = "\n\nAdditional requirements:\n"
                for mod in modifiers:
                    if mod in ACTIVITY_TYPES:
                        modifier_prompts += f"\n{ACTIVITY_TYPES[mod]}\n"
                system_prompt += modifier_prompts
            
            main_response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Create a CLIL activity for: {user_prompt}. Respond with a JSON object following the exact structure provided."}
                ],
                response_format={ "type": "json_object" }
            )
            
            return jsonify({
                "success": True,
                "data": main_response.choices[0].message.content
            })
            
        else:
            # Modified section customization
            system_prompt = SECTION_PROMPTS[section].format(
                current_activity=json.dumps(current_activity, indent=2),
                customization=customization
            )
            
            # Add modifiers if present
            if modifiers:
                modifier_prompts = "\n\nAdditional theme requirements:\n"
                for mod in modifiers:
                    if mod in ACTIVITY_TYPES:
                        modifier_prompts += f"\n{ACTIVITY_TYPES[mod]}\n"
                system_prompt += modifier_prompts
            
            # Changed to allow natural text response
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": customization}
                ]
            )
            
            # Return the natural text response
            return jsonify({
                "success": True,
                "section": section,
                "data": response.choices[0].message.content
            })
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/generate_helper', methods=['POST'])
def generate_helper():
    user_prompt = request.json.get('prompt')
    
    try:
        # Generate helper content
        helper_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": HELPER_SYSTEM_PROMPT},
                {"role": "user", "content": f"Create a helper guide for teaching about: {user_prompt}. Respond with a JSON object following the exact structure provided."}
            ],
            response_format={ "type": "json_object" }
        )
        
        return jsonify({
            "success": True,
            "helper_data": helper_response.choices[0].message.content
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/generate_insight', methods=['POST'])
def generate_insight():
    concept = request.json.get('concept')
    helper_context = request.json.get('helper_context', 'No context provided')
    print(f"\n🤖 Generating insight for: {concept}")
    
    try:
        # Generate insight content
        print(f"📝 Sending to LLM with prompt:\n{INSIGHT_PROMPT.format(concept=concept, helper_context=helper_context)}")
        insight_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": INSIGHT_PROMPT.format(concept=concept, helper_context=helper_context)},
                {"role": "user", "content": f"Explain this CLIL teaching concept: {concept}"}
            ],
            response_format={ "type": "json_object" }
        )
        
        return jsonify({
            "success": True,
            "insight_data": insight_response.choices[0].message.content
        })
        
    except Exception as e:
        print(f"Error generating insight: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/generate_inline', methods=['POST'])
def generate_inline():
    data = request.json
    content = data.get('content', '')  # Full HTML content (backup)
    command = data.get('command', '')
    position = data.get('position', -1)  # Still receive position as backup
    text_before_cursor = data.get('text_before_cursor', '')  # Extracted text before cursor
    
    # If we don't have text_before_cursor for some reason, log an error
    if not text_before_cursor:
        print("Warning: No text_before_cursor provided, using full content")
        # We could try to extract it from HTML here, but it's complex
        text_before_cursor = content
    
    def generate():
        try:
            # Log what we're using for debugging
            print(f"Using text before cursor: {text_before_cursor[:100]}...")
            
            prompt = f"""Text we are working on:
{text_before_cursor}

 user request: {command}

Generate appropriate text that continues naturally from the above context."""

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": INLINE_GENERATION_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                stream=True
            )

            for chunk in response:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            print(f"Error in streaming: {str(e)}")
            yield f"Error: {str(e)}"

    return Response(generate(), mimetype='text/event-stream')

@app.route('/generate_related_tags', methods=['POST'])
def generate_related_tags():
    clicked_tag = request.json.get('tag')
    context = request.json.get('context', {})
    
    # Enhanced context string
    context_str = f"""
Topic Overview: {context.get('topicOverview', '')}
Key Concepts: {', '.join(context.get('keyConcepts', []))}
Existing Tags: {', '.join(context.get('existingTags', []))}
Current Content: {context.get('content', '')}
    """
    
    try:
        # Generate related tags
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": TAG_GENERATION_PROMPT},
                {"role": "user", "content": f"Generate 3 related tags for: {clicked_tag}\nContext:\n{context_str}"}
            ],
            response_format={ "type": "json_object" }
        )
        
        return jsonify({
            "success": True,
            "tags": response.choices[0].message.content
        })
        
    except Exception as e:
        print(f"Error generating tags: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/chat', methods=['POST'])
def chat():
    message = request.json.get('message')
    context = request.json.get('context', {})
    history = request.json.get('history', [])
    
    # Format context variables for the prompt
    class_context = context.get('class_context', {})
    activity_types = context.get('activity_types', [])
    
    # Format class context string
    class_context_str = f"""
Current class information:
- Number of students: {class_context.get('students_count', 'Not specified')}
- Grade/Age level: {class_context.get('grade_level', 'Not specified')}
- Language skills: {class_context.get('language_skills', 'Not specified')}

Teaching Parameters:
- Technical Vocabulary Density: {context.get('teaching_parameters', {}).get('vocab_density', 'Not specified')}%
- Grammar Complexity Level: {context.get('teaching_parameters', {}).get('grammar_complexity', 'Not specified')}/5
- Content vs Language Balance: {context.get('teaching_parameters', {}).get('content_language_balance', 'Not specified')}% Content focus
"""
    
    # Format activity types string with descriptions
    activity_types_str = "No specific activity types selected"
    if activity_types:
        activity_descriptions = []
        for activity_type in activity_types:
            if activity_type in ACTIVITY_TYPES and isinstance(ACTIVITY_TYPES[activity_type], dict):
                activity_descriptions.append(f"- {ACTIVITY_TYPES[activity_type]['name']}:\n  {ACTIVITY_TYPES[activity_type]['description']}")
            elif activity_type in ACTIVITY_TYPES:
                activity_descriptions.append(f"- {activity_type}:\n  {ACTIVITY_TYPES[activity_type]}")
        if activity_descriptions:
            activity_types_str = "\n".join(activity_descriptions)
    
    try:
        # Prepare messages array with system prompt and history
        messages = [
            {"role": "system", "content": CHAT_SYSTEM_PROMPT.format(
                class_context=class_context_str,
                activity_types=activity_types_str
            )}
        ]
        
        # Add conversation history
        messages.extend(history)
        
        # Add current user message
        messages.append({"role": "user", "content": message})
        
        # Use the chat-specific system prompt with context
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages
        )
        
        return jsonify({
            "success": True,
            "message": response.choices[0].message.content
        })
        
    except Exception as e:
        print(f"Error in chat: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    # Get port from environment variable or default to 5000
    port = int(os.environ.get('PORT', 5000))
    # Run the app
    app.run(host='0.0.0.0', port=port, debug=True) 