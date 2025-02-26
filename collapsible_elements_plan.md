# Collapsible Elements Implementation Plan

## Current Structure
- CLIL Teaching Assistant (chatbot-card)
- Generate Activity section (input-section)

## Required Changes

### 1. HTML Structure Updates
- Add collapse/expand buttons to both sections
- Add collapsible class to main containers
- Preserve functionality while collapsed

### 2. CSS Additions Needed
```css
/* Collapsible state classes */
.section-collapsed {
  max-height: 60px;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.section-expanded {
  max-height: none;
  transition: max-height 0.3s ease;
}

/* Toggle button styles */
.collapse-toggle {
  position: absolute;
  right: 10px;
  top: 10px;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.collapse-toggle.collapsed {
  transform: rotate(180deg);
}
```

### 3. JavaScript Functions Needed
```javascript
// Toggle section collapse state
function toggleSection(sectionId) {
  const section = document.getElementById(sectionId);
  const toggle = section.querySelector('.collapse-toggle');
  
  section.classList.toggle('section-collapsed');
  toggle.classList.toggle('collapsed');
}

// Initialize collapsible sections
function initCollapsibleSections() {
  // Add toggle buttons
  // Add event listeners
  // Set initial states
}
```

### 4. Implementation Steps
1. Add HTML structure changes
   - Add toggle buttons
   - Add necessary classes and IDs
   - Preserve existing functionality

2. Add CSS styles
   - Add collapsible states
   - Add animations
   - Ensure responsive behavior

3. Add JavaScript functionality
   - Add toggle functions
   - Add initialization
   - Add state management

4. Test and verify
   - Test collapse/expand
   - Verify all existing functionality works
   - Check responsive behavior

### 5. Considerations
- Maintain all existing functionality
- Smooth animations
- Clear visual indicators
- Save state preferences
- Keyboard accessibility
- Screen reader support

### 6. Testing Checklist
- [ ] Collapse/expand works smoothly
- [ ] All existing functionality preserved
- [ ] Animations are smooth
- [ ] Responsive on all screen sizes
- [ ] Keyboard navigation works
- [ ] Screen readers can access all content
- [ ] State is preserved between sessions 