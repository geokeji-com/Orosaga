import type { Employee } from "@orosaga/contracts";

export function compareEmployees(
  left: Pick<Employee, "id" | "displayName">,
  right: Pick<Employee, "id" | "displayName">,
) {
  if (left.displayName < right.displayName) return -1;
  if (left.displayName > right.displayName) return 1;
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}
