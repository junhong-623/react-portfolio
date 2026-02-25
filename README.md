# React Portfolio Showcase

A multi-module React application built to demonstrate common frontend patterns — ideal for showcasing in technical interviews.

## ✨ Modules

| Module | Key Concepts |
|--------|-------------|
| **Dashboard** | Recharts, useMemo, filtering & sorting, custom tooltips |
| **Task Manager** | useReducer, CRUD, localStorage persistence, inline editing |
| **Job Search** | Custom debounce hook, multi-filter, useCallback, search highlighting |
| **Onboarding Wizard** | Multi-step form, per-step validation, complex state flow |

## 🚀 Getting Started

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/react-portfolio-showcase.git
cd react-portfolio-showcase

# 2. Install
npm install

# 3. Run dev server
npm run dev

# 4. Build for production
npm run build
```

## 🏗️ Project Structure

```
src/
├── App.jsx               # Root: navigation, dark mode, ThemeContext
├── main.jsx              # React DOM entry
├── Dashboard.jsx         # Module 1: Data visualisation
├── TaskManager.jsx       # Module 2: CRUD app
├── JobSearch.jsx         # Module 3: Real-time search & filter
└── OnboardingWizard.jsx  # Module 4: Multi-step form wizard
```

## 🧠 React Patterns Used

- **Context API** — global theme passed to all components without prop drilling
- **useReducer** — structured state management for CRUD operations
- **useMemo** — expensive filter/sort calculations cached by dependency
- **useCallback** — stable callbacks to prevent unnecessary child re-renders
- **Custom Hook** — `useDebounce` for search input delay
- **Controlled Inputs** — all form fields managed by React state
- **localStorage** — tasks persist across page refreshes
- **Component composition** — shared `Field`, `FilterBtn`, `ChartCard` components

## 🎨 Design

- Dark / Light mode with CSS variables
- Fonts: [Syne](https://fonts.google.com/specimen/Syne) + [DM Sans](https://fonts.google.com/specimen/DM+Sans)
- Smooth fade-in animations on page transitions
- Fully responsive layout

## 🛠️ Tech Stack

- **React 18** — hooks-based functional components
- **Vite** — fast dev server & bundler
- **Recharts** — composable chart library
- No CSS framework (pure inline styles + CSS variables)

## 📄 License

MIT
