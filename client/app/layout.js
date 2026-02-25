import './globals.css';
import Providers from './providers';

export const metadata = {
    title: 'PieVideo — Focus & Connect',
    description: 'Video calls built for productivity. Study together, focus together, achieve together.',
    icons: { icon: '/pie_logo.svg' },
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
            </head>
            <body style={{ fontFamily: "'Inter', sans-serif" }}>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
