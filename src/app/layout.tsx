import type { Metadata } from "next";
import { Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Social Universe - SecondMe 登录",
  description: "使用 SecondMe 账号登录",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={notoSans.className}>
        {children}
      </body>
    </html>
  );
}