import { ReactNode } from "react";

/**
 * Props for HeaderText component
 */
export interface HeaderTextProps {
  children: ReactNode; // The text content to display
  size?: number; // Optional font size for the header
  paddingTop?: number; // Optional padding from the top
}
