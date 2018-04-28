import { DocumentNode } from 'graphql';

import { readFile } from 'universal-fs';

import { isSchemaLike } from './isSchemaLike';
import { createDocWorker } from './createDocWorker';
import { createDocMap } from './createDocMap';

export async function getGql(
  filepath: string,
  { resolve = defaultResolve, wrapSingleExport = false } = {}
) {
  // Get source text from graphql file.
  const source = await readFile(filepath, { callDepth: 2 });

  // If the file doesn't contain any operations/fragments just return the raw text.
  if (isSchemaLike(source)) return source;

  // Otherwise, parse into a GraphQL AST object.
  const doc: DocumentNode = await createDocWorker(source, filepath, resolve).processDoc();

  // Separate each op from the original doc into its own full doc with its dependencies.
  const docMap = createDocMap(doc);

  // Return either a map of DocumentNodes or a bare DocumentNode.
  return wrapSingleExport || Object.keys(docMap).length > 2 ? docMap : docMap.default;
}

export async function defaultResolve(src: string, file: string) {
  const { resolve: pathResolve, dirname } = await import('path');
  return pathResolve(dirname(file), src);
}
