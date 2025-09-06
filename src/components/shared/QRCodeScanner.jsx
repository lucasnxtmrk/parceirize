"use client";

import { useState, useRef, useEffect } from "react";
import { Modal, Button, Alert, Card, Form } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import { FaCamera, FaKeyboard, FaQrcode, FaTimes, FaCheck, FaExclamationTriangle } from "react-icons/fa";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationContainer from "./NotificationContainer";

const QRCodeScanner = ({ 
  show, 
  onHide, 
  onScan, 
  title = "Validar QR Code", 
  placeholder = "Cole o código do QR ou use a câmera" 
}) => {
  const [scanMode, setScanMode] = useState("manual"); // "manual" ou "camera"
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scannerInstance, setScannerInstance] = useState(null);
  const { alerts, showSuccess, showError, hideAlert } = useNotifications();
  const scannerRef = useRef(null);

  // Cleanup scanner when modal closes
  useEffect(() => {
    if (!show) {
      cleanupScanner();
      setManualCode("");
      setScanMode("manual");
      setCameraError(null);
    }
  }, [show]);

  // Cleanup scanner on component unmount
  useEffect(() => {
    return () => {
      cleanupScanner();
    };
  }, []);

  const cleanupScanner = () => {
    if (scannerInstance) {
      try {
        scannerInstance.clear();
      } catch (error) {
        console.error("Erro ao limpar scanner:", error);
      }
      setScannerInstance(null);
    }
    setIsScanning(false);
  };

  const startCameraScanner = async () => {
    try {
      setCameraError(null);
      setIsScanning(true);

      // Verificar se já existe uma instância
      if (scannerInstance) {
        cleanupScanner();
      }

      // Aguardar um pouco para o DOM estar pronto
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!scannerRef.current) {
        throw new Error("Scanner container não encontrado");
      }

      const scanner = new Html5QrcodeScanner(
        "qr-scanner-container",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
        },
        false
      );

      scanner.render(
        (decodedText) => {
          // QR Code lido com sucesso
          showSuccess("QR Code lido com sucesso!");
          onScan(decodedText);
          cleanupScanner();
          onHide();
        },
        (error) => {
          // Ignorar erros de scanning contínuo
          if (error.includes("NotFoundException")) {
            return;
          }
          console.error("Erro no scanner:", error);
        }
      );

      setScannerInstance(scanner);
    } catch (error) {
      console.error("Erro ao inicializar câmera:", error);
      
      let errorMessage = "Erro ao acessar a câmera";
      
      if (error.name === "NotAllowedError") {
        errorMessage = "Permissão negada para acessar a câmera";
      } else if (error.name === "NotFoundError") {
        errorMessage = "Nenhuma câmera encontrada";
      } else if (error.name === "NotSupportedError") {
        errorMessage = "Câmera não suportada neste navegador";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Câmera está em uso por outro aplicativo";
      }
      
      setCameraError(errorMessage);
      setIsScanning(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode("");
      onHide();
    }
  };

  const toggleScanMode = (mode) => {
    cleanupScanner();
    setScanMode(mode);
    setCameraError(null);
    
    if (mode === "camera") {
      // Aguardar um pouco antes de iniciar a câmera
      setTimeout(startCameraScanner, 200);
    }
  };

  return (
    <>
      <NotificationContainer alerts={alerts} onDismiss={hideAlert} />
      
      <Modal 
        show={show} 
        onHide={onHide}
        centered
        size="lg"
        backdrop="static"
      >
        <AnimatePresence>
          {show && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <Modal.Header className="border-0 pb-0">
                <Modal.Title className="d-flex align-items-center">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <FaQrcode className="text-primary me-2" />
                  </motion.div>
                  {title}
                </Modal.Title>
                <Button
                  variant="link"
                  className="btn-close"
                  onClick={onHide}
                  style={{ textDecoration: 'none' }}
                >
                  <FaTimes />
                </Button>
              </Modal.Header>

              <Modal.Body className="p-4">
                {/* Botões de alternância entre modos */}
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="d-flex gap-2 mb-4"
                >
                  <Button
                    variant={scanMode === "manual" ? "primary" : "outline-primary"}
                    onClick={() => toggleScanMode("manual")}
                    className="flex-grow-1"
                  >
                    <FaKeyboard className="me-2" />
                    Inserir Código
                  </Button>
                  <Button
                    variant={scanMode === "camera" ? "primary" : "outline-primary"}
                    onClick={() => toggleScanMode("camera")}
                    className="flex-grow-1"
                  >
                    <FaCamera className="me-2" />
                    Usar Câmera
                  </Button>
                </motion.div>

                {/* Modo Manual */}
                {scanMode === "manual" && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="border-0 bg-light">
                      <Card.Body>
                        <Form onSubmit={handleManualSubmit}>
                          <Form.Group className="mb-3">
                            <Form.Label>Código do QR:</Form.Label>
                            <Form.Control
                              type="text"
                              value={manualCode}
                              onChange={(e) => setManualCode(e.target.value)}
                              placeholder={placeholder}
                              autoFocus
                              className="form-control-lg"
                            />
                          </Form.Group>
                          <div className="d-grid">
                            <Button
                              type="submit"
                              variant="success"
                              size="lg"
                              disabled={!manualCode.trim()}
                            >
                              <FaCheck className="me-2" />
                              Validar Código
                            </Button>
                          </div>
                        </Form>
                      </Card.Body>
                    </Card>
                  </motion.div>
                )}

                {/* Modo Câmera */}
                {scanMode === "camera" && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="border-0">
                      <Card.Body className="text-center">
                        {cameraError ? (
                          <Alert variant="danger" className="d-flex align-items-center">
                            <FaExclamationTriangle className="me-2" />
                            {cameraError}
                          </Alert>
                        ) : (
                          <>
                            <div
                              id="qr-scanner-container"
                              ref={scannerRef}
                              style={{ 
                                minHeight: "300px",
                                width: "100%"
                              }}
                            />
                            {isScanning && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mt-3"
                              >
                                <Alert variant="info" className="mb-0">
                                  <small>
                                    📱 Posicione o QR Code dentro da área destacada para fazer a leitura
                                  </small>
                                </Alert>
                              </motion.div>
                            )}
                          </>
                        )}
                      </Card.Body>
                    </Card>
                  </motion.div>
                )}

                {/* Instruções */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-4"
                >
                  <Alert variant="info" className="border-0 bg-info bg-opacity-10">
                    <small>
                      <strong>💡 Dicas:</strong><br />
                      • Use &quot;Inserir Código&quot; para colar o código manualmente<br />
                      • Use &quot;Usar Câmera&quot; para escanear o QR Code diretamente<br />
                      • Certifique-se de ter boa iluminação ao usar a câmera
                    </small>
                  </Alert>
                </motion.div>
              </Modal.Body>

              <Modal.Footer className="border-0 pt-0">
                <Button variant="secondary" onClick={onHide}>
                  Cancelar
                </Button>
              </Modal.Footer>
            </motion.div>
          )}
        </AnimatePresence>
      </Modal>
    </>
  );
};

export default QRCodeScanner;