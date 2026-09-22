# justfile for Digital Kaleidoscope App

# Default recipe: list available commands
default:
    @just --list

# Install project dependencies
install:
    npm install

# Start local development server
dev:
    npm run dev

# Build production bundle
build:
    npm run build

# Preview production build locally
preview:
    npm run preview

# Lint & build check
lint:
    npm run build

# Clean build artifacts
clean:
    rm -rf dist node_modules
