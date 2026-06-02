const fs = require('fs/promises');
const path = require('path');

async function initSkill(projectDir) {
  const targetDir = path.join(projectDir, '.agent', 'skills', 'testing-frontend');
  const sourceDir = path.resolve(__dirname, '..', 'skill-template');

  console.log(`\n📦 Initializing Agent Skill...`);
  console.log(`Source: ${sourceDir}`);
  console.log(`Target: ${targetDir}`);

  try {
    // Ensure target directory exists (and parent directories)
    await fs.mkdir(targetDir, { recursive: true });

    // Recursively copy the template to the target directory
    await fs.cp(sourceDir, targetDir, { recursive: true });

    console.log(`\n✅ Successfully installed the 'testing-frontend' skill!`);
    console.log(`Your agent can now run UI tests, scan for leakages, and check your UI automatically.`);
    console.log(`To see it in action, ask your agent: "Run a frontend test" or "Check my UI"\n`);
    return true;
  } catch (err) {
    console.error(`\n❌ Failed to initialize the skill:`, err.message);
    return false;
  }
}

module.exports = initSkill;
