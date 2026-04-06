import PriceChart from './components/PriceChart';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          DataMarkViz - Dashboard del Mercado Mexicano
        </h1>
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <PriceChart />
        </div>
      </div>
    </div>
  );
}

export default App;
