# Midnight Editorial Design System

This application uses the Midnight Editorial design style - a clean, minimal, dark aesthetic with sophisticated typography and smooth interactions.

## Color Palette

- **Background**: `#050505` (Deep black)
- **Surface**: `#111111` (Card backgrounds)
- **Borders**: `#333333` (Subtle borders)
- **Accent**: `#FF6B50` (Coral/Orange)
- **Text Primary**: `#ebebeb` (Off-white)
- **Text Secondary**: `#888888` (Gray)
- **Text Tertiary**: `#666666` (Darker gray)

## Typography

- **Primary Font**: Satoshi (Variable weight 300-900)
- **Secondary Font**: Inter (300-800)
- **Mono Font**: System monospace

### Font Usage
- `.font-satoshi` - Headlines, hero text, numbers
- `.font-inter` - Body text, labels, descriptions

## Components

### Cards
- `.card-glass` - Glassmorphic cards with subtle borders
- Border radius: `1.5rem` (24px) to `2.5rem` (40px)
- Hover states with smooth transitions

### Buttons
- `.btn-accent` - Primary action button (coral background, black text)
- Uppercase text with letter spacing
- Rounded corners (0.75rem)
- Hover: Slight lift effect

### Typography Scale
- Hero: `6xl` to `8xl` (96px-128px)
- Headings: `2xl` to `5xl`
- Body: `sm` to `base`
- Labels: `xs` (10px) with uppercase and tracking

## Spacing

- Section padding: `py-20` to `py-32`
- Card padding: `p-6` to `p-10`
- Gap between elements: `gap-3` to `gap-6`

## Animations

- `.animate-fade-up` - Fade in with upward motion
- `.animate-float` - Gentle floating effect
- Transition duration: 300ms for most interactions

## Design Principles

1. **Minimal & Clean**: Remove unnecessary elements
2. **High Contrast**: White text on dark backgrounds
3. **Subtle Borders**: Use rgba borders for depth
4. **Smooth Transitions**: All interactions are animated
5. **Typography First**: Let text breathe with proper spacing
6. **Accent Sparingly**: Use coral accent for key actions only

## Selection Color

Text selection uses the coral accent color for brand consistency:
```css
.selection-coral::selection {
  background-color: #FF6B50;
  color: white;
}
```
