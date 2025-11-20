# Customization Guide

## 🎨 Color Scheme
The application uses **Indigo** as the primary brand color.

To change the primary color:
1.  Open your editor's "Find and Replace".
2.  Search for `indigo`.
3.  Replace with `blue`, `purple`, `rose`, or `emerald`.

**Example locations:**
*   `bg-indigo-600` (Buttons)
*   `text-indigo-500` (Links)
*   `border-indigo-500` (Active Inputs)

## 🌑 Dark Mode logic
The theme toggle is located in `App.tsx`. It saves the preference to `localStorage`.

*   **Backgrounds**: `bg-gray-100` (Light) vs `dark:bg-gray-900` (Dark).
*   **Text**: `text-gray-900` (Light) vs `dark:text-gray-100` (Dark).
*   **Components**: `bg-white` (Light) vs `dark:bg-gray-800` (Dark Cards).

## 🧩 Adding New Icons
1.  Open `components/icons/Icons.tsx`.
2.  Add a new export function returning an SVG.
3.  Use `currentColor` for the stroke/fill to allow Tailwind classes to control the color.

```tsx
export const MyNewIcon = () => (
  <svg ... stroke="currentColor"> ... </svg>
);
```

## 🛠️ Adding a New Provider
1.  Update `types.ts`: Add to `Provider` type.
2.  Update `Chat.tsx`: Add to `ALL_MODELS` constant.
3.  Update `geminiService.ts`: Add a `generate[Provider]ChatResponse` function and update the switch case in `getChatResponse`.
