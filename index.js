#!/usr/bin/env node
import { Command } from 'commander';
import dotenv from 'dotenv';
import { getCasesByTicket, createCasesInTestRail } from './testrail.js'; 
import { processPullRequestDetails } from "./github.js";

dotenv.config();
const program = new Command();

program
  .name('gitrail-cli')
  .description('🚀 Send Github PR Test Cases to TestRail')
  .version('1.0.0');

program
  .command('cases')
  .description('Fetch test cases for a given Jira ticket and push new ones')
  .requiredOption('-p, --project <projectId>', 'TestRail Project ID')
  .requiredOption('-s, --suite <suiteId>', 'TestRail Suite ID')
  .requiredOption('-r, --section <rootSectionId>', 'Root section ID that holds ticket sub-sections')
  .requiredOption('-g, --pr <prId>', 'Pull Request ID')  
  .option('-t, --ticket <ticketId>', 'Jira ticket ID (e.g. CD-123456)')
  .action(async (opts) => {
    const { project, suite, section, ticket, pr } = opts;
    
    const githubProcessedData = await processPullRequestDetails("coupa", "coupa_development", pr);
    const ticketId = ticket || githubProcessedData.prDetails.jiraTicket;

    if (!ticketId) {
      console.error('❌ JIRA Ticket ID could not be determined.');
      return;
    }

    let matchingSectionID = await getCasesByTicket(project, suite, section, ticketId);

    if(matchingSectionID!=null)     //already present add in that
    {
   if (githubProcessedData.aiJson && githubProcessedData.aiJson.addedTests?.length) {
    console.log(`📝 Found ${githubProcessedData.aiJson.addedTests.length} new test(s) to add.`);
    await createCasesInTestRail( project, suite, matchingSectionID ,githubProcessedData.aiJson.addedTests);
  } else {
    console.log('✅ No new test cases to add.');
  }
    }
    else{     
      console.log("No maching section Found --- Creating one Section");
    }


  });

program.parse(process.argv);
