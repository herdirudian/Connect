import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function checkIsBirthdayPeriod(dobString: string | null | undefined): boolean {
    if (!dobString) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dob = new Date(dobString);
    const currentYear = today.getFullYear();
    
    const birthdayThisYear = new Date(currentYear, dob.getMonth(), dob.getDate());
    const diffTime = birthdayThisYear.getTime() - today.getTime();
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
       const birthdayNextYear = new Date(currentYear + 1, dob.getMonth(), dob.getDate());
       const diffTimeNext = birthdayNextYear.getTime() - today.getTime();
       diffDays = Math.ceil(diffTimeNext / (1000 * 60 * 60 * 24));
    }
    
    return diffDays >= 0 && diffDays <= 3;
}

export function formatDate(date: string | Date): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function maskName(name: string): string {
  if (!name) return 'Guest';
  return name
    .split(' ')
    .map(part => {
      if (part.length === 0) return '';
      // Always show first letter + 4 stars, or more if name is longer
      // Example: "Hendra" -> "H*****"
      // User requested: "misal H**** R*****"
      // Let's make it simple: First char + fixed 4 asterisks for consistent look, or matching length?
      // User example "H****" (5 chars total) for "H..."
      // Let's use: First char + (length-1) asterisks, but minimum 4 asterisks
      const starCount = Math.max(4, part.length - 1);
      return part[0] + '*'.repeat(starCount);
    })
    .join(' ');
}
