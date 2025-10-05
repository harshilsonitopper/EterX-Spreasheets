import React, { useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartData, ChartOptions, ArcElement, LineElement, PointElement, ChartType } from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ChartJsComponentProps {
    type: ChartType;
    data: ChartData;
    options: ChartOptions;
}

const ChartJsComponent: React.FC<ChartJsComponentProps> = ({ type, data, options }) => {
    const themeOptions = useMemo((): ChartOptions => {
        if (typeof window === 'undefined') return {};
        const rootStyles = getComputedStyle(document.documentElement);
        const textColor = rootStyles.getPropertyValue('--color-text-secondary').trim();
        const textPrimaryColor = rootStyles.getPropertyValue('--color-text-primary').trim();
        const gridColor = rootStyles.getPropertyValue('--color-border-primary').trim();
        const accentColor = rootStyles.getPropertyValue('--color-accent-primary').trim();
        
        const backgroundColors = [
            accentColor,
            rootStyles.getPropertyValue('--color-accent-primary-hover').trim(),
            '#ec4899', '#f59e0b', '#10b981', '#3b82f6'
        ];
        
        // Add theme colors to datasets if not already present
        const themedData = {
            ...data,
            datasets: data.datasets.map((dataset, index) => ({
                ...dataset,
                backgroundColor: dataset.backgroundColor || backgroundColors,
                borderColor: dataset.borderColor || accentColor,
                borderWidth: dataset.borderWidth || 1,
            }))
        };
        
        const defaultOptions: ChartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: textColor }
                },
                title: {
                    display: true,
                    text: 'Chart',
                    color: textPrimaryColor,
                    font: { size: 16 }
                },
            },
            scales: type !== 'pie' ? {
                 x: {
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                },
                y: {
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                }
            } : {}
        };
        
        return { ...defaultOptions, ...options };
    }, [type, options, data]);
    
    return <Chart type={type} data={data} options={themeOptions} />;
};

export default ChartJsComponent;