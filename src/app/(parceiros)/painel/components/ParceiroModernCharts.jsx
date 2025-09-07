"use client";

import { Card, CardBody, CardTitle } from 'react-bootstrap';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';
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
  Filler,
  RadialLinearScale
} from 'chart.js';

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
  Filler,
  RadialLinearScale
);

// Gráfico de vendas diárias
export const DailySalesChart = ({ data }) => {
  if (!data || !data.dias || !data.valores) {
    return (
      <Card className="h-100">
        <CardBody className="d-flex align-items-center justify-content-center" style={{ minHeight: '300px' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
            <p className="text-muted">Carregando vendas diárias...</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const chartData = {
    labels: data.dias,
    datasets: [
      {
        label: 'Vendas Diárias (R$)',
        data: data.valores,
        fill: true,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: 'rgb(59, 130, 246)',
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
        <CardTitle className="h6 text-muted mb-3">📈 Vendas dos Últimos 30 Dias</CardTitle>
        <div style={{ height: '300px' }}>
          <Line data={chartData} options={options} />
        </div>
      </CardBody>
    </Card>
  );
};

// Gráfico de vendas por horário
export const HourlySalesChart = ({ data }) => {
  if (!data || !data.horas || !data.vendas) {
    return (
      <Card className="h-100">
        <CardBody className="d-flex align-items-center justify-content-center" style={{ minHeight: '300px' }}>
          <div className="text-center">
            <div className="spinner-border text-success mb-3" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
            <p className="text-muted">Carregando padrão de horário...</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const chartData = {
    labels: data.horas,
    datasets: [
      {
        label: 'Vendas por Hora',
        data: data.vendas,
        backgroundColor: data.vendas.map((_, index) => {
          // Cores diferentes para diferentes períodos do dia
          if (index >= 6 && index < 12) return 'rgba(245, 158, 11, 0.8)'; // Manhã - amarelo
          if (index >= 12 && index < 18) return 'rgba(59, 130, 246, 0.8)'; // Tarde - azul
          if (index >= 18 && index < 22) return 'rgba(16, 185, 129, 0.8)'; // Noite - verde
          return 'rgba(107, 114, 128, 0.6)'; // Madrugada - cinza
        }),
        borderColor: data.vendas.map((_, index) => {
          if (index >= 6 && index < 12) return 'rgba(245, 158, 11, 1)';
          if (index >= 12 && index < 18) return 'rgba(59, 130, 246, 1)';
          if (index >= 18 && index < 22) return 'rgba(16, 185, 129, 1)';
          return 'rgba(107, 114, 128, 1)';
        }),
        borderWidth: 1
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
            return `Vendas: ${context.parsed.y}`;
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
        <CardTitle className="h6 text-muted mb-3">🕐 Padrão de Vendas por Horário</CardTitle>
        <div style={{ height: '300px' }}>
          <Bar data={chartData} options={options} />
        </div>
      </CardBody>
    </Card>
  );
};

// Gráfico de produtos mais vendidos
export const TopProductsBarChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <Card className="h-100">
        <CardBody className="d-flex align-items-center justify-content-center" style={{ minHeight: '300px' }}>
          <div className="text-center">
            <div className="spinner-border text-warning mb-3" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
            <p className="text-muted">Carregando produtos mais vendidos...</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const chartData = {
    labels: data.map(item => item.nome.length > 20 ? item.nome.substring(0, 20) + '...' : item.nome),
    datasets: [
      {
        label: 'Quantidade Vendida',
        data: data.map(item => item.quantidade),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)'
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(236, 72, 153, 1)'
        ],
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const item = data[context.dataIndex];
            return [
              `Quantidade: ${context.parsed.x}`,
              `Receita: R$ ${item.receita.toFixed(2).replace('.', ',')}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <Card className="h-100">
      <CardBody>
        <CardTitle className="h6 text-muted mb-3">🏆 Top 5 Produtos Mais Vendidos</CardTitle>
        <div style={{ height: '300px' }}>
          <Bar data={chartData} options={options} />
        </div>
      </CardBody>
    </Card>
  );
};

// Gauge de meta mensal
export const MonthlyGoalGauge = ({ current, target }) => {
  if (current === undefined || target === undefined || target === 0) {
    return (
      <Card className="h-100">
        <CardBody className="d-flex align-items-center justify-content-center" style={{ minHeight: '250px' }}>
          <div className="text-center">
            <div className="spinner-border text-info mb-3" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
            <p className="text-muted">Carregando meta mensal...</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const percentage = Math.min(Math.round((current / target) * 100), 100);
  
  const chartData = {
    labels: ['Alcançado', 'Restante'],
    datasets: [
      {
        data: [percentage, 100 - percentage],
        backgroundColor: [
          percentage >= 100 ? '#10b981' : percentage >= 70 ? '#3b82f6' : percentage >= 40 ? '#f59e0b' : '#ef4444',
          '#e5e7eb'
        ],
        borderWidth: 0,
        cutout: '70%'
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
            if (context.dataIndex === 0) {
              return `Alcançado: ${percentage}%`;
            }
            return `Restante: ${100 - percentage}%`;
          }
        }
      }
    }
  };

  return (
    <Card className="h-100">
      <CardBody className="text-center">
        <CardTitle className="h6 text-muted mb-3">🎯 Meta Mensal</CardTitle>
        <div style={{ height: '200px', position: 'relative' }}>
          <Doughnut data={chartData} options={options} />
          <div 
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center'
            }}
          >
            <h2 className="mb-0" style={{ 
              color: percentage >= 100 ? '#10b981' : percentage >= 70 ? '#3b82f6' : percentage >= 40 ? '#f59e0b' : '#ef4444'
            }}>
              {percentage}%
            </h2>
          </div>
        </div>
        <div className="mt-3">
          <p className="mb-1">
            <strong>R$ {current.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
          </p>
          <p className="text-muted small">
            de R$ {target.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </CardBody>
    </Card>
  );
};

// Card de KPI específico para parceiros
export const ParceiroKPICard = ({ title, value, subtitle, icon: Icon, color = '#3b82f6', trend, prefix = '', suffix = '' }) => {
  if (value === undefined || value === null) {
    return (
      <Card className="h-100 border-0 shadow-sm">
        <CardBody className="d-flex align-items-center justify-content-center p-4" style={{ minHeight: '120px' }}>
          <div className="text-center">
            <div className="spinner-border spinner-border-sm mb-2" role="status" style={{ color }}>
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
      if (prefix === 'R$') {
        return prefix + ' ' + val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      }
      if (suffix === '%') {
        return val.toFixed(1) + suffix;
      }
      return prefix + val.toLocaleString('pt-BR') + suffix;
    }
    return prefix + val + suffix;
  };

  return (
    <Card className="h-100 border-0 shadow-sm hover-card" style={{ transition: 'all 0.3s ease' }}>
      <CardBody className="p-4">
        <div className="d-flex justify-content-between align-items-start">
          <div className="flex-grow-1">
            <p className="text-muted small mb-2 text-uppercase fw-bold" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
              {title}
            </p>
            <h3 className="mb-2 fw-bold" style={{ color: color, fontSize: '1.75rem' }}>
              {formatValue(value)}
            </h3>
            {subtitle && (
              <small className="text-muted" style={{ fontSize: '0.875rem' }}>
                {subtitle}
              </small>
            )}
            {trend !== undefined && trend !== null && (
              <div className="mt-2">
                <span className={`small fw-bold px-2 py-1 rounded ${trend >= 0 ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                  {trend >= 0 ? '📈' : '📉'} {Math.abs(trend)}%
                </span>
              </div>
            )}
          </div>
          {Icon && (
            <div 
              className="d-flex align-items-center justify-content-center rounded-circle"
              style={{ 
                width: '56px', 
                height: '56px', 
                backgroundColor: color + '20',
                border: `2px solid ${color}30`
              }}
            >
              <Icon size={28} style={{ color }} />
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};