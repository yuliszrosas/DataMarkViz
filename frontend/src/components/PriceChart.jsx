import { useRef, useMemo } from 'react';
import { Line } from 'react-chartjs-2';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale, 
    LinearScale, 
    PointElement, 
    LineElement, 
    Title, 
    Tooltip, 
    Legend
);

const PriceChart = ({ data, symbol }) => {
    if (!data || data.length === 0) {
        return <div className="text-center py-10 text-gray-500">Cargando datos...</div>;
    }

    const reversed = [...data].reverse();

    // Plugin que dibuja la etiqueta del último día siempre
    const lastLabelPlugin = useMemo(() => ({
        id: 'lastLabel',
        afterDraw(chart) {
            const xAxis = chart.scales.x;
            const lastIndex = reversed.length - 1;
            const lastLabel = reversed[lastIndex]?.fecha;
            if (!lastLabel || !xAxis) return;

            const x = xAxis.getPixelForValue(lastIndex);
            const y = xAxis.bottom - 50; 

            const ctx = chart.ctx;
            ctx.save();
            ctx.font = '12px sans-serif';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'right';
            ctx.translate(x, y);
            ctx.rotate((-45 * Math.PI) / 180);
            ctx.fillText(lastLabel, 0, 0);
            ctx.restore();
        }
    }), [reversed]);

    const chartData = {
        labels: reversed.map(item => item.fecha),
        datasets: [
            {
                label: `Precio USD (${symbol})`,
                data: reversed.map(item => item.precio_usd),
                clip: false,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.3,
                yAxisID: 'y',
            },
            {
                label: `Precio MXN (${symbol})`,
                data: reversed.map(item => item.precio_mxn),
                clip: false,
                borderColor: 'rgb(16, 185, 129)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.3,
                yAxisID: 'y1',
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: { right: 20 }
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: { display: false },
            title: { display: false },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        let value = context.parsed.y;
                        label += context.dataset.label.includes('USD')
                            ? `: $${value.toFixed(2)} USD`
                            : `: $${value.toFixed(2)} MXN`;
                        return label;
                    }
                }
            },
        },
        scales: {
            x: {
                ticks: {
                    minRotation: 45,
                    maxRotation: 45,
                    autoSkip: true,
                    autoSkipPadding: 30,
                    maxTicksLimit: 15
                }
            },
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                afterFit: (axis) => { axis.width = 70; },
                title: { display: true, text: 'Precio USD' }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: { display: true, text: 'Precio MXN' },
                grid: { drawOnChartArea: false }
            }
        }
    };

    const minWidth = Math.max(600, reversed.length * 9);
    
    return (
        <div className="w-full flex flex-col">
            <div className="mb-4 flex flex-col items-center gap-2">
                <h3 className="text-lg font-bold text-gray-800 tracking-tight">
                    {symbol} - Precio USD vs MXN
                </h3>
                <div className="flex gap-6 justify-center items-center text-sm font-medium text-gray-600">
                    <div className="flex items-center gap-2">
                        <span className="w-7 h-3 bg-blue-500 rounded-sm inline-block border border-blue-600"></span>
                        <span>Precio USD ({symbol})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-7 h-3 bg-emerald-500 rounded-sm inline-block border border-emerald-600"></span>
                        <span>Precio MXN ({symbol})</span>
                    </div>
                </div>
            </div>

            <div className="w-full overflow-x-auto pb-2 custom-scrollbar">
                <div style={{ minWidth: `${minWidth}px`, width: '100%', height: '360px' }}>
                    <Line
                        data={chartData}
                        options={options}
                        plugins={[lastLabelPlugin]}
                    />
                </div>
            </div>
        </div>
    );
};

export default PriceChart;