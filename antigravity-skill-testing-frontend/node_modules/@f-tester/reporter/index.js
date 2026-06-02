const fs = require('fs');
const path = require('path');

class Reporter {
  constructor(outputDir, options = { markdown: true, json: false }) {
    this.outputDir = outputDir;
    this.options = options;
    this.results = {
      domains: [],
      summary: {},
      timestamp: new Date().toISOString()
    };
    
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  addDomainResult(domain) {
    this.results.domains.push(domain);
  }

  generateMarkdown() {
    let md = `# f-tester Test Report\n\n`;
    md += `Generated: ${this.results.timestamp}\n\n`;
    
    md += `## Domain Results\n\n`;
    md += `| Domain | Status | Issues | Time |\n`;
    md += `|--------|--------|--------|------|\n`;
    
    this.results.domains.forEach(d => {
      const status = d.passed ? '✅ Passed' : '❌ Failed';
      md += `| ${d.name} | ${status} | ${d.issues || 0} | ${d.duration || '0s'} |\n`;
    });
    
    md += `\n## Details\n\n`;
    this.results.domains.forEach(d => {
      md += `### ${d.name}\n`;
      md += `${d.details || 'No details provided.'}\n\n`;
    });

    const reportPath = path.join(this.outputDir, 'report.md');
    fs.writeFileSync(reportPath, md);
    console.log(`📄 Markdown report saved to ${reportPath}`);
  }

  generateJson() {
    const reportPath = path.join(this.outputDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`📄 JSON report saved to ${reportPath}`);
  }

  generate() {
    if (this.options.markdown) this.generateMarkdown();
    if (this.options.json) this.generateJson();
  }
}

module.exports = Reporter;
