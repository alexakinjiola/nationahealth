import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the logo mark on a full-bleed square (iOS rounds the corners itself). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b4cb4" }}>
        <svg width="132" height="132" viewBox="0 0 32 32">
          <path d="M21.9 10.6A8 8 0 1 0 24 16" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="24" cy="16" r="2.4" fill="#a6dbbb" />
          <path d="M11.5 16h4l1.6-3 2.2 6 1.2-3" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    size,
  );
}
