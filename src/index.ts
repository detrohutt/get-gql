import { DocumentNode, FragmentDefinitionNode } from 'graphql';

import { readFileSync } from 'fs';
import { resolve as pathResolve, isAbsolute, join, dirname } from 'path';

import { callerDirname } from 'caller-dirname';
import { separateOperations } from 'graphql/utilities/separateOperations';
import gql from 'graphql-tag';

const newlinePattern = /(\r\n|\r|\n)+/;

export function getGql(filepath: string, { resolve = defaultResolve, nowrap = true } = {}) {
  filepath = isAbsolute(filepath) ? filepath : join(callerDirname(), filepath);
  const source = readFileSync(filepath).toString();

  // If the file doesn't contain ops return raw text, else parse  and return docs object.
  if (isSchemaLike(source)) return source;

  const docs = createDocPerOp(processDoc(createDocWorker(source, filepath, resolve)));
  return nowrap && Object.keys(docs).length <= 2 ? docs.default : docs;
}

function defaultResolve(src: string, file: string) {
  return pathResolve(dirname(file), src);
}

function isSchemaLike(source: string) {
  const content = source
    .split(newlinePattern)
    .filter(line => !newlinePattern.test(line))
    .map(line => line.trim())
    .filter(line => !(line[0] === '#'))
    .filter(line => line.length > 0);

  const operationsPattern = /^(fragment|query|mutation|subscription)/;
  return !operationsPattern.test(content[0]);
}

interface Resolve {
  (src: string, file: string): string;
}

interface DocWorker {
  processFragments: () => void;
  parse: () => void;
  dedupeFragments: () => void;
  makeSourceEnumerable: () => void;
  readonly ast: DocumentNode;
}

function createDocWorker(source: string, filepath: string, resolve: Resolve): DocWorker {
  let ast: DocumentNode;
  let fragmentDefs: FragmentDefinitionNode[] = [];

  return {
    processFragments() {
      processImports(getImportStatements(source), filepath);

      function getImportStatements(src: string) {
        return src
          .split(newlinePattern)
          .map(line => line.trim())
          .filter(line => line.substr(0, 7) === '#import');
      }

      function processImports(imports: string[], relFile: string) {
        imports.forEach(statement => {
          const fragmentPath = statement.split(/[\s\n]+/g)[1].slice(1, -1);
          const absFragmentPath = resolve(fragmentPath, relFile);
          const fragmentSource = readFileSync(absFragmentPath.replace(/'/g, ''), 'utf8');
          const subFragments = getImportStatements(fragmentSource);
          if (subFragments.length > 0) processImports(subFragments, absFragmentPath);
          // prettier-ignore
          fragmentDefs = [...gql`${fragmentSource}`.definitions, ...fragmentDefs]
        });
      }
    },
    parse() {
      // prettier-ignore
      const parsedAST = gql`${source}`
      parsedAST.definitions = [...parsedAST.definitions, ...fragmentDefs];
      ast = parsedAST;
    },
    dedupeFragments() {
      let seenNames: Record<string, boolean> = {};
      // @ts-ignore: 'definitions' is a constant or read-only property
      ast!.definitions = ast.definitions.filter(def => {
        if (def.kind !== 'FragmentDefinition') return true;
        return seenNames[def.name.value] ? false : (seenNames[def.name.value] = true);
      });
    },
    makeSourceEnumerable() {
      const newAST = JSON.parse(JSON.stringify(ast));
      newAST.loc.source = ast.loc!.source;
      ast = newAST;
    },
    get ast() {
      return ast;
    }
  };
}

function processDoc(doc: DocWorker) {
  doc.processFragments();
  doc.parse();
  doc.dedupeFragments();
  doc.makeSourceEnumerable();
  return doc.ast;
}

function createDocPerOp(doc: any): Record<string, DocumentNode> {
  const docMap = separateOperations(doc);
  // Set the first/only export as the default export
  return { ...docMap, default: docMap[Object.keys(docMap)[0]] };
}
