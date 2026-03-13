import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import axios from 'axios';
import { LineChart, BarChart3, PieChart, Activity, Grip, BrainCircuit } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const VISUALIZATIONS = [
  { id: 'revenue-trend', name: 'Revenue Trend', icon: <LineChart size={20} /> },
  { id: 'revenue-distribution', name: 'Revenue Distribution', icon: <Activity size={20} /> },
  { id: 'top-customers', name: 'Top Customers', icon: <BarChart3 size={20} /> },
  { id: 'customer-segmentation', name: 'Customer Segmentation', icon: <PieChart size={20} /> },
  { id: 'correlation-heatmap', name: 'Correlation Heatmap', icon: <Grip size={20} /> },
];

function App() {
  const [activeVis, setActiveVis] = useState('revenue-trend');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const url = API_BASE_URL ? `${API_BASE_URL}/${activeVis}` : activeVis;
        const response = await axios.get(url);
        setData(response.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load data. Ensure the backend is running.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeVis]);

  const renderPlot = () => {
    if (!data) return null;
    
    // Common dark theme layout for Plotly
    const darkLayout = {
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { color: '#ededed', family: 'Outfit, sans-serif' },
      xaxis: { gridcolor: 'rgba(255,255,255,0.1)', zerolinecolor: 'rgba(255,255,255,0.1)' },
      yaxis: { gridcolor: 'rgba(255,255,255,0.1)', zerolinecolor: 'rgba(255,255,255,0.1)' },
      margin: { t: 40, r: 20, l: 60, b: 40 },
      autosize: true,
    };

    switch (activeVis) {
      case 'revenue-trend':
        return (
          <Plot
            data={[{
              x: data.x, y: data.y,
              type: 'scatter', mode: 'lines+markers',
              line: { color: '#00e0ff', width: 3 },
              marker: { color: '#7d2ae8', size: 8 }
            }]}
            layout={{ ...darkLayout, title: 'Monthly Revenue Trend' }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
          />
        );
      case 'revenue-distribution':
        return (
          <Plot
            data={[{
              x: data.x,
              type: 'histogram',
              marker: { color: '#7d2ae8', opacity: 0.8 },
              xbins: { size: 1000 }
            }]}
            layout={{ ...darkLayout, title: 'Revenue Distribution' }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
          />
        );
      case 'top-customers':
        return (
          <Plot
            data={[{
              x: data.x, y: data.y,
              type: 'bar',
              marker: { color: '#00e0ff' }
            }]}
            layout={{ ...darkLayout, title: 'Top 10 Customers by Revenue' }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
          />
        );
      case 'customer-segmentation':
        return (
          <Plot
            data={[{
              x: data.x, y: data.y, text: data.text,
              mode: 'markers', type: 'scatter',
              marker: { 
                size: 12, 
                color: data.y, 
                colorscale: 'Viridis',
                showscale: true,
                opacity: 0.7 
              }
            }]}
            layout={{ ...darkLayout, title: 'Purchase Frequency vs LTV', xaxis: { title: 'Frequency', ...darkLayout.xaxis }, yaxis: { title: 'Lifetime Value ($)', ...darkLayout.yaxis } }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
          />
        );
      case 'correlation-heatmap':
        return (
          <Plot
            data={[{
              z: data.z, x: data.x, y: data.y,
              type: 'heatmap',
              colorscale: 'Electric'
            }]}
            layout={{ ...darkLayout, title: 'Correlation Heatmap' }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#080808] text-[#ededed] font-sans">
      {/* Sidebar */}
      <div className="w-full md:w-72 glass-panel p-6 flex flex-col gap-6 md:min-h-screen border-b md:border-b-0 md:border-r border-white/10 m-0 md:m-4 rounded-none md:rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00e0ff] to-[#7d2ae8]">
            Analytics Engine
          </h1>
          <p className="text-sm text-gray-400 mt-2">Interactive AI Revenue Dashboard</p>
        </div>
        
        <div className="flex flex-col gap-2">
          {VISUALIZATIONS.map((vis) => (
            <button
              key={vis.id}
              onClick={() => setActiveVis(vis.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                activeVis === vis.id 
                  ? 'bg-gradient-to-r from-[#00e0ff]/20 to-[#7d2ae8]/20 border border-[#00e0ff]/50 text-white shadow-[0_0_15px_rgba(0,224,255,0.2)]'
                  : 'hover:bg-white/5 border border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <span className={activeVis === vis.id ? 'text-[#00e0ff]' : ''}>{vis.icon}</span>
              <span className="font-medium text-sm">{vis.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden md:h-[calc(100vh-2rem)] md:mt-4 md:mr-4">
        {/* Chart Container */}
        <div className="flex-1 glass-panel rounded-2xl p-4 flex items-center justify-center relative min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center gap-4 text-[#00e0ff]">
              <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
              <p className="animate-pulse">Analyzing Dataset...</p>
            </div>
          ) : error ? (
            <div className="text-red-400 text-center p-6 border border-red-500/30 rounded-xl bg-red-500/10">
              {error}
            </div>
          ) : (
            <div className="w-full h-full">
              {renderPlot()}
            </div>
          )}
        </div>

        {/* AI Insight Container */}
        <div className="glass-panel rounded-2xl p-6 border border-[#7d2ae8]/30 relative overflow-hidden shrink-0">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#00e0ff] to-[#7d2ae8]"></div>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-[#7d2ae8]/20 text-[#00e0ff] shrink-0">
              <BrainCircuit size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">AI Business Insight</h3>
              <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                {loading ? 'Generating insights...' : data?.insight || 'Select a visualization to generate business insights.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
