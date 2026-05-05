# Work Zone OS - Next.js Integration Guide

## 🎯 Step-by-Step Implementation

### Step 1: Update Tailwind Config

Replace your `tailwind.config.ts` with:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        wz_yellow: '#FFB300',
        wz_glass: 'rgba(255, 255, 255, 0.03)',
        wz_border: 'rgba(255, 255, 255, 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
```

### Step 2: Update Global Styles

In `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background: #000;
  color: #fff;
  font-family: system-ui, sans-serif;
}
```

### Step 3: Copy Components

Copy all `.tsx` files from `nextjs-components/` to `src/components/`:
- StatCard.tsx
- WorkOrderCard.tsx
- EquipmentCard.tsx
- MainLayout.tsx

### Step 4: Use in Your Pages

```typescript
import WorkOrderCard from '@/components/WorkOrderCard';

export default function Page() {
  return (
    <div className="grid grid-cols-3 gap-6">
      <WorkOrderCard
        id="WO-001"
        title="Road Repair"
        location="I-81 Mile 45"
        status="in-progress"
        priority="high"
      />
    </div>
  );
}
```

## 🎨 Design Tokens

Use these classes consistently:
- Glass card: `bg-[rgba(255,255,255,0.03)] backdrop-blur-md border border-[rgba(255,255,255,0.12)]`
- Amber glow: `shadow-[0_0_15px_rgba(255,179,0,0.10)]`
- Hover glow: `hover:shadow-[0_0_25px_rgba(255,179,0,0.2)]`
