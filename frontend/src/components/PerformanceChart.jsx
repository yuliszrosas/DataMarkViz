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
import { useMemo } from 'react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const PerformanceChart = ({ data, symbol }) => {
    if (!data || data.length === 0) {
        return <div className="text-center py-10 text-gray-500">Cargando datos...</div>;
    }

    const reversed = [...data].reverse();

    const lastLabelPlugin = useMemo(() => ({
        id: 'lastLabel',
        afterDraw(chart) {
            const xAxis = chart.scales.x;
            const lastIndex = reversed.length - 1;
            const lastLabel = reversed[lastIndex]?.fecha;
            if(!lastLabel || !xAxis) return;

            const x = xAxis.getPixelForValue(lastIndex);
            const y = xAxis.bottom -50;

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
                label: `Rendimiento USD (%)`,
                data: reversed.map(item => item.rendimiento_acumulado_usd),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.3,
                fill: false,
            },
            {
                label: `Rendimiento MXN (%)`,
                data: reversed.map(item => item.rendimiento_acumulado_mxn),
                borderColor: 'rgb(16, 185, 129)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.3,
                fill: false,
            }
        ]
    };

    const options = {
        responsive: true,
         maintainAspectRatio: false,
        layout:{
            padding : { right: 20 }
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend:{display: false},
            title: {display: false },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        let value = context.parsed.y;
                        return `${label}: ${value.toFixed(2)}%`;
                    }
                }
            }
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
                title: {
                    display: true,
                    text: 'Rendimiento (%)'
                },
                ticks: {
                    callback: function(value) {
                        return value + '%';
                    }
                }
            }
        }
    };

    const minWidth = Math.max(600, reversed.length * 9);

    return (
        <div className="w-full flex flex-col">
            <div className="mb-4 flex flex-col items-center gap-2">
                <h3 className="text-lg font-bold text-gray-800 tracking-tight">
                    {symbol} - Rendimiento Acumulado USD vs MXN
                </h3>
                <div className="flex gap-6 justify-center items-center text-sm font-medium text-gray-600">
                    <div className="flex items-center gap-2">
                        <span className="w-7 h-3 bg-blue-500 rounded-sm inline-block border border-blue-600"></span>
                        <span>Rendimiento USD (%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-7 h-3 bg-emerald-500 rounded-sm inline-block border border-emerald-600"></span>
                        <span>Rendimiento MXN (%)</span>
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

export default PerformanceChart;