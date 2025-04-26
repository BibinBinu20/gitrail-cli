const { version } = require('../package.json');

function getCLINote() {
  const timestamp = new Date().toISOString();
  return `[GitRail ${version}] this case was added via Gitrail CLI on ${timestamp}`;
}

module.exports = { getCLINote };