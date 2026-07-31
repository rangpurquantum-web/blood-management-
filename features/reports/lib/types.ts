// Shared types for the Reports feature

export interface Filters {
  bloodGroup: string;
  area: string;
  eligible: string;
  gender: string;
  ageMin: string;
  ageMax: string;
  createdFrom: string;
  createdTo: string;
  lastDonationFrom: string;
  lastDonationTo: string;
}

export const EMPTY_FILTERS: Filters = {
  bloodGroup: "",
  area: "",
  eligible: "",
  gender: "",
  ageMin: "",
  ageMax: "",
  createdFrom: "",
  createdTo: "",
  lastDonationFrom: "",
  lastDonationTo: "",
};
