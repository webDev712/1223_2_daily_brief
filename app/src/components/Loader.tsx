import { useEffect } from "react";

interface LoaderProps {
    solid?: boolean;
    small?: boolean;
}

export default function Loader({ solid = false, small = false }: LoaderProps) {
    useEffect(() => {
        window.scrollTo(0, 0);
        const originalOverflow = document.body.style.overflow;

        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, []);
    return (
        <div style={{
            position: 'absolute',
            top: 0,
            width: small ? '100%' : '100vw',
            height: small ? '100%' : '100vh',
            left: 0,
            backgroundColor: solid ? '#fff' : '#00000017',
            zIndex: 10000000000
        }}>
            <div className="spinner-border" role="status" style={{
                display: 'block',
                margin: small ? '50% auto auto auto' : '40vh auto auto auto'
            }}>
                <span className="sr-only">Loading...</span>
            </div>
        </div>
    )
}