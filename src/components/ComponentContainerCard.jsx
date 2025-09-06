import clsx from 'clsx';
import Link from 'next/link';
import { Card, CardBody, CardTitle } from 'react-bootstrap';
const ComponentContainerCard = ({
  title,
  id,
  description,
  children,
  titleClass,
  descriptionClass
}) => {
  return (
    <Card 
      className="border-0" 
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        marginBottom: '1.5rem'
      }}
    >
      <CardBody style={{padding: '1.5rem'}}>
        {title && (
          <CardTitle 
            as={'h5'} 
            className={clsx('anchor mb-3', titleClass)} 
            id={id}
            style={{
              color: '#0f172a',
              fontWeight: '600',
              fontSize: '1.125rem',
              marginBottom: '0.5rem'
            }}
          >
            {title}
            <Link 
              className="anchor-link" 
              href={`#${id}`}
              style={{
                color: '#64748b',
                textDecoration: 'none',
                marginLeft: '0.5rem',
                fontSize: '0.875rem'
              }}
            >
              #
            </Link>
          </CardTitle>
        )}
        {!!description && (
          <p 
            className={clsx('text-muted mb-3', descriptionClass)}
            style={{
              color: '#64748b',
              fontSize: '0.875rem',
              lineHeight: '1.5'
            }}
          >
            {description}
          </p>
        )}
        <div>{children}</div>
      </CardBody>
    </Card>
  );
};
export default ComponentContainerCard;