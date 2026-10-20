import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Phase0 Demo - Approve',
  description: 'Approval request management interface',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}
