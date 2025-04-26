const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const dotenv = require('dotenv');
const { is_debug } = require('../helpers/env_helper.js');
const { green, cyan } = require('../helpers/text_style.js');

dotenv.config();

const AWS_REGION = process.env.AWS_REGION;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

const CLAUDE_MODEL_ID = "us.anthropic.claude-3-7-sonnet-20250219-v1:0";

const client = new BedrockRuntimeClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

const masterPrompt = `
You are an expert in RSpec, Capybara, and SitePrism. Given diffs in unified format (--- / +++ / @@), extract RSpec test changes for TestRail.

🎯 Your job:
1. Identify **added** and **deleted** test cases.
2. For added tests:
   - Extract name from \`scenario\`, \`it\`, or nested \`context\`.
   - Infer steps from \`when\`, \`then\`, \`it\` blocks.
   - Classify as \`"feature"\` (UI steps like \`visit\`, \`click\`, \`page\`) or \`"unit"\` (no UI).
   - Include:
     - \`"name"\`: Title (include parent context if any)
     - \`"type"\`: \`"feature"\` or \`"unit"\`
     - \`"preconditions"\`: Any required setup
     - \`"steps"\`: Keep minimal (1 per logical block, simple wording)
     - \`"expectedResult"\`
     - \`"testData"\`
     - \`"comments"\`: File path from diff (search for it)

3. For deleted tests: Only include \`"name"\`.

⚠️ Important:
- No complex steps — keep it short, clear, and BDD-style.
- Use RSpec/Capybara/SitePrism expertise to understand structure, including shared examples.
- **Absolutely do NOT include any text or explanation outside the <json> json-content </json> — nothing before or after.**
- Only return a clean JSON response in the format:
<json>
{
  "addedTests": [],
  "deletedTests": []
}
</json>

- If no test changes are found, return the above structure exactly.

Input below is RSpec diff:
----RSPEC DIFF----
`;

function safeJsonParse(str) {
  try {
    return { parsed: JSON.parse(str), error: null };
  } catch (err) {
    return { parsed: null, error: err };
  }
}

function extractJsonBlock(text) {
    const hasStart = text.includes('<json>');
    const hasEnd = text.includes('</json>');
  
    if (hasStart && hasEnd) {
      const match = text.match(/<json>([\s\S]*?)<\/json>/);
      if (match) {
        return match[1].trim();
      }
    }
  
    throw new Error("Failed to Process case, Please Try Again.");
  }
  
  async function sendRequestToClaude(diff, isRetry = false) {
    try {
      const body = {
        anthropic_version: "bedrock-2023-05-31",
        messages: [
          {
            role: "user",
            content: masterPrompt + diff,
          },
        ],
        max_tokens: 1000,
      };
  
      const command = new InvokeModelCommand({
        modelId: CLAUDE_MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(body),
      });
  
      const response = await client.send(command);
      const responseBody = await response.body.transformToString();
      const parsedResponse = JSON.parse(responseBody);
      const jsonText = parsedResponse?.content?.[0]?.text;
  
      is_debug() && console.log("\n✅ AI Response : \n", jsonText);
  
      if (jsonText) {
        try {
          const jsonString = extractJsonBlock(jsonText);
          const parsedJson = JSON.parse(jsonString);
          return parsedJson;
        } catch (parseError) {
          if (!isRetry) {
            console.warn("⚠️ First parse failed. Retrying once...");
            return await sendRequestToClaude(diff, true);
          } else {
            throw new Error("Failed to Process case, Please Try Again.");
          }
        }
      } else {
        throw new Error("❗️ Invalid Response ❗️");
      }
    } catch (error) {
      console.error("❌ Error making request to Claude : ", error.message || error);
      throw error; 
    }
  }
  
  

module.exports = {
  sendRequestToClaude
};
