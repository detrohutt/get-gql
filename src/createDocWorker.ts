import { DocumentNode, FragmentDefinitionNode } from 'graphql';

import { readFileSync } from 'fs';

import gql from 'graphql-tag';

import { newlinePattern } from './constants';

export function createDocWorker(
  source: string,
  filepath: string,
  resolve: (src: string, file: string) => string
) {
  let ast: DocumentNode;
  let fragmentDefs: FragmentDefinitionNode[] = [];

  return {
    processFragments() {
      processFragmentImports(getFragmentImportStatements(source), filepath);

      function getFragmentImportStatements(src: string) {
        return src
          .split(newlinePattern)
          .map(line => line.trim())
          .filter(line => line.substr(0, 7) === '#import');
      }

      function processFragmentImports(imports: string[], relFile: string) {
        imports.forEach(statement => {
          const fragmentPath = statement.split(/[\s\n]+/g)[1].slice(1, -1);
          const absFragmentPath = resolve(fragmentPath, relFile);
          const fragmentSource = readFileSync(absFragmentPath.replace(/'/g, ''), 'utf8');
          const subFragments = getFragmentImportStatements(fragmentSource);
          if (subFragments.length > 0) processFragmentImports(subFragments, absFragmentPath);
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
    },
    processDoc() {
      this.processFragments();
      this.parse();
      this.dedupeFragments();
      this.makeSourceEnumerable();
      return this.ast;
    }
  };
}
