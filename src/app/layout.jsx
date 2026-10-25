import { Poppins } from "next/font/google";
import "./globals.css";
import AppProviders from "../components/providers/AppProviders.jsx";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata = {
  title: "Asipbook ERP System",
  description: "Asipbook Business Management System.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={poppins.className}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
