export default function SmallLoader() {
    return (
        <div style={{
            position: 'absolute',
            top: 0,
            width: '100%',
            height: '100%',
            left: 0,
            backgroundColor: '#00000017',
            zIndex: 10000000000,
            borderRadius: 'inherit'
        }}>
            <div className="spinner-border" role="status" style={{
                display: 'block',
                margin: 'auto',
                maxWidth: 20,
                minWidth: 20,
                maxHeight: 20,
                minHeight: 20,
            }}>
                <span className="sr-only">Loading...</span>
            </div>
        </div>
    )
}