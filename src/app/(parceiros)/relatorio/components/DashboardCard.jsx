"use client";

import { Card } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';

const DashboardCard = ({ 
    title, 
    value, 
    icon: IconComponent, 
    color = 'primary', 
    subtitle, 
    trend,
    delay = 0 
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
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
        >
            <Card className="h-100 shadow-sm border-0">
                <Card.Body>
                    <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                            <div className="d-flex align-items-center mb-2">
                                <div 
                                    className={`rounded-circle d-flex align-items-center justify-content-center me-3`}
                                    style={{
                                        width: '48px',
                                        height: '48px',
                                        backgroundColor: `var(--bs-${color})`,
                                        opacity: 0.1
                                    }}
                                >
                                    <IconComponent 
                                        size={20} 
                                        className={`text-${color}`}
                                    />
                                </div>
                                <div>
                                    <h6 className="text-muted mb-0 fw-normal">{title}</h6>
                                </div>
                            </div>
                            
                            <div className="mb-2">
                                <h3 className="fw-bold mb-0">{value}</h3>
                                {subtitle && (
                                    <small className="text-muted">{subtitle}</small>
                                )}
                            </div>

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
        </motion.div>
    );
};

export default DashboardCard;