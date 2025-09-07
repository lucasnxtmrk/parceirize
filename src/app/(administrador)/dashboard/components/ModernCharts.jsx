"use client";

import { useEffect, useRef } from 'react';
import { Card, CardBody, CardTitle, Row, Col } from 'react-bootstrap';
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
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

// Gráfico de linha - Crescimento de clientes e parceiros
export const GrowthLineChart = ({ data }) => {
  if (!data || !data.meses || !data.clientes || !data.parceiros) {
    return (
      <Card className="h-100">
        <CardBody className="d-flex align-items-center justify-content-center" style={{ minHeight: '300px' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
            <p className="text-muted">Carregando dados de crescimento...</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const chartData = {
    labels: data.meses,
    datasets: [
      {
        label: 'Novos Clientes',
        data: data.clientes,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'Novos Parceiros',
        data: data.parceiros,
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  return (
    <Card className="h-100">
      <CardBody>
        <CardTitle className="h6 text-muted mb-3">📈 Crescimento Mensal</CardTitle>
        <div style={{ height: '250px' }}>
          <Line data={chartData} options={options} />
        </div>
      </CardBody>
    </Card>
  );
};

// Gráfico de barras - Vouchers por categoria
export const VouchersBarChart = ({ data }) => {
  if (!data || !data.categorias || !data.totals) {
    return (
      <Card className="h-100">
        <CardBody className="d-flex align-items-center justify-content-center" style={{ minHeight: '300px' }}>
          <div className="text-center">
            <div className="spinner-border text-success mb-3" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
            <p className="text-muted">Carregando dados de vouchers...</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const chartData = {
    labels: data.categorias,
    datasets: [
      {
        label: 'Total Vouchers',
        data: data.totals,
        backgroundColor: [
          'rgba(139, 92, 246, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(156, 163, 175, 0.8)'
        ],
        borderColor: [
          'rgba(139, 92, 246, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(156, 163, 175, 1)'
        ],
        borderWidth: 1,
        borderRadius: 4
      },
      {
        label: 'Vouchers Ativos',
        data: data.ativos,
        backgroundColor: [
          'rgba(139, 92, 246, 0.4)',
          'rgba(59, 130, 246, 0.4)',
          'rgba(16, 185, 129, 0.4)',
          'rgba(245, 158, 11, 0.4)',
          'rgba(239, 68, 68, 0.4)',
          'rgba(156, 163, 175, 0.4)'
        ],
        borderColor: [
          'rgba(139, 92, 246, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(156, 163, 175, 1)'
        ],
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          afterLabel: function(context) {
            const total = context.parsed.y;
            return `Total: ${total} vouchers`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <Card className="h-100">
      <CardBody>
        <CardTitle className="h6 text-muted mb-3">🎟️ Vouchers por Categoria</CardTitle>
        <div style={{ height: '250px' }}>
          <Bar data={chartData} options={options} />
        </div>
      </CardBody>
    </Card>
  );
};

// Gráfico de rosca - Distribuição geral
export const DistribuitionDoughnutChart = ({ stats }) => {
  if (!stats) {
    return (
      <Card className="h-100">
        <CardBody className="d-flex align-items-center justify-content-center" style={{ minHeight: '300px' }}>
          <div className="text-center">
            <div className="spinner-border text-info mb-3" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
            <p className="text-muted">Carregando distribuição...</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const chartData = {
    labels: ['Clientes Ativos', 'Parceiros Ativos', 'Vouchers Disponíveis', 'Produtos Ativos'],
    datasets: [
      {
        data: [stats.totalClientes, stats.totalParceiros, stats.totalVouchers, stats.produtosAtivos],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',    // Azul - Clientes
          'rgba(16, 185, 129, 0.8)',    // Verde - Parceiros  
          'rgba(245, 158, 11, 0.8)',    // Amarelo - Vouchers
          'rgba(139, 92, 246, 0.8)'     // Roxo - Produtos
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(139, 92, 246, 1)'
        ],
        borderWidth: 2
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label;
            const value = context.formattedValue;
            const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <Card className="h-100">
      <CardBody>
        <CardTitle className="h6 text-muted mb-3">📊 Visão Geral do Sistema</CardTitle>
        <div style={{ height: '250px' }}>
          <Doughnut data={chartData} options={options} />
        </div>
      </CardBody>
    </Card>
  );
};

// Gráfico de área - Vendas mensais
export const SalesAreaChart = ({ data }) => {
  if (!data || !data.meses || !data.valores) {
    return (
      <Card className="h-100">
        <CardBody className="d-flex align-items-center justify-content-center" style={{ minHeight: '300px' }}>
          <div className="text-center">
            <div className="spinner-border text-warning mb-3" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
            <p className="text-muted">Carregando dados de vendas...</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const chartData = {
    labels: data.meses,
    datasets: [
      {
        label: 'Vendas (R$)',
        data: data.valores,
        fill: true,
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: 'rgba(16, 185, 129, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Vendas: R$ ${context.parsed.y.toFixed(2).replace('.', ',')}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: function(value) {
            return 'R$ ' + value.toFixed(0);
          }
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <Card className="h-100">
      <CardBody>
        <CardTitle className="h6 text-muted mb-3">💰 Vendas Mensais</CardTitle>
        <div style={{ height: '250px' }}>
          <Line data={chartData} options={options} />
        </div>
      </CardBody>
    </Card>
  );
};

// Card de KPI
export const KPICard = ({ title, value, subtitle, icon: Icon, color = '#3b82f6', trend }) => {
  if (value === undefined || value === null) {
    return (
      <Card className="h-100">
        <CardBody className="d-flex align-items-center justify-content-center" style={{ minHeight: '100px' }}>
          <div className="text-center">
            <div className="spinner-border spinner-border-sm text-primary mb-2" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
            <p className="text-muted small mb-0">Carregando...</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const formatValue = (val) => {
    if (typeof val === 'number') {
      if (title.toLowerCase().includes('taxa') || title.toLowerCase().includes('média')) {
        return val.toFixed(1) + (title.toLowerCase().includes('taxa') ? '%' : '');
      }
      if (title.toLowerCase().includes('receita') || title.toLowerCase().includes('ticket')) {
        return 'R$ ' + val.toFixed(2).replace('.', ',');
      }
      return val.toLocaleString('pt-BR');
    }
    return val;
  };

  return (
    <Card className="h-100 border-0 shadow-sm">
      <CardBody className="p-4">
        <div className="d-flex justify-content-between align-items-start">
          <div className="flex-grow-1">
            <p className="text-muted small mb-2">{title}</p>
            <h3 className="mb-1 fw-bold" style={{ color: color }}>
              {formatValue(value)}
            </h3>
            {subtitle && <small className="text-muted">{subtitle}</small>}
            {trend !== undefined && trend !== null && (
              <div className="mt-2">
                <span className={`small fw-bold ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
                  {trend >= 0 ? '↗️' : '↘️'} {Math.abs(trend)}%
                </span>
              </div>
            )}
          </div>
          {Icon && (
            <div 
              className="d-flex align-items-center justify-content-center rounded"
              style={{ 
                width: '48px', 
                height: '48px', 
                backgroundColor: color + '20' 
              }}
            >
              <Icon size={24} style={{ color }} />
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};