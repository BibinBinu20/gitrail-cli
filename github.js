import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { Octokit } from '@octokit/core';
import { sendRequestToClaude } from './gen-ai.js'; 

dotenv.config();

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  request: { fetch },
});

async function getPullRequestDetails(owner, repo, pullNumber) {
  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
      owner,
      repo,
      pull_number: pullNumber,
    });

    const pr = response.data;

    const jiraTicket = extractJiraTicket(pr.body);
    console.log(`🎫 JIRA Ticket: ${jiraTicket}`);

    const testFiles = await getChangedTestFiles(owner, repo, pullNumber);
    console.log('📂 Filtered Test Files:', testFiles);

    const fileDiffs = await getDiffsForTestFiles(owner, repo, pullNumber, testFiles);
    console.log('📄 Diffs for Test Files:', fileDiffs);

    return { jiraTicket, testFiles, fileDiffs };

  } catch (error) {
    console.error('❌ Failed to fetch PR details:', error.message);
    return null;
  }
}

// Function to extract JIRA ticket from PR description
function extractJiraTicket(description) {
  const jiraPattern = /\[MAIN_JIRA\]:\s*(https:\/\/\S+\/browse\/[A-Z]+-\d+)/;
  const match = description.match(jiraPattern);
  if (match && match[1]) {
    return match[1].split('/').pop(); // Extract just the ticket ID (e.g., CD-502495)
  }
  return null;
}

// Function to get files changed in the PR and filter for _spec.rb files
async function getChangedTestFiles(owner, repo, pullNumber) {
  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
      owner,
      repo,
      pull_number: pullNumber,
    });

    const files = response.data;
    const testFiles = files
      .filter(file => file.filename.endsWith('_spec.rb')) 
      .map(file => file.filename); //  Extract filenames only

    return testFiles;
  } catch (error) {
    console.error('❌ Failed to fetch changed test files:', error.message);
    return [];
  }
}

// Function to fetch diffs for the test files
async function getDiffsForTestFiles(owner, repo, pullNumber, testFiles) {
  const fileDiffs = {};

  try {
    for (const file of testFiles) {
      const response = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
        owner,
        repo,
        pull_number: pullNumber,
      });

      const fileData = response.data.find(f => f.filename === file);

      if (fileData && fileData.patch) {
         fileDiffs[file] = fileData.patch;
      }
    }

    return fileDiffs;
  } catch (error) {
    console.error('❌ Failed to fetch diffs for test files:', error.message);
    return {};
  }
}

export async function processPullRequestDetails(owner, repo, pullNumber) {
    const prDetails = await getPullRequestDetails(owner, repo, pullNumber);
  
    if (prDetails.testFiles.length>0) {
    //   console.log('JIRA Ticket:', prDetails.jiraTicket);
    //   console.log('Test Files:', prDetails.testFiles);
    //   console.log('File Diffs:', prDetails.fileDiffs);

    const diffString = Object.entries(prDetails.fileDiffs)
    .map(([filePath, patch]) => `--- ${filePath} ---\n${patch}`)
    .join("\n\n");

    console.log('🤖 Processing Diffs using GEN-AI');
       const aiJson =  await sendRequestToClaude(diffString);
        console.log('✅ Processing Complete');

        return { prDetails, aiJson };
    }
    return {prDetails,aiJson: null};
  }


//    processPullRequestDetails('coupa', 'coupa_development', 134701);

