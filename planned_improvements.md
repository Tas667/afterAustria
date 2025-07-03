# CLIL Activity Generator Improvements Plan

## 1. UI Cleanup
- Remove dark gray code box styling from socratic questions
- Keep elements clean and minimal
- Remove code-like appearance
- Make UI more teacher-friendly and less technical

## 2. Edit Mode Enhancement
- Add eye icon (👁️) functionality for all main elements in central column
- Extend edit functionality to all sections
- Ensure consistent edit experience across all components
- Use existing `createCardFromContent` function infrastructure

## 3. Learning Tasks Section Enhancement
### Visual Improvements
- Make learning tasks section expanded by default
- Collapse other sections initially
- Enhanced visual presentation
- More intuitive task organization

### Content Improvements
- Refine learning tasks prompt
- Focus on practical classroom activities
- Better structure for task presentation
- Clear duration and materials needed
- More detailed activity instructions

## 4. Inline Generation (Slash Command)
### Current Implementation
- Handled by `/generate_inline` route
- Uses `INLINE_GENERATION_PROMPT`
- Takes:
  - Current content
  - Command
  - Cursor position
- Streams response back to UI

### Context Understanding
- Document what context is available
- How it's being used
- Potential improvements

## 5. Chat Integration Enhancement
### Current State
- Uses `CHAT_SYSTEM_PROMPT`
- Includes class context
- Includes activity types

### Planned Improvements
- Better connection between chat and main generation
- More seamless integration
- Improved context sharing
- Better suggestion implementation

## 6. System Prompts Refinement
### General Improvements
- Review all system prompts
- Enhance clarity and specificity
- Focus on practical implementation
- More classroom-ready outputs

### Learning Tasks Prompt
- Special focus on learning tasks
- More practical classroom focus
- Better activity structuring
- Clear implementation guidelines

## 7. Model Configuration
- Using gpt-4o-mini model
- Ensure consistent model usage across all features
- Optimize prompt engineering for this model

## 8. Event Listener Verification
- Verify all event listeners are properly attached
- Ensure functions are being called correctly
- Double-check Flask routes for components
- Validate component loading

## 9. Tooltip System ✅
### Implementation Complete
- Added informational tooltips to provide context-sensitive help
- Implemented tooltips for section headers and slider controls
- Ensured tooltips remain visible even in collapsed sections
- Added proper z-index management for tooltip visibility
- Prevented duplicate tooltips from being created

### Documentation
- Created detailed documentation in `tooltip_implementation.md`
- Updated CHANGELOG.md with tooltip implementation details
- Added CSS and JavaScript implementation details

### Future Enhancements
- Add support for rich HTML content in tooltips
- Implement keyboard accessibility for tooltip content
- Add animation options for tooltip appearance

## Next Steps
1. Prioritize UI cleanup and edit mode enhancement
2. Focus on learning tasks improvements
3. Refine system prompts
4. Enhance chat integration
5. Verify and improve event listeners
6. Test and validate all changes

## Notes
- Keep track of all changes in version control
- Test each feature thoroughly before moving to next
- Maintain consistent UI/UX throughout
- Focus on teacher usability
- Ensure all components work together seamlessly 