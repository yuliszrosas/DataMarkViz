const ImpactCard = ({data, symbol}) => {
    if(!data || data.length === 0){
        return(
            <div className="flex items-center justify-center h-24">
                <p className="text-gray-400 text-sm">Cargando datos...</p>
            </div>
        );
    }

    const ultimo = data[0];

    const rendimientoUSD = ultimo.rendimiento_acumulado_usd;
    const rendimientoMXN = ultimo.rendimiento_acumulado_mxn;
    const impacto = rendimientoMXN - rendimientoUSD;

    const impactoReciente = data.length > 1 ? data[0].impacto_cambiario : 0;

    const fmt = (val) => {
        if(Math.abs(val) < 0.005) return '0.00%';
        return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
    };

    const color = (val) => val >= 0 ? 'text-green-600' : 'text-red-600';
    const arrow = (val) => val >= 0 ? '▲' : '▼';

    return (
        <div className="h-full">
            <h2 className="text-sm font-semibold text-gray-500 mb-1.5 pb-1.5 border-b border-gray-350 uppercase tracking-wide shrink-0">
                Impacto Cambiario — {symbol}
            </h2>

            <div className="space-y-3">
                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Rendimiento acumulado USD </span>
                    <span className={`text-sm font-semibold ${color(rendimientoUSD)}`}>
                        {arrow(rendimientoUSD)} {fmt(rendimientoUSD)}
                    </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Rendimiento acumuado MXN</span>
                    <span className={`text-sm font-semibold ${color(rendimientoMXN)}`}>
                        {arrow(rendimientoMXN)} {fmt(rendimientoMXN)}
                    </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Precio actual USD</span>
                    <span className="text-sm font-semibold text-gray-800">
                        ${ultimo.precio_usd.toFixed(2)}
                    </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Precio actual MXN</span>
                    <span className="text-sm font-semibold text-gray-800">
                        ${ultimo.precio_mxn.toFixed(2)}
                    </span>
                </div>

                <div className={`flex justify-between items-center py-2 px-3 rounded-lg mt-2 ${impacto >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <span className="text-sm font-bold text-gray-700">Impacto cambiario</span>
                    <span className={`text-base font-bold ${color(impacto)}`}>
                        {arrow(impacto)} {fmt(impacto)}
                    </span>
                </div>

                <p className="text-xs text-gray-400 mt-1.5 mb">
                    {impacto >= 0
                        ? 'El tipo de cambio favoreció al inversionista mexicano en este período.'
                        : 'El tipo de cambio perjudicó al inversionista mexicano en este período.'
                    }
                </p>
            </div>
        </div>
    );
};

export default ImpactCard;