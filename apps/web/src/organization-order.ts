import type { Employee } from "@orosaga/contracts";

export function isDepartmentHead(person: Pick<Employee, "title">) {
  return /(?:部门|部)负责人$/.test(person.title.trim());
}

export function compareEmployees(
  left: Pick<Employee, "id" | "displayName" | "title">,
  right: Pick<Employee, "id" | "displayName" | "title">,
) {
  const headDifference =
    Number(isDepartmentHead(right)) - Number(isDepartmentHead(left));
  if (headDifference) return headDifference;
  if (left.displayName < right.displayName) return -1;
  if (left.displayName > right.displayName) return 1;
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}
