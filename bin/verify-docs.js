/* eslint-disable no-console */
const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const CONFIG_TYPE_NAME = 'WidgetConfig';
const CONFIG_TYPE_FILE = path.resolve(
  __dirname,
  '..',
  'packages',
  'intents-swap-widget',
  'src',
  'types',
  'config.ts',
);

const MARKDOWN_FILE = path.resolve(__dirname, '..', 'docs', 'configuration.md');

const program = ts.createProgram([CONFIG_TYPE_FILE], {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
});

const checker = program.getTypeChecker();
const sourceFile = program.getSourceFile(CONFIG_TYPE_FILE);

if (!sourceFile) {
  throw new Error(`Source file not found: ${CONFIG_TYPE_FILE}`);
}

const getWidgetConfigKeys = () => {
  let widgetConfigType;

  ts.forEachChild(sourceFile, (node) => {
    if (
      ts.isTypeAliasDeclaration(node) &&
      node.name.text === CONFIG_TYPE_NAME
    ) {
      widgetConfigType = checker.getTypeAtLocation(node);
    }
  });

  if (!widgetConfigType) {
    throw new Error(`Type ${CONFIG_TYPE_NAME} not found`);
  }

  return checker
    .getPropertiesOfType(widgetConfigType)
    .map((symbol) => symbol.getName())
    .sort();
};

const getDocumentedConfigKeys = () => {
  const markdown = fs.readFileSync(MARKDOWN_FILE, 'utf8');

  // Matches: ### `optionName`
  const regex = /^#+\s+`([^`]+)`/gm;

  const keys = new Set();
  let match;

  // eslint-disable-next-line no-cond-assign
  while ((match = regex.exec(markdown)) !== null) {
    keys.add(match[1]);

    if (!match[0].startsWith('### `')) {
      console.error(
        `❌ Incorrect heading level detected: "${match[0]}" should be a level 3 heading (###)`,
      );

      process.exit(1);
    }
  }

  return Array.from(keys).sort();
};

const checkForDocumentedConfigKeys = () => {
  const keys = getWidgetConfigKeys();
  const documentedKeys = getDocumentedConfigKeys();

  const missingInDocs = keys.filter((key) => !documentedKeys.includes(key));

  const extraInDocs = documentedKeys.filter((key) => !keys.includes(key));

  // --- report ---
  if (missingInDocs.length || extraInDocs.length) {
    console.error('❌ Undocumented WidgetConfig keys detected');

    if (missingInDocs.length) {
      missingInDocs.forEach((k) => console.error(`  - ${k}`));
      console.error('');
    }

    if (extraInDocs.length) {
      console.error('Documented but not in WidgetConfig:');
      extraInDocs.forEach((k) => console.error(`  - ${k}`));
      console.error('');
    }

    process.exit(1);
  }
};

checkForDocumentedConfigKeys();
