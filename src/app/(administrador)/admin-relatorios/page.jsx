'use client';

import { useState, useEffect } from 'react';
import ComponentContainerCard from '@/components/ComponentContainerCard';
import { CardTitle, Row, Col, Card, Form, Button, Alert, Table } from 'react-bootstrap';
import { useSession } from 'next-auth/react';
import { FaUsers, FaHandshake, FaTicketAlt, FaDownload, FaCalendarAlt } from 'react-icons/fa';

export default function RelatoriosProvedor() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [relatorioTipo, setRelatorioTipo] = useState('clientes');
    const [periodo, setPeriodo] = useState('30');
    const [dadosRelatorio, setDadosRelatorio] = useState(null);

    const handleGerarRelatorio = async () => {
        setLoading(true);
        setMessage(null);

        try {
            const response = await fetch(`/api/admin/relatorios/${relatorioTipo}?periodo=${periodo}`);
            if (response.ok) {
                const data = await response.json();
                setDadosRelatorio(data);
                setMessage({ type: 'success', text: 'Relatório gerado com sucesso!' });
            } else {
                throw new Error('Erro ao gerar relatório');
            }
        } catch (error) {
            setMessage({ type: 'danger', text: 'Erro ao gerar relatório.' });
            setDadosRelatorio(null);
        } finally {
            setLoading(false);
        }
    };

    const handleExportar = () => {
        if (!dadosRelatorio) return;

        // Criar CSV simples
        const headers = Object.keys(dadosRelatorio.dados[0] || {});
        const csvContent = [
            headers.join(','),
            ...dadosRelatorio.dados.map(row => 
                headers.map(header => `"${row[header] || ''}"`).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio_${relatorioTipo}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (status === 'loading') {
        return <div>Carregando...</div>;
    }

    return (
        <ComponentContainerCard id="relatorios-provedor">
            {/* Cabeçalho */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <CardTitle as="h4" className="mb-0">Relatórios</CardTitle>
            </div>

            {message && (
                <Alert variant={message.type} className="mb-4">
                    {message.text}
                </Alert>
            )}

            <Row>
                {/* Configurações do Relatório */}
                <Col lg={4}>
                    <Card className="border-0 shadow-sm">
                        <Card.Body className="p-4">
                            <h5 className="mb-4">
                                <FaCalendarAlt className="me-2" />
                                Configurar Relatório
                            </h5>
                            
                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label>Tipo de Relatório</Form.Label>
                                    <Form.Select
                                        value={relatorioTipo}
                                        onChange={(e) => setRelatorioTipo(e.target.value)}
                                    >
                                        <option value="clientes">Clientes</option>
                                        <option value="parceiros">Parceiros</option>
                                        <option value="vouchers-utilizados">Vouchers Utilizados</option>
                                        <option value="resumo-geral">Resumo Geral</option>
                                    </Form.Select>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Período</Form.Label>
                                    <Form.Select
                                        value={periodo}
                                        onChange={(e) => setPeriodo(e.target.value)}
                                    >
                                        <option value="7">Últimos 7 dias</option>
                                        <option value="30">Últimos 30 dias</option>
                                        <option value="90">Últimos 90 dias</option>
                                        <option value="365">Último ano</option>
                                    </Form.Select>
                                </Form.Group>

                                <Button 
                                    variant="primary"
                                    onClick={handleGerarRelatorio}
                                    disabled={loading}
                                    className="w-100 mb-2"
                                >
                                    {loading ? 'Gerando...' : 'Gerar Relatório'}
                                </Button>

                                {dadosRelatorio && (
                                    <Button 
                                        variant="outline-success"
                                        onClick={handleExportar}
                                        className="w-100"
                                    >
                                        <FaDownload className="me-2" />
                                        Exportar CSV
                                    </Button>
                                )}
                            </Form>
                        </Card.Body>
                    </Card>

                    {/* Resumo Rápido */}
                    <Card className="border-0 shadow-sm mt-4">
                        <Card.Body className="p-4">
                            <h5 className="mb-3">Resumo Rápido</h5>
                            
                            <div className="d-flex align-items-center mb-3">
                                <FaUsers className="text-primary me-3" size={20} />
                                <div>
                                    <div className="fw-semibold">Total Clientes</div>
                                    <div className="text-muted small">Ativos no sistema</div>
                                </div>
                            </div>

                            <div className="d-flex align-items-center mb-3">
                                <FaHandshake className="text-success me-3" size={20} />
                                <div>
                                    <div className="fw-semibold">Total Parceiros</div>
                                    <div className="text-muted small">Parceiros cadastrados</div>
                                </div>
                            </div>

                            <div className="d-flex align-items-center">
                                <FaTicketAlt className="text-info me-3" size={20} />
                                <div>
                                    <div className="fw-semibold">Vouchers Usados</div>
                                    <div className="text-muted small">Este mês</div>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                
                {/* Resultado do Relatório */}
                <Col lg={8}>
                    <Card className="border-0 shadow-sm">
                        <Card.Body className="p-4">
                            <h5 className="mb-4">Resultado do Relatório</h5>
                            
                            {!dadosRelatorio ? (
                                <div className="text-center py-5">
                                    <div className="text-muted">
                                        <FaCalendarAlt size={48} className="mb-3" />
                                        <p>Selecione o tipo de relatório e período, depois clique em "Gerar Relatório"</p>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h6 className="mb-0">
                                            Relatório de {relatorioTipo.charAt(0).toUpperCase() + relatorioTipo.slice(1)}
                                        </h6>
                                        <span className="badge bg-primary">
                                            {dadosRelatorio.total || dadosRelatorio.dados?.length || 0} registros
                                        </span>
                                    </div>

                                    {dadosRelatorio.dados && dadosRelatorio.dados.length > 0 ? (
                                        <div className="table-responsive">
                                            <Table striped hover>
                                                <thead>
                                                    <tr>
                                                        {Object.keys(dadosRelatorio.dados[0]).map((key) => (
                                                            <th key={key} className="text-capitalize">
                                                                {key.replace(/_/g, ' ')}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {dadosRelatorio.dados.slice(0, 10).map((row, index) => (
                                                        <tr key={index}>
                                                            {Object.values(row).map((value, i) => (
                                                                <td key={i}>
                                                                    {typeof value === 'string' && value.length > 30 
                                                                        ? value.substring(0, 30) + '...' 
                                                                        : value || '-'
                                                                    }
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>

                                            {dadosRelatorio.dados.length > 10 && (
                                                <div className="text-center mt-3">
                                                    <small className="text-muted">
                                                        Mostrando 10 de {dadosRelatorio.dados.length} registros. 
                                                        Exporte para ver todos os dados.
                                                    </small>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4">
                                            <div className="text-muted">
                                                <p>Nenhum dado encontrado para o período selecionado.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </ComponentContainerCard>
    );
}