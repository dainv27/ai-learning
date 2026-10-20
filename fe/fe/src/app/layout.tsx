import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Approval System',
  description: 'Manage approval requests',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav className="bg-blue-600 text-white shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-xl font-bold">Approval System</h1>
          </div>
        </nav>
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
