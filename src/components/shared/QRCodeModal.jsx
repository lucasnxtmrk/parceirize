"use client";

import { useState, useRef, useEffect } from "react";
import { Modal, Button, Alert, Card } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import { FaQrcode, FaCopy, FaDownload, FaCheck, FaTimes } from "react-icons/fa";
import QRCode from "react-qr-code";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationContainer from "./NotificationContainer";

const QRCodeModal = ({ show, onHide, qrValue, title = "QR Code do Pedido" }) => {
  const [copied, setCopied] = useState(false);
  const { alerts, showSuccess, showError, hideAlert } = useNotifications();
  const qrRef = useRef(null);

  // Reset copied state when modal closes
  useEffect(() => {
    if (!show) {
      setCopied(false);
    }
  }, [show]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrValue);
      setCopied(true);
      showSuccess("Código copiado com sucesso!");
      
      // Reset after 3 seconds
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      showError("Erro ao copiar código");
    }
  };

  const handleDownload = () => {
    try {
      // Create SVG element from QR code
      const svg = qrRef.current.querySelector('svg');
      if (!svg) return;

      // Convert SVG to canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const data = new XMLSerializer().serializeToString(svg);
      const DOMURL = window.URL || window.webkitURL || window;

      const img = new Image();
      const svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
      const url = DOMURL.createObjectURL(svgBlob);

      img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        DOMURL.revokeObjectURL(url);

        // Download canvas as PNG
        const link = document.createElement('a');
        link.download = `qr-code-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
        
        showSuccess("QR Code baixado com sucesso!");
      };

      img.src = url;
    } catch (error) {
      showError("Erro ao baixar QR Code");
    }
  };

  if (!qrValue) return null;

  return (
    <>
      <NotificationContainer alerts={alerts} onDismiss={hideAlert} />
      
      <Modal 
        show={show} 
        onHide={onHide}
        centered
        size="md"
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

              <Modal.Body className="text-center p-4">
                {/* QR Code Display */}
                <motion.div
                  ref={qrRef}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                    delay: 0.2
                  }}
                  className="mb-4"
                >
                  <Card className="border-0 shadow-sm p-3 d-inline-block">
                    <QRCode
                      value={qrValue}
                      size={256}
                      style={{ 
                        height: "auto", 
                        maxWidth: "100%", 
                        width: "100%" 
                      }}
                      fgColor="#000000"
                      bgColor="#ffffff"
                    />
                  </Card>
                </motion.div>

                {/* Code Display */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="bg-light border-0 mb-4">
                    <Card.Body className="py-2">
                      <small className="text-muted d-block mb-1">Código do pedido:</small>
                      <code 
                        className="fs-6 text-dark user-select-all"
                        style={{ fontFamily: 'Monaco, Consolas, monospace' }}
                      >
                        {qrValue}
                      </code>
                    </Card.Body>
                  </Card>
                </motion.div>

                {/* Instructions */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <Alert variant="info" className="border-0 bg-info bg-opacity-10">
                    <small>
                      📱 <strong>Como usar:</strong><br />
                      Apresente este QR Code no estabelecimento para validação dos produtos
                      ou compartilhe o código acima.
                    </small>
                  </Alert>
                </motion.div>
              </Modal.Body>

              <Modal.Footer className="border-0 pt-0">
                <div className="d-flex gap-2 w-100">
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex-grow-1"
                  >
                    <Button
                      variant="outline-primary"
                      className="w-100"
                      onClick={handleCopy}
                      disabled={copied}
                    >
                      {copied ? (
                        <>
                          <FaCheck className="me-2" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <FaCopy className="me-2" />
                          Copiar Código
                        </>
                      )}
                    </Button>
                  </motion.div>

                  <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex-grow-1"
                  >
                    <Button
                      variant="success"
                      className="w-100"
                      onClick={handleDownload}
                    >
                      <FaDownload className="me-2" />
                      Baixar QR
                    </Button>
                  </motion.div>
                </div>
              </Modal.Footer>
            </motion.div>
          )}
        </AnimatePresence>
      </Modal>
    </>
  );
};

export default QRCodeModal;