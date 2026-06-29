# Backend Setup Steps (TypeScript)

This document outlines the step-by-step process for setting up the backend project using Node.js, Express, and TypeScript.

## Step 1: Create a `package.json` file

**Action:** Initialize the project to manage dependencies and scripts.

**Details:**
To start any Node.js project, we need a `package.json` file. This file acts as the heart of our project, keeping track of all the libraries (dependencies) we install, the versions we are using, and custom scripts for running, building, and testing our application.

Since we are using TypeScript, we will eventually add specific scripts to this file to compile our TypeScript code into standard JavaScript.

**Command to run:**
```bash
npm init -y
```
*(The `-y` flag automatically answers "yes" to all the default prompts, quickly generating a standard `package.json` file.)*
