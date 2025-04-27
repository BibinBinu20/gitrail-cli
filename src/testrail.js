#!/usr/bin/env node
const axios = require('axios');
const dotenv = require('dotenv');
const { is_debug } = require('../helpers/env_helper.js');
const { createLoader, green, cyan } = require('../helpers/text_style.js');
const { getCLINote } = require('../helpers/cli_notes.js');

dotenv.config();
const { TESTRAIL_DOMAIN, TESTRAIL_USER: EMAIL, TESTRAIL_KEY: API_KEY } = process.env;

const categoryValues = {
    '1': 'Functional (UI)',
    '3': 'Integration (API/CSV/CXML/SFTP/Export)',
    '6': 'Unit Test',
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
        console.log(`- [${sec.id}] ${sec.name}\n`);
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

  

async function createTestCase(suiteId, sectionId, testCase, releaseId) {
    const body = {
      title: testCase.name,
      custom_category: testCase.type == 'unit' ? 6 : (testCase.type == 'feature' ? 1 : 3),
      suite_id: suiteId,
      type_id: 10, //automated type value
      custom_preconds: testCase.preconditions,
      custom_steps: testCase.steps.map((step, index) => `${index + 1}. ${step}`).join('\n'),
      custom_test_data: testCase.testData,
      custom_comments: `${testCase.comments || ''}\n\n${getCLINote()}`,
      custom_release_no: releaseId
    };
        let response = await api.post(`/add_case/${sectionId}`, body);
  
    const result = await response.data;
    return result;
  }
  
  
  async function createCasesInTestRail(projectId, suiteId, sectionId, addedTests) {
    console.log(`🧪 Creating ${addedTests.length} test case(s) in TestRail...\n`);
  
    let releaseId = await detectReleaseFromSection(sectionId);
    let failedCases = [];
  
    for (let testCase of addedTests) {
      let created = false;
      let attempts = 0;
  
      while (attempts < 2 && !created) {
        try {
          attempts++;
          let result = await createTestCase(suiteId, sectionId, testCase, releaseId);
          console.log(`✅ Created: ${result.title} (ID: ${result.id})\n`);
          created = true;
        } catch (err) {
          console.error(`🚨 Attempt ${attempts} failed for test case: ${testCase.name}`, is_debug() ? (err.response?.data || err.message) : "", "\n");
  
          if (attempts === 2) {
            console.error(`❌ Skipping test case after 2 failed attempts: ${testCase.name}\n`);
            failedCases.push(testCase.name);
          } else {
            console.log(`🔄 Retrying adding test case: ${testCase.name}...\n`);
          }
        }
      }
    }
  
    if (failedCases.length === 0) {
      console.log(`🟢 ${green("All test cases added successfully in TestRail")} \n`);
    } else {
      console.log(`🔴 ${cyan("Some test cases failed to create:")} ${failedCases.join(', ')}\n`);
    }
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

  async function getReleaseIdFromName(releaseName) {
    try {
      const { data: fields } = await api.get('/get_case_fields');
  
      const releaseField = fields.find(f => f.system_name === 'custom_release_no');
      if (!releaseField) {
        throw new Error('custom_release_no field not found.');
      }
  
      let allItems = [];
  
      for (const config of releaseField.configs) {
        const itemsStr = config.options?.items;
        if (!itemsStr) continue;
  
        const parsedItems = itemsStr.split('\n').map(line => {
          const [id, name] = line.split(',').map(s => s.trim());
          return { id: parseInt(id, 10), name };
        });
  
        allItems = allItems.concat(parsedItems);
      }
  
      const match = allItems.find(item => item.name === releaseName);
  
      if (match) {
        return match.id;
      } else {
        // Take last available ID
        const lastItem = allItems[allItems.length - 1];
       is_debug() && console.log(`⚠️ Release name not found. Falling back to last ID: ${lastItem.id}\n`);
        return lastItem.id;
      }
  
    } catch (err) {
      console.error('❌ Failed to fetch release ID:', err.message);
      throw err;
    }
  }
  

  async function detectReleaseFromSection(startingSectionId) {
    let currentSectionId = startingSectionId;
    let rootSectionName = null;
  
    // Traverse upwards until we find the root (no parent)
    while (true) {
      const response = await api.get(`/get_section/${currentSectionId}`);
      const section = response.data;
  
      if (!section.parent_id) {
        const match = section.name.trim().match(/^R\d+/);
        rootSectionName = match ? match[0] : section.name.trim();  // handle cases like R23 Sample
        break;
      }
  
      currentSectionId = section.parent_id;
    }
    let releaseID = await getReleaseIdFromName(rootSectionName);
    return releaseID;
  }
  

 

  module.exports = {
    createSection,
    createCasesInTestRail,
    getCasesByTicket
  };