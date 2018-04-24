import { DocumentNode } from 'graphql';

import { readFileSync } from 'fs';
import { resolve as pathResolve, isAbsolute, join, dirname } from 'path';

import { callerDirname } from 'caller-dirname';

import { isSchemaLike } from './isSchemaLike';
import { createDocWorker } from './createDocWorker';
import { createDocMap } from './createDocMap';

export function getGql(
  filepath: string,
  { resolve = defaultResolve, wrapSingleExport = false } = {}
) {
  // Get source text from graphql file.
  filepath = isAbsolute(filepath) ? filepath : join(callerDirname(), filepath);
  const source = readFileSync(filepath).toString();

  // If the file doesn't contain any operations/fragments just return the raw text.
  if (isSchemaLike(source)) return source;

  // Otherwise, parse into a GraphQL AST object.
  const doc: DocumentNode = createDocWorker(source, filepath, resolve).processDoc();

  // Separate each op from the original doc into its own full doc with its dependencies.
  const docMap = createDocMap(doc);

  // Return either a map of DocumentNodes or a bare DocumentNode.
  return wrapSingleExport || Object.keys(docMap).length > 2 ? docMap : docMap.default;
}

export function defaultResolve(src: string, file: string) {
  return pathResolve(dirname(file), src);
}
