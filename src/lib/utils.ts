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
