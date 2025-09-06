import { FormControl, FormGroup, FormLabel } from 'react-bootstrap';
import Feedback from 'react-bootstrap/esm/Feedback';
import { Controller } from 'react-hook-form';
const TextFormInput = ({
  name,
  containerClassName: containerClass,
  control,
  id,
  label,
  noValidate,
  labelClassName: labelClass,
  ...other
}) => {
  return (
    <Controller 
      name={name} 
      defaultValue={''} 
      control={control} 
      render={({field, fieldState}) => (
        <FormGroup className={`mb-3 ${containerClass || ''}`}>
          {label && (typeof label === 'string' ? 
            <FormLabel 
              htmlFor={id ?? name} 
              className={`form-label mb-2 ${labelClass || ''}`}
              style={{color: '#374151', fontWeight: '500', fontSize: '0.875rem'}}
            >
              {label}
            </FormLabel> : <>{label}</>
          )}
          <FormControl 
            id={id ?? name} 
            {...other} 
            {...field} 
            isInvalid={Boolean(fieldState.error?.message)}
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              fontSize: '0.875rem',
              backgroundColor: '#ffffff',
              color: '#334155',
              transition: 'all 0.15s ease',
              ...other.style
            }}
          />
          {!noValidate && fieldState.error?.message && 
            <Feedback type="invalid" style={{fontSize: '0.8125rem', marginTop: '0.375rem', color: '#ef4444'}}>
              {fieldState.error?.message}
            </Feedback>
          }
        </FormGroup>
      )} 
    />
  );
};
export default TextFormInput;