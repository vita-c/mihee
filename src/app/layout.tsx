import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "사과꽃 강의실",
  description: "강의 요청부터 커리큘럼 · PPT 구성까지 한 카드에서 준비해요",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
