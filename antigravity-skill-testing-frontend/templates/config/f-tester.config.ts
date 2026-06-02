export default {
  targetDir: './dist',
  previewCommand: 'npm run preview',
  previewPort: 4173,
  enabledDomains: [
    'build', 'security', 'api', 'component', 'accessibility', 
    'performance', 'network', 'dom', 'breakage', 'cross-cutting',
    'personas', 'heuristics', 'perceived-quality'
  ],
  reporter: {
    markdown: true,
    json: false
  },
  personas: [
    {
      name: 'First-time visitor',
      context: 'Has never seen this product. Arrived from a Google search.',
      device: 'desktop',
      patience: 'medium',
      knowledge: 'none'
    },
    {
      name: 'Impatient mobile user',
      context: 'On phone, commuting, low bandwidth. Will abandon in 3s.',
      device: 'mobile',
      patience: 'low',
      knowledge: 'moderate'
    }
  ]
};
