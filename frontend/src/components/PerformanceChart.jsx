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
import { useMemo, useRef, useEffect } from 'react';

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
    const chartRef = useRef(null);

    useEffect(() => {
        function watchDPR() {
            const mq = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
            const onChange = () => {
                chartRef.current?.resize();
                mq.removeEventListener('change', onChange);
                watchDPR();
            };
            mq.addEventListener('change', onChange);
            return () => mq.removeEventListener('change', onChange);
        }
        const cleanup = watchDPR();
        return cleanup;
    }, []);

    if (!data || data.length === 0) {
        return <div className="text-center py-10 text-gray-500">Cargando datos...</div>;
    }

    const reversed = [...data].reverse();
    
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
            padding : { right: 20, left: 10 }
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
                    autoSkipPadding: 20,
                    maxTicksLimit: 12
                }, 
                grif: { display: false }
            },
            y: {
                afterFit: (axis) => { axis.width = 65; },
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
        <div className="w-full h-full min-w-0 flex flex-col justify-between">
            <div className="mb-2 flex flex-col items-center gap-1 shrink-0">
                <h3 className="text-base font-bold text-gray-800 tracking-tight">
                    {symbol} - Rendimiento Acumulado USD vs MXN
                </h3>
                <div className="flex gap-4 justify-center items-center text-xs font-medium text-gray-600">
                    <div className="flex items-center gap-1.5">
                        <span className="w-6 h-2.5 bg-blue-500 rounded-sm inline-block border border-blue-600"></span>
                        <span>Rendimiento USD (%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-6 h-2.5 bg-emerald-500 rounded-sm inline-block border border-emerald-600"></span>
                        <span>Rendimiento MXN (%)</span>
                    </div>
                </div>
            </div>

            <div className="w-full flex-1 min-h-[160px] overflow-x-auto">
                <div style={{ minWidth: `${minWidth}px` }} className="h-full relative">
                    <Line ref={chartRef} data={chartData} options={options} />
                </div>
            </div>
        </div>
    );
};

export default PerformanceChart;