# Portfolio - Gavin McFarland

A modern, minimalistic portfolio showcasing Figma development tools and plugins.

## Features

- **Modern Design**: Clean, minimalistic interface with dark mode support
- **Responsive**: Fully responsive design that works on all devices
- **Project Showcase**: Detailed presentation of major projects including Figlet, Plugma, Table Creator, and Table Widget
- **Fast Performance**: Built with Vite for optimal loading speeds

## Technologies Used

- React 18
- Vite (latest)
- Tailwind CSS
- PostCSS

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` to view the portfolio.

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

The production files will be generated in the `dist` folder.

## Projects Featured

1. **Figlet** - Interactive Figma API Sandbox
2. **Plugma** - Next-Level Figma Plugin Development Toolkit
3. **Table Creator** - Flexible Table Generation for Figma
4. **Table Widget** - Collaborative Tables for FigJam

## Structure

```
src/
├── components/
│   ├── Hero.jsx       # Landing section
│   ├── Projects.jsx   # Projects listing
│   ├── ProjectCard.jsx # Individual project cards
│   ├── About.jsx      # About section
│   └── Contact.jsx    # Contact information
├── data/
│   └── projects.js    # Project data and descriptions
├── App.jsx           # Main application component
├── main.jsx          # Entry point
└── index.css         # Tailwind CSS imports
```