// Componente NestingTable2.jsx (adaptado)
import { Button, Col, FormCheck, Row, Table } from 'react-bootstrap';
import clsx from 'clsx';
import Link from 'next/link';
import ComponentContainerCard from '@/components/ComponentContainerCard';
import UIExamplesList from '@/components/UIExamplesList';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { colorVariants, currency } from '@/context/constants';
import { toSentenceCase } from '@/utils/change-casing';
//import { extendedTableData, tableData } from './data'; // Não precisamos mais desses dados estáticos
import avatar6 from '@/assets/images/users/avatar-6.jpg';
import avatar7 from '@/assets/images/users/avatar-7.jpg';
import avatar8 from '@/assets/images/users/avatar-8.jpg';
import Image from 'next/image';
import PageTitle from '@/components/PageTitle';

const NestingTable2 = ({ vouchersUtilizados }) => { // Recebe os dados como props
    return (
        <ComponentContainerCard id="nesting1" title="Vouchers Utilizados" description="Lista de vouchers utilizados">
            <div className="table-responsive">
                <table className="table table-bordered table-striped table-centered">
                    <thead>
                        <tr>
                            <th scope="col">Código do Voucher</th>
                            <th scope="col">Cliente</th>
                            <th scope="col">Data de Utilização</th>
                            <th scope="col">Desconto</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vouchersUtilizados.map((voucher) => ( // Renderiza os dados dinamicamente
                            <tr key={voucher.codigo}>
                                <td>{voucher.codigo}</td>
                                <td>{voucher.cliente}</td>
                                <td>{voucher.dataUtilizacao}</td>
                                <td>{voucher.valorDesconto}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </ComponentContainerCard>
    );
};

export default NestingTable2;