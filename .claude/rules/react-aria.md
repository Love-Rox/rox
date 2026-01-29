# React Aria Components Guidelines

Use React Aria Components for **interactive UI elements** that require:
- Keyboard navigation and focus management
- Screen reader announcements and ARIA attributes
- Complex interaction patterns (dialogs, menus, selects)
- Touch and pointer event handling

## When to Use React Aria Components

| Component Type | Use React Aria | Reason |
|---------------|----------------|--------|
| Button, Link | Yes | Keyboard/focus/press events |
| TextField, TextArea | Yes | Input accessibility, validation |
| Select, ComboBox | Yes | Complex keyboard navigation |
| Dialog, Modal | Yes | Focus trapping, backdrop handling |
| Switch, Checkbox | Yes | Toggle state announcements |
| Menu, Popover | Yes | Focus management, dismiss handling |
| Tabs, TabPanel | Yes | Arrow key navigation |

## When Simple Styled Containers Are Appropriate

| Component Type | Use React Aria | Reason |
|---------------|----------------|--------|
| Card (static) | No | Visual grouping only, no interaction |
| CardHeader, CardContent | No | Semantic HTML sufficient |
| Layout containers | No | No user interaction |
| Decorative elements | No | Not interactive |

## Interactive Cards

For cards that respond to user interaction (click/press), use the `InteractiveCard` component:

```tsx
// Static card (no click handler) - uses div
<Card>
  <CardHeader>Title</CardHeader>
  <CardContent>Content</CardContent>
</Card>

// Interactive card (has press handler) - uses React Aria Button
<InteractiveCard onPress={() => navigate('/detail')}>
  <p>Click to view details</p>
</InteractiveCard>
```

## Accessibility Best Practices

1. **Always add `aria-label` to inputs** - Don't rely on `placeholder` alone
2. **Use RAC form components** - Prefer `TextField`, `SearchField` over plain `<input>`
3. **Use RAC selection patterns** - Prefer `RadioGroup`, `Select` over custom state-based buttons
4. **Ensure keyboard navigation** - All interactive elements must be keyboard accessible
