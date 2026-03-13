const fs = require('fs');

const content = `name: deploycheck

on:
  push:
    branches: ["main"]
  pull_request:
    branches: ["main"]

jobs:
  validate-environment:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "20"

      - name: Install deploycheck
        run: npm install -g .

      - name: Run deploycheck
        run: deploycheck validate
`;

fs.mkdirSync('.github/workflows', { recursive: true });
fs.writeFileSync('.github/workflows/deploycheck.yml', content);
console.log('GitHub Action file created successfully');
