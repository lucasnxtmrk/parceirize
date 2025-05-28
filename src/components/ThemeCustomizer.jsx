'use client';

import { Button, Col, Offcanvas, OffcanvasBody, OffcanvasHeader, Row } from 'react-bootstrap';
import { useLayoutContext } from '@/context/useLayoutContext';
import { toSentenceCase } from '@/utils/change-casing';
import SimplebarReactClient from './wrappers/SimplebarReactClient';

const EsquemaDeCores = () => {
  const {
    theme,
    changeTheme
  } = useLayoutContext();
  const modos = ['claro', 'escuro'];
  return <div>
      <h5 className="mb-3 font-16 fw-semibold">Esquema de Cores</h5>
      {modos.map((modo, idx) => <div key={modo + idx} className="form-check mb-2">
          <input className="form-check-input" type="radio" name="data-bs-theme" id={`layout-color-${modo}`} onChange={() => changeTheme(modo)} checked={theme === modo} />
          <label className="form-check-label" htmlFor={`layout-color-${modo}`}>
            {toSentenceCase(modo)}
          </label>
        </div>)}
    </div>;
};

const TemaTopbar = () => {
  const {
    topbarTheme,
    changeTopbarTheme
  } = useLayoutContext();
  const modos = ['claro', 'escuro'];
  return <div>
      <h5 className="my-3 font-16 fw-semibold">Cor da Barra Superior</h5>
      {modos.map((modo, idx) => <div key={idx + modo} className="form-check mb-2">
          <input className="form-check-input" type="radio" name="data-topbar-color" id={`topbar-color-${modo}`} onChange={() => changeTopbarTheme(modo)} checked={topbarTheme === modo} />
          <label className="form-check-label" htmlFor={`topbar-color-${modo}`}>
            {toSentenceCase(modo)}
          </label>
        </div>)}
    </div>;
};

const TemaMenu = () => {
  const {
    menu: {
      theme
    },
    changeMenu: {
      theme: changeMenuTheme
    }
  } = useLayoutContext();
  const modos = ['claro', 'escuro'];
  return <div>
      <h5 className="my-3 font-16 fw-semibold">Cor do Menu</h5>
      {modos.map((modo, idx) => <div key={idx + modo + idx} className="form-check mb-2">
          <input className="form-check-input" type="radio" name="data-menu-color" id={`leftbar-color-${modo}`} onChange={() => changeMenuTheme(modo)} checked={theme === modo} />
          <label className="form-check-label" htmlFor={`leftbar-color-${modo}`}>
            {toSentenceCase(modo)}
          </label>
        </div>)}
    </div>;
};

const TamanhoSidebar = () => {
  const {
    menu: {
      size: menuSize
    },
    changeMenu: {
      size: changeMenuSize
    }
  } = useLayoutContext();
  const tamanhos = [{
    name: 'Padrão',
    size: 'default'
  }, {
    name: 'Condensado',
    size: 'condensed'
  }, {
    name: 'Oculto',
    size: 'hidden'
  }, {
    name: 'Pequeno Hover Ativo',
    size: 'sm-hover-active'
  }, {
    name: 'Pequeno Hover',
    size: 'sm-hover'
  }];
  return <div>
      <h5 className="my-3 font-16 fw-semibold">Tamanho da Barra Lateral</h5>
      {tamanhos.map((tamanho, idx) => <div key={tamanho.size + idx} className="form-check mb-2">
          <input className="form-check-input" type="radio" name="data-menu-size" id={`leftbar-size-${tamanho.size}`} onChange={() => changeMenuSize(tamanho.size)} checked={menuSize === tamanho.size} />
          <label className="form-check-label" htmlFor={`leftbar-size-${tamanho.size}`}>
            {tamanho.name}
          </label>
        </div>)}
    </div>;
};

const PersonalizadorDeTema = ({
  open,
  toggle
}) => {
  const {
    resetSettings,
    theme
  } = useLayoutContext();
  return <div>
      <Offcanvas placement="end" show={open} onHide={toggle} className="border-0 rounded-start-4 overflow-hidden" tabIndex={-1}>
        <OffcanvasHeader closeVariant="white" closeButton className="d-flex align-items-center bg-primary p-3">
          <h5 className="text-white m-0">Configurações de Tema</h5>
        </OffcanvasHeader>
        <OffcanvasBody className="p-0">
          <SimplebarReactClient className="h-100">
            <div className="p-3 settings-bar">
              <EsquemaDeCores />

              {theme === 'claro' && <TemaTopbar />}

              {theme === 'claro' && <TemaMenu />}

              <TamanhoSidebar />
            </div>
          </SimplebarReactClient>
        </OffcanvasBody>
        <div className="offcanvas-footer border-top p-3 text-center">
          <Row>
            <Col>
              <Button variant="danger" onClick={resetSettings} className="w-100">
                Resetar
              </Button>
            </Col>
          </Row>
        </div>
      </Offcanvas>
    </div>;
};
export default PersonalizadorDeTema;
