# Contributing to DSAverse

Welcome to DSAverse! 🚀 We're excited that you're interested in contributing to our data structures and algorithms visualization project. This guide will help you get started with contributing to the project.

## Table of Contents

-   [Code of Conduct](#code-of-conduct)
-   [How Can I Contribute?](#how-can-i-contribute)
-   [Getting Started](#getting-started)
-   [Development Setup](#development-setup)
-   [Contribution Guidelines](#contribution-guidelines)
-   [Pull Request Process](#pull-request-process)
-   [Issue Guidelines](#issue-guidelines)
-   [Style Guidelines](#style-guidelines)
-   [Community](#community)

## Code of Conduct

By participating in this project, you agree to abide by our code of conduct. Please be respectful, inclusive, and constructive in all interactions.

## How Can I Contribute?

There are many ways to contribute to DSAverse:

### 🐛 Bug Reports

-   Report bugs and issues you encounter
-   Provide clear steps to reproduce the problem
-   Include screenshots or recordings if applicable

### 💡 Feature Requests

-   Suggest new algorithms or data structures
-   Propose new visualization techniques
-   Request UI/UX improvements

### 🔧 Code Contributions

-   Implement new algorithms and data structures
-   Add interactive visualizations
-   Improve existing animations and visual effects
-   Optimize performance
-   Add unit tests
-   Fix bugs

### 📚 Documentation

-   Improve README files
-   Add code comments
-   Create tutorials and guides

### 🎨 Design Contributions

-   Improve visual design and user interface
-   Create better icons and graphics
-   Enhance user experience
-   Design responsive layouts

## Getting Started

### Prerequisites

Before you begin, ensure you have:

-   Node.js (version 16 or higher)
-   npm or yarn package manager
-   Git
-   A code editor (VS Code recommended)

### Fork and Clone

1. Fork the DSAverse repository
2. Clone your fork locally:

```bash
git clone https://github.com/Archit1706/dsaverse.git
cd dsaverse
```

3. Add the upstream repository:

```bash
git remote add upstream https://github.com/Archit1706/dsaverse.git
```

## Development Setup

1. Install dependencies:

```bash
npm install
# or
yarn install
```

2. Start the development server:

```bash
npm run dev
# or
yarn dev
```

3. Open your browser and navigate to `http://localhost:3000`

4. Make your changes and test them locally

## Contribution Guidelines

### Types of Contributions We Welcome

#### New Algorithms

-   Sorting algorithms (Quick Sort, Merge Sort, Heap Sort, etc.)
-   Searching algorithms (Binary Search, Linear Search, etc.)
-   Graph algorithms (DFS, BFS, Dijkstra, etc.)
-   Dynamic programming solutions
-   Tree algorithms
-   String algorithms

#### New Data Structures

-   Arrays and Lists
-   Stacks and Queues
-   Trees (Binary, AVL, Red-Black, etc.)
-   Graphs
-   Hash Tables
-   Heaps
-   Tries

#### Visualization Improvements

-   Smooth animations
-   Interactive controls
-   Step-by-step execution
-   Speed controls
-   Color coding for different states
-   Sound effects (optional)

### Project Structure

```
DSAverse/
├── .next/                      # Next.js build output (auto-generated)
├── app/                        # Next.js App Router pages and layouts
│   ├── page.js                 # Main homepage
│   ├── layout.js               # Root layout component
│   ├── globals.css             # Global styles
│   └── [algorithm]/            # Dynamic algorithm pages
├── components/                 # Reusable React components
├── data/                       # Static data and configurations
│   ├── algorithmCategories.js  # Algorithm metadata and info
│   ├── dataStructures.js       # Data structure definitions
│   └── examples.js             # Example datasets
├── node_modules/               # Dependencies (auto-generated)
├── public/                     # Static assets
├── .gitignore                  # Git ignore rules
├── CONTRIBUTING.md             # This file
├── eslint.config.mjs           # ESLint configuration
├── jsconfig.json               # JavaScript/TypeScript config
├── next.config.mjs             # Next.js configuration
├── package.json                # Dependencies and scripts
├── package-lock.json           # Locked dependency versions
├── postcss.config.mjs          # PostCSS configuration
└── README.md                   # Project documentation
```

## Pull Request Process

1. **Create a new branch** for your feature:

```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes** following our coding standards

3. **Test your changes** thoroughly:

```bash
npm test
npm run build
```

4. **Commit your changes** with a descriptive message:

```bash
git commit -m "Add bubble sort visualization with step-by-step animation"
```

5. **Push to your fork**:

```bash
git push origin feature/your-feature-name
```

6. **Create a Pull Request** from your fork to the main repository

### Pull Request Guidelines

-   Use a clear and descriptive title
-   Include a detailed description of your changes
-   Reference any related issues
-   Add screenshots or GIFs for visual changes
-   Ensure all tests pass
-   Update documentation if necessary

## Issue Guidelines

### Creating Issues

When creating an issue, please:

1. **Search existing issues** first to avoid duplicates
2. **Use a clear and descriptive title**
3. **Provide detailed information**:
    - Steps to reproduce (for bugs)
    - Expected vs actual behavior
    - Screenshots or recordings
    - Browser and OS information
    - Error messages or console logs

### Issue Labels

We use labels to categorize issues:

-   `bug` - Something isn't working
-   `enhancement` - New feature or improvement
-   `good first issue` - Good for newcomers
-   `help wanted` - Extra attention needed
-   `documentation` - Documentation related
-   `visualization` - Visualization improvements

## Style Guidelines

### Code Style

-   Use **TypeScript** for type safety
-   Follow **ESLint** and **Prettier** configurations
-   Use **meaningful variable and function names**
-   Add **JSDoc comments** for functions and classes
-   Keep functions **small and focused**
-   Use **consistent indentation** (2 spaces)

### Commit Messages

Follow the conventional commit format:

-   `feat: add new sorting algorithm visualization`
-   `fix: resolve animation timing issue`
-   `docs: update installation instructions`
-   `style: improve component styling`
-   `refactor: optimize rendering performance`
-   `test: add unit tests for binary search`

### Algorithm Implementation Guidelines

When implementing algorithms:

1. **Include time and space complexity** in comments
2. **Add step-by-step comments** explaining the logic
3. **Use consistent naming conventions**
4. **Include edge case handling**
5. **Add visualization hooks** for animation

Example:

```javascript
/**
 * Bubble Sort Algorithm
 * Time Complexity: O(n²)
 * Space Complexity: O(1)
 */
function bubbleSort(arr, visualize = false) {
    const n = arr.length;

    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            // Compare adjacent elements
            if (arr[j] > arr[j + 1]) {
                // Swap elements
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];

                // Visualization hook
                if (visualize) {
                    visualize.swap(j, j + 1);
                }
            }
        }
    }

    return arr;
}
```

### Visualization Guidelines

When creating visualizations:

1. **Use consistent color schemes**
2. **Add smooth transitions and animations**
3. **Include play/pause/reset controls**
4. **Show current step information**
5. **Make it responsive for mobile devices**
6. **Add accessibility features** (ARIA labels, keyboard navigation)

## Testing

-   Write **unit tests** for new algorithms
-   Add **integration tests** for visualizations
-   Test on **multiple browsers**
-   Verify **mobile responsiveness**
-   Check **accessibility compliance**

Run tests with:

```bash
npm test
npm run test:coverage
```

## Documentation

When adding new features:

1. Update relevant **README** sections
2. Add **inline code comments**
3. Create **usage examples**
4. Update **API documentation**
5. Add **tutorial content** if applicable

## Community

### Getting Help

-   Check existing **issues** and **discussions**
-   Ask questions in **GitHub Discussions**
-   Reach out via **email**: architrathod77@gmail.com
-   Join our community discussions

### Recognition

Contributors are recognized in:

-   **Contributors** section of README
-   **Release notes** for major contributions
-   **GitHub contributors** graph

## Resources

### Learning Resources

-   [Algorithm Visualizations](https://visualgo.net/)
-   [Data Structures Reference](https://www.geeksforgeeks.org/data-structures/)
-   [React Documentation](https://react.dev/)
-   [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Tools

-   [VS Code](https://code.visualstudio.com/) - Recommended editor
-   [React Developer Tools](https://react.dev/learn/react-developer-tools)
-   [Git](https://git-scm.com/) - Version control

## Questions?

If you have any questions about contributing, feel free to:

-   Open an issue with the `question` label
-   Start a discussion in GitHub Discussions
-   Contact the maintainers directly

Thank you for contributing to DSAverse! 🎉 Your contributions help make computer science education more accessible and engaging for everyone.

---

**Happy Coding!** 🚀
