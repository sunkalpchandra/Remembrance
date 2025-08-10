import {
  Geist,
  Geist_Mono,
  Hedvig_Letters_Sans,
  Hedvig_Letters_Serif,
  IBM_Plex_Mono,
  Manrope,
  Poppins,
} from "next/font/google";
export const poppins = Poppins({
  weight: ["400", "600"],
  preload: false,
});

export const IBM = IBM_Plex_Mono({
  weight: "400",
  subsets: ["latin"],
  preload: false,
});
export const hedvig = Hedvig_Letters_Serif({
  weight: "400",
  preload: false,
});

export const ManRope = Manrope({
  weight: "400",
  preload: false,
});
