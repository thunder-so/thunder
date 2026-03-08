#!/usr/bin/env node
import { Command } from 'commander';
import shell from 'shelljs';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name('th')
  .description('Thunder CLI for unified CDK deployment')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize a new Thunder project or service')
  .action(() => {
    shell.exec(`node ${path.join(__dirname, 'th-init.mjs')}`);
  });

program
  .command('deploy')
  .description('Deploy Thunder services to AWS')
  .option('-s, --stage <stage>', 'Deployment stage', 'dev')
  .option('-f, --filter <service>', 'Filter by service name')
  .action((options) => {
    // Pass args to the deploy script
    const args = process.argv.slice(3).join(' ');
    shell.exec(`node ${path.join(__dirname, 'th-deploy.mjs')} ${args}`);
  });

program
  .command('destroy')
  .description('Remove Thunder services from AWS')
  .option('-s, --stage <stage>', 'Deployment stage', 'dev')
  .action((options) => {
    const args = process.argv.slice(3).join(' ');
    shell.exec(`node ${path.join(__dirname, 'th-destroy.mjs')} ${args}`);
  });

program.parse(process.argv);
