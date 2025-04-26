#!/usr/bin/env node
const axios = require('axios');
const dotenv = require('dotenv');
const { is_debug } = require('./helpers/env_helper.js');
const { createLoader, green, cyan } = require('./helpers/text_style.js');

dotenv.config();
const { TESTRAIL_DOMAIN, TESTRAIL_USER: EMAIL, TESTRAIL_KEY: API_KEY } = process.env;

const categoryValues = {
    '1': 'Functional (UI)',
    '2': 'Functional (Request)',
    '3': 'Integration (API/CSV/CXML/SFTP/Export)',
    '4': 'Notification (Auto-Reminders/Escalations)',
    '5': 'Systems (Background/OS/Security/Platform)',
    '6': 'Unit Test',
    '7': 'Unit-UI Test',
    '8': 'API',
    '9': 'CXML',
    '10': 'SFTP',
    '11': 'UI bulk load',
    '12': 'Localization',
    '13': 'DB Migration',
    '14': 'Hulk',
    '15': 'E2E-Smoke'
  };

const auth = Buffer.from(`${EMAIL}:${API_KEY}`).toString('base64');

const api = axios.create({
  baseURL: `${TESTRAIL_DOMAIN}/index.php?/api/v2`,
  headers: {
    Authorization: `Basic ${auth}`,
  },
});

async function fetchAllSections(projectId, suiteId) {
    let offset = 0;
    const limit = 250;
    let allSections = [];
  
    while (true) {
      const response = await api.get(`/get_sections/${projectId}&suite_id=${suiteId}&limit=${limit}&offset=${offset}`);
      const data = response.data;
  
      let batch = data.sections;
  
  
      allSections = allSections.concat(batch);
  
      if (batch.length < limit || !data._links?.next) {
        break;
      }
  
      offset += limit;
    }
  
    return allSections;
  }

async function getSubSections(projectId, suiteId, parentSectionId) {
    console.log("📡 Fetching TestRail suite status", is_debug() ? " from "+api.defaults.baseURL : '', "\n");
  try {
    const allSections = await fetchAllSections(projectId, suiteId);
    
    let res = allSections.filter(sec => sec.parent_id == parentSectionId);

     is_debug() && (console.log(`📁 Sub-sections of section ${parentSectionId}:`),
      res.forEach(sec => {
        console.log(`- [${sec.id}] ${sec.name}`);
      }));

    return res;
  
  } catch (err) {
    console.error('🚨 Error fetching sub-sections:', err.response?.data || err.message);
    return [];
  }
}

async function getCasesByTicket(projectId, suiteId, parentSectionId, ticketId) {
    //  console.log(projectId+" "+suiteId+" "+parentSectionId+" "+ticketId);
  try {
    const subSections = await getSubSections(projectId, suiteId, parentSectionId);
    const matchingSection = subSections.find(sec => sec.name.startsWith(`${ticketId}`));

    if (!matchingSection) {
      return null;
    }

    const sectionId = matchingSection.id;
    const res = await api.get(`/get_cases/${projectId}&suite_id=${suiteId}&section_id=${sectionId}`);
    const cases = res.data.cases || [];

    is_debug() && (
    console.log(`✅ Found ${cases.length} cases in section [${sectionId}] "${matchingSection.name}" \n`),
    cases.forEach(tc => {
      console.log(`- [${tc.id}] ${tc.title}`);
    }));

    return matchingSection.id;
  } catch (err) {
    console.error('🚨 Error fetching test cases by ticket:', err.response?.data || err.message);
    return [];
  }
}

  

async function createTestCase(suiteId, sectionId, testCase) {
    const body = {
      title: testCase.name,
      custom_category: testCase.type == 'unit' ? 6 : 1,
      suite_id: suiteId,
      custom_preconds: testCase.preconditions,
      custom_steps: testCase.steps.map((step, index) => `${index + 1}. ${step}`).join('\n'),
      custom_test_data: testCase.testData,
      custom_comments: testCase.comments,
      custom_release_no: 97
    };
        let response = await api.post(`/add_case/${sectionId}`, body);
  
    const result = await response.data;
    return result;
  }
  
  
async function createCasesInTestRail(projectId, suiteId, sectionId, addedTests) {
    console.log(`🧪 Creating ${addedTests.length} test case(s) in TestRail... \n`);
  
    for (let testCase of addedTests) {
      try {
        let created = await createTestCase(suiteId, sectionId, testCase);
        console.log(`✅ Created: ${created.title} (ID: ${created.id})\n`);
      } catch (err) {
        console.error(err);
      }
    }
    console.log(`🟢 ${green("All test cases are added to TestRail")} \n`);
  
  }

  async function createSection(projectId, suiteId, parentSectionId, sectionName) {
    try {
      const body = {
        suite_id: suiteId,
        parent_id: parentSectionId,
        name: sectionName
      };
  
      const response = await api.post(`/add_section/${projectId}`, body);
  
      if (response.status === 200 || response.status === 201) {
        console.log(`📁 Section "${sectionName}" created successfully (ID: ${response.data.id}) \n`);
        return response.data.id;
      } else {
        throw new Error(`❌ Failed to create section \n`);
      }
    } catch (err) {
      console.error('🚨 Error creating section:', err.response?.data || err.message);
      return null;
    }
  }

  module.exports = {
    createSection,
    createCasesInTestRail,
    getCasesByTicket
  };