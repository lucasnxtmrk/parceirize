import { Table } from 'react-bootstrap';
import ComponentContainerCard from '@/components/ComponentContainerCard';

const NestingTable2 = ({ vouchersUtilizados }) => {
    return (
        <ComponentContainerCard id="nesting1" title="Vouchers Utilizados" description="Lista de vouchers utilizados">
            <div className="table-responsive">
                <Table striped bordered hover>
                    <thead>
                        <tr>
                            <th>Código do Voucher</th>
                            <th>Cliente</th>
                            <th>Data de Utilização</th>
                            <th>Desconto</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vouchersUtilizados.length > 0 ? (
                            vouchersUtilizados.map((voucher, index) => (
                                <tr key={index}>
                                    <td>{voucher.codigo}</td>
                                    <td>{voucher.cliente}</td>
                                    <td>{voucher.dataUtilizacao}</td>
                                    <td>{voucher.valorDesconto}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="text-center">Nenhum voucher utilizado ainda.</td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </div>
        </ComponentContainerCard>
    );
};

export default NestingTable2;
