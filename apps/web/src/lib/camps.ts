import type { Camp } from "@orosaga/contracts";

export function distributeCamps(camps: Camp[], groups = 4) {
  const result: Camp[][] = [];
  let cursor = 0;
  for (let index = 0; index < groups; index += 1) {
    const size =
      Math.floor(camps.length / groups) +
      (index < camps.length % groups ? 1 : 0);
    result.push(camps.slice(cursor, cursor + size));
    cursor += size;
  }
  return result;
}
