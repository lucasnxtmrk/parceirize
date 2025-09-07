"use client";

import { LineChart } from '@mui/x-charts/LineChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge';
import { SparkLineChart } from '@mui/x-charts/SparkLineChart';
import { Card, CardBody, CardTitle } from 'react-bootstrap';
import { useTheme } from '@emotion/react';

// Gráfico de linha - Crescimento de clientes/parceiros
export const GrowthLineChart = ({ data }) => {
  if (!data || !data.months || !data.clientes || !data.parceiros) {
    return (
      <Card className="shadow-sm border-0 h-100">
        <CardBody className="d-flex align-items-center justify-content-center" style={{ minHeight: '300px' }}>
          <p className="text-muted">Carregando dados de crescimento...</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-0 h-100">
      <CardBody>
        <CardTitle className="h6 text-muted mb-3">Crescimento Mensal</CardTitle>
        <LineChart
          width={500}
          height={300}
          series={[
            { data: data.clientes, label: 'Clientes', color: '#3b82f6' },
            { data: data.parceiros, label: 'Parceiros', color: '#10b981' },
          ]}
          xAxis={[{ scaleType: 'point', data: data.months }]}
          sx={{
            '.MuiLineElement-root': {
              strokeWidth: 2,
            },
            '.MuiMarkElement-root': {
              scale: '0.8',
            },
          }}
        />
      </CardBody>
    </Card>
  );
};

// Gráfico de barras - Vouchers por categoria
export const VouchersBarChart = ({ data }) => {
  if (!data || !data.categories || !data.totals) {
    return (
      <Card className="shadow-sm border-0 h-100">
        <CardBody className="d-flex align-items-center justify-content-center" style={{ minHeight: '300px' }}>
          <p className="text-muted">Carregando dados de vouchers...</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-0 h-100">
      <CardBody>
        <CardTitle className="h6 text-muted mb-3">Vouchers por Categoria</CardTitle>
        <BarChart
          width={500}
          height={300}
          series={[
            { data: data.totals, label: 'Total Vouchers', color: '#8b5cf6' },
            { data: data.ativos, label: 'Vouchers Ativos', color: '#10b981' }
          ]}
          xAxis={[{ scaleType: 'band', data: data.categories, id: 'categories' }]}
          yAxis={[{ id: 'vouchers' }]}
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

// Gráfico de pizza - Distribuição por categoria
export const CategoryPieChart = ({ data }) => {
  if (!data || !data.labels || !data.values) {
    return (
      <Card className="shadow-sm border-0 h-100">
        <CardBody className="d-flex align-items-center justify-content-center" style={{ minHeight: '300px' }}>
          <p className="text-muted">Carregando distribuição por categoria...</p>
        </CardBody>
      </Card>
    );
  }

  // Transform data for PieChart
  const pieData = data.labels.map((label, index) => ({
    id: index,
    label: label,
    value: data.values[index]
  }));

  return (
    <Card className="shadow-sm border-0 h-100">
      <CardBody>
        <CardTitle className="h6 text-muted mb-3">Visão Geral do Sistema</CardTitle>
        <PieChart
          series={[
            {
              data: pieData,
              highlightScope: { faded: 'global', highlighted: 'item' },
              faded: { innerRadius: 30, additionalRadius: -30, color: 'gray' },
            },
          ]}
          width={500}
          height={300}
        />
      </CardBody>
    </Card>
  );
};

// KPI Card com Sparkline
export const KPICard = ({ title, value, trend, sparklineData, color = '#3b82f6' }) => {
  if (value === undefined || value === null) {
    return (
      <Card className="shadow-sm border-0">
        <CardBody className="d-flex align-items-center justify-content-center" style={{ minHeight: '100px' }}>
          <p className="text-muted small">Carregando...</p>
        </CardBody>
      </Card>
    );
  }

  const isPositive = trend >= 0;

  return (
    <Card className="shadow-sm border-0">
      <CardBody className="d-flex justify-content-between align-items-center">
        <div>
          <p className="text-muted small mb-1">{title}</p>
          <h3 className="mb-0">{value}</h3>
          {trend !== undefined && trend !== null && (
            <span className={`small ${isPositive ? 'text-success' : 'text-danger'}`}>
              {isPositive ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
        </div>
        {sparklineData && sparklineData.length > 0 && (
          <div>
            <SparkLineChart
              data={sparklineData}
              width={100}
              height={40}
              colors={[color]}
              showHighlight
              showTooltip
            />
          </div>
        )}
      </CardBody>
    </Card>
  );
};

// Gauge Chart - Taxa de conversão
export const ConversionGauge = ({ value, title = "Taxa de Conversão" }) => {
  if (value === undefined || value === null) {
    return (
      <Card className="shadow-sm border-0">
        <CardBody className="d-flex align-items-center justify-content-center" style={{ minHeight: '200px' }}>
          <p className="text-muted small">Carregando {title.toLowerCase()}...</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-0">
      <CardBody className="text-center">
        <CardTitle className="h6 text-muted mb-3">{title}</CardTitle>
        <Gauge
          width={200}
          height={150}
          value={value}
          valueMax={100}
          startAngle={-90}
          endAngle={90}
          sx={{
            [`& .${gaugeClasses.valueText}`]: {
              fontSize: 24,
              transform: 'translate(0px, 0px)',
            },
            [`& .${gaugeClasses.valueArc}`]: {
              fill: value >= 70 ? '#10b981' : value >= 40 ? '#f59e0b' : '#ef4444',
            },
          }}
          text={({ value }) => `${value}%`}
        />
      </CardBody>
    </Card>
  );
};