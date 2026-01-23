# AI Coding Assistant Instructions

## Project Overview
This is a React 19 TypeScript application built with Vite, featuring a community forum with posts, comments, and user interactions. Uses Tailwind CSS for styling, React Query for data fetching, and MSW for API mocking in development.

## Architecture Patterns

### Data Fetching & State Management
- **React Query**: Primary data fetching library with QueryClient configured in `main.tsx`
  - `retry: 0` - No automatic retries on failures
  - `refetchOnWindowFocus: false` - Prevents unnecessary refetches
- **Direct API calls in components**: Currently using direct API imports in page components (e.g., `CommunityDetailPage.tsx`)
  - Custom hooks planned but not yet implemented (empty files in `src/hooks/community/`)
- **Zustand**: Available for global state but currently unused

### API Integration
- **Axios instance** in `src/api/api.ts` with cookie-based authentication
- **Base URL**: `VITE_API_BASE_URL` environment variable
- **Authentication**: Cookie-based with `withCredentials: true`
- **Token handling**: Functions like `getAccessToken()`, `isLoggedIn()` for cookie management
- **MSW mocking**: Enabled in development via `src/mocks/browser.ts`

### Component Structure
- **Pages**: Route-based components in `src/pages/` with subfolders by feature
- **Components**: Organized in `src/components/` with layout/ and feature-specific folders
- **Layout**: Fixed header/footer with main content padding (`pt-[96px] pb-[120px]`)

### Styling & UI
- **Tailwind CSS**: Utility-first styling with custom config
- **Icons**: Lucide React icons
- **Fonts**: Pretendard font family
- **Responsive**: Max-width containers (`max-w-[1200px]`)

## Development Workflow

### Essential Commands
```bash
npm run dev        # Start dev server with MSW mocking
npm run build      # TypeScript compilation + Vite build
npm run lint       # ESLint checking
npm run lint:fix   # Auto-fix ESLint issues
npm run preview    # Preview production build
```

### Build Process
- TypeScript compilation via `tsc -b` before Vite build
- ESLint configured with React, TypeScript, and Prettier integration
- MSW worker served from `public/` directory

## Code Patterns & Conventions

### API Response Handling
- **Pagination**: Uses `PaginatedResponse<T>` interface with `count`, `next`, `previous`, `results`
- **Error handling**: Try/catch blocks with user-friendly Korean error messages
- **Loading states**: Boolean flags like `loading`, `isSubmitting`

### Time Formatting
- **Relative time**: Custom `formatRelativeTime()` in `src/utils/community.ts`
- **Korean format**: "방금 전", "X분 전", "X시간 전", "X일 전"

### Authentication Flow
- **Login checks**: `isLoggedIn()` function checking for `refreshToken` cookie
- **Protected actions**: Redirect to `/login` with `state: { from: currentPath }`
- **Token headers**: `Authorization: Bearer ${token}` for authenticated requests

### File Organization
- **Types**: Centralized in `src/types/index.ts` with detailed interfaces
- **API functions**: Grouped in `src/api/api.ts` with consistent naming (`getCommunityPosts`, `createCommunityPost`)
- **Utils**: Feature-specific utilities in `src/utils/` (e.g., `community.ts`)

### Component Patterns
- **State management**: Multiple `useState` hooks for form inputs, loading, error states
- **Navigation**: `useNavigate` from React Router for programmatic routing
- **URL params**: `useParams` for route parameters like `postId`

## Key Files to Reference

### Core Setup
- `src/main.tsx`: React Query setup, MSW initialization, router wrapping
- `src/App.tsx`: Route definitions with community CRUD paths
- `package.json`: Dependencies and scripts overview

### API & Types
- `src/api/api.ts`: All API functions with axios configuration
- `src/types/index.ts`: Complete type definitions for API responses
- `src/mocks/handlers.ts`: MSW request handlers for development

### Components
- `src/pages/community/CommunityDetailPage.tsx`: Example of direct API usage in components
- `src/components/layout/Header.tsx`: Layout component with fixed positioning

### Configuration
- `vite.config.ts`: Minimal Vite setup with React and Tailwind plugins
- `eslint.config.js`: Comprehensive linting rules for TypeScript/React

## Common Patterns to Follow

### When Adding New Features
1. Define types in `src/types/index.ts` first
2. Add API functions to `src/api/api.ts`
3. Create page component in appropriate `src/pages/` subfolder
4. Update routes in `src/App.tsx`

### Error Handling
- Use try/catch with Korean error messages for user-facing errors
- Log technical errors to console for debugging
- Set loading states appropriately during async operations

### Authentication
- Check `isLoggedIn()` before protected actions
- Use `navigate('/login', { state: { from: location.pathname } })` for redirects
- Include auth tokens in API calls when available

### Styling
- Use Tailwind utility classes primarily
- Follow existing responsive patterns with `max-w-[1200px]` containers
- Maintain header/footer spacing in layout components</content>
<parameter name="filePath">/Users/admin/Documents/main project/oz_externship_fe_06_team4/.github/copilot-instructions.md