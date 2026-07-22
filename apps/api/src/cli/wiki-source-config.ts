export type WikiChild = { node_token: string; title: string };

export function resolveExcludedTokens(
  children: WikiChild[],
  excludedTitles: string[],
) {
  const tokens = excludedTitles.map((title) => {
    const matches = children.filter((child) => child.title === title);
    if (matches.length !== 1)
      throw new Error(
        `Wiki exclusion title must match exactly one direct child: ${JSON.stringify(title)} matched ${matches.length}`,
      );
    return matches[0]!.node_token;
  });
  if (new Set(tokens).size !== tokens.length)
    throw new Error("Wiki exclusion titles resolved to duplicate node tokens");
  return tokens;
}
