export default function Loader() {
    return (
        <div style={{
            position: 'absolute',
            top: 0,
            width: '100vw',
            height: '100vh',
            left: 0,
            backgroundColor: '#00000017',
            zIndex: 10000000000
        }}>
            <div className="spinner-border" role="status" style={{
                display: 'block',
                margin: '40vh auto auto auto'
            }}>
                <span className="sr-only">Loading...</span>
            </div>
        </div>
    )
}