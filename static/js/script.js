// Store generated sections
let generatedSections = {
    content: [],
    language: [],
    tasks: [],
    assessment: [],
    materials: []
};

// Current indices for each section
const currentIndices = {
    content: 0,
    language: 0,
    tasks: 0,
    assessment: 0,
    materials: 0
};

// Store current modifiers
let currentModifiers = [];

// Panel state
let currentCustomizeSection = null;

// Initialize speech recognition
let recognition = null;
let isRecording = false;
let finalTranscript = '';
let shouldGenerateAfterRecording = false;

// Add conversation history array
let conversationHistory = [];

// Separate tag click handler function
async function handleTagClick(e) {
    console.log('🏷️ Tag clicked:', e.target.textContent);
    e.stopPropagation();
    const tag = e.target;
    const tagText = tag.textContent;
    const modal = document.querySelector('.content-modal');
    
    // Get the parent card (helper card, insight card, or modal content)
    const parentCard = tag.closest('.helper-card, .insight-card, .content-modal') || modal;
    console.log('📦 Parent card found:', parentCard);
    
    // If we're in edit mode
    if (modal.classList.contains('active') && modal.querySelector('.modal-content').isContentEditable) {
        console.log('✏️ In edit mode - expanding tag');
        await handleTagExpansion(tag);
        return;
    }
    
    // Normal mode - create insight card
    console.log('📝 Creating insight card');
    const helperContext = {
        title: parentCard.querySelector('.helper-card-header h3, .modal-header h2, .section-header h3')?.textContent || 'Context',
        overview: {
            description: parentCard.querySelector('.helper-section:first-child p, .insight-summary, .section-content p')?.textContent || '',
            concepts: Array.from(parentCard.querySelectorAll('.helper-tag')).map(t => t.textContent)
        },
        aspects: Array.from(parentCard.querySelectorAll('.tip-group, .section-content')).map(group => ({
            title: group.querySelector('h4, h3')?.textContent || '',
            description: group.querySelector('p')?.textContent || '',
            tags: Array.from(group.querySelectorAll('.helper-tag')).map(t => t.textContent)
        }))
    };
    
    // Create and show loading card
    const loadingCard = createLoadingInsightCard(tagText);
    const tipsOverlay = document.querySelector('.tips-overlay');
    tipsOverlay.insertBefore(loadingCard, tipsOverlay.firstChild);
    setTimeout(() => loadingCard.classList.add('visible'), 100);
    
    try {
        console.log('📤 Sending insight request:', {
            concept: tagText,
            helper_context: helperContext
        });
        
        const response = await fetch('/generate_insight', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                concept: tagText,
                helper_context: JSON.stringify(helperContext, null, 2)
            })
        });
        
        const result = await response.json();
        console.log('📥 Received insight response:', result);
        
        if (result.success) {
            const insightData = typeof result.insight_data === 'string'
                ? JSON.parse(result.insight_data)
                : result.insight_data;
            
            const insightCard = createInsightCard(insightData);
            loadingCard.replaceWith(insightCard);
            setTimeout(() => insightCard.classList.add('visible'), 100);
        } else {
            throw new Error(result.error || 'Failed to generate insight');
        }
    } catch (error) {
        console.error('❌ Error generating insight:', error);
        loadingCard.classList.add('error');
        loadingCard.querySelector('.tips-card-header h3').textContent = 'Error generating insight';
        loadingCard.querySelector('.insight-summary').textContent = 'Failed to generate insight. Please try again.';
    }
}

// Add tag expansion handler
async function handleTagExpansion(tag) {
    console.log('🔄 Expanding tag:', tag.textContent);
    
    // Get context from the modal content
    const modal = document.querySelector('.content-modal');
    const context = {
        title: modal.querySelector('.modal-header h2').textContent,
        content: modal.querySelector('.modal-content').innerHTML,
        existingTags: Array.from(modal.querySelectorAll('.helper-tag'))
            .map(t => t.textContent),
        topicOverview: document.querySelector('.helper-section:first-child p')?.textContent || '',
        keyConcepts: Array.from(document.querySelector('.helper-section:first-child .helper-tags')?.querySelectorAll('.helper-tag') || [])
            .map(t => t.textContent)
    };
    
    try {
        // Show loading state
        tag.style.opacity = '0.5';
        
        // Generate related tags
        const response = await fetch('/generate_related_tags', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tag: tag.textContent,
                context: context
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            const tagsData = typeof result.tags === 'string' ? JSON.parse(result.tags) : result.tags;
            const tagsContainer = tag.closest('.helper-tags') || createTagsContainer(tag);
            
            // Create and add new tags with animation
            tagsData.related_tags.forEach((newTag, index) => {
                // Skip if tag already exists
                if (context.existingTags.includes(newTag)) return;
                
                const tagElement = document.createElement('span');
                tagElement.className = 'helper-tag';
                tagElement.textContent = newTag;
                tagElement.style.opacity = '0';
                tagElement.style.transform = 'translateY(10px)';
                
                // Add click handler to new tag
                tagElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleTagClick(e);
                });
                
                tagsContainer.appendChild(tagElement);
                
                // Animate tag appearance with delay
                setTimeout(() => {
                    tagElement.style.transition = 'all 0.3s ease';
                    tagElement.style.opacity = '1';
                    tagElement.style.transform = 'translateY(0)';
                }, index * 100);
            });
        }
    } catch (error) {
        console.error('Error generating related tags:', error);
    } finally {
        // Restore tag appearance
        tag.style.opacity = '1';
    }
}

// Helper function to create tags container if it doesn't exist
function createTagsContainer(tag) {
    const container = document.createElement('div');
    container.className = 'helper-tags';
    
    // If the tag is in the modal content
    if (tag.closest('.modal-content')) {
        // Insert after the paragraph containing the tag
        const paragraph = tag.closest('p');
        if (paragraph) {
            paragraph.parentNode.insertBefore(container, paragraph.nextSibling);
        } else {
            // If no paragraph found, append to modal content
            tag.closest('.modal-content').appendChild(container);
        }
    } else {
        // Insert after the tag
        tag.parentNode.insertBefore(container, tag.nextSibling);
    }
    
    return container;
}

// Add quick customization templates
const QUICK_CUSTOMIZATIONS = {
    "1": [ // Content Objectives
        {
            text: "Make it more practical and hands-on",
            prompt: "Rewrite these objectives to be more practical and hands-on, focusing on what students will actually do rather than abstract concepts."
        },
        {
            text: "Simplify for younger students",
            prompt: "Adapt these objectives for younger students, using simpler language and more basic concepts while maintaining the core learning goals."
        },
        {
            text: "Add cross-curricular connections",
            prompt: "Enhance these objectives by adding connections to other subjects like math, science, or art where relevant."
        },
        {
            text: "Focus on critical thinking",
            prompt: "Revise these objectives to emphasize critical thinking skills, analysis, and problem-solving."
        }
    ],
    "2": [ // Language Objectives
        {
            text: "Add more everyday phrases",
            prompt: "Include more everyday conversational phrases and expressions that students can use outside the classroom."
        },
        {
            text: "Focus on academic language",
            prompt: "Enhance the academic vocabulary and formal language structures needed for this topic."
        },
        {
            text: "Add pronunciation focus",
            prompt: "Include specific pronunciation goals and speaking practice opportunities."
        },
        {
            text: "Simplify vocabulary",
            prompt: "Simplify the vocabulary and language structures while maintaining the key learning points."
        }
    ],
    "3": [ // Learning Tasks
        {
            text: "Make more interactive",
            prompt: "Transform these tasks to be more interactive and engaging, with more student-to-student interaction."
        },
        {
            text: "Add group activities",
            prompt: "Modify these tasks to include more collaborative group work and team-based learning."
        },
        {
            text: "Include digital tools",
            prompt: "Integrate digital tools and technology into these tasks to enhance learning."
        },
        {
            text: "Add game elements",
            prompt: "Add game-like elements and friendly competition to make these tasks more engaging."
        }
    ],
    "4": [ // Assessment Criteria
        {
            text: "Add peer assessment",
            prompt: "Include opportunities for peer assessment and feedback in these criteria."
        },
        {
            text: "Make more observable",
            prompt: "Make the assessment criteria more specific and observable, with clear indicators of success."
        },
        {
            text: "Add self-reflection",
            prompt: "Include self-assessment and reflection components in these criteria."
        },
        {
            text: "Simplify rubric",
            prompt: "Simplify the assessment criteria while maintaining clear standards for evaluation."
        }
    ],
    "5": [ // Text Deep Learning
        {
            text: "Simplify Language",
            prompt: "Adjust the text and questions to use simpler language while maintaining the core concepts."
        },
        {
            text: "Add Real-World Examples",
            prompt: "Include more practical, real-world examples and applications in the text and questions."
        },
        {
            text: "Enhance Critical Thinking",
            prompt: "Add more analytical and evaluative questions that promote deeper critical thinking."
        },
        {
            text: "Cultural Perspectives",
            prompt: "Include diverse cultural perspectives and cross-cultural comparisons in the text and questions."
        },
        {
            text: "Visual Learning",
            prompt: "Suggest visual aids, diagrams, or multimedia elements that could complement the text."
        }
    ]
};

// Initialize speech recognition
try {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.warn('Speech recognition not supported');
    } else {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        // Set up recognition event handlers
        recognition.onstart = () => {
            console.log('Recognition started');
            isRecording = true;
            document.querySelectorAll('.mic-button').forEach(btn => btn.classList.add('recording'));
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            const focusedElement = document.activeElement;
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // Update the focused input with transcription
            if (focusedElement && (focusedElement.id === 'prompt-input' || focusedElement.id === 'customize-input')) {
                focusedElement.value = finalTranscript + interimTranscript;
                console.log('Transcript updated:', focusedElement.value);
            }
        };

        recognition.onend = () => {
            console.log('Recognition ended');
            isRecording = false;
            document.querySelectorAll('.mic-button').forEach(btn => btn.classList.remove('recording'));
            
            if (shouldGenerateAfterRecording) {
                shouldGenerateAfterRecording = false;
                generateActivity();
            }
        };

        recognition.onerror = (event) => {
            console.error('Recognition error:', event.error);
            isRecording = false;
            document.querySelectorAll('.mic-button').forEach(btn => btn.classList.remove('recording'));
            alert('Speech recognition error: ' + event.error);
        };
    }
} catch (e) {
    console.warn('Speech recognition not supported:', e);
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Add event listener for generate button
    document.getElementById('generate-btn').addEventListener('click', generateActivity);
    
    // Add event listener for save button
    document.getElementById('save-lesson-btn')?.addEventListener('click', saveLesson);

    // Add event listeners for view buttons in main sections
    document.querySelectorAll('.section .card-btn.view').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const section = btn.closest('.section');
            const container = section.querySelector('.part-container');
            const title = section.querySelector('.section-header h3').textContent;
            
            const modal = document.querySelector('.content-modal');
            const modalContent = modal.querySelector('.modal-content');
            const modalTitle = modal.querySelector('.modal-header h2');
            
            modalTitle.textContent = title;
            
            // Extract the content from the section-content div if it exists
            const sectionContent = container.querySelector('.section-content');
            if (sectionContent) {
                modalContent.innerHTML = sectionContent.innerHTML;
            } else {
                modalContent.innerHTML = container.innerHTML;
            }
            
            modal.dataset.currentSection = container.id;
            modal.classList.add('active');
            
            // Initialize modal features
            initializeModalSelectionHandling(modal);
        });
    });
    
    // Add event listeners for regenerate buttons
    document.querySelectorAll('.regenerate-btn').forEach(btn => {
        btn.addEventListener('click', () => regenerateSection(btn.dataset.section));
    });

    // Create customize panel HTML
    document.body.insertAdjacentHTML('beforeend', `
        <div id="customize-panel" class="customize-panel">
            <div class="panel-header">
                <h2>Customize</h2>
                <button class="close-panel">✕</button>
            </div>
            <div class="panel-body">
                <div class="input-container">
                    <textarea id="customize-input" placeholder="Enter additional instructions or modifications for this section..."></textarea>
                    <button id="customize-mic-button" class="mic-button">
                        <svg class="mic-icon" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z" />
                        </svg>
                    </button>
                </div>
                <button id="apply-customize" class="action-btn">Apply Changes</button>
            </div>
        </div>
    `);

    // Now add event listeners for customize buttons
    document.querySelectorAll('.customize-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openCustomizePanel(btn.dataset.section, e));
    });

    // Add panel event listeners after panel is created
    const closePanel = document.querySelector('.close-panel');
    const applyCustomize = document.getElementById('apply-customize');
    if (closePanel) {
        closePanel.addEventListener('click', closeCustomizePanel);
    }
    if (applyCustomize) {
        applyCustomize.addEventListener('click', handleCustomization);
    }

    // Add mic button handler for customize panel
    const customizeMicButton = document.getElementById('customize-mic-button');
    if (customizeMicButton && recognition) {
        customizeMicButton.addEventListener('click', () => {
            const customizeInput = document.getElementById('customize-input');
            if (customizeInput) {
                handleMicButtonClick(customizeMicButton, customizeInput);
            }
        });
    }

    // Initialize tips card collapse/expand
    const tipsHeader = document.querySelector('.tips-card-header');
    const tipsContent = document.querySelector('.tips-card-content');
    if (tipsHeader && tipsContent) {
        tipsHeader.classList.add('collapsed');
        tipsHeader.addEventListener('click', () => {
            tipsHeader.classList.toggle('collapsed');
            tipsContent.classList.toggle('collapsed');
        });
    }
    
    // Add click handlers for tips
    document.querySelectorAll('.tip-group p').forEach(tip => {
        tip.addEventListener('click', () => {
            const promptInput = document.getElementById('prompt-input');
            const currentText = promptInput.value;
            const tipText = tip.textContent.trim();
            
            if (currentText) {
                promptInput.value = currentText + ' ' + tipText;
            } else {
                promptInput.value = tipText;
            }
            
            promptInput.focus();
        });
    });
    
    // Add tips panel toggle functionality
    const tipsOverlay = document.querySelector('.tips-overlay');
    const tipsToggle = document.querySelector('.tips-toggle');
    const bookContainer = document.querySelector('.book-container');
    
    if (tipsToggle && tipsOverlay) {
        tipsToggle.addEventListener('click', () => {
            tipsOverlay.classList.toggle('collapsed');
            bookContainer.classList.toggle('tips-collapsed');
        });
    }
    
    // Add enter key listener to customize input
    document.getElementById('customize-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const section = currentCustomizeSection;
            const input = document.getElementById('customize-input');
            const prompt = input.value.trim();
            
            if (prompt) {
                closeCustomizePanel();
                applyCustomization(prompt, section);
            }
        }
    });
    
    // Initialize loading indicators
    document.querySelectorAll('.loading-indicator').forEach(indicator => {
        indicator.style.display = 'none';
    });

    // Add microphone button handler
    const micButton = document.getElementById('mic-button');
    if (micButton && recognition) {
        micButton.addEventListener('click', () => {
            if (!isRecording) {
                try {
                    // Focus the prompt input before starting recognition
                    document.getElementById('prompt-input').focus();
                    recognition.start();
                } catch (e) {
                    console.error('Error starting recognition:', e);
                    alert('Error starting speech recognition. Please try again.');
                }
            } else {
                try {
                    recognition.stop();
                } catch (e) {
                    console.error('Error stopping recognition:', e);
                }
            }
        });
    } else {
        // Hide mic button if speech recognition is not supported
        if (micButton) {
            micButton.style.display = 'none';
        }
    }

    // Add modal HTML with updated button handlers
    const modalHTML = `
        <div class="content-modal">
            <div class="modal-container">
                <div class="modal-header">
                    <h2>View Content</h2>
                    <div class="modal-controls">
                        <div class="editor-toolbar">
                            <button class="format-btn" data-command="bold" title="Bold (Ctrl+B)">B</button>
                            <button class="format-btn" data-command="italic" title="Italic (Ctrl+I)">I</button>
                        </div>
                        <button class="modal-btn export" title="Export/Print" onclick="printContent()">🖨️</button>
                        <button class="modal-btn copy" title="Copy content" onclick="copyContent()">📋</button>
                        <button class="modal-btn save" title="Save changes">💾</button>
                        <button class="modal-btn close" title="Close">✕</button>
                    </div>
                </div>
                <div class="modal-content" contenteditable="true"></div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add modal event listeners
    const modal = document.querySelector('.content-modal');
    const modalContent = modal.querySelector('.modal-content');
    const saveBtn = modal.querySelector('.modal-btn.save');
    const closeBtn = modal.querySelector('.modal-btn.close');

    // Add keyboard shortcuts for formatting
    modalContent.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    document.execCommand('bold', false, null);
                    break;
                case 'i':
                    e.preventDefault();
                    document.execCommand('italic', false, null);
                    break;
            }
        }
    });

    // Add formatting button handlers with active state
    modal.querySelectorAll('.format-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const command = btn.dataset.command;
            document.execCommand(command, false, null);
            
            // Toggle active state based on current selection
            const isActive = document.queryCommandState(command);
            btn.classList.toggle('active', isActive);
            
            modalContent.focus();
        });
    });

    // Update format button states when selection changes
    modalContent.addEventListener('selectionchange', () => {
        modal.querySelectorAll('.format-btn').forEach(btn => {
            const command = btn.dataset.command;
            const isActive = document.queryCommandState(command);
            btn.classList.toggle('active', isActive);
        });
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    // Update save button handler to work with all card types
    saveBtn.addEventListener('click', () => {
        console.log('💾 Save button clicked');
        const content = modalContent.innerHTML;
        const cardId = modal.dataset.currentCard;
        const sectionId = modal.dataset.currentSection;
        
        // First try to find a card (for helper/insight cards)
        const card = document.querySelector(`[data-card-id="${cardId}"]`);
        
        if (card) {
            // Handle helper/insight cards
            if (card.classList.contains('tips-card') || card.classList.contains('insight-card')) {
                console.log('💡 Updating insight/tips card');
                const cardContent = card.querySelector('.tips-card-content');
                if (cardContent) {
                    cardContent.innerHTML = content;
                    // Re-attach click handlers to any tags
                    cardContent.querySelectorAll('.helper-tag').forEach(tag => {
                        tag.removeEventListener('click', handleTagClick);
                        tag.addEventListener('click', handleTagClick);
                    });
                }
            } else {
                console.log('🎴 Updating helper card');
                const helperSection = card.querySelector('.helper-section');
                if (helperSection) {
                    helperSection.innerHTML = content;
                    // Re-attach click handlers to all tags
                    helperSection.querySelectorAll('.helper-tag').forEach(tag => {
                        tag.removeEventListener('click', handleTagClick);
                        tag.addEventListener('click', handleTagClick);
                    });
                }
            }
        } else if (sectionId) {
            // Handle main section content
            console.log('📝 Updating main section:', sectionId);
            const container = document.getElementById(sectionId);
            if (container) {
                // Check if content already has section-content wrapper
                if (content.includes('section-content')) {
                    // Content already has section-content wrapper, use as is
                    container.innerHTML = content;
                } else {
                    // Wrap content in section-content div
                    container.innerHTML = `<div class="section-content">${content}</div>`;
                }
                
                // Update the content in generatedSections array
                const sectionKey = sectionId.replace('-container', '');
                if (generatedSections[sectionKey]) {
                    console.log(`Saving content for section ${sectionKey}, index ${currentIndices[sectionKey]}`);
                    
                    // Store the raw content without section-content wrapper
                    if (content.includes('section-content')) {
                        // Extract content from within section-content div
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = content;
                        const sectionContent = tempDiv.querySelector('.section-content');
                        if (sectionContent) {
                            generatedSections[sectionKey][currentIndices[sectionKey]] = sectionContent.innerHTML;
                        } else {
                            generatedSections[sectionKey][currentIndices[sectionKey]] = content;
                        }
                    } else {
                        generatedSections[sectionKey][currentIndices[sectionKey]] = content;
                    }
                    
                    // Ensure the content is saved properly by logging it
                    console.log(`Saved content length: ${generatedSections[sectionKey][currentIndices[sectionKey]].length} characters`);
                    
                    // Force update the display to ensure changes are visible
                    updateSectionDisplay(sectionKey);
                } else {
                    console.warn(`Section ${sectionKey} not found in generatedSections`);
                }
                
                // Re-attach click handlers to any tags in the main section
                container.querySelectorAll('.helper-tag').forEach(tag => {
                    tag.removeEventListener('click', handleTagClick);
                    tag.addEventListener('click', handleTagClick);
                });
            }
        }
        
        modal.classList.remove('active');
    });

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeBtn.click();
        }
    });

    // Add escape key handler
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeBtn.click();
        }
    });

    // Add command prompt HTML to modal
    const commandPromptHTML = `
        <div class="command-prompt">
            <input type="text" class="command-input" placeholder="Type a command (e.g., 'add', 'expand', 'summarize')" />
            <div class="command-status"></div>
        </div>
    `;
    modal.insertAdjacentHTML('beforeend', commandPromptHTML);

    // Command prompt handling
    const commandPrompt = modal.querySelector('.command-prompt');
    const commandInput = commandPrompt.querySelector('.command-input');
    const commandStatus = commandPrompt.querySelector('.command-status');
    let currentCommandRange = null;
    let isGenerating = false;

    // Function to extract text before cursor as a fallback
    function extractTextBeforeCursor(element, range) {
        try {
            // Try using Range API first
            const beforeCursorRange = document.createRange();
            beforeCursorRange.selectNodeContents(element);
            beforeCursorRange.setEnd(range.startContainer, range.startOffset);
            return beforeCursorRange.toString();
        } catch (error) {
            console.error("Error extracting text with Range API:", error);
            
            // Fallback: Get all text and try to estimate cursor position
            const fullText = element.textContent;
            const approximatePosition = Math.min(
                range.startOffset || 0,
                fullText.length
            );
            
            return fullText.substring(0, approximatePosition);
        }
    }
    
    // Function to prepare text before cursor for API
    function prepareTextBeforeCursor(text) {
        // If text is too long, truncate it to last 5000 characters
        // This helps stay within API limits while keeping most relevant context
        const MAX_LENGTH = 5000;
        
        if (text.length <= MAX_LENGTH) {
            return text;
        }
        
        // Keep the last MAX_LENGTH characters as they're most relevant
        const truncatedText = text.substring(text.length - MAX_LENGTH);
        
        // Add a note about truncation
        return `[...text truncated...]\n\n${truncatedText}`;
    }

    // Add command detection to modal content
    modalContent.addEventListener('keydown', (e) => {
        if (isGenerating) return; // Prevent new commands while generating

        if ((e.key === '/' || e.key === '@') && !commandPrompt.classList.contains('active')) {
            e.preventDefault();
            
            try {
                // Store the current selection/cursor position
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);
                currentCommandRange = range;
    
                // Extract text before cursor using our helper function
                const textBeforeCursor = extractTextBeforeCursor(modalContent, range);
                
                // Log for debugging
                console.log("Text before cursor:", textBeforeCursor.substring(0, 100) + "...");
                console.log("Text before cursor length:", textBeforeCursor.length);
                
                // Store for later use (no need to prepare/truncate yet, we'll do that when sending)
                commandPrompt.dataset.textBeforeCursor = textBeforeCursor;
    
                // Position and show command prompt at cursor position
                const rect = range.getBoundingClientRect();
                const modalRect = modal.getBoundingClientRect();
                
                // Calculate position to keep prompt within modal bounds
                let top = rect.bottom + 5;
                let left = rect.left;
                
                // Adjust if too close to bottom
                if (top + 100 > modalRect.bottom) {
                    top = rect.top - 60; // Position above
                }
                
                // Adjust if too close to right edge
                if (left + 320 > modalRect.right) {
                    left = modalRect.right - 330;
                }
                
                commandPrompt.style.top = `${top}px`;
                commandPrompt.style.left = `${left}px`;
                commandPrompt.classList.add('active');
                
                // Create a temporary marker for the command position
                const marker = document.createElement('span');
                marker.className = 'command-marker';
                marker.textContent = e.key;
                range.insertNode(marker);
                
                // Focus the command input
                commandInput.value = '';
                commandInput.focus();
            } catch (error) {
                console.error("Error setting up command prompt:", error);
                // Fallback: Just show the command prompt without text extraction
                commandPrompt.style.top = '50%';
                commandPrompt.style.left = '50%';
                commandPrompt.classList.add('active');
                commandInput.value = '';
                commandInput.focus();
            }
        }
    });

    // Handle command suggestions
    commandPrompt.querySelectorAll('.command-suggestion').forEach(suggestion => {
        suggestion.addEventListener('click', () => {
            const command = suggestion.textContent.split('-')[0].trim();
            commandInput.value = command;
            commandInput.focus();
        });
    });

    // Handle command suggestions filtering
    commandInput.addEventListener('input', () => {
        const value = commandInput.value.toLowerCase();
        
        // Filter suggestions based on input
        commandPrompt.querySelectorAll('.command-suggestion').forEach(suggestion => {
            const text = suggestion.textContent.toLowerCase();
            suggestion.style.display = text.includes(value) ? 'block' : 'none';
        });
    });

    // Handle command input
    commandInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Escape') {
            closeCommandPrompt();
            return;
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const command = commandInput.value.trim();
            if (!command) return;

            try {
                isGenerating = true;
                commandStatus.textContent = 'Generating...';
                commandStatus.classList.add('generating');

                // Get the full context
                const fullContent = modalContent.innerHTML;
                const marker = modalContent.querySelector('.command-marker');
                
                // Get the stored text before cursor and prepare it
                let textBeforeCursor = commandPrompt.dataset.textBeforeCursor || '';
                textBeforeCursor = prepareTextBeforeCursor(textBeforeCursor);
                
                // Debug logs
                console.log("Command:", command);
                console.log("Text before cursor length:", textBeforeCursor.length);
                console.log("Text before cursor preview:", textBeforeCursor.substring(0, 100) + "...");
                
                // Create context-aware prompt
                const contextPrompt = {
                    content: fullContent,
                    command: command,
                    position: marker ? Array.from(modalContent.childNodes).indexOf(marker) : -1,
                    text_before_cursor: textBeforeCursor  // Send extracted text before cursor
                };

                // Start streaming request
                const response = await fetch('/generate_inline', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(contextPrompt)
                });

                if (!response.body) {
                    throw new Error('ReadableStream not supported');
                }

                // Remove the command marker
                if (marker) {
                    marker.remove();
                }

                // Create a new element for the generated content
                const generatedSpan = document.createElement('span');
                generatedSpan.className = 'generating-text';
                currentCommandRange.insertNode(generatedSpan);

                // Set up text streaming
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let generatedText = '';

                while (true) {
                    const {value, done} = await reader.read();
                    if (done) break;
                    
                    const text = decoder.decode(value);
                    generatedText += text;
                    
                    // Use the formatContent function to properly format the text
                    // This will convert markdown to HTML and handle lists, tables, etc.
                    generatedSpan.innerHTML = formatContent(generatedText);
                }

                // Finalize generated content
                generatedSpan.classList.remove('generating-text');
                
                // Ensure the content is properly formatted in the DOM
                // This helps with saving the content later
                if (generatedSpan.innerHTML !== formatContent(generatedText)) {
                    generatedSpan.innerHTML = formatContent(generatedText);
                }
                
                // Clean up
                closeCommandPrompt();
                
            } catch (error) {
                console.error('Error generating content:', error);
                commandStatus.textContent = 'Error generating content';
                commandStatus.classList.remove('generating');
                setTimeout(closeCommandPrompt, 2000);
            } finally {
                isGenerating = false;
            }
        }
    });

    function closeCommandPrompt() {
        commandPrompt.classList.remove('active');
        commandInput.value = '';
        commandStatus.textContent = '';
        commandStatus.classList.remove('generating');
        
        // Remove any leftover command markers
        const markers = modalContent.querySelectorAll('.command-marker');
        markers.forEach(marker => marker.remove());
    }

    // Close command prompt when clicking outside
    document.addEventListener('click', (e) => {
        if (!commandPrompt.contains(e.target) && !modalContent.contains(e.target)) {
            closeCommandPrompt();
        }
    });

    // Update tag click handling in modal content
    modalContent.addEventListener('click', async (e) => {
        const tag = e.target.closest('.helper-tag');
        if (!tag) return;
        
        e.stopPropagation();
        
        // Show loading state
        tag.style.opacity = '0.5';
        
        try {
            // Generate tags from clicked tag
            const response = await fetch('/generate_related_tags', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tag: tag.textContent,
                    context: {
                        content: modalContent.innerHTML,
                        existingTags: Array.from(modalContent.querySelectorAll('.helper-tag'))
                            .map(t => t.textContent)
                    }
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                const tagsData = typeof result.tags === 'string' ? JSON.parse(result.tags) : result.tags;
                
                // Create tags container if it doesn't exist
                let tagsContainer = tag.closest('.helper-tags');
                if (!tagsContainer) {
                    tagsContainer = document.createElement('div');
                    tagsContainer.className = 'helper-tags';
                    tag.parentElement.after(tagsContainer);
                }
                
                // Add new tags
                tagsData.related_tags.forEach((newTag, index) => {
                    // Skip if tag already exists
                    if (tagsContainer.querySelector(`.helper-tag[data-tag="${newTag}"]`)) return;
                    
                    const tagElement = document.createElement('span');
                    tagElement.className = 'helper-tag';
                    tagElement.textContent = newTag;
                    tagElement.dataset.tag = newTag;
                    tagElement.style.opacity = '0';
                    tagElement.style.transform = 'translateY(10px)';
                    
                    tagsContainer.appendChild(tagElement);
                    
                    // Animate tag appearance
                    setTimeout(() => {
                        tagElement.style.transition = 'all 0.3s ease';
                        tagElement.style.opacity = '1';
                        tagElement.style.transform = 'translateY(0)';
                    }, index * 100);
                });
            }
        } catch (error) {
            console.error('Error generating related tags:', error);
        } finally {
            // Reset tag appearance
            tag.style.opacity = '1';
        }
    });

    // Add selection handling to modal content
    initializeModalSelectionHandling(modal);
});

// Update openCustomizePanel to include quick customizations
function openCustomizePanel(section, event) {
    console.log('Opening panel for section:', section);
    event.stopPropagation(); // Add this line to prevent event bubbling
    const panel = document.getElementById('customize-panel');
    const input = document.getElementById('customize-input');
    const button = event.currentTarget;
    const buttonRect = button.getBoundingClientRect();
    
    // Position panel near the button
    panel.style.position = 'fixed';
    panel.style.top = `${buttonRect.bottom + 5}px`;
    panel.style.left = `${buttonRect.left}px`;
    
    // Update active button state
    document.querySelectorAll('.customize-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');
    
    // Set panel title based on section
    const sectionTitles = {
        '1': 'Content Objectives',
        '2': 'Language Objectives',
        '3': 'Learning Tasks',
        '4': 'Assessment Criteria',
        '5': 'Text Deep Learning'
    };
    
    document.querySelector('.panel-header h2').textContent = 
        `Customize ${sectionTitles[section]}`;
    
    currentCustomizeSection = section;
    input.value = ''; // Clear previous input
    
    panel.classList.add('active');
    input.focus();
}

// Close customization panel
function closeCustomizePanel() {
    console.log('Closing panel');
    const panel = document.getElementById('customize-panel');
    panel.classList.remove('active');
    document.querySelectorAll('.customize-btn').forEach(btn => {
        btn.classList.remove('active');
    });
}

// Handle customization submission from Apply button
function handleCustomization() {
    console.log('Handle customization clicked');
    const customInput = document.getElementById('customize-input');
    const customPrompt = customInput.value.trim();
    const section = currentCustomizeSection;
    
    console.log('Prompt:', customPrompt, 'Section:', section);
    
    if (!customPrompt) {
        alert('Please enter your customization instructions');
        return;
    }
    
    // Close panel immediately
    closeCustomizePanel();
    
    // Start the customization process in the background
    applyCustomization(customPrompt, section);
}

// Helper function to detect and format content type
function formatContent(text) {
    if (!text) return '';
    
    // Pre-process markdown to fix common issues
    text = fixMarkdownPatterns(text);
    
    // Use marked to convert markdown to HTML
    return marked.parse(text);
}

// Update the existing formatting functions to use the new formatter
function formatContentObjectives(objectives) {
    if (Array.isArray(objectives)) {
        return objectives.map((obj, i) => `${i + 1}. ${obj}`).join('<br>');
    }
    return formatContent(objectives);
}

function formatLanguageObjectives(objectives) {
    if (typeof objectives === 'object' && objectives !== null) {
        return `
            <strong>Key Vocabulary:</strong><br>
            • ${objectives.key_vocabulary.join('<br>• ')}<br><br>
            <strong>Language Structures:</strong><br>
            • ${objectives.language_structures.join('<br>• ')}<br><br>
            <strong>Example Phrases:</strong><br>
            • ${objectives.example_phrases.join('<br>• ')}
        `;
    }
    return formatContent(objectives);
}

function formatLearningTasks(tasks) {
    if (Array.isArray(tasks)) {
        return tasks.map((task, i) => {
            let taskHtml = `
                <div class="task-card">
                    <h3>${i + 1}. ${task.title}</h3>
                    <div class="task-duration"><i class="fas fa-clock"></i> ${task.duration}</div>
                    <div class="task-description">${task.description}</div>
                    <div class="task-steps">
            `;
            
            // Format Step 1: Requirements
            if (task.step_1_requirements) {
                const step = task.step_1_requirements;
                taskHtml += `
                    <div class="task-step">
                        <h4>Step 1: ${step.name}</h4>
                        <p>${step.description}</p>
                `;
                
                // Format elements for Step 1
                if (step.elements && Array.isArray(step.elements)) {
                    taskHtml += `<div class="step-elements">`;
                    
                    // Format each element
                    step.elements.forEach(element => {
                        taskHtml += `
                            <div class="step-element">
                                <strong>${element.name}:</strong>
                        `;
                        
                        // Check if details is an array or string
                        if (Array.isArray(element.details)) {
                            taskHtml += `<ul>`;
                            element.details.forEach(detail => {
                                taskHtml += `<li>${detail}</li>`;
                            });
                            taskHtml += `</ul>`;
                        } else {
                            taskHtml += `<p>${element.details}</p>`;
                        }
                        
                        taskHtml += `</div>`;
                    });
                    
                    taskHtml += `</div>`;
                }
                
                taskHtml += `</div>`;
            }
            
            // Format Step 2: Execution
            if (task.step_2_execution) {
                const step = task.step_2_execution;
                taskHtml += `
                    <div class="task-step">
                        <h4>Step 2: ${step.name}</h4>
                        <p>${step.description}</p>
                `;
                
                // Format elements for Step 2
                if (step.elements && Array.isArray(step.elements)) {
                    taskHtml += `<div class="step-elements">`;
                    
                    // Format each element
                    step.elements.forEach(element => {
                        taskHtml += `
                            <div class="step-element">
                                <strong>${element.name}:</strong>
                        `;
                        
                        // Check if details is an array or string
                        if (Array.isArray(element.details)) {
                            taskHtml += `<ul>`;
                            element.details.forEach(detail => {
                                taskHtml += `<li>${detail}</li>`;
                            });
                            taskHtml += `</ul>`;
                        } else {
                            taskHtml += `<p>${element.details}</p>`;
                        }
                        
                        taskHtml += `</div>`;
                    });
                    
                    taskHtml += `</div>`;
                }
                
                taskHtml += `</div>`;
            }
            
            // Format Step 3: Wrap-up
            if (task.step_3_wrap_up) {
                const step = task.step_3_wrap_up;
                taskHtml += `
                    <div class="task-step">
                        <h4>Step 3: ${step.name}</h4>
                        <p>${step.description}</p>
                `;
                
                // Format elements for Step 3
                if (step.elements && Array.isArray(step.elements)) {
                    taskHtml += `<div class="step-elements">`;
                    
                    // Format each element
                    step.elements.forEach(element => {
                        taskHtml += `
                            <div class="step-element">
                                <strong>${element.name}:</strong>
                        `;
                        
                        // Check if details is an array or string
                        if (Array.isArray(element.details)) {
                            taskHtml += `<ul>`;
                            element.details.forEach(detail => {
                                taskHtml += `<li>${detail}</li>`;
                            });
                            taskHtml += `</ul>`;
                        } else {
                            taskHtml += `<p>${element.details}</p>`;
                        }
                        
                        taskHtml += `</div>`;
                    });
                    
                    taskHtml += `</div>`;
                }
                
                taskHtml += `</div>`;
            }
            
            // Close task steps and task card
            taskHtml += `
                    </div>
                </div>
            `;
            
            return taskHtml;
        }).join('');
    }
    return formatContent(tasks);
}

function formatAssessmentCriteria(criteria) {
    if (Array.isArray(criteria)) {
        return criteria.map((criterion, i) => `
            <strong>${i + 1}. ${criterion.criterion}</strong><br>
            Method: ${criterion.method}<br>
        `).join('<br>');
    }
    return formatContent(criteria);
}

function formatMaterialsResources(resources) {
    if (Array.isArray(resources)) {
        return resources.map((resource, i) => `
            <strong>${i + 1}. ${resource.type}</strong><br>
            ${resource.description}<br>
            Purpose: ${resource.purpose}<br>
        `).join('<br>');
    }
    return formatContent(resources);
}

// Update the customization handler to use the improved formatter
async function applyCustomization(customPrompt, section) {
    console.log('Applying customization for section:', section);
    if (!section) {
        console.error('No section specified');
        return;
    }
    
    // Show loading state
    showSectionLoading(section);
    
    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                prompt: document.getElementById('prompt-input').value.trim(),
                section: section,
                customization: customPrompt,
                current_activity: getCurrentActivityState()
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            const sectionMap = {
                '1': 'content',
                '2': 'language',
                '3': 'tasks',
                '4': 'assessment',
                '5': 'materials'
            };
            
            const sectionKey = sectionMap[section];
            
            // Format the response using our improved formatter
            const formattedContent = formatContent(result.data);
            generatedSections[sectionKey].push(formattedContent);
            
            // Update the current index to point to the new version
            currentIndices[sectionKey] = generatedSections[sectionKey].length - 1;
            
            // Update the display immediately
            updateSectionDisplay(sectionKey);
        } else {
            throw new Error(result.error || 'Failed to apply customization');
        }
    } catch (error) {
        console.error('Error in customization:', error);
        alert('Error applying customization: ' + error.message);
    } finally {
        hideSectionLoading(section);
    }
}

// Helper function to get current activity state
function getCurrentActivityState() {
    return {
        content_objectives: document.getElementById('content-container').innerHTML,
        language_objectives: document.getElementById('language-container').innerHTML,
        learning_tasks: document.getElementById('tasks-container').innerHTML,
        assessment_criteria: document.getElementById('assessment-container').innerHTML,
        materials_resources: document.getElementById('materials-container').innerHTML
    };
}

// Add formatting helper function
function formatCustomResponse(text) {
    // Pre-process text to fix common patterns that get misinterpreted as code blocks
    text = fixMarkdownPatterns(text);
    
    // Configure marked options for security and features
    marked.setOptions({
        gfm: true, // GitHub Flavored Markdown
        breaks: true, // Convert line breaks to <br>
        headerIds: false, // Don't add ids to headers
        mangle: false, // Don't escape HTML
        sanitize: true, // Sanitize HTML input
        smartLists: true, // Use smarter list behavior
        smartypants: true, // Use smart punctuation
        xhtml: true, // Use XHTML style tags
        pedantic: false // Less strict parsing (helps with indented lists)
    });

    // Convert markdown to HTML
    return marked.parse(text);
}

// Add a helper function to fix markdown patterns that might be misinterpreted
function fixMarkdownPatterns(text) {
    if (!text) return text;
    
    // Fix indented lists (4+ spaces followed by a dash or asterisk)
    text = text.replace(/^(\s{4,})([*-])/gm, '  $2');
    
    // Fix blank lines in lists that cause list restart
    text = text.replace(/^([*-]\s.+)(\n\n)([*-]\s)/gm, '$1\n$3');
    
    // Fix mixed list markers
    text = text.replace(/^([*-]\s.+\n)([*-]\s)/gm, '$1$2');
    
    // Fix indented text blocks that get interpreted as code blocks
    text = text.replace(/^(\s{4,})([^*-\s])/gm, '$2');
    
    // Fix multiple consecutive indented lines
    text = text.replace(/^\s{4,}(.+)$/gm, '$1');
    
    return text;
}

// Add helper content handling
function createHelperCard(data) {
    const card = document.createElement('div');
    card.className = 'helper-card';
    card.dataset.cardId = `card-${Date.now()}`;
    // Store the recipe for this card
    card._cardData = {
        type: 'helper',
        recipe: data
    };
    
    // Create overview section
    const overview = data.topic_overview;
    let content = `
        <div class="helper-card-header">
            <h3>${overview.title}</h3>
            <span class="toggle-icon">▾</span>
            <div class="card-controls">
                <span class="header-tooltip-trigger-wrapper-helper"></span>
                <button class="card-btn view" title="View full screen">👁️</button>
            </div>
        </div>
        <div class="helper-card-content">
            <div class="helper-section">
                <div class="helper-section-title">Overview</div>
                <p>${overview.description}</p>
                <div class="helper-tags">
                    ${overview.key_concepts.map(concept => `<span class="helper-tag">${concept}</span>`).join('')}
                </div>
            </div>
    `;
    
    // Add teaching aspects
    data.teaching_aspects.forEach(aspect => {
        content += `
            <div class="helper-section">
                <div class="helper-section-title">${aspect.title}</div>
                <p>${aspect.description}</p>
                <div class="helper-tags">
                    ${aspect.tags.map(tag => `<span class="helper-tag">${tag}</span>`).join('')}
                </div>
            </div>
        `;
    });
    
    // Add resources section
    content += `
        <div class="helper-section">
            <div class="helper-section-title">Suggested Resources</div>
            ${data.suggested_resources.map(resource => `
                <div class="resource-item">
                    <strong>${resource.type}:</strong> ${resource.description}
                    <div class="helper-tags">
                        ${resource.examples.map(example => `<span class="helper-tag">${example}</span>`).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    content += `</div>`;
    card.innerHTML = content;
    
    // Add tooltip to helper card header
    const helperHeaderTooltipWrapper = card.querySelector('.helper-card-header .card-controls .header-tooltip-trigger-wrapper-helper');
    if (helperHeaderTooltipWrapper) {
        createTooltip(helperHeaderTooltipWrapper, "This card provides a general overview, teaching aspects, and resources for the main activity topic. Explore the tags for deeper insights on specific concepts.", 'right');
    }
    
    // Add click handler for collapse/expand
    const header = card.querySelector('.helper-card-header');
    const content_div = card.querySelector('.helper-card-content');
    
    header.addEventListener('click', () => {
        header.classList.toggle('collapsed');
        content_div.classList.toggle('collapsed');
    });
    
    // Add view button handler for helper card
    card.querySelector('.card-btn.view').addEventListener('click', (e) => {
        e.stopPropagation();
        const modal = document.querySelector('.content-modal');
        const modalContent = modal.querySelector('.modal-content');
        const modalTitle = modal.querySelector('.modal-header h2');
        modalTitle.textContent = card.querySelector('.helper-card-header h3').textContent;
        modalContent.innerHTML = content_div.innerHTML;
        modal.dataset.currentCard = card.dataset.cardId || `card-${Date.now()}`;
        modal.classList.add('active');
    });
    
    // Add click handlers for tags
    card.querySelectorAll('.helper-tag').forEach(tag => {
        tag.addEventListener('click', (e) => {
            // Always use handleTagClick for insight card creation
            handleTagClick(e);
        });
    });
    
    return card;
}

// Update createInsightCard function to include control buttons
function createInsightCard(data) {
    const card = document.createElement('div');
    card.className = 'tips-card insight-card';
    card.dataset.cardId = `card-${Date.now()}`;
    // Store the recipe for this card
    card._cardData = {
        type: 'insight',
        recipe: data
    };
    
    const content = `
        <div class="tips-card-header">
            <h3>${data.title}</h3>
            <span class="toggle-icon">▾</span>
            <div class="card-controls">
                <span class="header-tooltip-trigger-wrapper-insight"></span>
                <button class="card-btn view" title="View full screen">👁️</button>
                <button class="card-btn close" title="Remove card">✕</button>
            </div>
        </div>
        <div class="tips-card-content">
            <div class="tip-group">
                <p class="insight-summary">${data.summary}</p>
            </div>
            <div class="tip-group">
                <h4>Practical Tips</h4>
                ${data.practical_tips.map(tip => `
                    <p>${tip}</p>
                `).join('')}
            </div>
            <div class="tip-group">
                <h4>Example</h4>
                <p><strong>Scenario:</strong> ${data.example.scenario}</p>
                <p><strong>Application:</strong> ${data.example.application}</p>
            </div>
            <div class="helper-tags">
                ${generateTagsFromContent(data)}
            </div>
        </div>
    `;
    
    card.innerHTML = content;
    
    // Add tooltip to insight card header
    const insightHeaderTooltipWrapper = card.querySelector('.tips-card-header .card-controls .header-tooltip-trigger-wrapper-insight');
    if (insightHeaderTooltipWrapper) {
        createTooltip(insightHeaderTooltipWrapper, "This card gives a focused explanation of the clicked tag, with practical tips and examples for your CLIL context.", 'right');
    }
    
    // Add click handler for collapse/expand
    const header = card.querySelector('.tips-card-header');
    const contentDiv = card.querySelector('.tips-card-content');
    
    header.addEventListener('click', (e) => {
        if (!e.target.matches('.card-btn')) {
            header.classList.toggle('collapsed');
            contentDiv.classList.toggle('collapsed');
        }
    });
    
    // Add view button handler
    card.querySelector('.card-btn.view').addEventListener('click', (e) => {
        e.stopPropagation();
        const modal = document.querySelector('.content-modal');
        const modalContent = modal.querySelector('.modal-content');
        const modalTitle = modal.querySelector('.modal-header h2');
        modalTitle.textContent = data.title;
        modalContent.innerHTML = contentDiv.innerHTML;
        modal.dataset.currentCard = card.dataset.cardId;
        modal.classList.add('active');
    });
    
    // Add close button handler
    card.querySelector('.card-btn.close').addEventListener('click', (e) => {
        e.stopPropagation();
        card.remove();
    });
    
    // Add click handlers to all tags in the card
    card.querySelectorAll('.helper-tag').forEach(tag => {
        tag.addEventListener('click', handleTagClick);
    });
    
    return card;
}

// Helper function to generate tags from insight content
function generateTagsFromContent(data) {
    const tags = new Set();
    
    // Extract key terms from title and summary
    const keyTerms = data.title.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    keyTerms.forEach(term => tags.add(term));
    
    // Extract important terms from practical tips
    data.practical_tips.forEach(tip => {
        const terms = tip.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
        terms.forEach(term => tags.add(term));
    });
    
    // Add key terms from example
    const scenarioTerms = data.example.scenario.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    scenarioTerms.forEach(term => tags.add(term));
    
    // Convert to array and limit to most relevant tags
    const tagArray = Array.from(tags).slice(0, 5);
    
    return tagArray.map(tag => `<span class="helper-tag">${tag}</span>`).join('');
}

// Add this function to create loading card
function createLoadingInsightCard(tagText) {
    const card = document.createElement('div');
    card.className = 'tips-card insight-card loading';
    
    const content = `
        <div class="tips-card-header">
            <h3>Loading insight for: ${tagText}</h3>
            <span class="loading-spinner">⌛</span>
        </div>
        <div class="tips-card-content">
            <div class="tip-group">
                <p class="insight-summary loading-placeholder">Generating insight...</p>
            </div>
            <div class="tip-group">
                <h4>Practical Tips</h4>
                <p class="loading-placeholder">Loading tips...</p>
            </div>
            <div class="tip-group">
                <h4>Example</h4>
                <p class="loading-placeholder">Preparing example...</p>
            </div>
        </div>
    `;
    
    card.innerHTML = content;
    return card;
}

// Update generateActivity function
async function generateActivity() {
    const promptInput = document.getElementById('prompt-input');
    const prompt = promptInput.value.trim();
    
    if (!prompt) {
        alert('Please enter a description for your CLIL activity');
        return;
    }
    
    // Get and store selected modifiers
    currentModifiers = Array.from(document.querySelectorAll('.modifier-checkbox input:checked'))
        .map(checkbox => checkbox.value);
    
    // Get custom theme text
    const customThemeInput = document.getElementById('custom-theme-input');
    const customThemeText = customThemeInput ? customThemeInput.value.trim() : null;
    
    // Show loading state
    document.getElementById('generate-btn').disabled = true;
    document.getElementById('generate-btn').textContent = 'Generating...';
    
    // Add generating effect to all empty sections
    document.querySelectorAll('.section').forEach(section => {
        const container = section.querySelector('.part-container');
        if (!container.innerHTML || container.innerHTML.includes('empty-message')) {
            section.classList.add('generating');
        }
    });

    // Create and show loading helper card immediately
    const loadingHelperCard = document.createElement('div');
    loadingHelperCard.className = 'helper-card loading';
    loadingHelperCard.innerHTML = `
        <div class="helper-card-header">
            <h3>Generating helper content...</h3>
            <span class="loading-spinner">⌛</span>
        </div>
        <div class="helper-card-content">
            <div class="helper-section">
                <div class="helper-section-title">Overview</div>
                <p class="loading-placeholder">Loading overview...</p>
                <div class="helper-tags">
                    <span class="helper-tag loading-placeholder">Loading...</span>
                    <span class="helper-tag loading-placeholder">Loading...</span>
                </div>
            </div>
            <div class="helper-section">
                <div class="helper-section-title">Teaching Aspects</div>
                <p class="loading-placeholder">Loading teaching aspects...</p>
                <div class="helper-tags">
                    <span class="helper-tag loading-placeholder">Loading...</span>
                    <span class="helper-tag loading-placeholder">Loading...</span>
                </div>
            </div>
            <div class="helper-section">
                <div class="helper-section-title">Suggested Resources</div>
                <p class="loading-placeholder">Loading resources...</p>
                <div class="helper-tags">
                    <span class="helper-tag loading-placeholder">Loading...</span>
                </div>
            </div>
        </div>
    `;

    // Add to helper column
    const helperContent = document.querySelector('.helper-content');
    helperContent.innerHTML = ''; // Clear existing content
    helperContent.appendChild(loadingHelperCard);
    
    // Trigger animation
    setTimeout(() => loadingHelperCard.classList.add('visible'), 100);
    
    try {
        // Make both API calls in parallel
        const [mainResponse, helperResponse] = await Promise.allSettled([
            // Main content generation
            fetch('/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    prompt,
                    modifiers: currentModifiers,
                    custom_theme_text: customThemeText // Add custom theme text here
                })
            }).then(r => r.json()),
            
            // Helper content generation
            fetch('/generate_helper', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt })
            }).then(r => r.json())
        ]);

        // Handle main content if it succeeded
        if (mainResponse.status === 'fulfilled' && mainResponse.value.success) {
            const data = JSON.parse(mainResponse.value.data);
            generatedSections.content = [formatContentObjectives(data.content_objectives)];
            generatedSections.language = [formatLanguageObjectives(data.language_objectives)];
            generatedSections.tasks = [formatLearningTasks(data.learning_tasks)];
            generatedSections.assessment = [formatAssessmentCriteria(data.assessment_criteria)];
            generatedSections.materials = [formatTextDeepLearning(data.text_deep_learning_input)];
            
            // Reset indices and update displays
            Object.keys(currentIndices).forEach(section => {
                currentIndices[section] = 0;
                updateSectionDisplay(section);
            });
        } else if (mainResponse.status === 'rejected' || !mainResponse.value.success) {
            console.error('Error generating main content:', mainResponse.reason || mainResponse.value.error);
        }

        // Handle helper content if it succeeded
        if (helperResponse.status === 'fulfilled' && helperResponse.value.success) {
            const helperData = JSON.parse(helperResponse.value.helper_data);
            const helperCard = createHelperCard(helperData);
            
            // Add to helper column
            const helperContent = document.querySelector('.helper-content');
            helperContent.innerHTML = ''; // Clear existing content
            helperContent.appendChild(helperCard);
            
            // Trigger animation
            setTimeout(() => helperCard.classList.add('visible'), 100);
        } else if (helperResponse.status === 'rejected' || !helperResponse.value.success) {
            console.error('Error generating helper content:', helperResponse.reason || helperResponse.value.error);
        }

    } catch (error) {
        console.error('Error in generation:', error);
        alert('Error generating activity: ' + error.message);
    } finally {
        // Reset button state and remove generating effects
        document.getElementById('generate-btn').disabled = false;
        document.getElementById('generate-btn').textContent = 'Generate Activity';
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('generating');
        });
    }
}

// Regenerate specific section
async function regenerateSection(sectionNumber) {
    const promptInput = document.getElementById('prompt-input');
    const prompt = promptInput.value.trim();
    
    if (!prompt) {
        alert('Please enter a description for your CLIL activity');
        return;
    }
    
    const sectionMap = {
        '1': 'content',
        '2': 'language',
        '3': 'tasks',
        '4': 'assessment',
        '5': 'materials'
    };
    
    const sectionKey = sectionMap[sectionNumber];
    const btn = document.querySelector(`[data-section="${sectionNumber}"]`);
    
    // Show loading state
    btn.disabled = true;
    btn.textContent = '⌛';
    
    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                prompt,
                section: sectionNumber,
                modifiers: currentModifiers
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            const data = JSON.parse(result.data);
            let formattedContent;
            
            // Format based on section type
            switch(sectionNumber) {
                case '1':
                    formattedContent = formatContentObjectives(data.content_objectives);
                    break;
                case '2':
                    formattedContent = formatLanguageObjectives(data.language_objectives);
                    break;
                case '3':
                    formattedContent = formatLearningTasks(data.learning_tasks);
                    break;
                case '4':
                    formattedContent = formatAssessmentCriteria(data.assessment_criteria);
                    break;
                case '5':
                    formattedContent = formatTextDeepLearning(data.text_deep_learning_input);
                    break;
            }
            
            // Add new version to the section's array
            generatedSections[sectionKey].push(formattedContent);
            currentIndices[sectionKey] = generatedSections[sectionKey].length - 1;
            updateSectionDisplay(sectionKey);
        } else {
            throw new Error(result.error || 'Failed to regenerate section');
        }
    } catch (error) {
        alert('Error regenerating section: ' + error.message);
    } finally {
        // Reset button state
        btn.disabled = false;
        btn.textContent = '🔄';
    }
}

// Change displayed version of a section
function changePart(section, direction) {
    const versions = generatedSections[section];
    if (!versions || versions.length === 0) return;
    
    currentIndices[section] = (currentIndices[section] + direction + versions.length) % versions.length;
    updateSectionDisplay(section);
}

// Update the display of a section
function updateSectionDisplay(section) {
    const container = document.getElementById(`${section}-container`);
    const versions = generatedSections[section];
    const navButtons = container.parentElement.querySelector('.nav-buttons');
    const quickCustomizeContainer = container.parentElement.querySelector('.section-quick-customizations');
    const versionCounterElement = navButtons.querySelector('.version-counter'); // Get the counter span
    
    if (!versions || versions.length === 0) {
        container.innerHTML = '<p class="empty-message">Generate an activity to see content</p>';
        navButtons.classList.remove('has-multiple');
        quickCustomizeContainer.classList.remove('visible');
        // Remove version counter tooltip if no versions
        const existingCounterIcon = versionCounterElement.nextElementSibling;
        if (existingCounterIcon && existingCounterIcon.classList.contains('info-tooltip-trigger')) {
            existingCounterIcon.remove();
        }
        if (versionCounterElement) versionCounterElement.textContent = '0/0'; // Show 0/0 if no content
        return;
    }
    
    const currentContent = versions[currentIndices[section]];
    
    // Check if content already has section-content wrapper
    if (currentContent && typeof currentContent === 'string') {
        if (currentContent.includes('section-content')) {
            container.innerHTML = currentContent;
        } else {
            container.innerHTML = `<div class="section-content">${currentContent}</div>`;
        }
    } else {
        container.innerHTML = '<p class="empty-message">Content could not be loaded</p>';
        console.error('Invalid content for section:', section, currentContent);
    }
    
    // Update navigation buttons
    if (!navButtons.querySelector('.create-card-btn')) {
        const createCardBtn = document.createElement('button');
        createCardBtn.className = 'create-card-btn';
        createCardBtn.title = 'Create card from this content';
        createCardBtn.addEventListener('click', () => createCardFromContent(section));
        navButtons.appendChild(createCardBtn); // Add to the end instead of before counter
    }
    
    // Show quick customization buttons and populate them
    quickCustomizeContainer.classList.add('visible');
    quickCustomizeContainer.innerHTML = ''; // Clear existing buttons
    
    const sectionNumber = quickCustomizeContainer.dataset.section;
    QUICK_CUSTOMIZATIONS[sectionNumber].forEach(customization => {
        const btn = document.createElement('button');
        btn.className = 'quick-customize-btn';
        btn.textContent = customization.text;
        btn.addEventListener('click', () => {
            applyCustomization(customization.prompt, sectionNumber);
        });
        quickCustomizeContainer.appendChild(btn);
    });
    
    // If container is regenerating, add the effect to the new content
    if (container.classList.contains('regenerating')) {
        const content = container.querySelector('.section-content');
        if (content) {
            content.classList.add('regenerating');
        }
    }
    
    // Update navigation buttons and counter text
    const prevBtn = navButtons.querySelector('.prev-btn');
    const nextBtn = navButtons.querySelector('.next-btn');
    versionCounterElement.textContent = `${currentIndices[section] + 1}/${versions.length}`;
    
    // Manage version counter tooltip
    const counterTooltipId = `version-counter-tooltip-wrapper-${section}`; // Unique ID for the wrapper
    let iconWrapper = navButtons.querySelector(`#${counterTooltipId}`);
    
    if (versions.length > 1) {
        navButtons.classList.add('has-multiple');
        prevBtn.disabled = false;
        nextBtn.disabled = false;
        if (!iconWrapper) {
            iconWrapper = document.createElement('span'); 
            iconWrapper.id = counterTooltipId;
            iconWrapper.style.display = 'inline-flex'; // To align with other nav items
            iconWrapper.style.alignItems = 'center';
            versionCounterElement.after(iconWrapper); // Insert wrapper after counter
            
            const tooltipText = "Use the arrows to navigate through different generated or customized versions for this section.";
            createTooltip(iconWrapper, tooltipText, 'top'); 
            // The createTooltip function itself appends the .info-tooltip-trigger inside this iconWrapper
        }
    } else {
        navButtons.classList.remove('has-multiple');
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        if (iconWrapper) {
            iconWrapper.remove(); // Remove the wrapper, which also removes the icon inside
        }
    }
}

// Show loading state for a section
function showSectionLoading(section) {
    const loadingIndicator = document.getElementById(`loading-${section}`);
    const adjustingIndicator = document.getElementById(`adjusting-${section}`);
    if (loadingIndicator) {
        loadingIndicator.classList.add('active');
    }
    if (adjustingIndicator) {
        adjustingIndicator.classList.add('active');
    }
    
    // Add regenerating effect to content
    const sectionMap = {
        '1': 'content',
        '2': 'language',
        '3': 'tasks',
        '4': 'assessment',
        '5': 'materials'
    };
    const sectionKey = sectionMap[section];
    const container = document.getElementById(`${sectionKey}-container`);
    const content = container.querySelector('.section-content');
    
    container.classList.add('regenerating');
    if (content) {
        content.classList.add('regenerating');
    }
}

// Hide loading state for a section
function hideSectionLoading(section) {
    const loadingIndicator = document.getElementById(`loading-${section}`);
    const adjustingIndicator = document.getElementById(`adjusting-${section}`);
    if (loadingIndicator) {
        loadingIndicator.classList.remove('active');
    }
    if (adjustingIndicator) {
        adjustingIndicator.classList.remove('active');
    }
    
    // Remove regenerating effect from content
    const sectionMap = {
        '1': 'content',
        '2': 'language',
        '3': 'tasks',
        '4': 'assessment',
        '5': 'materials'
    };
    const sectionKey = sectionMap[section];
    const container = document.getElementById(`${sectionKey}-container`);
    const content = container.querySelector('.section-content');
    
    container.classList.remove('regenerating');
    if (content) {
        content.classList.remove('regenerating');
    }
}

// Add CSS styles for formatted content
const formattingStyles = `
    .formatted-content {
        font-size: 0.95rem;
        line-height: 1.5;
        padding: 0.5rem;
    }
    
    .formatted-content h4 {
        color: #333;
        margin: 1.5rem 0 1rem;
        font-size: 1.1rem;
        font-weight: 600;
        border-bottom: 1px solid #eee;
        padding-bottom: 0.5rem;
    }
    
    .formatted-content h4:first-child {
        margin-top: 0;
    }
    
    .formatted-content h5 {
        color: #444;
        margin: 1rem 0 0.5rem;
        font-size: 1rem;
        font-weight: 600;
    }
    
    .formatted-content p {
        margin: 0.75rem 0;
        color: #333;
    }
    
    .formatted-content ul, 
    .formatted-content ol {
        margin: 0.75rem 0;
        padding-left: 1.5rem;
    }
    
    .formatted-content li {
        margin: 0.5rem 0;
        color: #333;
    }
    
    .formatted-content hr {
        margin: 1.5rem 0;
        border: none;
        border-top: 1px solid #eee;
    }
    
    .formatted-content .labeled-content {
        margin: 0.75rem 0;
        line-height: 1.6;
    }
    
    .formatted-content .labeled-content strong {
        color: #1976d2;
        margin-right: 0.5rem;
        font-weight: 600;
    }
    
    .formatted-content strong {
        color: #333;
        font-weight: 600;
    }
    
    .formatted-content em {
        font-style: italic;
        color: #555;
    }
    
    .formatted-content .duration {
        color: #666;
        font-size: 0.9rem;
        margin-left: 0.3rem;
        font-weight: normal;
    }
    
    .formatted-content > *:first-child {
        margin-top: 0;
    }
    
    .formatted-content > *:last-child {
        margin-bottom: 0;
    }
    
    .formatted-content .content-divider {
        border: none;
        height: 1px;
        background: #e0e0e0;
        margin: 1.5rem 0;
        width: 100%;
    }
    
    .modal-btn.save {
        background: #4CAF50;
        color: white;
        border: none;
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
        margin-right: 8px;
        transition: all 0.2s ease;
    }
    
    .modal-btn.save:hover {
        background: #45a049;
        transform: translateY(-1px);
    }
    
    .modal-btn.save:active {
        transform: translateY(0);
    }
`;

// Update the style element
const style = document.createElement('style');
style.textContent = formattingStyles;
document.head.appendChild(style);

// Function to create and show modal for content editing
function createCardFromContent(section) {
    // Get the section content
    const content = document.getElementById(`${section}-container`).innerHTML;
    
    // Get the title based on section
    const sectionTitles = {
        'content': 'Content Objectives',
        'language': 'Language Objectives',
        'tasks': 'Learning Tasks',
        'assessment': 'Assessment Criteria',
        'materials': 'Text Deep Learning'
    };
    const title = `Pillar Copy: ${sectionTitles[section] || section}`;
    
    // Use the new dedicated function to create the card
    const card = createPillarCopyCard({ title: title, content: content });
    
    // Add the card to the helper column
    const helperContent = document.querySelector('.helper-content');
    helperContent.insertBefore(card, helperContent.firstChild);
    
    // Trigger animation
    setTimeout(() => card.classList.add('visible'), 100);
}

// Function to create a card from a pillar copy
function createPillarCopyCard(data) {
    const card = document.createElement('div');
    card.className = 'helper-card copied-pillar';
    card.dataset.cardId = `card-${Date.now()}`;

    // Store the recipe for this card
    card._cardData = {
        type: 'pillar_copy',
        recipe: data
    };
    
    const cardHTML = `
        <div class="helper-card-header">
            <h3>${data.title}</h3>
            <span class="toggle-icon">▾</span>
            <div class="card-controls">
                <button class="card-btn view" title="View full screen">👁️</button>
                <button class="card-btn close" title="Remove card">✕</button>
            </div>
        </div>
        <div class="helper-card-content">
            <div class="helper-section">
                ${data.content}
            </div>
        </div>
    `;
    card.innerHTML = cardHTML;

    const header = card.querySelector('.helper-card-header');
    const contentDiv = card.querySelector('.helper-card-content');
    header.addEventListener('click', (e) => {
        if (!e.target.closest('.card-btn')) {
            header.classList.toggle('collapsed');
            contentDiv.classList.toggle('collapsed');
        }
    });

    card.querySelector('.card-btn.view').addEventListener('click', (e) => {
        e.stopPropagation();
        openModal(contentDiv.innerHTML, data.title);
        // Note: The modal's own save logic will handle updates.
    });

    card.querySelector('.card-btn.close').addEventListener('click', (e) => {
        e.stopPropagation();
        card.remove();
    });

    card.querySelectorAll('.helper-tag').forEach(tag => {
        tag.addEventListener('click', handleTagClick);
    });

    return card;
}

// Add styles for tag animations
const tagStylesContent = `
    .helper-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }
    
    .helper-tag {
        font-size: 0.8rem;
        padding: 0.3rem 0.8rem;
        background: var(--bg-secondary, #f5f5f5);
        border-radius: 999px;
        color: var(--text-secondary, #666);
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
    }
    
    .modal-content[contenteditable="true"] .helper-tag:hover::after {
        content: '+ expand';
        position: absolute;
        top: -20px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 0.7rem;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        opacity: 0.8;
    }
    
    .helper-tag:hover {
        background: var(--accent-light, #e3f2fd);
        color: var(--text-primary, #333);
        transform: translateY(-1px);
    }
`;

// Add the new styles
document.head.insertAdjacentHTML('beforeend', `<style>${tagStylesContent}</style>`);

// Add handleMicButtonClick function
function handleMicButtonClick(button, targetInput) {
    if (!recognition) {
        console.warn('Speech recognition not available');
        return;
    }

    if (!isRecording) {
        try {
            // Focus the input before starting recognition
            targetInput.focus();
            // Clear previous transcript
            finalTranscript = '';
            recognition.start();
            button.classList.add('recording');
        } catch (e) {
            console.error('Error starting recognition:', e);
            alert('Error starting speech recognition. Please try again.');
        }
    } else {
        try {
            recognition.stop();
            button.classList.remove('recording');
        } catch (e) {
            console.error('Error stopping recognition:', e);
        }
    }
}

// Add selection handling to modal content
function initializeModalSelectionHandling(modal) {
    const modalContent = modal.querySelector('.modal-content');
    
    // Add selection popup HTML
    const selectionPopupHTML = `
        <div class="selection-popup">
            <button class="add-tags-btn">Generate Tags</button>
        </div>
    `;
    modal.insertAdjacentHTML('beforeend', selectionPopupHTML);
    
    // Handle text selection
    modalContent.addEventListener('mouseup', () => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        const selectionPopup = modal.querySelector('.selection-popup');
        
        if (selectedText && modalContent.isContentEditable) {
            // Get selection position
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const modalRect = modal.getBoundingClientRect();
            
            // Position popup above selection
            let top = rect.top - modalRect.top - 40;
            let left = rect.left - modalRect.left + (rect.width / 2);
            
            // Ensure popup stays within modal bounds
            if (top < 10) top = rect.bottom - modalRect.top + 10;
            if (left < 10) left = 10;
            if (left > modalRect.width - 100) left = modalRect.width - 100;
            
            selectionPopup.style.top = `${top}px`;
            selectionPopup.style.left = `${left}px`;
            selectionPopup.classList.add('active');
            selectionPopup.dataset.selectedText = selectedText;
        } else {
            selectionPopup.classList.remove('active');
        }
    });
    
    // Handle tag generation from selection
    modal.querySelector('.selection-popup .add-tags-btn').addEventListener('click', async () => {
        const selectionPopup = modal.querySelector('.selection-popup');
        const selectedText = selectionPopup.dataset.selectedText;
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        
        try {
            // Generate tags from selected text
            const response = await fetch('/generate_related_tags', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tag: selectedText,
                    context: {
                        content: selectedText,
                        existingTags: Array.from(modalContent.querySelectorAll('.helper-tag'))
                            .map(t => t.textContent)
                    }
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                const tagsData = typeof result.tags === 'string' ? JSON.parse(result.tags) : result.tags;
                
                // Create tags container if it doesn't exist
                let tagsContainer = range.endContainer.parentElement.nextElementSibling;
                if (!tagsContainer || !tagsContainer.classList.contains('helper-tags')) {
                    tagsContainer = document.createElement('div');
                    tagsContainer.className = 'helper-tags';
                    range.endContainer.parentElement.after(tagsContainer);
                }
                
                // Add new tags
                tagsData.related_tags.forEach((tag, index) => {
                    const tagElement = document.createElement('span');
                    tagElement.className = 'helper-tag';
                    tagElement.textContent = tag;
                    tagElement.dataset.tag = tag;
                    tagElement.style.opacity = '0';
                    tagElement.style.transform = 'translateY(10px)';
                    
                    tagsContainer.appendChild(tagElement);
                    
                    // Animate tag appearance
                    setTimeout(() => {
                        tagElement.style.transition = 'all 0.3s ease';
                        tagElement.style.opacity = '1';
                        tagElement.style.transform = 'translateY(0)';
                    }, index * 100);
                });
            }
        } catch (error) {
            console.error('Error generating tags:', error);
        }
        
        // Hide popup
        selectionPopup.classList.remove('active');
    });
    
    // Hide popup when clicking outside
    document.addEventListener('mousedown', (e) => {
        const selectionPopup = modal.querySelector('.selection-popup');
        if (!selectionPopup.contains(e.target)) {
            selectionPopup.classList.remove('active');
        }
    });
}

// Add styles for selection popup
const selectionPopupStyles = `
    .selection-popup {
        position: absolute;
        display: none;
        background: rgba(0,0,0,0.8);
        border-radius: 3px;
        padding: 2px 6px;
        z-index: 1000;
        transform: translateX(-50%);
        color: white;
        font-size: 0.7rem;
        opacity: 0.8;
    }
    
    .selection-popup.active {
        display: block;
        animation: popup-appear 0.2s ease forwards;
    }
    
    .selection-popup .add-tags-btn {
        background: transparent;
        color: white;
        border: none;
        padding: 0;
        cursor: pointer;
        font-size: 0.7rem;
        transition: all 0.2s ease;
    }
    
    .selection-popup .add-tags-btn:hover {
        opacity: 1;
    }
    
    @keyframes popup-appear {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(5px);
        }
        to {
            opacity: 0.8;
            transform: translateX(-50%) translateY(0);
        }
    }
`;

// Add the selection popup styles
document.head.insertAdjacentHTML('beforeend', `<style>${selectionPopupStyles}</style>`);

// Initialize selection handling when opening modal
function openModal(content, title) {
    const modal = document.querySelector('.content-modal');
    modal.classList.add('active');
    modal.querySelector('.modal-header h2').textContent = title;
    modal.querySelector('.modal-content').innerHTML = content;
    
    // Initialize selection handling
    initializeModalSelectionHandling(modal);
}

// Add print functionality
function printContent() {
    const modal = document.querySelector('.content-modal');
    const modalContent = modal.querySelector('.modal-content').innerHTML;
    const title = modal.querySelector('.modal-header h2').textContent;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>${title}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    line-height: 1.6;
                }
                .helper-tag {
                    display: inline-block;
                    padding: 2px 8px;
                    background: #f5f5f5;
                    border-radius: 12px;
                    margin: 2px;
                    font-size: 0.9em;
                }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            ${modalContent}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

// Add copy functionality
function copyContent() {
    const modal = document.querySelector('.content-modal');
    const modalContent = modal.querySelector('.modal-content');
    
    // Create a temporary textarea to handle the copy
    const textarea = document.createElement('textarea');
    textarea.value = modalContent.innerText;
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        // Execute copy command
        document.execCommand('copy');
        // Show success feedback
        const copyBtn = modal.querySelector('.modal-btn.copy');
        const originalTitle = copyBtn.title;
        copyBtn.title = 'Copied!';
        copyBtn.textContent = '✓';
        setTimeout(() => {
            copyBtn.title = originalTitle;
            copyBtn.textContent = '📋';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
        alert('Failed to copy content');
    } finally {
        document.body.removeChild(textarea);
    }
}

// Chatbot functionality
function addChatMessage(message, isUser = false) {
    const messagesContainer = document.getElementById('chatbot-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isUser ? 'user' : ''}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar';
    avatar.textContent = isUser ? '👤' : '🤖';
    
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    // Use formatContent instead of textContent to properly format the message
    // This will convert markdown to HTML and handle lists, tables, etc.
    bubble.innerHTML = isUser ? message : formatContent(message);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(bubble);
    messagesContainer.appendChild(messageDiv);
    
    // Add message to conversation history
    conversationHistory.push({
        role: isUser ? "user" : "assistant",
        content: message
    });
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function handleChatSubmit() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Get context using the updated getContext function
    const context = getContext();
    
    // Add user message
    addChatMessage(message, true);
    input.value = '';
    
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                message,
                context: context,
                history: conversationHistory.slice(0, -1)
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            addChatMessage(data.message);
        } else {
            addChatMessage('Sorry, I encountered an error. Please try again.');
            conversationHistory.pop();
        }
    } catch (error) {
        console.error('Chat error:', error);
        addChatMessage('Sorry, I encountered an error. Please try again.');
        conversationHistory.pop();
    }
}

// Initialize chat functionality
document.addEventListener('DOMContentLoaded', function() {
    const sendButton = document.getElementById('send-chat');
    const chatInput = document.getElementById('chat-input');
    const chatMicButton = document.getElementById('chat-mic-button');
    const useResponseButton = document.getElementById('use-response');
    
    // Initialize speech recognition for chat
    if ('webkitSpeechRecognition' in window) {
        const chatRecognition = new webkitSpeechRecognition();
        chatRecognition.continuous = false;
        chatRecognition.interimResults = false;
        
        chatRecognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            chatInput.value = transcript;
            chatMicButton.classList.remove('recording');
        };
        
        chatRecognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            chatMicButton.classList.remove('recording');
        };
        
        chatRecognition.onend = function() {
            chatMicButton.classList.remove('recording');
        };
        
        // Add click handler for mic button
        chatMicButton.addEventListener('click', function() {
            // Focus the input first
            chatInput.focus();
            
            if (chatMicButton.classList.contains('recording')) {
                chatRecognition.stop();
                chatMicButton.classList.remove('recording');
            } else {
                chatRecognition.start();
                chatMicButton.classList.add('recording');
            }
        });
    } else {
        chatMicButton.style.display = 'none';
    }
    
    sendButton.addEventListener('click', handleChatSubmit);
    
    // Add event listener for the use response button
    useResponseButton.addEventListener('click', function() {
        // Get the most recent chatbot response
        const chatMessages = document.querySelectorAll('.chat-message:not(.user)');
        if (chatMessages.length === 0) {
            alert('No chatbot responses available to use');
            return;
        }
        
        // Get the most recent chatbot message
        const latestChatbotMessage = chatMessages[chatMessages.length - 1];
        const messageBubble = latestChatbotMessage.querySelector('.chat-bubble');
        
        // Get the raw text from the conversation history instead of the HTML
        let messageText = '';
        if (conversationHistory.length > 0) {
            // Find the last assistant message
            for (let i = conversationHistory.length - 1; i >= 0; i--) {
                if (conversationHistory[i].role === 'assistant') {
                    messageText = conversationHistory[i].content;
                    break;
                }
            }
        }
        
        // If we couldn't get it from history, fall back to text content
        if (!messageText) {
            messageText = messageBubble.textContent;
        }
        
        // Set the generator input value
        const promptInput = document.getElementById('prompt-input');
        promptInput.value = messageText;
        
        // Scroll to the generator input and focus it
        promptInput.scrollIntoView({ behavior: 'smooth' });
        promptInput.focus();
        
        // Visual feedback for the button
        useResponseButton.classList.add('clicked');
        setTimeout(() => {
            useResponseButton.classList.remove('clicked');
        }, 300);
    });
    
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleChatSubmit();
        }
    });
    
    // Add welcome message
    addChatMessage('Hello! I\'m your CLIL teaching assistant. How can I help you today?');
});

function getContext() {
    const contentLanguageBalance = document.getElementById('content-language-balance').value;
    return {
        class_context: {
            students_count: document.getElementById('students-count').value,
            grade_level: document.getElementById('grade-level').value,
            language_skills: document.getElementById('language-skills').value
        },
        teaching_parameters: {
            vocab_density: document.getElementById('vocab-density').value,
            grammar_complexity: document.getElementById('grammar-complexity').value,
            content_language_balance: contentLanguageBalance
        },
        // Add a more explicit content vs language focus parameter
        content_vs_language_focus: {
            content_percentage: contentLanguageBalance,
            language_percentage: 100 - parseInt(contentLanguageBalance),
            description: `${contentLanguageBalance}% Content / ${100 - parseInt(contentLanguageBalance)}% Language Focus`
        },
        activity_types: Array.from(document.querySelectorAll('.activity-type-checkbox:checked'))
            .map(cb => cb.value)
            .filter(value => value !== 'all')
    };
}

// Activity types handling
document.addEventListener('DOMContentLoaded', function() {
    const activityTypesSearch = document.getElementById('activity-types-search');
    const activityTypeOptions = document.querySelectorAll('.activity-type-option');
    const allCheckbox = document.querySelector('.activity-type-checkbox[value="all"]');

    // Search functionality
    activityTypesSearch.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        
        activityTypeOptions.forEach(option => {
            if (option.querySelector('input').value === 'all') return;
            
            const text = option.querySelector('span').textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                option.style.display = '';
            } else {
                option.style.display = 'none';
            }
        });
    });

    // Handle "All" checkbox
    allCheckbox.addEventListener('change', function(e) {
        const isChecked = e.target.checked;
        activityTypeOptions.forEach(option => {
            const checkbox = option.querySelector('input');
            if (checkbox.value !== 'all') {
                checkbox.checked = isChecked;
            }
        });
    });

    // Handle individual checkboxes
    activityTypeOptions.forEach(option => {
        const checkbox = option.querySelector('input');
        if (checkbox.value !== 'all') {
            checkbox.addEventListener('change', function() {
                updateAllCheckbox();
            });
        }
    });
});

function updateAllCheckbox() {
    const allCheckbox = document.querySelector('.activity-type-checkbox[value="all"]');
    const otherCheckboxes = Array.from(document.querySelectorAll('.activity-type-checkbox:not([value="all"])'));
    const allChecked = otherCheckboxes.every(cb => cb.checked);
    const noneChecked = otherCheckboxes.every(cb => !cb.checked);
    
    allCheckbox.checked = allChecked;
    allCheckbox.indeterminate = !allChecked && !noneChecked;
}

// Chat settings panel functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize sliders
    const sliders = {
        'vocab-density': (value) => `${value}%`,
        'grammar-complexity': (value) => `${value}/5`,
        'content-language-balance': (value) => `${value}% Content`
    };

    Object.keys(sliders).forEach(id => {
        const slider = document.getElementById(id);
        if (slider) {
            const valueDisplay = slider.nextElementSibling;
            slider.addEventListener('input', function() {
                valueDisplay.textContent = sliders[id](this.value);
            });
        }
    });

    const settingsBtn = document.getElementById('chat-settings-btn');
    const closeSettingsBtn = document.querySelector('.close-settings-btn');
    const saveSettingsBtn = document.querySelector('.save-settings-btn');
    const contextInputs = document.querySelector('.chat-context-inputs');

    settingsBtn.addEventListener('click', function() {
        contextInputs.classList.remove('collapsed');
        // Load saved settings when opening panel
        loadSavedSettings();
    });

    closeSettingsBtn.addEventListener('click', function() {
        contextInputs.classList.add('collapsed');
    });

    saveSettingsBtn.addEventListener('click', function() {
        saveSettings();
        // Show feedback
        const originalText = saveSettingsBtn.textContent;
        saveSettingsBtn.textContent = '✓';
        setTimeout(() => {
            saveSettingsBtn.textContent = originalText;
        }, 1500);
    });

    function saveSettings() {
        // Save text input values
        const settingsInputs = document.querySelectorAll('.context-input');
        settingsInputs.forEach(input => {
            localStorage.setItem(input.id, input.value);
        });

        // Save slider values
        Object.keys(sliders).forEach(id => {
            const slider = document.getElementById(id);
            if (slider) {
                localStorage.setItem(id, slider.value);
            }
        });

        // Save activity type selections
        const selectedTypes = Array.from(document.querySelectorAll('.activity-type-checkbox:checked'))
            .map(cb => cb.value)
            .filter(value => value !== 'all');
        localStorage.setItem('selected_activity_types', JSON.stringify(selectedTypes));
    }

    function loadSavedSettings() {
        // Load text input values
        const settingsInputs = document.querySelectorAll('.context-input');
        settingsInputs.forEach(input => {
            const savedValue = localStorage.getItem(input.id);
            if (savedValue) {
                input.value = savedValue;
            }
        });

        // Load slider values
        Object.keys(sliders).forEach(id => {
            const slider = document.getElementById(id);
            if (slider) {
                const savedValue = localStorage.getItem(id);
                if (savedValue) {
                    slider.value = savedValue;
                    slider.nextElementSibling.textContent = sliders[id](savedValue);
                }
            }
        });

        // Load activity type selections
        const savedTypes = JSON.parse(localStorage.getItem('selected_activity_types') || '[]');
        document.querySelectorAll('.activity-type-checkbox').forEach(checkbox => {
            if (checkbox.value !== 'all') {
                checkbox.checked = savedTypes.includes(checkbox.value);
            }
        });
        updateAllCheckbox();
    }

    // Load settings on page load
    loadSavedSettings();
});

function formatTextDeepLearning(content) {
    if (!content) return '';
    
    let html = `
        <div class="text-deep-learning-section">
            <div class="learning-section">
                <h4>Key Information About the Subject (Pareto Principle 80/20)</h4>
                <ul class="question-list">
                    ${content.pareto_printable.points.map((item, index) => `
                        <li><strong>${index + 1}. ${item.point}</strong>
                        
                        ${item.explanation}</li>
                    `).join('')}
                </ul>
            </div>
            
            <div class="learning-section">
                <h4>Socratic Questions</h4>
                <p><strong>Question Types:</strong> ${content.socratic_questions.question_types.join(', ')}</p>
                <ul class="question-list">
                    ${content.socratic_questions.example_questions.map(q => `
                        <li>${q}</li>
                    `).join('')}
                </ul>
            </div>
            
            <div class="learning-section">
                <h4>Extended Writing Exercises</h4>
                <p><strong>Writing Types:</strong> ${content.extended_writing_exercises.writing_types.join(', ')}</p>
                ${content.extended_writing_exercises.example_tasks.map(task => `
                    <div class="writing-item">
                        <h5>${task.task}</h5>
                        <p>${task.description}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    return html;
}

// Add collapsible section functionality
function initCollapsibleSections() {
    const sections = document.querySelectorAll('.collapsible-section');
    
    sections.forEach(section => {
        const header = section.querySelector('.section-header, .chatbot-header, .input-header');
        
        if (header) {
            header.addEventListener('click', (e) => {
                // Don't collapse if clicking on the settings button or any button in the header
                if (e.target.closest('.chat-settings-btn') || e.target.closest('button')) {
                    return;
                }
                
                section.classList.toggle('collapsed');
                section.classList.toggle('expanded');
            });
        }
    });
    
    // Add specific event handler for the settings button to prevent event bubbling
    const settingsBtn = document.getElementById('chat-settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Stop the event from bubbling up to the header
        });
    }
}

// Initialize collapsible sections when document is ready
document.addEventListener('DOMContentLoaded', () => {
    initCollapsibleSections();
    initializeTooltips(); // Initialize tooltips
    
    // Check if we are loading an existing lesson
    if (lessonId) {
        waitForAuth(() => {
            window.auth.onAuthStateChanged(user => {
                console.log("Auth state changed. User: ", user);
                if (user) {
                    loadLesson(lessonId);
                } else {
                    console.log("User not logged in, redirecting to login to load lesson.");
                    window.location.href = '/login';
                }
            });
        });
    }
});

// ... rest of existing code ...

// Add this global variable before the createTooltip function
let activeTooltipContent = null;

// Function to create tooltips
function createTooltip(targetElement, tooltipText, position = 'top', isWide = false) {
    // Check if element already has a tooltip trigger
    if (targetElement.querySelector('.info-tooltip-trigger')) {
        return null; 
    }
    
    const triggerElement = document.createElement('span');
    triggerElement.className = 'info-tooltip-trigger';
    // Use SVG for the icon
    triggerElement.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="16px" height="16px"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1-8h-2V7h2v2z"></path></svg>';
    
    // Minimal inline styles for the trigger, rest should be in CSS
    triggerElement.style.display = 'inline-flex';
    triggerElement.style.verticalAlign = 'middle';
    triggerElement.style.marginLeft = '6px'; // Maintain spacing
    triggerElement.style.cursor = 'help';

    targetElement.appendChild(triggerElement);

    let tooltipContentElement = null; 
    let hideTimeout;

    const showTooltip = () => {
        clearTimeout(hideTimeout); // Clear any pending hide operations

        if (activeTooltipContent && activeTooltipContent.parentNode) {
            activeTooltipContent.parentNode.removeChild(activeTooltipContent);
        }
        activeTooltipContent = null;

        tooltipContentElement = document.createElement('span');
        tooltipContentElement.className = 'tooltip-content'; 
        if (isWide) {
            tooltipContentElement.classList.add('wide-tooltip');
        }
        tooltipContentElement.innerHTML = tooltipText;
        document.body.appendChild(tooltipContentElement);
        activeTooltipContent = tooltipContentElement;

        void tooltipContentElement.offsetWidth; 

        const triggerRect = triggerElement.getBoundingClientRect();
        const contentRect = tooltipContentElement.getBoundingClientRect();
        
        let top, left; // These will be document-absolute
        let arrowTopOffsetVariable = '50%'; // Default

        tooltipContentElement.classList.remove('orient-top', 'orient-bottom', 'orient-left', 'orient-right');

        switch (position) {
            case 'bottom':
                top = triggerRect.bottom + window.scrollY + 8;
                left = triggerRect.left + window.scrollX + (triggerRect.width / 2) - (contentRect.width / 2);
                tooltipContentElement.classList.add('orient-bottom');
                break;
            case 'left':
                top = triggerRect.top + window.scrollY + (triggerRect.height / 2) - (contentRect.height / 2);
                left = triggerRect.left + window.scrollX - contentRect.width - 8;
                tooltipContentElement.classList.add('orient-left');
                // Arrow offset calculation will be refined after boundary checks
                break;
            case 'right':
                top = triggerRect.top + window.scrollY + (triggerRect.height / 2) - (contentRect.height / 2);
                left = triggerRect.right + window.scrollX + 8;
                tooltipContentElement.classList.add('orient-right');
                // Arrow offset calculation will be refined after boundary checks
                break;
            case 'top':
            default:
                top = triggerRect.top + window.scrollY - contentRect.height - 8;
                left = triggerRect.left + window.scrollX + (triggerRect.width / 2) - (contentRect.width / 2);
                tooltipContentElement.classList.add('orient-top');
                break;
        }

        // Convert initial document-absolute positions to viewport-relative for boundary checks
        let viewport_top = top - window.scrollY;
        let viewport_left = left - window.scrollX;
        const margin = 8; // Viewport margin

        // Adjust left boundary
        if (viewport_left < margin) {
            viewport_left = margin;
        }
        // Adjust right boundary
        if (viewport_left + contentRect.width > window.innerWidth - margin) {
            viewport_left = window.innerWidth - contentRect.width - margin;
        }

        // Adjust top boundary
        if (viewport_top < margin) {
            viewport_top = margin;
        }
        // Adjust bottom boundary
        if (viewport_top + contentRect.height > window.innerHeight - margin) {
            // If tooltip was meant to be 'bottom' and went off-screen, try to flip it to 'top'
            if (position === 'bottom' && (triggerRect.top - contentRect.height - 8 > margin)) { // triggerRect.top is viewport-relative
                viewport_top = triggerRect.top - contentRect.height - 8; // New viewport_top for 'top' position
                tooltipContentElement.classList.remove('orient-bottom'); // Update orientation class
                tooltipContentElement.classList.add('orient-top');
            } else {
                // Cannot flip or wasn't 'bottom', so try to stick to bottom of viewport
                viewport_top = window.innerHeight - contentRect.height - margin;
                // If it's still too tall (e.g., contentRect.height > window.innerHeight), stick to top
                if (viewport_top < margin) {
                    viewport_top = margin;
                }
            }
        }

        // Final document-absolute positions for styling
        tooltipContentElement.style.top = `${viewport_top + window.scrollY}px`;
        tooltipContentElement.style.left = `${viewport_left + window.scrollX}px`;
        
        // Recalculate arrowTopOffsetVariable for left/right based on final viewport_top
        // This is the offset from the tooltip's (viewport) top edge to the trigger's (viewport) center Y
        if (position === 'left' || position === 'right') {
            const trigger_viewport_center_y = triggerRect.top + triggerRect.height / 2;
            // viewport_top is the final viewport-relative top of the tooltip content box
            arrowTopOffsetVariable = `${trigger_viewport_center_y - viewport_top}px`;
        }
        // For top/bottom, arrow is horizontally centered; existing CSS handles Y alignment relative to tooltip edge.

        tooltipContentElement.style.position = 'absolute';
        tooltipContentElement.style.zIndex = '20000';
        tooltipContentElement.style.visibility = 'visible';
        tooltipContentElement.style.opacity = '1';
        triggerElement.dataset.tooltipShown = 'true'; 
        tooltipContentElement.style.setProperty('--arrow-top-offset', arrowTopOffsetVariable);

        tooltipContentElement.addEventListener('mouseenter', () => {
            clearTimeout(hideTimeout); 
        });
        tooltipContentElement.addEventListener('mouseleave', () => {
             hideTimeout = setTimeout(removeTooltipContent, 50);
        });
    };

    const removeTooltipContent = () => {
        if (tooltipContentElement && tooltipContentElement.parentNode) {
            tooltipContentElement.parentNode.removeChild(tooltipContentElement);
        }
        if (activeTooltipContent === tooltipContentElement) {
            activeTooltipContent = null;
        }
        tooltipContentElement = null; // Ensure it's cleared
    };
    
    triggerElement.addEventListener('mouseenter', showTooltip);

    triggerElement.addEventListener('mouseleave', () => {
        // Delay hiding to allow mouse to move from trigger to content
        hideTimeout = setTimeout(() => {
            // Check if the mouse is now over the tooltip content itself
            if (activeTooltipContent && activeTooltipContent.matches(':hover')) {
                return; // Don't hide if mouse is over the content
            }
            removeTooltipContent();
        }, 100); 
    });
    
    return triggerElement;
}

// Add tooltips to section headers
function initializeTooltips() {
    // Tooltip for the CLIL Teaching Assistant chatbot card header
    const chatSettingsBtn = document.getElementById('chat-settings-btn');
    if (chatSettingsBtn && chatSettingsBtn.parentElement) {
        const tooltipText = "Consider this chatbot more of a request refiner than a chatbot. You don\'t actually need this but it\'s sometimes helpful to gather some information beforehand. You can do it by talking to the chatbot, it will ask you some guiding questions, you can also click settings ⚙️ and set some data manually like amount of students or favorite types of activities etc, the final advice Will consider all this context and be sent to the generator for refinement so don\'t stress about the settings." +
                            "<br><br><strong>The AI is looking for these parameters:</strong>" +
                            "<ul>" +
                            "<li><strong>ESSENTIAL INFO:</strong><ul><li>Student count</li><li>Grade/age level</li><li>Language proficiency</li><li>Lesson duration</li><li>Main topic/subject</li></ul></li>" +
                            "<li><strong>HELPFUL INFO:</strong><ul><li>Available technology</li><li>Classroom setup</li><li>Learning preferences</li><li>Cultural background</li><li>Previous knowledge</li></ul></li>" +
                            "</ul>";
        createTooltip(chatSettingsBtn.parentElement, tooltipText, 'bottom');
    }

    // Tooltip for the "Generate Activity" section header
    const inputHeader = document.querySelector('.input-section .input-header');
    if (inputHeader) {
        const tooltipText = "We\'ve built the generator on top of five core elements of every CLIL lesson. It will take your activity idea, convert it into these five elements, and let you adapt each one as you see fit—whether through big overall changes or precise adjustments, depending on where you want to take it\nThe generator is currently not connected to the chatbot settings. You can paste the final chatbot idea here, or simply type something like 'a lesson about going to the mechanic.'The themes below are just examples of potential settings. Try them.";
        createTooltip(inputHeader, tooltipText, 'bottom', true); // isWide is true
    }

    // Tooltip specifically for the .prompt-modifiers div (theme explanations)
    const promptModifiersDiv = document.querySelector('.prompt-modifiers');
    if (promptModifiersDiv) {
        const tooltipText = "Selecting a theme (e.g., Superhero, Space Adventure) will influence the style, vocabulary, and example scenarios of the generated activity, tailoring it to that specific thematic focus. These themes provide a way to add a specific flavor to the educational content.";
        createTooltip(promptModifiersDiv, tooltipText, 'bottom', false);
    }

    // Tooltips for the 5 main section headers (pillars)
    const contentObjectivesHeader = document.querySelector('.content-objectives .section-header h3');
    if (contentObjectivesHeader) {
        createTooltip(contentObjectivesHeader, "This pillar defines the subject-specific knowledge and skills students will acquire. What will they learn or be able to do regarding the topic itself?", 'right');
    }

    const languageObjectivesHeader = document.querySelector('.language-objectives .section-header h3');
    if (languageObjectivesHeader) {
        createTooltip(languageObjectivesHeader, "Focuses on the language aspects: key vocabulary, grammatical structures, and communication functions students will use and practice while learning the content.", 'right');
    }

    const learningTasksHeader = document.querySelector('.learning-tasks .section-header h3');
    if (learningTasksHeader) {
        createTooltip(learningTasksHeader, "Outlines the activities and procedures students will follow. How will they engage with the content and language to achieve the objectives? Includes steps, materials, and interactions.", 'right');
    }

    const assessmentCriteriaHeader = document.querySelector('.assessment .section-header h3');
    if (assessmentCriteriaHeader) {
        createTooltip(assessmentCriteriaHeader, "Details how student progress in both content and language will be measured. What will be assessed, and what are the indicators of success?", 'right');
    }

    const materialsHeader = document.querySelector('.materials .section-header h3'); // Assuming .materials is the class for "Text Deep Learning" section
    if (materialsHeader) {
        createTooltip(materialsHeader, "Provides resources and prompts for deeper engagement with a central text or topic, often including key point summaries, critical thinking questions, and related writing tasks.", 'right');
    }
    
    // Add tooltips to sliders
    const vocabDensitySlider = document.getElementById('vocab-density');
    if (vocabDensitySlider && vocabDensitySlider.parentElement) {
        createTooltip(vocabDensitySlider.parentElement, "Controls how many technical terms appear in the activity. Higher values mean more specialized vocabulary.", 'top');
    }
    
    const grammarComplexitySlider = document.getElementById('grammar-complexity');
    if (grammarComplexitySlider && grammarComplexitySlider.parentElement) {
        createTooltip(grammarComplexitySlider.parentElement, "Sets the grammatical difficulty level. Higher values use more complex sentence structures and tenses.", 'top');
    }
    
    const contentLanguageBalanceSlider = document.getElementById('content-language-balance');
    if (contentLanguageBalanceSlider && contentLanguageBalanceSlider.parentElement) {
        createTooltip(contentLanguageBalanceSlider.parentElement, "Adjusts focus between subject content and language learning. Left emphasizes content knowledge, right emphasizes language skills.", 'top');
    }
}

// Function to save the lesson
async function saveLesson() {
    console.log("Saving lesson...");
    const saveButton = document.getElementById('save-lesson-btn');

    try {
        const user = window.auth.currentUser;
        if (!user) {
            alert("You must be logged in to save a lesson.");
            return;
        }
        const idToken = await user.getIdToken();

        // The "digital blueprint" of the lesson
        const lessonBlueprint = {
            lessonId: lessonId || null,
            title: document.getElementById('lesson-title').value || 'Untitled Lesson',
            pillars: {
                content: {
                    versions: generatedSections.content,
                    currentIndex: currentIndices.content
                },
                language: {
                    versions: generatedSections.language,
                    currentIndex: currentIndices.language
                },
                tasks: {
                    versions: generatedSections.tasks,
                    currentIndex: currentIndices.tasks
                },
                assessment: {
                    versions: generatedSections.assessment,
                    currentIndex: currentIndices.assessment
                },
                materials: {
                    versions: generatedSections.materials,
                    currentIndex: currentIndices.materials
                }
            },
            sideCards: Array.from(document.querySelectorAll('.helper-content .helper-card, .tips-overlay .insight-card'))
                .map(card => card._cardData)
                .filter(Boolean), // Filter out any cards that failed to have data
            chatHistory: conversationHistory,
            chatContext: {
                // Future: capture settings from the chatbot UI
                systemPrompt: document.getElementById('system-prompt-input')?.value || "You are a helpful assistant for lesson planning.",
                temperature: document.getElementById('temperature-slider')?.value || 0.7
            }
        };

        const response = await fetch('/save_lesson', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify(lessonBlueprint)
        });

        const result = await response.json();

        if (result.success) {
            console.log("Lesson saved successfully:", result.lessonId);
            alert("Lesson saved!");
            // If it was a new lesson, update the current lessonId and URL
            if (!lessonId && result.lessonId) {
                lessonId = result.lessonId;
                history.pushState({}, '', `/editor/${lessonId}`);
            }
        } else {
            throw new Error(result.error || "Failed to save lesson.");
        }

    } catch (error) {
        console.error('Error saving lesson:', error);
        alert('Error saving lesson: ' + error.message);
    }
}

function waitForAuth(callback) {
    if (window.auth) {
        callback();
    } else {
        console.log("Waiting for auth...");
        setTimeout(() => waitForAuth(callback), 100);
    }
}

// Function to load a lesson
async function loadLesson(id) {
    console.log("Loading lesson:", id);
    try {
        const user = window.auth.currentUser;
        if (!user) {
            // This case should be handled by onAuthStateChanged, but as a fallback
            console.error("No user logged in, cannot load lesson.");
            return;
        }
        const idToken = await user.getIdToken();

        const response = await fetch(`/load_lesson/${id}`, {
            headers: {
                'Authorization': `Bearer ${idToken}`
            }
        });

        const result = await response.json();

        if (result.success) {
            const lesson = result.lesson;
            console.log("Lesson data received:", lesson);

            // 1. Populate Title
            document.getElementById('lesson-title').value = lesson.title;

            // 2. Populate Pillars
            generatedSections.content = lesson.pillars.content.versions;
            currentIndices.content = lesson.pillars.content.currentIndex;

            generatedSections.language = lesson.pillars.language.versions;
            currentIndices.language = lesson.pillars.language.currentIndex;

            generatedSections.tasks = lesson.pillars.tasks.versions;
            currentIndices.tasks = lesson.pillars.tasks.currentIndex;

            generatedSections.assessment = lesson.pillars.assessment.versions;
            currentIndices.assessment = lesson.pillars.assessment.currentIndex;

            generatedSections.materials = lesson.pillars.materials.versions;
            currentIndices.materials = lesson.pillars.materials.currentIndex;

            Object.keys(generatedSections).forEach(sectionKey => {
                updateSectionDisplay(sectionKey);
            });

            // 3. Recreate Side Cards using their original creation functions
            const helperContent = document.querySelector('.helper-content');
            const tipsOverlay = document.querySelector('.tips-overlay');
            helperContent.innerHTML = ''; // Clear existing left-column cards
            tipsOverlay.innerHTML = ''; // Clear existing right-column cards

            if (lesson.sideCards) {
                lesson.sideCards.forEach(cardInfo => {
                    let cardElement = null;
                    if (cardInfo.type === 'helper') {
                        cardElement = createHelperCard(cardInfo.recipe);
                        if(cardElement) helperContent.appendChild(cardElement);
                    } else if (cardInfo.type === 'insight') {
                        cardElement = createInsightCard(cardInfo.recipe);
                        if(cardElement) tipsOverlay.appendChild(cardElement);
                    } else if (cardInfo.type === 'pillar_copy') {
                        cardElement = createPillarCopyCard(cardInfo.recipe);
                        if(cardElement) helperContent.appendChild(cardElement);
                    }

                    if (cardElement) {
                        // Make the card visible with an animation
                        setTimeout(() => cardElement.classList.add('visible'), 100);
                    }
                });
            }

            // 4. Populate Chat
            conversationHistory = lesson.chatHistory || [];
            const messagesContainer = document.getElementById('chatbot-messages');
            messagesContainer.innerHTML = '';
            conversationHistory.forEach(msg => addChatMessage(msg.content, msg.role === 'user'));
            
            // 5. Populate Chat Context (Bonus)
            // This part can be expanded to fully restore the settings UI
            if(lesson.chatContext) {
                 // For now, just log it
                 console.log("Restoring chat context:", lesson.chatContext);
            }


        } else {
            throw new Error(result.error || "Failed to load lesson.");
        }

    } catch (error) {
        console.error("Error loading lesson:", error);
        alert("Could not load lesson: " + error.message);
    }
}