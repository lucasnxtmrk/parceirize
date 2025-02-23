'use client';

import ChoicesFormInput from '@/components/from/ChoicesFormInput';
import Nouislider from 'nouislider-react';
import { useState } from 'react';
import { Button, Card, CardBody, CardFooter, CardHeader, CardTitle, Col, Row } from 'react-bootstrap';
const PropertiesFilter = () => {
  const [selectedValue, setSelectedValue] = useState([6000, 100000]);
  const handleSliderChange = values => {
    setSelectedValue(values);
  };
  const handleInputChange = event => {
    if (selectedValue[0] <= Math.round(event.target.value)) {
      setSelectedValue([selectedValue[0], Math.round(event.target.value)]);
    }
  };
  return <Col xl={3} lg={12}>
      <Card>
        <CardHeader className="border-bottom">
          <div>
            <CardTitle as={'h4'}>Parceiros</CardTitle>
            <p className="mb-0">Mais de 1.000 parceiros conectados</p>
          </div>
        </CardHeader>
        <CardBody className="border-light">
          <form>
            <label htmlFor="choices-single-groups" className="form-label">
              Estado
            </label>
            <ChoicesFormInput className="form-control" id="choices-single-groups" data-placeholder="Select City">
            <option>Escolha a cidade</option>
              <optgroup label="Pernambuco">
                <option value="Recife">Recife</option>
                <option value="Olinda">Olinda</option>
                <option value="Jaboatão dos Guararapes">Jaboatão dos Guararapes</option>
                <option value="Paulista">Paulista</option>
                <option value="Caruaru">Caruaru</option>
                <option value="Petrolina">Petrolina</option>
                <option value="Cabo de Santo Agostinho">Cabo de Santo Agostinho</option> {/* Incluído */}
                <option value="Ipojuca">Ipojuca</option> {/* Próximo a Cabo */}
                <option value="Moreno">Moreno</option> {/* Próximo a Cabo */}
                <option value="São Lourenço da Mata">São Lourenço da Mata</option> {/* Próximo a Cabo */}
        {/* Adicione outras cidades de Pernambuco próximas a Cabo se desejar */}
    </optgroup>
    {/* Você pode adicionar outros estados/regiões aqui, se necessário */}
</ChoicesFormInput>
          </form>
          <h5 className="text-dark fw-medium my-3"> Nichos Parceiros:</h5>
          <Row className="g-1">
            <Col lg={6}>
              <div className="mb-2">
                <input className="form-check-input" type="checkbox" id="defaultCheck5" />
                &nbsp;
                <label className="form-check-label ms-1" htmlFor="defaultCheck1">
                  Barbearia
                </label>
              </div>
            </Col>
            <Col lg={6}>
              <div className="mb-2">
                <input className="form-check-input" type="checkbox" id="defaultCheck6" />
                &nbsp;
                <label className="form-check-label ms-1" htmlFor="defaultCheck1">
                  Petshop
                </label>
              </div>
            </Col>
            <Col lg={6}>
              <div className="mb-2">
                <input className="form-check-input" type="checkbox" id="defaultCheck7" />
                &nbsp;
                <label className="form-check-label ms-1" htmlFor="defaultCheck1">
                  Academia
                </label>
              </div>
            </Col>
            <Col lg={6}>
              <div className="mb-2">
                <input className="form-check-input" type="checkbox" id="defaultCheck8" />
                &nbsp;
                <label className="form-check-label ms-1" htmlFor="defaultCheck1">
                  Restaurante
                </label>
              </div>
            </Col>
            <Col lg={6}>
              <div className="mb-2">
                <input className="form-check-input" type="checkbox" id="defaultCheck9" />
                &nbsp;
                <label className="form-check-label ms-1" htmlFor="defaultCheck1">
                  Restaurante
                </label>
              </div>
            </Col>
            <Col lg={6}>
              <div className="mb-2">
                <input className="form-check-input" type="checkbox" id="defaultCheck10" />
                &nbsp;
                <label className="form-check-label ms-1" htmlFor="defaultCheck1">
                  Salão de beleza
                </label>
              </div>
            </Col>
          </Row>
        </CardBody>
        <CardFooter>
          <Button variant="primary" className="w-100">
            Aplicar Filtro
          </Button>
        </CardFooter>
      </Card>
    </Col>;
};
export default PropertiesFilter;