# Work Zone OS - Design Tokens & Patterns

## 🎨 Color Palette

### Primary Colors
- **Amber/Yellow**: `#FFB300` - Primary CTA, accents, highlights
- **Black**: `#000000` - Base background
- **White**: `#FFFFFF` - Primary text

### Glass-morphism
- **Glass Background**: `rgba(255, 255, 255, 0.03)`
- **Glass Border**: `rgba(255, 255, 255, 0.12)`
- **Amber Glow**: `rgba(255, 179, 0, 0.1)`

### Status Colors
- **Success/Active**: `#10B981` (green-500)
- **Warning/Break**: `#EAB308` (yellow-500)
- **Error/High Priority**: `#EF4444` (red-500)
- **Info/In Progress**: `#3B82F6` (blue-500)

---

## 🔧 Reusable CSS Classes

### Glass Card Pattern
```css
bg-[rgba(255,255,255,0.03)]
backdrop-blur-md
border border-[rgba(255,255,255,0.12)]
rounded-xl
shadow-[0_0_15px_rgba(255,179,0,0.10)]
hover:shadow-[0_0_25px_rgba(255,179,0,0.2)]
transition-all
```

### Primary Button
```css
bg-amber-500
text-black
px-6 py-3
rounded-lg
font-semibold
hover:bg-amber-400
hover:shadow-[0_0_20px_rgba(255,179,0,0.5)]
transition-all
```

### Secondary Button
```css
bg-white/10
backdrop-blur-sm
border border-amber-500/30
text-white
px-6 py-3
rounded-lg
font-semibold
hover:bg-white/20
transition-all
```

---

## 📐 Spacing Scale
- **xs**: 0.25rem (4px)
- **sm**: 0.5rem (8px)
- **md**: 1rem (16px)
- **lg**: 1.5rem (24px)
- **xl**: 2rem (32px)

---

## 🎯 Typography
- **Headings**: Bold, white color
- **Body**: Regular, gray-300/gray-400
- **Small text**: text-sm, gray-500

---

## ✨ Animation Patterns
All transitions use `transition-all` with default duration.
Hover effects increase glow intensity and border opacity.
