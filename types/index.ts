export type UserRole = "Admin" | "Staff";

export type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

export type BloodRequestStatus = "Pending" | "Fulfilled" | "Cancelled";

export const BLOOD_TYPES: BloodType[] = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

export const BLOOD_REQUEST_STATUSES: BloodRequestStatus[] = [
  "Pending",
  "Fulfilled",
  "Cancelled",
];
