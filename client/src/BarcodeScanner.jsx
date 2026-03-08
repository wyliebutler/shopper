import { useEffect, useRef } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { X } from 'lucide-react'

const BarcodeScanner = ({ onScan, onClose }) => {
    const scannerRef = useRef(null)

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                videoConstraints: {
                    facingMode: "environment"
                }
            },
            /* verbose= */ false
        )

        scanner.render(
            (decodedText) => {
                scanner.clear()
                onScan(decodedText)
            },
            (errorMessage) => {
                // ignore errors during scanning
            }
        )

        scannerRef.current = scanner

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => {
                    console.error("Failed to clear scanner. ", error)
                })
            }
        }
    }, [onScan])

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '500px',
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                position: 'relative'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        zIndex: 10
                    }}
                >
                    <X size={24} color="#333" />
                </button>
                <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333' }}>Scan Barcode</h2>
                <div id="reader" width="100%"></div>
            </div>
        </div>
    )
}

export default BarcodeScanner
