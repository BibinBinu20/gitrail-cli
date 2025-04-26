#!/usr/bin/env node
const { Command } = require('commander');
const dotenv = require('dotenv');
const { getCasesByTicket, createCasesInTestRail, createSection } = require('./src/testrail.js');
const { processPullRequestDetails } = require("./src/github.js");
const { displayBanner } = require('./helpers/banner.js');

dotenv.config();
const program = new Command();


if (process.argv.length <= 2 || !['sync', 'cases'].includes(process.argv[2])) {
    displayBanner();
  }

program
  .name('gitrail-cli')
  .description('🚀 CLI To Sync PR Test Cases to TestRail')
  .version('1.0.0');

// Full Sync to TestRail
program
  .command('sync [repoBranch]')
  .description('Sync test cases for a PR to TestRail')
  .requiredOption('-p, --project <projectId>', 'TestRail Project ID')
  .requiredOption('-s, --suite <suiteId>', 'TestRail Suite ID')
  .requiredOption('-r, --section <rootSectionId>', 'Root section ID')
  .requiredOption('--pr <prId>', 'Pull Request ID') 
  .option('-t, --ticket <ticketId>', 'Jira ticket ID (e.g. CD-123456)')
  .action(async (repoBranch = 'coupa_development',opts) => {
    const { project, suite, section, ticket, pr } = opts;

    const githubProcessedData = await processPullRequestDetails("coupa", repoBranch, pr);
    const ticketId = ticket || githubProcessedData.prDetails.jiraTicket;

    if (!ticketId) {
      console.error('❌ JIRA Ticket ID could not be determined.\n');
      return;
    }

    let matchingSectionID = await getCasesByTicket(project, suite, section, ticketId);

    if (!matchingSectionID) {
      console.log("🆕 No matching section found. Creating a new one...\n");
      matchingSectionID = await createSection(project, suite, section, ticketId); 
      console.log(`✅ Created section '${ticketId}' with ID: ${matchingSectionID}\n`);
    }

    if (githubProcessedData.aiJson && githubProcessedData.aiJson.addedTests?.length) {
      console.log(`📝 Found ${githubProcessedData.aiJson.addedTests.length} new test(s) to add.\n`);
      await createCasesInTestRail(project, suite, matchingSectionID, githubProcessedData.aiJson.addedTests);
    } else {
      console.log('✅ No new test cases to add.\n');
    }
  });

// Extract Json Only
program
  .command('cases [repoBranch]')
  .description('Extract test cases from a GitHub PR and return JSON')
  .requiredOption('-g, --pr <prId>', 'Pull Request ID')
  .action(async (repoBranch = 'coupa_development',opts) => {
    const { pr } = opts;

   await processPullRequestDetails("coupa", repoBranch, pr);
  });

program.parse(process.argv);
