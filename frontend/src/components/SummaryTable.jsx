const SummaryTable = ({ data, symbol }) => {
    if (!data || data.length === 0) {
        return <div className="text-center py-10 text-gray-500">Cargando datos...</div>;
    }

    const primerDia = data[data.length - 1];
    const ultimoDia = data[0];
    
    const rendimientoPeriodoUSD = ultimoDia.rendimiento_acumulado_usd;
    const rendimientoPeriodoMXN = ultimoDia.rendimiento_acumulado_mxn;
    const impactoCambiarioPeriodo = ultimoDia.impacto_cambiario;

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-1.5 text-left text-sm font-semibold text-gray-700 border-b">Métrica</th>
                        <th className="px-4 py-1.5 text-right text-sm font-semibold text-gray-700 border-b">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="border-b hover:bg-gray-50">
                        <td className="px-4 py-1.5 text-sm text-gray-700">Precio Actual USD</td>
                        <td className="px-4 py-1.5 text-right text-sm font-medium text-gray-900">${ultimoDia.precio_usd.toFixed(2)}</td>
                    </tr>
                    <tr className="border-b hover:bg-gray-50">
                        <td className="px-4 py-1.5 text-sm text-gray-700">Precio Actual MXN</td>
                        <td className="px-4 py-1.5 text-right text-sm font-medium text-gray-900">${ultimoDia.precio_mxn.toFixed(2)}</td>
                    </tr>
                    <tr className="border-b hover:bg-gray-50">
                        <td className="px-4 py-1.5 text-sm text-gray-700">Variación Diaria USD</td>
                        <td className={`px-4 py-1.5 text-right text-sm font-medium ${(data[1]?.rendimiento_diario_usd ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(data[1]?.rendimiento_diario_usd ?? 0)>= 0 ? '▲' : '▼'} {Math.abs(data[1]?.rendimiento_diario_usd ?? 0).toFixed(2)}%
                        </td>
                    </tr>
                    <tr className="border-b hover:bg-gray-50">
                        <td className="px-4 py-1.5 text-sm text-gray-700">Variación Diaria MXN</td>
                        <td className={`px-4 py-1.5 text-right text-sm font-medium ${(data[1]?.rendimiento_diario_mxn ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(data[1]?.rendimiento_diario_mxn ?? 0) >= 0 ? '▲' : '▼'} {Math.abs(data[1]?.rendimiento_diario_mxn ?? 0).toFixed(2)}%
                        </td>
                    </tr>
                    <tr className="border-b hover:bg-gray-50">
                        <td className="px-4 py-1.5 text-sm text-gray-700">Rendimiento Período USD</td>
                        <td className={`px-4 py-1.5 text-right text-sm font-medium ${rendimientoPeriodoUSD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {rendimientoPeriodoUSD >= 0 ? '▲' : '▼'} {Math.abs(rendimientoPeriodoUSD).toFixed(2)}%
                        </td>
                    </tr>
                    <tr className="border-b hover:bg-gray-50">
                        <td className="px-4 py-1.5 text-sm text-gray-700">Rendimiento Período MXN</td>
                        <td className={`px-4 py-1.5 text-right text-sm font-medium ${rendimientoPeriodoMXN >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {rendimientoPeriodoMXN >= 0 ? '▲' : '▼'} {Math.abs(rendimientoPeriodoMXN).toFixed(2)}%
                        </td>
                    </tr>
                    <tr className="bg-gray-50">
                        <td className="px-4 py-1.5 text-sm font-semibold text-gray-900">Impacto Cambiario Acumulado</td>
                        <td className={`px-4 py-1.5 text-right text-sm ${impactoCambiarioPeriodo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {impactoCambiarioPeriodo >= 0 ? '▲' : '▼'} {Math.abs(impactoCambiarioPeriodo).toFixed(2)}%
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

export default SummaryTable;