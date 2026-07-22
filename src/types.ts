export type Role = 'user' | 'owner' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** For owners: the garage they have been verified to manage. */
  ownedGarageId?: string | null;
}

/** A review pulled from Google Maps. Read-only in our app, always labelled as Google-sourced. */
export interface GoogleReview {
  author: string;
  rating: number;
  text: string;
  relativeTime: string;
}

/** A review written by a user inside our app. Separate from Google. */
export interface InternalReview {
  id: string;
  garageId: string;
  userId: string;
  userName: string;
  rating: number;
  text: string;
  createdAt: number;
}

export interface Garage {
  id: string;
  name: string;
  /** Wilayat / city, e.g. "Al Khuwair, Muscat". */
  area: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  services: string[];
  hours: string;
  /** Whether the garage has been verified by the app owners. */
  verified: boolean;
  // --- Data sourced from Google Maps ---
  googleRating: number;
  googleRatingCount: number;
  googleReviews: GoogleReview[];
}

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface OwnerApplication {
  id: string;
  garageId: string;
  garageName: string;
  applicantId: string;
  applicantName: string;
  phone: string;
  note: string;
  status: ApplicationStatus;
  createdAt: number;
}

export interface Database {
  users: User[];
  garages: Garage[];
  reviews: InternalReview[];
  applications: OwnerApplication[];
}
