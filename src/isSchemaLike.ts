import { newlinePattern } from './constants';

export function isSchemaLike(source: string) {
  const content = source
    .split(newlinePattern)
    // Fixed a bug but not sure why.. newline chars weren't being consumed by split.
    .filter(line => !newlinePattern.test(line))
    // Dedent everything to make matching simpler.
    .map(line => line.trim())
    // Remove GraphQL comments.
    .filter(line => !(line[0] === '#'))
    // Remove blank lines.
    .filter(line => line.length > 0);

  // Return whether the first line of actual content doesn't start with any known op/frag keyword.
  const operationsPattern = /^(fragment|query|mutation|subscription)/;
  return !operationsPattern.test(content[0]);
}
