"use client";

import { Card } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

// Registrar componentes do Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const ChartCard = ({ title, data, type = 'line' }) => {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                cornerRadius: 8,
                callbacks: {
                    label: function(context) {
                        return `Vendas: R$ ${context.parsed.y.toFixed(2)}`;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    color: '#6c757d'
                }
            },
            y: {
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    color: '#6c757d',
                    callback: function(value) {
                        return 'R$ ' + value.toFixed(0);
                    }
                }
            }
        },
        elements: {
            line: {
                tension: 0.4
            },
            point: {
                radius: 4,
                hoverRadius: 6
            }
        }
    };

    const chartData = {
        labels: data?.labels || [],
        datasets: [
            {
                label: 'Vendas',
                data: data?.values || [],
                borderColor: 'rgb(13, 110, 253)',
                backgroundColor: type === 'bar' ? 'rgba(13, 110, 253, 0.1)' : 'rgba(13, 110, 253, 0.05)',
                borderWidth: 2,
                fill: type === 'line'
            }
        ]
    };

    const ChartComponent = type === 'bar' ? Bar : Line;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
        >
            <Card className="h-100 shadow-sm border-0">
                <Card.Header className="bg-white border-0 pb-0">
                    <h5 className="mb-0 fw-bold">{title}</h5>
                </Card.Header>
                <Card.Body>
                    <div style={{ height: '300px', width: '100%' }}>
                        {data && data.labels && data.labels.length > 0 ? (
                            <ChartComponent data={chartData} options={chartOptions} />
                        ) : (
                            <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                                <div className="text-center">
                                    <div className="mb-2">📊</div>
                                    <p>Sem dados para exibir</p>
                                </div>
                            </div>
                        )}
                    </div>
                </Card.Body>
            </Card>
        </motion.div>
    );
};

export default ChartCard;