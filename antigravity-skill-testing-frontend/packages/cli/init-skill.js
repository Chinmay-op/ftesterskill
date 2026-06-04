const fs = require('fs/promises');
const path = require('path');

/**
 * Recursively copy a directory, creating destination dirs as needed.
 */
async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Initialize the f-tester AI agent skill in a target project directory.
 *
 * Copies the complete skill template (SKILL.md + scripts/ + examples/ + references/)
 * into the project's `.agent/skills/testing-frontend/` directory.
 * Also copies the default config file if one doesn't already exist.
 */
async function initSkill(projectDir) {
  // Resolve paths
  const templateSkillDir = path.resolve(__dirname, '../../templates/skill');
  const configSource = path.resolve(__dirname, '../../templates/config/f-tester.config.ts');

  // Detect whether the project uses .agents/ or .agent/ (Antigravity supports both)
  const agentsDir = path.join(projectDir, '.agents', 'skills', 'testing-frontend');
  const agentDir = path.join(projectDir, '.agent', 'skills', 'testing-frontend');

  let targetDir;
  // Prefer .agents/ if it already exists (newer Antigravity convention)
  try {
    await fs.access(path.join(projectDir, '.agents'));
    targetDir = agentsDir;
  } catch {
    targetDir = agentDir;
  }

  const configTarget = path.join(projectDir, 'f-tester.config.ts');

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           📦 f-tester Pro Max — Skill Installer             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // Check if skill already exists
  let skillExists = false;
  try {
    await fs.access(path.join(targetDir, 'SKILL.md'));
    skillExists = true;
  } catch {
    // Skill doesn't exist yet, proceed
  }

  if (skillExists) {
    console.log('⚠️  Existing skill detected at:');
    console.log(`   ${targetDir}`);
    console.log('   Overwriting with latest version...');
    console.log('');
  }

  try {
    // Verify template exists
    try {
      await fs.access(templateSkillDir);
    } catch {
      console.error('❌ Template skill directory not found at:', templateSkillDir);
      console.error('   This usually means the package is corrupted. Try reinstalling:');
      console.error('   npm install -g f-tester');
      return false;
    }

    // Copy the complete skill template
    console.log('📋 Installing skill files...');
    await copyDir(templateSkillDir, targetDir);

    // Count what was installed
    const countFiles = async (dir) => {
      let count = 0;
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            count += await countFiles(path.join(dir, entry.name));
          } else {
            count++;
          }
        }
      } catch { /* ignore */ }
      return count;
    };

    const totalFiles = await countFiles(targetDir);

    // Copy config if it doesn't exist
    let configCopied = false;
    try {
      await fs.access(configTarget);
    } catch {
      try {
        await fs.copyFile(configSource, configTarget);
        configCopied = true;
      } catch {
        // Config template might not exist in some distributions
      }
    }

    // Print success
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ Successfully installed f-tester Pro Max skill!          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`   📁 Skill location:  ${targetDir}`);
    console.log(`   📄 Files installed: ${totalFiles}`);
    if (configCopied) {
      console.log(`   ⚙️  Config created:  ${configTarget}`);
    }
    console.log('');
    console.log('   Installed components:');
    console.log('   ├── SKILL.md            (16-domain testing intelligence)');
    console.log('   ├── scripts/            (10 automated scanning scripts)');
    console.log('   ├── examples/           (10 Playwright test templates)');
    console.log('   └── references/         (Report template + sample report)');
    console.log('');
    console.log('   🚀 What to do next:');
    console.log('   ─────────────────────────────────────────────────');
    console.log('   Ask your AI agent any of these:');
    console.log('');
    console.log('     "Test the frontend"');
    console.log('     "Run a UX audit"');
    console.log('     "Check for security leaks in the build"');
    console.log('     "Run persona-driven user journey tests"');
    console.log('     "Evaluate design system consistency"');
    console.log('');
    console.log('   The agent will automatically load the skill and');
    console.log('   run the full 16-domain testing suite.');
    console.log('');

    return true;
  } catch (err) {
    console.error('');
    console.error('❌ Failed to install the skill:', err.message);
    console.error('');
    console.error('   Troubleshooting:');
    console.error('   1. Make sure you have write permissions to:', projectDir);
    console.error('   2. Try running with: npx f-tester init-skill');
    console.error('   3. File an issue: https://github.com/Chinmay-op/ftesterskill/issues');
    console.error('');
    return false;
  }
}

module.exports = initSkill;
