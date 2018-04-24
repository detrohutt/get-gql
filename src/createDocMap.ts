import { DocumentNode, ExecutableDefinitionNode } from 'graphql';

import { separateOperations } from 'graphql/utilities/separateOperations';

export function createDocMap(doc: DocumentNode): Record<string, DocumentNode> {
  // If there's only one export, just wrap and return it (includes fragments).
  if (doc.definitions.length === 1) {
    const { name } = <ExecutableDefinitionNode>doc.definitions[0];
    return name ? { [name.value]: doc, default: doc } : { default: doc };
  }

  // Creates a full document, including dependencies, for each op (not fragments) in doc.
  const docMap = separateOperations(doc);

  // Set the first/only export as the default export
  return { ...docMap, default: docMap[Object.keys(docMap)[0]] };
}
