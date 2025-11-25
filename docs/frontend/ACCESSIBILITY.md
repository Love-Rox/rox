# Accessibility Implementation

This document describes the accessibility features implemented in the Rox frontend.

**Last Updated:** 2025-11-25

## Overview

The Rox frontend is built with accessibility as a core principle, ensuring that all users can navigate and interact with the application effectively, regardless of their abilities or assistive technologies.

## Key Features

### 1. Keyboard Navigation

**Implementation:** [`useKeyboardNavigation` hook](../../packages/frontend/src/hooks/useKeyboardNavigation.ts)

- **Vim-style navigation**: `j`/`k` keys for moving between timeline posts
- **Arrow keys**: `↓`/`↑` for alternative navigation
- **Jump navigation**: `Home` to first post, `End` to last post
- **Smart focus**: Automatically scrolls focused items into view
- **Input detection**: Disabled when user is typing in input fields

**Usage Example:**
```typescript
const timelineRef = useRef<HTMLDivElement>(null);

useKeyboardNavigation(timelineRef, {
  enabled: notes.length > 0,
  itemSelector: '[role="article"]',
});
```

### 2. Focus Management

**Implementation:** [`useFocusTrap` hook](../../packages/frontend/src/hooks/useFocusTrap.ts)

- **Focus trap**: Prevents keyboard focus from escaping modal dialogs
- **Initial focus**: Automatically focuses a designated element on open
- **Return focus**: Restores focus to previously focused element on close
- **Tab cycling**: Wraps Tab/Shift+Tab navigation within the modal
- **Escape key**: Closes modal when Escape is pressed

**Usage Example:**
```typescript
const modalRef = useRef<HTMLDivElement>(null);
const closeButtonRef = useRef<HTMLButtonElement>(null);

useFocusTrap(modalRef, {
  initialFocusRef: closeButtonRef,
  onEscape: onClose,
});
```

**Integrated Components:**
- [ImageModal](../../packages/frontend/src/components/ui/ImageModal.tsx) - Image viewer with focus trap

### 3. ARIA Attributes

All interactive elements have appropriate ARIA attributes for screen readers:

#### Timeline Components
- **Timeline container**: `role="feed"`, `aria-busy`, `aria-label`
- **Note cards**: `role="article"`, `aria-label`, `tabIndex={0}` for keyboard focus
- **Timeline tabs**: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`

#### Interactive Elements
- **Buttons**: `aria-label` with descriptive text
- **Image galleries**: `role="group"`, count information in `aria-label`
- **Reactions**: `aria-pressed` for toggle state, count in `aria-label`
- **Content warnings**: `aria-expanded`, `role="alert"`
- **Modals**: `role="dialog"`, `aria-modal="true"`, `aria-label`

#### Loading States
- **Loading indicators**: `role="status"`, `aria-label`, `aria-live="polite"`
- **Progress bars**: `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`

### 4. Screen Reader Support

- **Tailwind CSS `sr-only` class**: Visually hidden text that's still read by screen readers
- **Status announcements**: Important state changes announced to screen readers
- **Decorative elements**: `aria-hidden="true"` for purely decorative content

**Examples:**
```tsx
// Loading indicator
<div role="status" aria-label="Loading timeline">
  <Spinner />
  <span className="sr-only">Loading posts...</span>
</div>

// Decorative emoji
<div className="text-4xl" aria-hidden="true">📭</div>
```

### 5. Focus Indicators

All focusable elements have visible focus indicators:

```tsx
<Card
  className="focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
  tabIndex={0}
>
```

## Component-Specific Implementations

### Timeline ([Timeline.tsx](../../packages/frontend/src/components/timeline/Timeline.tsx))
- Keyboard navigation enabled
- Container has `role="feed"` and `aria-busy` state
- Loading states announced to screen readers

### NoteCard ([NoteCard.tsx](../../packages/frontend/src/components/note/NoteCard.tsx))
- `role="article"` with descriptive `aria-label`
- `tabIndex={0}` for keyboard navigation
- Focus ring on keyboard focus
- All buttons have descriptive `aria-label` attributes

### ImageModal ([ImageModal.tsx](../../packages/frontend/src/components/ui/ImageModal.tsx))
- Focus trap prevents keyboard focus from escaping
- `role="dialog"` with `aria-modal="true"`
- Close button receives initial focus
- Escape key closes modal
- Focus returns to trigger element on close

### Form Components
- All forms use semantic HTML elements
- Error messages properly associated with inputs
- Required fields indicated with `aria-required`

## Testing Accessibility

### Keyboard Navigation Testing
1. Navigate to the timeline page
2. Press `j` or `↓` to move to the next post
3. Press `k` or `↑` to move to the previous post
4. Press `Home` to jump to the first post
5. Press `End` to jump to the last post
6. Verify focus moves smoothly and items scroll into view

### Screen Reader Testing
1. Enable VoiceOver (macOS) or NVDA (Windows)
2. Navigate through the timeline
3. Verify all interactive elements are announced
4. Verify state changes are announced
5. Verify images have appropriate alt text

### Focus Management Testing
1. Open an image modal
2. Press Tab to navigate through focusable elements
3. Verify focus doesn't escape the modal
4. Press Escape to close
5. Verify focus returns to the image that opened the modal

## WCAG 2.1 Level AA Compliance

The implementation aims to meet WCAG 2.1 Level AA standards:

- ✅ **1.3.1 Info and Relationships** - Semantic HTML and ARIA attributes
- ✅ **2.1.1 Keyboard** - All functionality available via keyboard
- ✅ **2.1.2 No Keyboard Trap** - Focus can always move away from components
- ✅ **2.4.3 Focus Order** - Logical and intuitive focus order
- ✅ **2.4.7 Focus Visible** - Clear focus indicators on all interactive elements
- ✅ **4.1.2 Name, Role, Value** - All components have appropriate ARIA attributes
- ✅ **4.1.3 Status Messages** - Screen reader announcements for state changes

## Future Enhancements

- [ ] Skip navigation links
- [ ] Landmark regions (via ARIA landmarks)
- [ ] More granular live region announcements
- [ ] High contrast mode support
- [ ] Reduced motion preferences
- [ ] Custom keyboard shortcut configuration

## Resources

- [ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM](https://webaim.org/)
- [React Aria Components Documentation](https://react-spectrum.adobe.com/react-aria/components.html)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
