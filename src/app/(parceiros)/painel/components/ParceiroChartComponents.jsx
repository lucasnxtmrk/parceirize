"use client";

import { LineChart } from '@mui/x-charts/LineChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { AreaChart } from '@mui/x-charts/LineChart';
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge';
import { SparkLineChart } from '@mui/x-charts/SparkLineChart';
import { Card, CardBody, CardTitle } from 'react-bootstrap';

// Gráfico de área - Vendas ao longo do tempo
export const SalesAreaChart = ({ data }) => {
  if (!data || !data.days || !data.vendas) {
    return (
      <Card className="shadow-sm border-0 h-100">
        <CardBody className="d-flex align-items-center justify-content-center" style={{ minHeight: '300px' }}>
          <p className="text-muted">Carregando dados de vendas...</p>
        </CardBody>
      </Card>
    );
  }

  const series = [
    { 
      data: data.vendas, 
      label: 'Vendas', 
      color: '#8b5cf6',
      area: true,
      curve: 'catmullRom'
    }
  ];

  if (data.meta && data.meta.length > 0) {
    series.push({ 
      data: data.meta, 
      label: 'Meta', 
      color: '#ef4444',
      curve: 'linear'
    });
  }

  return (
    <Card className="shadow-sm border-0 h-100">
      <CardBody>
        <CardTitle className="h6 text-muted mb-3">Vendas da Semana</CardTitle>
        <LineChart
          width={500}
          height={300}
          series={series}
          xAxis={[{ scaleType: 'point', data: data.days }]}
          sx={{
            '.MuiLineElement-root': {
              strokeWidth: 2,
            },
            '.MuiAreaElement-root': {
              fillOpacity: 0.3,
            },
          }}
        />
      </CardBody>
    </Card>
  );
};

// Gráfico de barras - Produtos mais vendidos
export const TopProductsChart = ({ data }) => {
  if (!data || !data.produtos || !data.vendas || data.produtos.length === 0) {
    return (
      <Card className="shadow-sm border-0 h-100">
        <CardBody className="d-flex align-items-center justify-content-center" style={{ minHeight: '300px' }}>
          <p className="text-muted">Carregando produtos mais vendidos...</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-0 h-100">
      <CardBody>
        <CardTitle className="h6 text-muted mb-3">Top 5 Produtos</CardTitle>
        <BarChart
          width={500}
          height={300}
          series={[
            { data: data.vendas, label: 'Vendas', color: '#10b981' }
          ]}
          yAxis={[{ scaleType: 'band', data: data.produtos, id: 'produtos' }]}
          xAxis={[{ id: 'vendas' }]}
          layout="horizontal"
          margin={{ left: 100 }}
          sx={{
            '.MuiBarElement-root': {
              rx: 4,
            },
          }}
        />
      </CardBody>
    </Card>
  );
};

// Gráfico de linha - Taxa de conversão
export const ConversionRateChart = ({ data }) => {
  if (!data || !data.horas || !data.taxa) {
    return (
      <Card className="shadow-sm border-0 h-100">
        <CardBody className="d-flex align-items-center justify-content-center" style={{ minHeight: '250px' }}>
          <p className="text-muted">Carregando taxa de conversão...</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-0 h-100">
      <CardBody>
        <CardTitle className="h6 text-muted mb-3">Taxa de Conversão por Horário</CardTitle>
        <LineChart
          width={500}
          height={250}
          series={[
            { 
              data: data.taxa, 
              label: 'Taxa (%)', 
              color: '#f59e0b',
              curve: 'monotoneX'
            },
          ]}
          xAxis={[{ scaleType: 'point', data: data.horas }]}
          yAxis={[{ min: 0, max: 100 }]}
          sx={{
            '.MuiLineElement-root': {
              strokeWidth: 3,
            },
            '.MuiMarkElement-root': {
              scale: '1',
            },
          }}
        />
      </CardBody>
    </Card>
  );
};

// Gauge - Meta mensal
export const MonthlyGoalGauge = ({ current, target }) => {
  if (current === undefined || current === null || target === undefined || target === null) {
    return (
      <Card className="shadow-sm border-0 h-100">
        <CardBody className="d-flex align-items-center justify-content-center" style={{ minHeight: '250px' }}>
          <p className="text-muted small">Carregando meta mensal...</p>
        </CardBody>
      </Card>
    );
  }

  const percentage = Math.round((current / target) * 100);
  
  return (
    <Card className="shadow-sm border-0 h-100">
      <CardBody className="text-center">
        <CardTitle className="h6 text-muted mb-3">Meta Mensal</CardTitle>
        <Gauge
          width={200}
          height={150}
          value={percentage}
          valueMax={100}
          startAngle={-110}
          endAngle={110}
          sx={{
            [`& .${gaugeClasses.valueText}`]: {
              fontSize: 28,
              transform: 'translate(0px, 0px)',
              fontWeight: 'bold',
            },
            [`& .${gaugeClasses.valueArc}`]: {
              fill: percentage >= 100 ? '#10b981' : percentage >= 70 ? '#3b82f6' : percentage >= 40 ? '#f59e0b' : '#ef4444',
            },
            [`& .${gaugeClasses.referenceArc}`]: {
              fill: '#e5e7eb',
            },
          }}
          text={({ value }) => `${value}%`}
        />
        <div className="mt-3">
          <p className="mb-1 text-dark">
            <strong>R$ {current.toLocaleString('pt-BR')}</strong>
          </p>
          <p className="text-muted small">
            de R$ {target.toLocaleString('pt-BR')}
          </p>
        </div>
      </CardBody>
    </Card>
  );
};

// Card de métrica com mini gráfico
export const MetricCard = ({ title, value, subtitle, sparklineData, trend, icon: Icon, color = '#3b82f6' }) => {
  if (value === undefined || value === null) {
    return (
      <Card className="shadow-sm border-0">
        <CardBody className="d-flex align-items-center justify-content-center" style={{ minHeight: '120px' }}>
          <p className="text-muted small">Carregando...</p>
        </CardBody>
      </Card>
    );
  }

  const isPositive = trend >= 0;

  return (
    <Card className="shadow-sm border-0">
      <CardBody>
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <p className="text-muted small mb-1">{title}</p>
            <h4 className="mb-0">{value}</h4>
            {subtitle && <small className="text-muted">{subtitle}</small>}
          </div>
          {Icon && (
            <div className={`p-2 rounded`} style={{ backgroundColor: `${color}20` }}>
              <Icon size={24} style={{ color }} />
            </div>
          )}
        </div>
        
        <div className="d-flex justify-content-between align-items-center">
          {sparklineData && sparklineData.length > 0 && (
            <SparkLineChart
              data={sparklineData}
              width={120}
              height={40}
              colors={[color]}
              showHighlight
              showTooltip
            />
          )}
          {trend !== undefined && trend !== null && (
            <span className={`small fw-bold ${isPositive ? 'text-success' : 'text-danger'}`}>
              {isPositive ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
        </div>
      </CardBody>
    </Card>
  );
};