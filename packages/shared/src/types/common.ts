/** Note visibility level controlling who can see the content. */
export type Visibility = "public" | "home" | "followers" | "specified";

/** Unique identifier represented as a string. */
export type ID = string;

/** Common timestamp fields shared across entities. */
export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}
