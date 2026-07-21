export type WikiMetricNode = {
  node_token: string;
  parent_node_token?: string | undefined;
  obj_type: string;
};

const documentTypes = new Set(["doc", "docx"]);

export function countWikiDescendants(root: string, nodes: WikiMetricNode[]) {
  const byParent = new Map<string, WikiMetricNode[]>();
  for (const node of nodes) {
    const key = node.parent_node_token ?? "";
    byParent.set(key, [...(byParent.get(key) ?? []), node]);
  }
  let legacyDescendantCount = 0;
  let documentCount = 0;
  const pending = [...(byParent.get(root) ?? [])];
  while (pending.length) {
    const node = pending.pop()!;
    legacyDescendantCount += 1;
    if (documentTypes.has(node.obj_type)) documentCount += 1;
    pending.push(...(byParent.get(node.node_token) ?? []));
  }
  return { legacyDescendantCount, documentCount };
}
