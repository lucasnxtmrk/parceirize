'use client';

import { useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import ValidacaoManual from './ValidacaoManual'; // Importe o componente de validação manual
import ValidacaoQrCode from './ValidacaoQrCode'; // Importe o componente de validação por QR Code

const ValidacaoModal = ({ show, handleClose, validationMode, qrData }) => {
    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Validar Voucher</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {validationMode === 'qr' ? (
                    <ValidacaoQrCode qrData={qrData} />
                ) : (
                    <ValidacaoManual />
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Cancelar
                </Button>
                <Button variant="primary" onClick={() => {
                    // Lógica para validar o voucher (depende do modo de validação)
                    if (validationMode === 'qr') {
                        console.log('Validar voucher com QR Code:', qrData);
                    } else {
                        // Obtenha os dados do formulário de ValidacaoManual
                        // e valide o voucher manualmente
                        console.log('Validar voucher manualmente');
                    }
                    handleClose();
                }}>
                    Validar
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ValidacaoModal;