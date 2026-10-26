export function splitIntoClauses(text: string): string[] {
  const withoutFillers = text.replace(
    /,?\s*\b(?:um|uh|erm|ah)\b\s*,?/gi,
    ' '
  );
  const clauses: string[] = [];
  let start = 0;
  let index = 0;

  const pushClause = (end: number) => {
    const clause = withoutFillers.slice(start, end).trim();
    if (clause) clauses.push(clause);
  };

  while (index < withoutFillers.length) {
    const char = withoutFillers[index];
    if (
      char === ',' &&
      !(
        index > 0 &&
        index + 1 < withoutFillers.length &&
        /\d/.test(withoutFillers[index - 1]) &&
        /\d/.test(withoutFillers[index + 1])
      )
    ) {
      pushClause(index);
      start = index + 1;
      index += 1;
      continue;
    }
    if (
      char === ';' ||
      char === '.' &&
        !(
          /\d/.test(withoutFillers[index - 1] ?? '') &&
          /\d/.test(withoutFillers[index + 1] ?? '')
        )
    ) {
      pushClause(char === '.' ? index + 1 : index);
      start = index + 1;
      index += 1;
      continue;
    }

    const word = withoutFillers.slice(index).match(/^(and|then)\b/i);
    if (
      word &&
      (index === 0 || /\s/.test(withoutFillers[index - 1])) &&
      (index + word[0].length === withoutFillers.length ||
        /\s|[,.;]/.test(withoutFillers[index + word[0].length]))
    ) {
      pushClause(index);
      start = index + word[0].length;
      index = start;
      continue;
    }
    index += 1;
  }

  const finalClause = withoutFillers.slice(start).trim();
  if (finalClause) clauses.push(finalClause);
  return clauses;
}
