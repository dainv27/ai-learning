import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Phase0 Demo - Approvals',
  description: 'Approval workflow validation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
