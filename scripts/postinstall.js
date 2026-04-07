#!/usr/bin/env node
/**
 * @thunder-so/thunder — skill auto-installer
 *
 * Runs after `npm install @thunder-so/thunder`.
 * Copies the aws-deploy skill into .claude/skills/ if Claude Code is detected.
 *
 * Claude Code skill spec: https://code.claude.com/docs/en/skills
 * Location: .claude/skills/<skill-name>/SKILL.md (project-level skill)
 */

"use strict";

const fs = require("fs");
const path = require("path");

const SKILL_NAME = "aws-deploy";
const SKILL_SRC = path.join(__dirname, "..", ".claude", "skills", SKILL_NAME);

// Walk up from node_modules to find the actual project root
const PROJECT_ROOT = findProjectRoot(__dirname);

if (!PROJECT_ROOT) {
  // Can't find project root — silent exit, don't break installs
  process.exit(0);
}

const SKILL_DEST = path.join(PROJECT_ROOT, ".claude", "skills", SKILL_NAME);

// Only install if:
// 1. The source skill directory exists (sanity check)
// 2. We're inside a project that looks like it uses Claude Code, OR we install anyway
//    (skills are harmless if Claude Code isn't used)
if (!fs.existsSync(SKILL_SRC)) {
  process.exit(0);
}

// Don't overwrite if skill is already at the same version
const destSkillMd = path.join(SKILL_DEST, "SKILL.md");
const srcSkillMd = path.join(SKILL_SRC, "SKILL.md");

if (fs.existsSync(destSkillMd)) {
  const srcContent = fs.readFileSync(srcSkillMd, "utf8");
  const destContent = fs.readFileSync(destSkillMd, "utf8");
  if (srcContent === destContent) {
    // Already up to date
    process.exit(0);
  }
}

try {
  copyDir(SKILL_SRC, SKILL_DEST);
  console.log(`⚡ Thunder: installed /aws-deploy skill into .claude/skills/`);
  console.log(`   Run /aws-deploy in Claude Code to deploy your app to AWS.`);
} catch (err) {
  // Silent — never break installs
}

// ── Helpers ────────────────────────────────────────────────────────────────

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function findProjectRoot(startDir) {
  // Walk up until we find a package.json NOT inside node_modules
  let dir = startDir;
  for (let i = 0; i < 8; i++) {
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
    if (dir.includes("node_modules")) continue;
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
  }
  return null;
}
