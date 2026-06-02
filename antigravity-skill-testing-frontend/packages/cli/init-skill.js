const fs = require('fs/promises');
const path = require('path');

async function initSkill(projectDir) {
  const targetDir = path.join(projectDir, '.agent', 'skills', 'testing-frontend');
  const sourceDir = path.resolve(__dirname, '../../templates/skill');
  const configSource = path.resolve(__dirname, '../../templates/config/f-tester.config.ts');
  const configTarget = path.join(projectDir, 'f-tester.config.ts');

  console.log(`\n📦 Initializing f-tester Agent Skill...`);
  console.log(`Source: ${sourceDir}`);
  console.log(`Target: ${targetDir}`);

  try {
    await fs.mkdir(targetDir, { recursive: true });
    await fs.cp(sourceDir, targetDir, { recursive: true });
    
    // Copy config if it doesn't exist
    try {
      await fs.access(configTarget);
    } catch {
      await fs.copyFile(configSource, configTarget).catch(() => {});
    }

    console.log(`\n✅ Successfully installed the 'testing-frontend' skill!`);
    console.log(`Your agent can now run UI tests, evaluate UX, and check leakages.`);
    console.log(`Ask your agent: "Run a frontend test" or "Do a UX audit"\n`);
    return true;
  } catch (err) {
    console.error(`\n❌ Failed to initialize the skill:`, err.message);
    return false;
  }
}

module.exports = initSkill;
