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

# Run unit tests
test:
    npm run test

# Trigger GitHub Actions deployment workflow remotely
deploy:
    gh workflow run deploy.yml

# View GitHub Actions deployment status
deploy-status:
    gh run list --workflow="deploy.yml"

# Open live deployed website in browser
open-live:
    open https://sahith25.github.io/kaleidoscope/

# Build, commit, and push to trigger auto-deployment
push msg="update":
    npm run build
    git add .
    git commit -m "{{msg}}" || true
    git push

# Clean build artifacts
clean:
    rm -rf dist node_modules
