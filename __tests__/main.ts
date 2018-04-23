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
  test('absolute filepath argument', () => {
    const result = getGql(join(__dirname, '../__fixtures__/graphql/named.graphql'));
    expect(typeof result).toBe('object');
  });

  test('relative filepath argument', () => {
    const result = getGql('../__fixtures__/graphql/named.graphql');
    expect(typeof result).toBe('object');
  });

  test('single named query', () => {
    const result = <DocMap>getGql('../__fixtures__/graphql/named.graphql');
    expect(result.kind).toBe('Document');
  });

  test('single named query with { nowrap: false }', () => {
    const { named } = <DocMap>getGql('../__fixtures__/graphql/named.graphql', { nowrap: false });
    expect(named.kind).toBe('Document');
  });

  test('single unnamed query', () => {
    const result = <DocMap>getGql('../__fixtures__/graphql/unnamed.graphql');
    expect(result.kind).toBe('Document');
  });

  test('multiple operations', () => {
    const result = <DocMap>getGql('../__fixtures__/graphql/multiple.graphql');
    const { first, second, third } = result;
    expect(first).toEqual(result.default);
    expect(first.kind).toBe('Document');
    expect(second.kind).toBe('Document');
    expect(third.kind).toBe('Document');
  });

  test('query with nested fragment', () => {
    const full = <DocMap>getGql('../__fixtures__/graphql/nested/partial.graphql');
    expect(full.kind).toBe('Document');
    expect(full.definitions).toHaveLength(2);
    // @ts-ignore
    expect(full.definitions[0].kind).toBe('OperationDefinition');
    // @ts-ignore
    expect(full.definitions[1].kind).toBe('FragmentDefinition');
  });
});

describe('parse schema file at runtime', () => {
  test('absolute filepath argument', () => {
    const schema = getGql('../__fixtures__/graphql/schema.graphql');
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
