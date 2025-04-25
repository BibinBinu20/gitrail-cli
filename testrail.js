#!/usr/bin/env node
import axios from 'axios';
import dotenv from 'dotenv';
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
    console.log("📡 Fetching cases from:", api.defaults.baseURL);
  try {
    const allSections = await fetchAllSections(projectId, suiteId);
    
    let res = allSections.filter(sec => sec.parent_id == parentSectionId);
          console.log(`📁 Sub-sections of section ${parentSectionId}:`);
      res.forEach(sec => {
        console.log(`- [${sec.id}] ${sec.name}`);
      });

    return res;
  
  } catch (err) {
    console.error('🚨 Error fetching sub-sections:', err.response?.data || err.message);
    return [];
  }
}

export async function getCasesByTicket(projectId, suiteId, parentSectionId, ticketId) {
    //  console.log(projectId+" "+suiteId+" "+parentSectionId+" "+ticketId);
  try {
    const subSections = await getSubSections(projectId, suiteId, parentSectionId);
    const matchingSection = subSections.find(sec => sec.name.startsWith(`${ticketId} `));

    if (!matchingSection) {
      return null;
    }
    // console.log(matchingSection);

    const sectionId = matchingSection.id;
    const res = await api.get(`/get_cases/${projectId}&suite_id=${suiteId}&section_id=${sectionId}`);
    const cases = res.data.cases || [];

    console.log(`✅ Found ${cases.length} cases in section [${sectionId}] "${matchingSection.name}"`);
    cases.forEach(tc => {
      console.log(`- [${tc.id}] ${tc.title}`);
    });

    return matchingSection.id;
  } catch (err) {
    console.error('🚨 Error fetching test cases by ticket:', err.response?.data || err.message);
    return [];
  }
}

  

async function createTestCase(suiteId, sectionId, testCase) {
    // console.log(testCase);
    const body = {
      title: testCase.name,
    //   type_id: testCase.type === 'feature' ? 2 : 3, 
    custom_category: testCase.type == 'unit' ? 6 : 1,
    //   priority_id: 2, // default priority
      suite_id: suiteId,
      custom_preconds: testCase.preconditions,
      custom_steps: testCase.steps.map((step, index) => `${index + 1}. ${step}`).join('\n'),
      custom_test_data: testCase.testData,
      custom_comments: testCase.comments,
      custom_release_no: 97
    };
  

        let response = await api.post(`/add_case/${sectionId}`, body);
        // console.log("------------")
        // console.log(response);
        // console.log("------------")
        if (response.status === 200 || response.status === 201) {
            console.log('Test case added successfully');
          } else {
            throw new Error(`❌ Failed to create case`);
          }

  
    const result = await response.data;
    return result;
  }
  
  
  export async function createCasesInTestRail(projectId, suiteId, sectionId, addedTests) {
    console.log(`🧪 Creating ${addedTests.length} test case(s) in TestRail...`);
  
    for (let testCase of addedTests) {
      try {
        let created = await createTestCase(suiteId, sectionId, testCase);
        console.log(`✅ Created: ${created.title} (ID: ${created.id})`);
      } catch (err) {
        console.error(err);
      }
    }
  
    console.log("🎉 All test cases processed.");
  }

//   const casesTOAdd=[
//     {
//         "name": "with supplier managed inventory valid data without order line adds errors when order line referenced in CSV could not be found when reorder is supplier managed",
//         "type": "unit",
//         "preconditions": "Allow inventory collaboration, have valid managed by supplier row data without an order line",
//         "steps": [
//           "Create a reorder alert using the CSV loader with valid managed by supplier data but no order line",
//           "Attempt to save the reorder alert"
//         ],
//         "expectedResult": "The reorder alert should not be saved and should have errors related to the order line",
//         "testData": "Valid managed by supplier row data without order line",
//         "comments": "spec/models/csv_reorder_alert_load_spec.rb"
//       },
//       {
//         "name": "does not throw error if adding invalid type to minmax",
//         "type": "unit",
//         "preconditions": "Have valid row data with ManagedBySupplier type",
//         "steps": [
//           "Create a reorder alert with type set to ManagedBySupplier",
//           "Check for errors on the type field"
//         ],
//         "expectedResult": "The type field should not have errors about valid type values",
//         "testData": "Valid row with Type set to ManagedBySupplier",
//         "comments": "spec/models/csv_reorder_alert_load_spec.rb"
//       }
//   ]

//   createCasesInTestRail(1,6675,219662,casesTOAdd)