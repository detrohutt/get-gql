// Types
import { DocumentNode } from 'graphql';

// Builtins
import { join } from 'path';

// Externals
import * as dedent from 'dedent';

// Internals
import { getGql } from '../src/index';

type DocMap = Record<string, DocumentNode>;

describe('parse client-side graphql file at runtime', () => {
  test('absolute filepath argument', async () => {
    const result = await getGql(join(__dirname, '../__fixtures__/graphql/named.graphql'));
    expect(typeof result).toBe('object');
  });

  test('relative filepath argument', async () => {
    const result = await getGql('../__fixtures__/graphql/named.graphql');
    expect(typeof result).toBe('object');
  });

  test('single fragment', async () => {
    const result = (await getGql('../__fixtures__/graphql/fragment.graphql')) as DocMap;
    expect(result.kind).toBe('Document');
  });

  test('single named query', async () => {
    const result = (await getGql('../__fixtures__/graphql/named.graphql')) as DocMap;
    expect(result.kind).toBe('Document');
  });

  test('single named query with { wrapSingleExport: true }', async () => {
    const { named } = (await getGql('../__fixtures__/graphql/named.graphql', {
      wrapSingleExport: true
    })) as DocMap;
    expect(named.kind).toBe('Document');
  });

  test('single unnamed query', async () => {
    const result = (await getGql('../__fixtures__/graphql/unnamed.graphql')) as DocMap;
    expect(result.kind).toBe('Document');
  });

  test('multiple operations', async () => {
    const result = (await getGql('../__fixtures__/graphql/multiple.graphql')) as DocMap;
    const { first, second, third } = result;
    expect(first).toEqual(result.default);
    expect(first.kind).toBe('Document');
    expect(second.kind).toBe('Document');
    expect(third.kind).toBe('Document');
  });

  test('query with nested fragment', async () => {
    const full = (await getGql('../__fixtures__/graphql/nested/partial.graphql')) as DocMap;
    expect(full.kind).toBe('Document');
    expect(full.definitions).toHaveLength(2);
    // @ts-ignore
    expect(full.definitions[0].kind).toBe('OperationDefinition');
    // @ts-ignore
    expect(full.definitions[1].kind).toBe('FragmentDefinition');
  });
});

describe('parse schema file at runtime', () => {
  test('absolute filepath argument', async () => {
    const schema = await getGql(join(__dirname, '../__fixtures__/graphql/schema.graphql'));
    expect(schema).toBe(
      dedent`schema {
            query: Query
          }

          type Query {
            test: String
          }\n`
    );
  });
});
