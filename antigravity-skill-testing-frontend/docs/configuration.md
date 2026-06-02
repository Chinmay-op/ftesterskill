# Configuration

Configure f-tester by creating an `f-tester.config.ts` file in your project root.

```ts
export default {
  targetDir: './dist', // Where your build output lives
  previewCommand: 'npm run preview', // How to serve it locally
  previewPort: 4173,
  enabledDomains: ['build', 'dom', 'personas', 'heuristics'],
  reporter: { markdown: true, json: true },
  personas: [
    { name: 'First-time visitor', device: 'desktop' }
  ]
};
```
