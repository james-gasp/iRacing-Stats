export const LICENSE_LETTERS: Record<number, string> = {
  1: "R",
  2: "D",
  3: "C",
  4: "B",
  5: "A",
  6: "P",
};

export const LICENSE_COLORS: Record<string, string> = {
  R: "bg-red-600",
  D: "bg-orange-500",
  C: "bg-yellow-500",
  B: "bg-green-600",
  A: "bg-blue-600",
  P: "bg-black",
};

export function licenseLetter(group: number | null | undefined): string {
  if (!group) return "-";
  return LICENSE_LETTERS[group] ?? "-";
}
