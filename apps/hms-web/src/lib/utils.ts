/**
 * Utility function for merging class names with Tailwind CSS
 */
export function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
