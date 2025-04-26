function green(text) {
  return `\x1b[32m${text}\x1b[0m`;
}

function red(text) {
  return `\x1b[31m${text}\x1b[0m`;
}

function cyan(text) {
  return `\x1b[36m${text}\x1b[0m`;
}

function magenta(text) {
  return `\x1b[35m${text}\x1b[0m`;
}

function createLoader(message, colorFn = text => text, icon = '🔍') {
  const dots = ['', '.', '..', '...', '....'];
  let i = 0;

  const interval = setInterval(() => {
    process.stdout.write(`\r${icon} ${colorFn(message)} ${dots[i++ % dots.length]}   `);
  }, 400);

  return {
    stop(finalMsg = null, finalColor = green, finalIcon = '✅') {
      clearInterval(interval);
      process.stdout.write('\n');
      if (finalMsg) {
        process.stdout.write(`${finalIcon} ${finalColor(finalMsg)}\n`);
      }
    }
  };
}

module.exports = {
  green,
  red,
  cyan,
  magenta,
  createLoader
};
