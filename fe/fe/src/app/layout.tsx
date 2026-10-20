import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Approvals - Phase0 Demo',
  description: 'Approval workflow validation',
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
