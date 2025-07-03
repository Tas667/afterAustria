# Changelog

## [Unreleased]

### Added
- Settings Panel Enhancement
  - Added collapsible settings panel with gear icon
  - Implemented settings persistence using localStorage
  - Added smooth transition animations
  - Improved layout of input fields
  - Added close button for better UX

- Activity Types Selection
  - Added dropdown menu with various activity types (Station Rotation, Think-Pair-Share, Project Based, etc.)
  - Each activity type includes detailed descriptions and implementation guidelines
  - Search functionality for filtering activity types
  - Multiple selection support with "All" option
  - Scrollable container for better UX

- Chatbot Memory Enhancement
  - Implemented conversation history tracking
  - Added context-aware responses
  - Improved error handling for chat requests
  - Backend support for maintaining conversation context

- Natural Conversation Flow
  - Updated system prompt for more conversational interactions
  - Removed structured response requirements
  - Enhanced context gathering capabilities
  - Improved response formatting

- Tooltip System
  - Added informational tooltips to provide context-sensitive help
  - Implemented tooltips for section headers and slider controls
  - Ensured tooltips remain visible even in collapsed sections
  - Added proper z-index management for tooltip visibility
  - Prevented duplicate tooltips from being created
  - Added tooltips to CLIL Assistant card header, Generate Activity card header, theme modifiers section, 5 main pillar headers, version counters, helper card headers, and insight card headers.

### Modified
- Backend Updates
  - Updated `app.py` with new activity type definitions
  - Enhanced chat system prompt for better context handling
  - Improved error handling and response formatting
  - Added support for conversation history in chat endpoints

- Frontend Improvements
  - Restructured activity type selection UI
  - Enhanced chat interface with better message handling
  - Added visual feedback for user interactions
  - Improved responsive design for better usability
  - Added collapsible settings panel
  - Improved settings persistence

- Tooltip System Enhancements
  - Switched to SVG icons for tooltip triggers.
  - Implemented pulsing animation for unviewed tooltips and style change for viewed tooltips (orange to gray).
  - Tooltip content now appended to `document.body` to prevent clipping and ensure high z-index.
  - Improved dynamic positioning logic, including robust viewport boundary adjustments and refined arrow alignment using CSS custom properties (`--arrow-top-offset`).
  - Enhanced support for HTML content within tooltips.
  - Added `wide-tooltip` class for specific tooltips needing more width.
  - Resolved various positioning and styling issues, including icon placement in card headers and title truncation conflicts.

### Technical Details
- Model Configuration
  - Using gpt-4o-mini model for all API calls
  - Optimized response formats for better performance
  - Enhanced error handling and recovery

- Code Structure
  - Organized activity type definitions
  - Improved system prompts organization
  - Enhanced JSON response handling
  - Better type checking and validation
  - Added localStorage integration for settings

### UI/UX Improvements
- Settings Panel
  - Intuitive gear icon for access
  - Smooth open/close animations
  - Persistent settings across sessions
  - Improved input field organization

- Activity Type Selection
  - Checkbox-based selection interface
  - Search and filter functionality
  - Clear visual feedback for selected items
  - Improved scrolling and navigation

- Chat Interface
  - Better message threading
  - Improved context display
  - Enhanced error state handling
  - More intuitive user input handling

- Tooltip System
  - Non-intrusive SVG information icons with hover/pulse effect.
  - Contextual help for complex features with HTML support.
  - Tooltips render above all elements and adjust to viewport.
  - Consistent styling with visual feedback for viewed state.
  - Improved user guidance through strategically placed tooltips across the application.

## [Future Plans]
- Enhanced activity type filtering
- Improved chat context management
- Better error recovery mechanisms
- Additional activity type templates
- Enhanced customization options
- Advanced settings configuration options 