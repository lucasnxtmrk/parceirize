"use client";

import { Card } from 'react-bootstrap';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';

const DashboardCard = ({ 
    title, 
    value, 
    icon: IconComponent, 
    color = 'primary', 
    subtitle, 
    trend
}) => {
    const getTrendIcon = () => {
        if (!trend) return null;
        if (trend > 0) return <FaArrowUp className="text-success me-1" size={12} />;
        if (trend < 0) return <FaArrowDown className="text-danger me-1" size={12} />;
        return null;
    };

    const getTrendText = () => {
        if (!trend) return '';
        const sign = trend > 0 ? '+' : '';
        return `${sign}${trend}% vs mês anterior`;
    };

    const getTrendColor = () => {
        if (!trend) return 'text-muted';
        return trend > 0 ? 'text-success' : 'text-danger';
    };

    return (
        <Card className="h-100 border-0 bg-white" style={{ 
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            transition: 'box-shadow 0.2s ease'
        }}>
            <Card.Body className="p-3">
                <div className="d-flex align-items-start gap-3">
                    <div 
                        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: `var(--bs-${color})`,
                            opacity: 0.1
                        }}
                    >
                        <IconComponent 
                            size={18} 
                            className={`text-${color}`}
                        />
                    </div>
                    
                    <div className="flex-grow-1 min-w-0">
                        <h6 className="text-muted mb-1 fw-normal small">{title}</h6>
                        <h4 className="fw-bold mb-1 text-truncate">{value}</h4>
                        
                        {subtitle && (
                            <p className="small text-muted mb-2">{subtitle}</p>
                        )}

                        {trend !== undefined && (
                            <div className="d-flex align-items-center">
                                {getTrendIcon()}
                                <small className={`${getTrendColor()} fw-medium`}>
                                    {getTrendText()}
                                </small>
                            </div>
                        )}
                    </div>
                </div>
            </Card.Body>
        </Card>
    );
};

export default DashboardCard;