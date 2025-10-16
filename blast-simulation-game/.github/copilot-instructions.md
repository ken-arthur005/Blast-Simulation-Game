# Rock Blasterz - AI Coding Agent Instructions

## Project Overview
A React-based 2D mining simulation game where players design blast patterns to maximize ore recovery. Users upload CSV files containing ore grid data, which is visualized on an HTML5 canvas with interactive gameplay elements.

## Architecture & Data Flow

### Core Components Pipeline
1. **Entry Point**: `main.jsx` → Sets up React Router with `GameProvider` context wrapping all routes
2. **Routes**: 
   - `/` → `HomePage` (player name input + game start)
   - `/simulation-screen` → `CsvParse` (CSV upload + grid visualization)
3. **State Management**: `GameContext` provides global state (`playerName`, `score`, `currentScenario`)
4. **CSV Processing Chain**:
   ```
   CsvParse → CsvFileValidation → CsvDataValidation → GridDataProcessor 
   → OreGridVisualization → GridCanvas (HTML5 Canvas rendering)
   ```

### Key Data Transformations
- **CSV Input**: Expects headers `x,y,ore_type` (see `/public/sample-ore.csv`)
- **GridDataProcessor**: Transforms flat CSV into 2D grid array, normalizes coordinates to zero-based indexing
- **OreBlock**: Class-based representation of individual grid cells with pixel positioning
- **OreColorMapper**: Maps ore type strings to hex colors (e.g., `gold` → `#FFD700`)

## Critical Conventions

### Component Structure
- **Pages/**: Route-level components (e.g., `HomePage.jsx`)
- **Components/**: Reusable UI and logic components
- **utils/**: Pure JavaScript utility classes (no React dependencies)
- All React components use `.jsx` extension; utilities use `.js`

### Validation Pattern
Two-stage validation for CSV uploads:
1. **File validation** (`CsvFileValidation.jsx`): Extension, size (<10MB), non-empty
2. **Data validation** (`CsvDataValidation.jsx`): Required columns, data types, coordinate validation

Both return `{ isValid: boolean, error: string }` objects. Always validate file before data to avoid parsing invalid files.

### Canvas Rendering Architecture
- **GridCanvas**: Manages canvas lifecycle, centering, and block rendering
- **OreBlock**: Encapsulates block rendering logic with methods like `render(ctx)`, `containsPoint()`
- Canvas centers grid content using offset calculations in `GridCanvas.jsx` (lines 56-60)
- Block sizing is adaptive based on grid dimensions (calculated in `OreGridVisualization.jsx`)

### Toast Notification System
Use `Toast.jsx` component with `showToast(message, type)` helper:
- Types: `"error"` (red), `"success"` (green)
- Auto-dismisses after 10 seconds
- Example: `showToast("CSV file validated successfully!", "success")`

## Styling Approach

### Tailwind CSS v4
- Using `@tailwindcss/vite` plugin (configured in `vite.config.js`)
- Custom utilities in `App.css`:
  - `.text-stroke`: Black text outline effect
  - `.text-shadow`: Drop shadow for text
  - `.box-shadow`: Standard box shadow
  - `.background`: Full-screen background image with fixed attachment
  - `.ui-font`: Custom 'GrilledCheese BTN Toasted' font

### Responsive Design Pattern
Extensive use of responsive classes with breakpoints:
```jsx
className="text-[32px] xs:text-[40px] sm:text-[60px] md:text-[80px] lg:text-[100px]"
```
Always maintain this granular responsive scaling for consistency (see `HomePage.jsx` for reference).

## Development Workflow

### Commands
- `pnpm dev` - Start Vite dev server (default port 5173)
- `pnpm build` - Production build
- `pnpm lint` - Run ESLint
- `pnpm preview` - Preview production build

### Dependencies
- **React 19.1.1** with React Router v7 (uses `createBrowserRouter`)
- **PapaParse**: CSV parsing (via `react-papaparse` wrapper)
- **Lucide React** + **React Icons**: Icon libraries (both installed)
- **Tailwind CSS v4**: Styling via Vite plugin

### Debugging Tips
- Grid processing logs extensively via `console.log` (see `gridDataProcessor.js`, `printGridDebugInfo.js`)
- Check browser console for CSV validation errors with normalized header names
- Canvas rendering logs block count and centering offsets

## Common Patterns

### Context Usage
```jsx
const { gameState, setGameState } = useContext(GameContext);
// Update entire state object:
setGameState({ ...gameState, playerName: e.target.value });
```

### File Key Reset Pattern
When CSV upload fails validation, reset file input using key prop:
```jsx
const [fileKey, setFileKey] = useState(Date.now());
// In CSVReader: key={fileKey}
// On error: setFileKey(Date.now());
```

### Default CSV Loading
`CsvParse` automatically loads `/sample-ore.csv` on mount using `fetch()` + PapaParse (lines 38-56)

## Integration Points

- **React Router**: Client-side routing with `<Link to='/simulation-screen'>`
- **HTML5 Canvas**: Direct 2D context manipulation via `useRef` and `canvasRef.current.getContext('2d')`
- **File Upload**: Using `react-papaparse`'s `CSVReader` with drag-and-drop support
- **No backend**: Fully client-side application

## Important Gotchas

1. **Headers are case-insensitive**: CSV validation normalizes to lowercase (`x`, `y`, `ore_type`)
2. **Grid coordinates start at 0**: `GridDataProcessor` normalizes min X/Y to 0
3. **Canvas context must be saved/restored**: Use `ctx.save()` and `ctx.restore()` around transforms (see `GridCanvas.jsx` lines 60-74)
4. **Toast auto-clears**: Don't manually clear toasts, they auto-dismiss after 10s
5. **Button disabled state**: Use opacity + cursor-not-allowed, not `disabled` attribute (see `HomePage.jsx` lines 103-118)
